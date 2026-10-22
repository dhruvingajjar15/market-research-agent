import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, truncateSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Script } from "node:vm";
import { parseViewerArgs, startReportViewer } from "../src/viewer.ts";
import { renderDocx } from "../src/docx.ts";
import type { ResearchReport } from "../src/index.ts";

const REPORT_ID = "trend-2026-10-16T12-00-00-000Z-example";

function sampleReport(directory: string): ResearchReport {
  return {
    researchType: "trend",
    researchQuestion: "Electric bike adoption",
    generatedQueries: ["electric bike adoption trends"],
    searchResults: [{
      query: "electric bike adoption trends",
      results: [{ title: "Example result", url: "https://example.com/article", snippet: "Recent market evidence" }],
    }],
    sourcesUsed: [{
      title: "Example result",
      url: "https://example.com/article",
      snippet: "Recent market evidence",
      queries: ["electric bike adoption trends"],
    }],
    validationWarnings: ["Only 1 unique source found."],
    analysis: {
      executiveSummary: "Adoption is growing in some markets.",
      keyFindings: ["Demand is uneven."],
      recommendations: ["Check local conditions."],
      risks: ["Infrastructure varies."],
      opportunities: ["New commuter segments."],
      confidenceScore: "medium",
      source: "api",
    },
    generatedAt: "2026-10-16T12:00:00.000Z",
    reportPaths: {
      json: path.join(directory, `${REPORT_ID}.json`),
      markdown: path.join(directory, `${REPORT_ID}.md`),
    },
  };
}

test("viewer reads reports created after it starts and serves a formatted page and downloads", async (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), "market-research-viewer-"));
  const { server, url } = await startReportViewer({ outputDir: directory, port: 0 });
  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(directory, { recursive: true, force: true });
  });

  const emptyResponse = await fetch(new URL("api/reports", url));
  assert.equal(emptyResponse.status, 200);
  assert.deepEqual(await emptyResponse.json(), []);

  const report = sampleReport(directory);
  const docxPath = path.join(directory, `${REPORT_ID}.docx`);
  report.reportPaths.docx = docxPath;
  writeFileSync(report.reportPaths.json, JSON.stringify(report));
  writeFileSync(report.reportPaths.markdown, "# Market Research Report\n\nReadable Markdown.");
  const document = await renderDocx(report);
  writeFileSync(docxPath, document);
  writeFileSync(path.join(directory, "broken.json"), "{bad json");

  const listResponse = await fetch(new URL("api/reports", url));
  assert.equal(listResponse.headers.get("cache-control"), "no-store");
  assert.deepEqual(await listResponse.json(), [{
    id: REPORT_ID,
    researchType: "trend",
    researchQuestion: "Electric bike adoption",
    generatedAt: "2026-10-16T12:00:00.000Z",
    confidenceScore: "medium",
    sourceCount: 1,
    warningCount: 1,
    hasDocx: true,
  }]);

  const pageResponse = await fetch(url);
  const page = await pageResponse.text();
  assert.equal(pageResponse.status, 200);
  assert.match(pageResponse.headers.get("content-type") ?? "", /text\/html/);
  assert.match(page, /Market Research/);
  assert.match(page, /api\/reports/);
  assert.match(page, /Evidence analysis/);
  assert.match(page, /Source appearances by search query/);
  assert.match(page, /Saved sources by website/);
  assert.match(page, /href="\/docx"/);
  assert.match(page, /View Word document/);
  assert.match(page, /Download DOCX/);
  assert.doesNotMatch(page, /Recent market evidence/);
  const inlineScript = page.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(inlineScript);
  assert.doesNotThrow(() => new Script(inlineScript[1]));

  const detailResponse = await fetch(new URL(`api/reports/${REPORT_ID}`, url));
  const { evidenceInsights, hasDocx, ...displayReport } = await detailResponse.json() as ResearchReport & {
    hasDocx: boolean;
    evidenceInsights: {
      sourceCount: number;
      queryCoverage: Array<{ firstSeen: number; repeated: number }>;
      domainCoverage: Array<{ domain: string; count: number }>;
    };
  };
  assert.deepEqual(displayReport, report);
  assert.equal(hasDocx, true);
  assert.equal(evidenceInsights.sourceCount, 1);
  assert.deepEqual(evidenceInsights.queryCoverage.map(({ firstSeen, repeated }) => [firstSeen, repeated]), [[1, 0]]);
  assert.deepEqual(evidenceInsights.domainCoverage, [{ domain: "example.com", count: 1 }]);

  const markdownResponse = await fetch(new URL(`api/reports/${REPORT_ID}/markdown`, url));
  assert.equal(markdownResponse.status, 200);
  assert.match(markdownResponse.headers.get("content-disposition") ?? "", /attachment; filename=.*\.md/);
  assert.match(await markdownResponse.text(), /Readable Markdown/);

  const jsonResponse = await fetch(new URL(`api/reports/${REPORT_ID}/json`, url));
  assert.equal(jsonResponse.status, 200);
  assert.match(jsonResponse.headers.get("content-disposition") ?? "", /attachment; filename=.*\.json/);
  assert.deepEqual(await jsonResponse.json(), report);

  const docxResponse = await fetch(new URL(`api/reports/${REPORT_ID}/docx`, url));
  assert.equal(docxResponse.status, 200);
  assert.match(docxResponse.headers.get("content-type") ?? "", /application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/);
  assert.equal(docxResponse.headers.get("content-disposition"), `attachment; filename="${REPORT_ID}.docx"`);
  assert.deepEqual(Buffer.from(await docxResponse.arrayBuffer()), document);
});

