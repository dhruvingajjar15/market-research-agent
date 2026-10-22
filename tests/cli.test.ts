import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildValidationWarnings,
  deduplicateSearchResults,
  generateSearchQueries,
  getUsageText,
  isHelpRequest,
  loadEnvironment,
  normalizeAnalysisResponse,
  normalizeConfidenceScore,
  normalizeSourceUrl,
  parseArgs,
  parseJsonResponseContent,
  renderMarkdown,
  runResearch,
  validateApiConfiguration,
  validateResearchInput,
} from "../src/index.ts";
import { exportSavedReport, parseExportArgs } from "../src/export.ts";

function setEnvironment(t: TestContext, entries: Record<string, string | undefined>) {
  const previous = Object.fromEntries(Object.keys(entries).map((key) => [key, process.env[key]]));

  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });
}

function mockResearchApis(
  t: TestContext,
  options: {
    tavilyPayload?: (callCount: number) => unknown;
    openAiChoices?: unknown[];
  } = {},
) {
  const calls = {
    tavily: 0,
    openAi: 0,
    tavilyRequests: [] as Array<{ method: string | undefined; headers: Headers; body: unknown }>,
  };
  const tavilyPayload = options.tavilyPayload ?? ((callCount: number) => ({
    results: [{ title: `Source ${callCount}`, url: `https://example.com/${callCount}`, content: "Research evidence" }],
  }));
  const openAiChoices = options.openAiChoices ?? [{
    index: 0,
    message: {
      role: "assistant",
      content: JSON.stringify({
        executiveSummary: "Evidence-based summary",
        keyFindings: ["A finding"],
        recommendations: ["A recommendation"],
        risks: ["A risk"],
        opportunities: ["An opportunity"],
        confidenceScore: "medium",
      }),
    },
    finish_reason: "stop",
  }];

  t.mock.method(globalThis, "fetch", async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url === "https://api.tavily.com/search") {
      calls.tavily += 1;
      calls.tavilyRequests.push({
        method: init?.method,
        headers: new Headers(init?.headers),
        body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
      });
      return Response.json(tavilyPayload(calls.tavily));
    }

    if (url.endsWith("/chat/completions")) {
      calls.openAi += 1;
      return Response.json({
        id: "chatcmpl-test",
        object: "chat.completion",
        created: 1,
        model: "gpt-4o-mini",
        choices: openAiChoices,
      });
    }

    throw new Error(`Unexpected URL in mocked research API: ${url}`);
  });

  return calls;
}

