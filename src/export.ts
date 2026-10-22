import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ResearchReport, SearchResult } from "./index.js";
import { renderDocx } from "./docx.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isSearchResult(value: unknown): value is SearchResult {
  return isRecord(value)
    && typeof value.title === "string"
    && typeof value.url === "string"
    && typeof value.snippet === "string";
}

function isResearchReport(value: unknown): value is ResearchReport {
  if (!isRecord(value) || !isRecord(value.analysis) || !isRecord(value.reportPaths)) {
    return false;
  }

  const analysis = value.analysis;
  const reportPaths = value.reportPaths;

  return typeof value.researchType === "string"
    && typeof value.researchQuestion === "string"
    && typeof value.generatedAt === "string"
    && isStringArray(value.generatedQueries)
    && isStringArray(value.validationWarnings)
    && Array.isArray(value.sourcesUsed)
    && value.sourcesUsed.every((source) => isSearchResult(source) && isRecord(source) && isStringArray(source.queries))
    && Array.isArray(value.searchResults)
    && value.searchResults.every((group) => isRecord(group)
      && typeof group.query === "string"
      && Array.isArray(group.results)
      && group.results.every(isSearchResult))
    && typeof analysis.executiveSummary === "string"
    && isStringArray(analysis.keyFindings)
    && isStringArray(analysis.recommendations)
    && isStringArray(analysis.risks)
    && isStringArray(analysis.opportunities)
    && (analysis.confidenceScore === "high" || analysis.confidenceScore === "medium" || analysis.confidenceScore === "low")
    && analysis.source === "api"
    && typeof reportPaths.json === "string"
    && typeof reportPaths.markdown === "string";
}

export function parseExportArgs(argv: string[]) {
  let reportPath: string | undefined;
  let outputPath: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--output" || arg === "-o") {
      const next = argv[index + 1];
      if (!next || next.startsWith("-")) {
        throw new Error(`Option ${arg} requires a .docx path.`);
      }
      outputPath = next;
      index += 1;
    } else if (arg.startsWith("--output=") || arg.startsWith("-o=")) {
      outputPath = arg.slice(arg.indexOf("=") + 1);
      if (!outputPath) {
        throw new Error(`Option ${arg} requires a .docx path.`);
      }
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown export option: ${arg}. Run export --help for usage.`);
    } else if (reportPath) {
      throw new Error("Export accepts one saved JSON report path.");
    } else {
      reportPath = arg;
    }
  }

  if (!reportPath) {
    throw new Error("A saved JSON report path is required. Run export --help for usage.");
  }

  if (path.extname(reportPath).toLowerCase() !== ".json") {
    throw new Error("Export input must be a saved .json report.");
  }

  const resolvedOutputPath = outputPath ?? `${reportPath.slice(0, -5)}.docx`;
  if (path.extname(resolvedOutputPath).toLowerCase() !== ".docx") {
    throw new Error("Export output must have a .docx extension. The legacy .doc format is not supported.");
  }

  return { reportPath, outputPath: resolvedOutputPath };
}

export async function exportSavedReport(reportPath: string, outputPath: string) {
  if (path.extname(reportPath).toLowerCase() !== ".json") {
    throw new Error("Export input must be a saved .json report.");
  }
  if (path.extname(outputPath).toLowerCase() !== ".docx") {
    throw new Error("Export output must have a .docx extension. The legacy .doc format is not supported.");
  }

  const contents = await readFile(reportPath, "utf8");
  let parsed: unknown;

  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new Error(`Invalid JSON report: ${reportPath}`);
  }

  if (!isResearchReport(parsed)) {
    throw new Error(`The file is not a valid Market Research Agent report: ${reportPath}`);
  }

  const document = await renderDocx(parsed);
  await mkdir(path.dirname(outputPath), { recursive: true });
  try {
    await writeFile(outputPath, document, { flag: "wx" });
  } catch (error) {
    if (isRecord(error) && error.code === "EEXIST") {
      throw new Error(`Output already exists: ${outputPath}. Choose another path with --output.`);
    }
    throw error;
  }

  return outputPath;
}

export async function runExportCli(argv: string[]) {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log([
      "Export a saved research report to Word (.docx)",
      "",
      "Usage:",
      "  market-research-agent export <report.json> [--output <file.docx>]",
      "",
      "The default output is beside the JSON report with the same filename stem.",
      "No API keys or new research requests are needed.",
    ].join("\n"));
    return;
  }

  const { reportPath, outputPath } = parseExportArgs(argv);
  const savedPath = await exportSavedReport(reportPath, outputPath);
  console.log(`Saved Word report: ${path.resolve(savedPath)}`);
}
