import assert from "node:assert/strict";
import test from "node:test";
import { inflateRawSync } from "node:zlib";
import { renderDocx } from "../src/docx.ts";
import type { ResearchReport } from "../src/index.ts";

// A DOCX is a ZIP archive. Read a named entry using Node's built-in zlib so the
// test can inspect real Word XML without adding a second document dependency.
function zipText(archive: Buffer, name: string) {
  let endRecord = -1;
  for (let offset = archive.length - 22; offset >= Math.max(0, archive.length - 65_557); offset -= 1) {
    if (archive.readUInt32LE(offset) === 0x06054b50) {
      endRecord = offset;
      break;
    }
  }
  assert.notEqual(endRecord, -1, "DOCX must contain a ZIP end record");

  const entryCount = archive.readUInt16LE(endRecord + 10);
  let offset = archive.readUInt32LE(endRecord + 16);
  for (let index = 0; index < entryCount; index += 1) {
    assert.equal(archive.readUInt32LE(offset), 0x02014b50, "invalid ZIP central directory");
    const method = archive.readUInt16LE(offset + 10);
    const compressedLength = archive.readUInt32LE(offset + 20);
    const nameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const localOffset = archive.readUInt32LE(offset + 42);
    const entryName = archive.toString("utf8", offset + 46, offset + 46 + nameLength);

    if (entryName === name) {
      assert.equal(archive.readUInt32LE(localOffset), 0x04034b50, "invalid ZIP local header");
      const localNameLength = archive.readUInt16LE(localOffset + 26);
      const localExtraLength = archive.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = archive.subarray(start, start + compressedLength);
      if (method === 0) return compressed.toString("utf8");
      assert.equal(method, 8, "unsupported ZIP compression method");
      return inflateRawSync(compressed).toString("utf8");
    }

    offset += 46 + nameLength + extraLength + commentLength;
  }

  assert.fail(`DOCX does not contain ${name}`);
}

function sampleReport(): ResearchReport {
  const source = {
    title: "Evidence & growth",
    url: "https://example.com/evidence?a=1&b=2",
    snippet: "Demand rose by 12%.",
  };

  return {
    researchType: "competitor",
    researchQuestion: "Coffee & tea subscriptions?",
    generatedQueries: ["coffee subscription market", "tea subscription alternatives"],
    searchResults: [
      { query: "coffee subscription market", results: [source] },
      { query: "tea subscription alternatives", results: [] },
    ],
    sourcesUsed: [{ ...source, queries: ["coffee subscription market"] }],
    validationWarnings: ["Only 1 unique source found."],
    analysis: {
      executiveSummary: "The market is growing, but evidence is limited.",
      keyFindings: ["Subscription demand exists."],
      recommendations: ["Interview prospective customers."],
      risks: ["Pricing may be difficult."],
      opportunities: ["Niche bundles could stand out."],
      confidenceScore: "medium",
      source: "api",
    },
    generatedAt: "2026-10-21T12:00:00.000Z",
    reportPaths: { json: "report.json", markdown: "report.md" },
  };
}

test("renderDocx creates a complete, styled Word report with working source hyperlinks", async () => {
  const document = await renderDocx(sampleReport());
  assert.equal(document.subarray(0, 2).toString("ascii"), "PK");

  const body = zipText(document, "word/document.xml");
  const links = zipText(document, "word/_rels/document.xml.rels");
  const footer = zipText(document, "word/footer1.xml");

  for (const text of [
    "Market Research Report", "Report Details", "Validation", "Executive Summary",
    "Key Findings", "Recommendations", "Risks", "Opportunities", "Sources Used",
    "Search Queries", "Search Results", "Subscription demand exists.",
    "Interview prospective customers.", "Pricing may be difficult.",
    "Niche bundles could stand out.", "Demand rose by 12%.",
    "No unique sources returned for this query.",
  ]) {
    assert.ok(body.includes(text), `DOCX should include ${text}`);
  }

  assert.match(body, /Coffee &amp; tea subscriptions\?/);
  assert.match(body, /Warning: Only 1 unique source found\./);
  assert.match(body, /w:pStyle w:val="Heading1"/);
  assert.match(body, /<w:hyperlink\b[^>]*r:id=/);
  assert.match(links, /Target="https:\/\/example\.com\/evidence\?a=1&amp;b=2"/);
  assert.match(footer, /PAGE/);
});

test("renderDocx keeps empty sections readable", async () => {
  const report = sampleReport();
  report.sourcesUsed = [];
  report.validationWarnings = [];
  report.generatedQueries = [];
  report.searchResults = [];
  report.analysis.keyFindings = [];

  const body = zipText(await renderDocx(report), "word/document.xml");
  assert.match(body, /No validation warnings\./);
  assert.match(body, /None reported\./);
  assert.match(body, /No sources found\./);
  assert.match(body, /No search results recorded\./);
});

test("renderDocx prints malformed source URLs without adding broken hyperlinks", async () => {
  const report = sampleReport();
  report.sourcesUsed = [
    { title: "Incomplete web address", url: "https://", snippet: "Saved source", queries: [] },
    { title: "Non-web address", url: "file:///private/report", snippet: "Saved source", queries: [] },
  ];
  report.searchResults = [];

  const document = await renderDocx(report);
  const body = zipText(document, "word/document.xml");
  const links = zipText(document, "word/_rels/document.xml.rels");
  assert.match(body, /Incomplete web address/);
  assert.match(body, /file:\/\/\/private\/report/);
  assert.doesNotMatch(links, /Target="https:\/\/"/);
  assert.doesNotMatch(links, /Target="file:/);
});