function createTemporaryReportDirectory(t: TestContext) {
  const directory = mkdtempSync(path.join(tmpdir(), "market-research-reports-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test("generateSearchQueries creates five queries for competitor research", () => {
  const queries = generateSearchQueries("competitor", "social journaling app");
  assert.equal(queries.length, 5);
  assert.ok(queries.every((query) => query.includes("social journaling app") || query.includes("competitor") || query.includes("market") || query.includes("feature") || query.includes("reviews")));
});

test("loadEnvironment reads API keys from a local .env file", (t) => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "market-research-env-"));
  const envPath = path.join(tempDir, ".env");
  writeFileSync(envPath, "OPENAI_API_KEY=test-openai\nTAVILY_API_KEY=test-tavily\n", "utf8");

  setEnvironment(t, { OPENAI_API_KEY: undefined, TAVILY_API_KEY: undefined });

  try {
    const env = loadEnvironment(tempDir);
    assert.equal(env.OPENAI_API_KEY, "test-openai");
    assert.equal(env.TAVILY_API_KEY, "test-tavily");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("parseJsonResponseContent accepts plain JSON", () => {
  const parsed = parseJsonResponseContent<{ executiveSummary: string }>('{"executiveSummary":"Summary"}');
  assert.equal(parsed.executiveSummary, "Summary");
});

test("parseJsonResponseContent accepts fenced JSON", () => {
  const parsed = parseJsonResponseContent<{ executiveSummary: string }>('```json\n{"executiveSummary":"Summary"}\n```');
  assert.equal(parsed.executiveSummary, "Summary");
});

test("normalizeConfidenceScore accepts labels and maps numbers", () => {
  assert.equal(normalizeConfidenceScore("HIGH"), "high");
  assert.equal(normalizeConfidenceScore("medium"), "medium");
  assert.equal(normalizeConfidenceScore("low"), "low");
  assert.equal(normalizeConfidenceScore(0.92), "high");
  assert.equal(normalizeConfidenceScore(0.61), "medium");
  assert.equal(normalizeConfidenceScore(0.2), "low");
});

test("normalizeAnalysisResponse drops malformed OpenAI fields instead of crashing markdown rendering", () => {
  const analysis = normalizeAnalysisResponse({
    executiveSummary: "  Summary  ",
    keyFindings: "Not an array",
    recommendations: [" Keep this ", "", 42],
    risks: null,
    opportunities: ["Opportunity"],
    confidenceScore: "HIGH",
  });

  assert.deepEqual(analysis, {
    executiveSummary: "Summary",
    keyFindings: [],
    recommendations: ["Keep this"],
    risks: [],
    opportunities: ["Opportunity"],
    confidenceScore: "high",
    source: "api",
  });
});

test("normalizeSourceUrl ignores trailing slash, hashes, and tracking parameters", () => {
  assert.equal(
    normalizeSourceUrl("https://example.com/article/?utm_source=newsletter#section"),
    normalizeSourceUrl("https://example.com/article"),
  );
});

test("parseArgs supports positional and named research arguments", () => {
  assert.deepEqual(parseArgs(["mvp", "AI-assisted", "writing"]), {
    researchType: "mvp",
    researchQuestion: "AI-assisted writing",
    outputDir: "reports",
    includeDocx: false,
  });

  assert.deepEqual(parseArgs(["--research-type=trend", "--research-question", "mood-based posting"]), {
    researchType: "trend",
    researchQuestion: "mood-based posting",
    outputDir: "reports",
    includeDocx: false,
  });

  assert.deepEqual(parseArgs(["-t", "customer_pain", "-q", "-private sharing concerns"]), {
    researchType: "customer_pain",
    researchQuestion: "-private sharing concerns",
    outputDir: "reports",
    includeDocx: false,
  });

  assert.deepEqual(parseArgs(["competitor", "coffee shops", "--output-dir", "custom-reports"]), {
    researchType: "competitor",
    researchQuestion: "coffee shops",
    outputDir: "custom-reports",
    includeDocx: false,
  });

  assert.deepEqual(parseArgs(["--research-type", "trend", "electric", "bikes"]), {
    researchType: "trend",
    researchQuestion: "electric bikes",
    outputDir: "reports",
    includeDocx: false,
  });

  assert.deepEqual(parseArgs(["trend", "electric bikes", "--format=docx"]), {
    researchType: "trend",
    researchQuestion: "electric bikes",
    outputDir: "reports",
    includeDocx: true,
  });

  assert.throws(() => parseArgs(["competitor", "coffee shops", "--unknown"]), /Unknown option/);
  assert.throws(() => parseArgs(["--research-type="]), /requires a value/);
  assert.throws(() => parseArgs(["trend", "electric bikes", "--format", "doc"]), /Unsupported report format/);
});

test("parseExportArgs accepts a saved JSON report and requires genuine DOCX output", () => {
  assert.deepEqual(parseExportArgs(["reports/example.json"]), {
    reportPath: "reports/example.json",
    outputPath: "reports/example.docx",
  });
  assert.deepEqual(parseExportArgs(["reports/example.json", "--output", "other/report.docx"]), {
    reportPath: "reports/example.json",
    outputPath: "other/report.docx",
  });
  assert.throws(() => parseExportArgs([]), /saved JSON report path is required/);
  assert.throws(() => parseExportArgs(["reports/example.md"]), /saved \.json report/);
  assert.throws(() => parseExportArgs(["reports/example.json", "--output", "report.doc"]), /legacy \.doc format is not supported/);
});

test("help helpers identify help requests and print usage", () => {
  assert.equal(isHelpRequest(["--help"]), true);
  assert.equal(isHelpRequest(["-h"]), true);
  assert.equal(isHelpRequest(["mvp", "question"]), false);
  assert.match(getUsageText(), /market-research-agent/);
  assert.match(getUsageText(), /npm run research/);
  assert.match(getUsageText(), /Supported research types/);
  assert.match(getUsageText(), /--format docx/);
  assert.match(getUsageText(), /export <report\.json>/);
});

test("a symlinked CLI entrypoint prints help", (t) => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "market-research-bin-"));
  t.after(() => rmSync(tempDir, { recursive: true, force: true }));
  const sourcePath = fileURLToPath(new URL("../src/index.ts", import.meta.url));
  const binPath = path.join(tempDir, "market-research-agent");
  symlinkSync(sourcePath, binPath);

  const result = spawnSync(process.execPath, ["--import", "tsx", binPath, "--help"], {
    encoding: "utf8",
    cwd: path.dirname(path.dirname(sourcePath)),
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Market Research Agent/);
  assert.match(result.stdout, /Supported research types/);
  assert.equal(result.stderr, "");
});