test("viewer serves a local DOCX preview page and scripts with a restrictive CSP", async (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), "market-research-viewer-"));
  const { server, url } = await startReportViewer({ outputDir: directory, port: 0 });
  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(directory, { recursive: true, force: true });
  });

  const previewResponse = await fetch(new URL("docx", url));
  assert.equal(previewResponse.status, 200);
  const previewPage = await previewResponse.text();
  const csp = previewResponse.headers.get("content-security-policy") ?? "";
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /script-src 'self'/);
  assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/);
  assert.match(csp, /style-src[^;]*'unsafe-inline'/);
  assert.match(csp, /connect-src 'self'/);
  assert.match(csp, /img-src[^;]*data: blob:/);
  assert.match(csp, /font-src[^;]*data: blob:/);
  assert.match(previewPage, /src="\/assets\/jszip\.min\.js"/);
  assert.match(previewPage, /src="\/assets\/docx-preview\.min\.js"/);
  assert.match(previewPage, /src="\/assets\/docx-preview-client\.js"/);
  assert.doesNotMatch(previewPage, /src="https?:\/\//);
  assert.doesNotMatch(previewPage, /<script\b(?![^>]*\bsrc=)[^>]*>/i);

  for (const asset of ["jszip.min.js", "docx-preview.min.js", "docx-preview-client.js"]) {
    const assetResponse = await fetch(new URL(`assets/${asset}`, url));
    assert.equal(assetResponse.status, 200, asset);
    assert.match(assetResponse.headers.get("content-type") ?? "", /application\/javascript/, asset);
    const script = await assetResponse.text();
    assert.ok(script.length > 100, `${asset} should contain a script`);
    if (asset === "docx-preview-client.js") {
      assert.doesNotThrow(() => new Script(script));
    }
  }
});

