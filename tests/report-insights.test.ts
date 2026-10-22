import test from "node:test";
import assert from "node:assert/strict";
import { buildEvidenceInsights } from "../src/report-insights.ts";
import type { ResearchReport, SourceUsed } from "../src/index.ts";

function source(url: string, queries: string[]): SourceUsed {
  return { title: url, url, snippet: "", queries };
}

function reportWith(generatedQueries: string[], sourcesUsed: SourceUsed[]): ResearchReport {
  return {
    researchType: "trend",
    researchQuestion: "Example topic",
    generatedQueries,
    searchResults: [],
    sourcesUsed,
    validationWarnings: [],
    analysis: {
      executiveSummary: "",
      keyFindings: [],
      recommendations: [],
      risks: [],
      opportunities: [],
      confidenceScore: "low",
      source: "api",
    },
    generatedAt: "2026-01-01T00:00:00.000Z",
    reportPaths: { json: "", markdown: "" },
  };
}

test("query coverage counts each matching source once and marks its earliest generated query", () => {
  const report = reportWith(["first", "second", "third"], [
    source("https://www.example.com/a", ["second", "first", "first"]),
    source("https://example.com/b", ["second"]),
    source("https://other.example/c", ["third", "first"]),
    source("bad url", ["a query not generated"]),
  ]);
  const original = structuredClone(report);

  const insights = buildEvidenceInsights(report);

  assert.deepEqual(insights.queryCoverage, [
    { query: "first", total: 2, firstSeen: 2, repeated: 0 },
    { query: "second", total: 2, firstSeen: 1, repeated: 1 },
    { query: "third", total: 1, firstSeen: 0, repeated: 1 },
  ]);
  assert.equal(insights.sourceCount, 4);
  assert.equal(insights.multiQuerySourceCount, 2);
  assert.equal(insights.domainCount, 2);
  assert.deepEqual(insights.domainCoverage, [
    { domain: "example.com", count: 2 },
    { domain: "Unknown website", count: 1 },
    { domain: "other.example", count: 1 },
  ]);
  assert.match(insights.observations.join(" "), /2 sources appeared in more than one generated search query/);
  assert.match(insights.observations.join(" "), /Across 3 generated search queries, recorded sources associated with each query range from 1 to 2/);
  assert.match(insights.observations.join(" "), /example\.com accounts for 2 of 4 recorded sources, the most among identifiable websites/);
  assert.match(insights.observations.join(" "), /1 source did not match a recorded generated search query/);
  assert.doesNotMatch(insights.observations.join(" "), /market size|market quality|representative/i);
  assert.deepEqual(report, original);
  assert.deepEqual(buildEvidenceInsights(report), insights);
});

test("domain coverage groups HTTP and HTTPS hostnames, ignoring leading www", () => {
  const insights = buildEvidenceInsights(reportWith(["query"], [
    source("https://WWW.Example.COM/path", ["query"]),
    source("http://example.com/other", ["query"]),
    source("https://news.example.com/item", ["query"]),
    source("file:///local/report.html", ["query"]),
    source("javascript:alert(1)", ["query"]),
    source("http://www.", ["query"]),
  ]));

  assert.equal(insights.domainCount, 2);
  assert.deepEqual(insights.domainCoverage, [
    { domain: "Unknown website", count: 3 },
    { domain: "example.com", count: 2 },
    { domain: "news.example.com", count: 1 },
  ]);
  assert.match(insights.observations.join(" "), /example\.com accounts for 2 of 6 recorded sources/);
});

test("distribution observations describe tied websites and equal query coverage precisely", () => {
  const insights = buildEvidenceInsights(reportWith(["first", "second"], [
    source("https://alpha.example/a", ["first", "second"]),
    source("https://alpha.example/b", ["first", "second"]),
    source("https://beta.example/a", ["first", "second"]),
    source("https://beta.example/b", ["first", "second"]),
  ]));

  assert.match(insights.observations.join(" "), /2 identifiable websites share the highest count, with 2 of 4 recorded sources each/);
  assert.match(insights.observations.join(" "), /Each of 2 generated search queries is associated with 4 recorded sources/);
});

test("empty reports and reports without generated queries have honest empty coverage", () => {
  const empty = buildEvidenceInsights(reportWith([], []));
  assert.deepEqual(empty.queryCoverage, []);
  assert.deepEqual(empty.domainCoverage, []);
  assert.equal(empty.sourceCount, 0);
  assert.equal(empty.domainCount, 0);
  assert.equal(empty.multiQuerySourceCount, 0);
  assert.deepEqual(empty.observations, [
    "No sources were recorded for this report.",
    "No generated search queries were recorded for this report.",
  ]);

  const noQueries = buildEvidenceInsights(reportWith([], [source("not a URL", ["older query"])]));
  assert.deepEqual(noQueries.queryCoverage, []);
  assert.deepEqual(noQueries.domainCoverage, [{ domain: "Unknown website", count: 1 }]);
  assert.equal(noQueries.domainCount, 0);
  assert.equal(noQueries.multiQuerySourceCount, 0);
  assert.match(noQueries.observations.join(" "), /No generated search queries/);

  const noSources = buildEvidenceInsights(reportWith(["first", "second"], []));
  assert.deepEqual(noSources.queryCoverage, [
    { query: "first", total: 0, firstSeen: 0, repeated: 0 },
    { query: "second", total: 0, firstSeen: 0, repeated: 0 },
  ]);
  assert.deepEqual(noSources.observations, ["No sources were recorded for this report."]);
});

test("duplicate generated query labels do not create duplicate chart categories", () => {
  const insights = buildEvidenceInsights(reportWith(["repeat", "repeat", "other"], [
    source("https://example.com", ["repeat", "other"]),
  ]));

  assert.deepEqual(insights.queryCoverage, [
    { query: "repeat", total: 1, firstSeen: 1, repeated: 0 },
    { query: "other", total: 1, firstSeen: 0, repeated: 1 },
  ]);
  assert.equal(insights.multiQuerySourceCount, 1);
});