test("deduplicateSearchResults removes duplicate URLs across queries and tracks query origins", () => {
  const deduplicated = deduplicateSearchResults([
    {
      query: "query one",
      results: [
        { title: "First", url: "https://example.com/article?utm_source=test", snippet: "One" },
        { title: "Second", url: "https://example.com/second", snippet: "Two" },
      ],
    },
    {
      query: "query two",
      results: [
        { title: "First duplicate", url: "https://example.com/article/#intro", snippet: "Duplicate" },
      ],
    },
  ]);

  assert.equal(deduplicated.sourcesUsed.length, 2);
  assert.deepEqual(deduplicated.sourcesUsed[0].queries, ["query one", "query two"]);
  assert.equal(deduplicated.searchResults[1].results.length, 0);
});

test("buildValidationWarnings warns when fewer than five unique sources are found", () => {
  const warnings = buildValidationWarnings([
    { title: "One", url: "https://example.com/one", snippet: "One", queries: ["query"] },
  ]);

  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Only 1 unique source found/);
});

test("buildValidationWarnings does not warn when five sources are found", () => {
  const sources = Array.from({ length: 5 }, (_, index) => ({
    title: `Source ${index + 1}`,
    url: `https://example.com/${index + 1}`,
    snippet: "Snippet",
    queries: ["query"],
  }));

  assert.deepEqual(buildValidationWarnings(sources), []);
});

test("validateResearchInput rejects unsupported research types and empty questions", () => {
  assert.deepEqual(validateResearchInput("MVP", " Phase 1 features "), {
    researchType: "mvp",
    researchQuestion: "Phase 1 features",
  });
  assert.throws(() => validateResearchInput("unknown", "Question"), /Unsupported research type/);
  assert.throws(() => validateResearchInput("mvp", "   "), /Research question is required/);
});

test("validateApiConfiguration reports all missing API keys before research starts", () => {
  assert.doesNotThrow(() => validateApiConfiguration({
    OPENAI_API_KEY: "test-openai",
    TAVILY_API_KEY: "test-tavily",
  }));
  assert.throws(
    () => validateApiConfiguration({}),
    /OPENAI_API_KEY, TAVILY_API_KEY/,
  );
});