test("viewer only exposes bounded, regular DOCX files for valid matching reports", async (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), "market-research-viewer-"));
  const { server, url } = await startReportViewer({ outputDir: directory, port: 0 });
  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(directory, { recursive: true, force: true });
  });

  const report = sampleReport(directory);
  const docxPath = path.join(directory, `${REPORT_ID}.docx`);
  const otherDocxPath = path.join(directory, "other-file.docx");
  report.reportPaths.docx = otherDocxPath;
  writeFileSync(report.reportPaths.json, JSON.stringify(report));
  writeFileSync(otherDocxPath, "other document");

  const listing = async () => (await (await fetch(new URL("api/reports", url))).json() as Array<{ hasDocx: boolean }>)[0].hasDocx;
  const detail = async () => (await (await fetch(new URL(`api/reports/${REPORT_ID}`, url))).json() as { hasDocx: boolean }).hasDocx;
  const download = async () => fetch(new URL(`api/reports/${REPORT_ID}/docx`, url));

  assert.equal(await listing(), false);
  assert.equal(await detail(), false);
  assert.equal((await download()).status, 404);

  mkdirSync(docxPath);
  assert.equal(await listing(), false);
  assert.equal((await download()).status, 404);
  rmSync(docxPath, { recursive: true });

  symlinkSync(otherDocxPath, docxPath);
  assert.equal(await listing(), false);
  assert.equal((await download()).status, 404);
  unlinkSync(docxPath);

  writeFileSync(docxPath, "x");
  truncateSync(docxPath, 20 * 1024 * 1024 + 1);
  assert.equal(await listing(), false);
  assert.equal((await download()).status, 404);
  unlinkSync(docxPath);

  writeFileSync(docxPath, Buffer.from("PK\u0003\u0004test"));
  assert.equal(await listing(), true);
  assert.equal(await detail(), true);
  assert.equal((await download()).status, 200);

  writeFileSync(report.reportPaths.json, "{bad json");
  assert.deepEqual(await (await fetch(new URL("api/reports", url))).json(), []);
  assert.equal((await download()).status, 404);
});

test("viewer rejects unsupported methods and report paths", async (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), "market-research-viewer-"));
  const { server, url } = await startReportViewer({ outputDir: directory, port: 0 });
  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(directory, { recursive: true, force: true });
  });

  assert.equal((await fetch(new URL("api/reports", url), { method: "POST" })).status, 405);
  assert.equal((await fetch(new URL("api/reports/%2e%2e%2fsecret", url))).status, 404);
  assert.equal((await fetch(new URL("api/reports/missing", url))).status, 404);
});

test("viewer can display older reports without source metadata or labeled confidence", async (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), "market-research-viewer-"));
  const { server, url } = await startReportViewer({ outputDir: directory, port: 0 });
  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(directory, { recursive: true, force: true });
  });

  const id = "trend-legacy";
  const legacy = JSON.parse(JSON.stringify(sampleReport(directory))) as Record<string, unknown>;
  delete legacy.sourcesUsed;
  delete legacy.validationWarnings;
  (legacy.analysis as Record<string, unknown>).confidenceScore = 0.85;
  writeFileSync(path.join(directory, `${id}.json`), JSON.stringify(legacy));

  const list = await (await fetch(new URL("api/reports", url))).json() as Array<{ id: string; sourceCount: number; confidenceScore: string }>;
  assert.equal(list[0].id, id);
  assert.equal(list[0].sourceCount, 1);
  assert.equal(list[0].confidenceScore, "high");

  const report = await (await fetch(new URL(`api/reports/${id}`, url))).json() as ResearchReport & {
    evidenceInsights: { sourceCount: number };
  };
  assert.equal(report.analysis.confidenceScore, "high");
  assert.equal(report.sourcesUsed[0].queries[0], "electric bike adoption trends");
  assert.deepEqual(report.validationWarnings, []);
  assert.equal(report.evidenceInsights.sourceCount, 1);
});

test("viewer command accepts an output directory and validates its port", () => {
  assert.deepEqual(parseViewerArgs(["--output-dir", "other-reports", "--port=4300"]), {
    outputDir: "other-reports",
    port: 4300,
  });
  assert.throws(() => parseViewerArgs(["--port", "abc"]), /Viewer port/);
  assert.throws(() => parseViewerArgs(["--unknown", "value"]), /Unknown viewer option/);
});
