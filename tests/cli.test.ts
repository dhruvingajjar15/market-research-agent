import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
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
  validateApiConfiguration,
  validateResearchInput,
} from "../src/index.ts";

test("generateSearchQueries creates five queries for competitor research", () => {
  const queries = generateSearchQueries("competitor", "social journaling app");
  assert.equal(queries.length, 5);
  assert.ok(queries.every((query) => query.includes("social journaling app") || query.includes("competitor") || query.includes("market") || query.includes("feature") || query.includes("reviews")));
});

test("loadEnvironment reads API keys from a local .env file", () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), "market-research-env-"));
  const envPath = path.join(tempDir, ".env");
  writeFileSync(envPath, "OPENAI_API_KEY=test-openai\nTAVILY_API_KEY=test-tavily\n", "utf8");

  const previousCwd = process.cwd();
  process.chdir(tempDir);

  try {
    const env = loadEnvironment();
    assert.equal(env.OPENAI_API_KEY, "test-openai");
    assert.equal(env.TAVILY_API_KEY, "test-tavily");
  } finally {
    process.chdir(previousCwd);
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
  });

  assert.deepEqual(parseArgs(["--research-type=trend", "--research-question", "mood-based posting"]), {
    researchType: "trend",
    researchQuestion: "mood-based posting",
    outputDir: "reports",
  });

  assert.deepEqual(parseArgs(["-t", "customer_pain", "-q", "-private sharing concerns"]), {
    researchType: "customer_pain",
    researchQuestion: "-private sharing concerns",
    outputDir: "reports",
  });

  assert.deepEqual(parseArgs(["competitor", "coffee shops", "--output-dir", "custom-reports"]), {
    researchType: "competitor",
    researchQuestion: "coffee shops",
    outputDir: "custom-reports",
  });

  assert.deepEqual(parseArgs(["--research-type", "trend", "electric", "bikes"]), {
    researchType: "trend",
    researchQuestion: "electric bikes",
    outputDir: "reports",
  });

  assert.throws(() => parseArgs(["competitor", "coffee shops", "--unknown"]), /Unknown option/);
  assert.throws(() => parseArgs(["--research-type="]), /requires a value/);
});

test("help helpers identify help requests and print usage", () => {
  assert.equal(isHelpRequest(["--help"]), true);
  assert.equal(isHelpRequest(["-h"]), true);
  assert.equal(isHelpRequest(["mvp", "question"]), false);
  assert.match(getUsageText(), /market-research-agent/);
  assert.match(getUsageText(), /npm run research/);
  assert.match(getUsageText(), /Supported research types/);
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