test("renderMarkdown builds a readable report", () => {
  const markdown = renderMarkdown({
    researchType: "trend",
    researchQuestion: "mood-based posting | AI writing",
    generatedQueries: ["query one", "query two"],
    searchResults: [{ query: "query one", results: [{ title: "Result", url: "https://example.com", snippet: "Snippet" }] }],
    sourcesUsed: [{ title: "Result | Source", url: "https://example.com", snippet: "Snippet", queries: ["query one"] }],
    validationWarnings: ["Only 1 unique source found. Aim for at least 5 sources before relying on this report."],
    analysis: {
      executiveSummary: "Summary",
      keyFindings: ["One"],
      recommendations: ["Do this"],
      risks: ["Risk"],
      opportunities: ["Opportunity"],
      confidenceScore: "high",
      source: "api",
    },
    generatedAt: "2026-06-30T00:00:00.000Z",
    reportPaths: { json: "reports/example.json", markdown: "reports/example.md" },
  });

  assert.match(markdown, /# Market Research Report/);
  assert.match(markdown, /## Key Findings/);
  assert.match(markdown, /## Sources Used/);
  assert.match(markdown, /## Validation/);
  assert.match(markdown, /\| Confidence \| High \|/);
  assert.match(markdown, /mood-based posting \\| AI writing/);
  assert.match(markdown, /Result \\| Source/);
  assert.match(markdown, /Do this/);
});

test("renderMarkdown escapes link brackets and newlines in list content", () => {
  const markdown = renderMarkdown({
    researchType: "trend",
    researchQuestion: "question",
    generatedQueries: ["query"],
    searchResults: [
      {
        query: "query",
        results: [{ title: "Result [bracket]", url: "https://example.com/a path?q=one)", snippet: "Snippet\ncontinued" }],
      },
    ],
    sourcesUsed: [{ title: "Source [bracket]", url: "https://example.com/a path?q=one)", snippet: "Snippet", queries: ["query"] }],
    validationWarnings: [],
    analysis: {
      executiveSummary: "Summary\ncontinued",
      keyFindings: ["Finding\ncontinued"],
      recommendations: [],
      risks: [],
      opportunities: [],
      confidenceScore: "medium",
      source: "api",
    },
    generatedAt: "2026-06-30T00:00:00.000Z",
    reportPaths: { json: "reports/example.json", markdown: "reports/example.md" },
  });

  assert.match(markdown, /Source \\\[bracket\\\]/);
  assert.match(markdown, /https:\/\/example.com\/a%20path\?q=one%29/);
  assert.match(markdown, /Finding continued/);
  assert.doesNotMatch(markdown, /Snippet\ncontinued/);
});

for (const [caseName, tavilyResponse] of [
  ["missing", { answer: "No results field" }],
  ["non-array", { results: "not an array" }],
] as const) {
  test(`runResearch rejects Tavily responses with ${caseName} results`, async (t) => {
    setEnvironment(t, { OPENAI_API_KEY: "test-openai", TAVILY_API_KEY: "test-tavily" });
    const outputDir = createTemporaryReportDirectory(t);
    const calls = mockResearchApis(t, { tavilyPayload: () => tavilyResponse });

    await assert.rejects(runResearch("trend", "electric bikes", outputDir), /Tavily returned malformed results.*expected a results array/);
    assert.equal(calls.tavily, 1);
    assert.equal(calls.openAi, 0);
    assert.deepEqual(readdirSync(outputDir), []);

    const request = calls.tavilyRequests[0];
    assert.equal(request.method, "POST");
    assert.equal(request.headers.get("Authorization"), "Bearer test-tavily");
    assert.equal(request.headers.get("Content-Type"), "application/json");
    assert.deepEqual(request.body, {
      query: generateSearchQueries("trend", "electric bikes")[0],
      search_depth: "basic",
      max_results: 5,
    });
  });
}

test("runResearch rejects malformed Tavily result entries", async (t) => {
  setEnvironment(t, { OPENAI_API_KEY: "test-openai", TAVILY_API_KEY: "test-tavily" });
  const outputDir = createTemporaryReportDirectory(t);
  const calls = mockResearchApis(t, { tavilyPayload: () => ({ results: [{ title: "Missing URL", content: "Evidence" }] }) });

  await assert.rejects(runResearch("trend", "electric bikes", outputDir), /Tavily returned a malformed result.*non-empty URL/);
  assert.equal(calls.tavily, 1);
  assert.equal(calls.openAi, 0);
  assert.deepEqual(readdirSync(outputDir), []);
});

for (const [caseName, choices] of [
  ["missing", []],
  ["empty", [{ index: 0, message: { role: "assistant", content: "  " }, finish_reason: "stop" }]],
] as const) {
  test(`runResearch rejects ${caseName} OpenAI text content`, async (t) => {
    setEnvironment(t, { OPENAI_API_KEY: "test-openai", TAVILY_API_KEY: "test-tavily" });
    const outputDir = createTemporaryReportDirectory(t);
    const calls = mockResearchApis(t, { openAiChoices: [...choices] });

    await assert.rejects(runResearch("trend", "electric bikes", outputDir), /OpenAI analysis returned no text content/);
    assert.equal(calls.tavily, 5);
    assert.equal(calls.openAi, 1);
    assert.deepEqual(readdirSync(outputDir), []);
  });
}

test("runResearch rejects OpenAI JSON without a summary", async (t) => {
  setEnvironment(t, { OPENAI_API_KEY: "test-openai", TAVILY_API_KEY: "test-tavily" });
  const outputDir = createTemporaryReportDirectory(t);
  const calls = mockResearchApis(t, {
    openAiChoices: [{ index: 0, message: { role: "assistant", content: "{}" }, finish_reason: "stop" }],
  });

  await assert.rejects(runResearch("trend", "electric bikes", outputDir), /OpenAI analysis returned no executive summary/);
  assert.equal(calls.tavily, 5);
  assert.equal(calls.openAi, 1);
  assert.deepEqual(readdirSync(outputDir), []);
});

test("runResearch writes distinct JSON and Markdown reports when timestamps match", async (t) => {
  setEnvironment(t, { OPENAI_API_KEY: "test-openai", TAVILY_API_KEY: "test-tavily" });
  const outputDir = createTemporaryReportDirectory(t);
  const calls = mockResearchApis(t);
  t.mock.method(Date.prototype, "toISOString", () => "2026-10-13T12:00:00.000Z");

  const firstReport = await runResearch("trend", "electric bikes", outputDir);
  const firstJson = readFileSync(firstReport.reportPaths.json, "utf8");
  const secondReport = await runResearch("trend", "cargo bikes", outputDir);

  assert.notEqual(firstReport.reportPaths.json, secondReport.reportPaths.json);
  assert.notEqual(firstReport.reportPaths.markdown, secondReport.reportPaths.markdown);
  assert.equal(readFileSync(firstReport.reportPaths.json, "utf8"), firstJson);
  assert.deepEqual(JSON.parse(firstJson), firstReport);
  assert.deepEqual(JSON.parse(readFileSync(secondReport.reportPaths.json, "utf8")), secondReport);
  assert.match(readFileSync(firstReport.reportPaths.markdown, "utf8"), /electric bikes/);
  assert.match(readFileSync(secondReport.reportPaths.markdown, "utf8"), /cargo bikes/);
  assert.equal(readdirSync(outputDir).length, 4);
  assert.equal(calls.tavily, 10);
  assert.equal(calls.openAi, 2);
});

test("DOCX research output and saved-report export create Word files without overwriting", async (t) => {
  setEnvironment(t, { OPENAI_API_KEY: "test-openai", TAVILY_API_KEY: "test-tavily" });
  const outputDir = createTemporaryReportDirectory(t);
  mockResearchApis(t);

  const report = await runResearch("trend", "electric bikes", outputDir, { includeDocx: true });
  const docxPath = report.reportPaths.docx;
  assert.ok(docxPath);
  assert.equal(path.parse(docxPath).name, path.parse(report.reportPaths.json).name);
  assert.equal(readFileSync(docxPath).subarray(0, 2).toString("ascii"), "PK");
  assert.equal(JSON.parse(readFileSync(report.reportPaths.json, "utf8")).reportPaths.docx, docxPath);

  const copiedPath = path.join(outputDir, "saved-report.docx");
  await exportSavedReport(report.reportPaths.json, copiedPath);
  assert.equal(readFileSync(copiedPath).subarray(0, 2).toString("ascii"), "PK");
  await assert.rejects(exportSavedReport(report.reportPaths.json, copiedPath), /Output already exists/);

  const cliPath = path.join(outputDir, "cli-export.docx");
  const sourcePath = fileURLToPath(new URL("../src/index.ts", import.meta.url));
  const result = spawnSync(process.execPath, ["--import", "tsx", sourcePath, "export", report.reportPaths.json, "--output", cliPath], {
    encoding: "utf8",
    cwd: path.dirname(path.dirname(sourcePath)),
    env: { ...process.env, OPENAI_API_KEY: "", TAVILY_API_KEY: "" },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Saved Word report:/);
  assert.equal(readFileSync(cliPath).subarray(0, 2).toString("ascii"), "PK");
});

test("saved-report export explains invalid JSON and invalid report data", async (t) => {
  const outputDir = createTemporaryReportDirectory(t);
  const reportPath = path.join(outputDir, "invalid.json");
  const docxPath = path.join(outputDir, "invalid.docx");

  writeFileSync(reportPath, "not JSON", "utf8");
  await assert.rejects(exportSavedReport(reportPath, docxPath), /Invalid JSON report/);

  writeFileSync(reportPath, JSON.stringify({ researchQuestion: "incomplete" }), "utf8");
  await assert.rejects(exportSavedReport(reportPath, docxPath), /not a valid Market Research Agent report/);
  assert.deepEqual(readdirSync(outputDir), ["invalid.json"]);
});
