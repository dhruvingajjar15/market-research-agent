import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { constants } from "node:fs";
import { lstat, open, readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import type { ResearchReport, SearchResult, SearchResultsForQuery, SourceUsed } from "./index.js";
import { renderDocxPreviewPage, renderDocxPreviewScript } from "./docx-preview-page.js";
import { buildEvidenceInsights } from "./report-insights.js";
import { renderViewerPage } from "./viewer-page.js";

const REPORT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const MAX_REPORT_BYTES = 8 * 1024 * 1024;
const MAX_DOCX_BYTES = 20 * 1024 * 1024;
const packageRequire = createRequire(import.meta.url);
const BROWSER_ASSET_PATHS: Record<string, string> = {
  "/assets/jszip.min.js": path.resolve(path.dirname(packageRequire.resolve("jszip")), "../dist/jszip.min.js"),
  "/assets/docx-preview.min.js": path.join(path.dirname(packageRequire.resolve("docx-preview")), "docx-preview.min.js"),
};

export interface ReportSummary {
  id: string;
  researchType: string;
  researchQuestion: string;
  generatedAt: string;
  confidenceScore: string;
  sourceCount: number;
  warningCount: number;
  hasDocx: boolean;
}

export interface ViewerOptions {
  outputDir?: string;
  port?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isSearchResult(value: unknown): value is SearchResult {
  return isRecord(value) && typeof value.title === "string" && typeof value.url === "string" && typeof value.snippet === "string";
}

function isSourceUsed(value: unknown): value is SourceUsed {
  return isSearchResult(value) && isRecord(value) && isStringArray(value.queries);
}

function normalizeConfidence(value: unknown): ResearchReport["analysis"]["confidenceScore"] {
  if (typeof value === "string") {
    const label = value.trim().toLowerCase();
    if (label === "high" || label === "medium" || label === "low") {
      return label;
    }
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= 0.75 ? "high" : value >= 0.5 ? "medium" : "low";
  }
  return "low";
}

function deriveSources(searchResults: SearchResultsForQuery[]): SourceUsed[] {
  const sources = new Map<string, SourceUsed>();
  for (const group of searchResults) {
    for (const result of group.results) {
      const prior = sources.get(result.url);
      if (prior) {
        if (!prior.queries.includes(group.query)) {
          prior.queries.push(group.query);
        }
      } else {
        sources.set(result.url, { ...result, queries: [group.query] });
      }
    }
  }
  return [...sources.values()];
}

function normalizeSavedReport(value: unknown): ResearchReport | null {
  if (!isRecord(value) || !isRecord(value.analysis)) {
    return null;
  }

  const analysis = value.analysis;
  const valid = typeof value.researchType === "string"
    && typeof value.researchQuestion === "string"
    && typeof value.generatedAt === "string"
    && isStringArray(value.generatedQueries)
    && typeof analysis.executiveSummary === "string"
    && isStringArray(analysis.keyFindings)
    && isStringArray(analysis.recommendations)
    && isStringArray(analysis.risks)
    && isStringArray(analysis.opportunities)
    && Array.isArray(value.searchResults)
    && value.searchResults.every((group) => isRecord(group)
      && typeof group.query === "string"
      && Array.isArray(group.results)
      && group.results.every(isSearchResult));
  if (!valid) {
    return null;
  }

  const searchResults = value.searchResults as SearchResultsForQuery[];
  const sourcesUsed = Array.isArray(value.sourcesUsed)
    && value.sourcesUsed.every(isSourceUsed)
    ? value.sourcesUsed as SourceUsed[]
    : deriveSources(searchResults);

  return {
    researchType: value.researchType as ResearchReport["researchType"],
    researchQuestion: value.researchQuestion as string,
    generatedAt: value.generatedAt as string,
    generatedQueries: value.generatedQueries as string[],
    searchResults,
    sourcesUsed,
    validationWarnings: isStringArray(value.validationWarnings) ? value.validationWarnings : [],
    analysis: {
      executiveSummary: analysis.executiveSummary as string,
      keyFindings: analysis.keyFindings as string[],
      recommendations: analysis.recommendations as string[],
      risks: analysis.risks as string[],
      opportunities: analysis.opportunities as string[],
      confidenceScore: normalizeConfidence(analysis.confidenceScore),
      source: "api",
    },
    reportPaths: isRecord(value.reportPaths)
      && typeof value.reportPaths.json === "string"
      && typeof value.reportPaths.markdown === "string"
      ? {
        json: value.reportPaths.json,
        markdown: value.reportPaths.markdown,
        ...(typeof value.reportPaths.docx === "string" ? { docx: value.reportPaths.docx } : {}),
      }
      : { json: "", markdown: "" },
  };
}

function isMissingFile(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT";
}

function isUnavailableDocx(error: unknown): boolean {
  return isRecord(error) && (error.code === "ENOENT" || error.code === "ELOOP");
}

function isUsableDocx(info: { isFile(): boolean; size: number }): boolean {
  return info.isFile() && info.size > 0 && info.size <= MAX_DOCX_BYTES;
}

async function hasDocxFile(outputDir: string, id: string): Promise<boolean> {
  try {
    return isUsableDocx(await lstat(path.join(outputDir, `${id}.docx`)));
  } catch (error) {
    if (isMissingFile(error)) {
      return false;
    }
    throw error;
  }
}

async function readDocxFile(outputDir: string, id: string): Promise<Buffer | null> {
  try {
    const filePath = path.join(outputDir, `${id}.docx`);
    if (!isUsableDocx(await lstat(filePath))) {
      return null;
    }
    const handle = await open(filePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    try {
      if (!isUsableDocx(await handle.stat())) {
        return null;
      }
      const contents = await handle.readFile();
      return contents.length <= MAX_DOCX_BYTES ? contents : null;
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (isUnavailableDocx(error)) {
      return null;
    }
    throw error;
  }
}

async function readRegularFile(filePath: string): Promise<string | null> {
  try {
    const info = await lstat(filePath);
    if (!info.isFile() || info.size > MAX_REPORT_BYTES) {
      return null;
    }
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (isMissingFile(error)) {
      return null;
    }
    throw error;
  }
}

async function loadReport(outputDir: string, id: string): Promise<{ report: ResearchReport; json: string } | null> {
  if (!REPORT_ID_PATTERN.test(id)) {
    return null;
  }

  const json = await readRegularFile(path.join(outputDir, `${id}.json`));
  if (json === null) {
    return null;
  }

  try {
    const report: unknown = JSON.parse(json);
    const normalized = normalizeSavedReport(report);
    return normalized ? { report: normalized, json } : null;
  } catch {
    return null;
  }
}

export async function listSavedReports(outputDir: string): Promise<ReportSummary[]> {
  let files;
  try {
    files = await readdir(outputDir, { withFileTypes: true });
  } catch (error) {
    if (isMissingFile(error)) {
      return [];
    }
    throw error;
  }

  const reports = await Promise.all(files
    .filter((file) => file.isFile() && file.name.endsWith(".json"))
    .map(async (file) => {
      const id = file.name.slice(0, -5);
      const saved = await loadReport(outputDir, id);
      if (!saved) {
        return null;
      }

      const { report } = saved;
      return {
        id,
        researchType: report.researchType,
        researchQuestion: report.researchQuestion,
        generatedAt: report.generatedAt,
        confidenceScore: report.analysis.confidenceScore,
        sourceCount: report.sourcesUsed.length,
        warningCount: report.validationWarnings.length,
        hasDocx: await hasDocxFile(outputDir, id),
      };
    }));

  return reports
    .filter((report): report is NonNullable<typeof report> => report !== null)
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt) || b.id.localeCompare(a.id));
}

function respond(response: ServerResponse, status: number, contentType: string, body: string | Buffer, extraHeaders: Record<string, string> = {}) {
  response.writeHead(status, {
    "Content-Type": contentType,
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    ...extraHeaders,
  });
  response.end(body);
}

function respondJson(response: ServerResponse, status: number, value: unknown) {
  respond(response, status, "application/json; charset=utf-8", JSON.stringify(value));
}

function downloadName(id: string, extension: "json" | "md" | "docx") {
  return `attachment; filename="${id}.${extension}"`;
}

async function handleRequest(request: IncomingMessage, response: ServerResponse, outputDir: string) {
  const localPort = response.socket?.localPort;
  if (request.headers.host !== `127.0.0.1:${localPort}` && request.headers.host !== `localhost:${localPort}`) {
    respondJson(response, 403, { error: "This viewer is available only from this computer." });
    return;
  }

  if (request.method !== "GET") {
    respondJson(response, 405, { error: "Method not allowed." });
    return;
  }

  const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
  if (pathname === "/") {
    respond(response, 200, "text/html; charset=utf-8", renderViewerPage(), {
      "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'",
    });
    return;
  }

  if (pathname === "/docx") {
    respond(response, 200, "text/html; charset=utf-8", renderDocxPreviewPage(), {
      "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; font-src 'self' data: blob:; base-uri 'none'; form-action 'none'; object-src 'none'; frame-ancestors 'none'",
    });
    return;
  }

  if (pathname === "/assets/docx-preview-client.js") {
    respond(response, 200, "application/javascript; charset=utf-8", renderDocxPreviewScript());
    return;
  }

  const assetPath = BROWSER_ASSET_PATHS[pathname];
  if (assetPath) {
    respond(response, 200, "application/javascript; charset=utf-8", await readFile(assetPath));
    return;
  }

  if (pathname === "/api/reports") {
    respondJson(response, 200, await listSavedReports(outputDir));
    return;
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 3 || segments.length > 4 || segments[0] !== "api" || segments[1] !== "reports") {
    respondJson(response, 404, { error: "Not found." });
    return;
  }

  const id = segments[2];
  const format = segments[3];
  if (!REPORT_ID_PATTERN.test(id) || (format !== undefined && format !== "json" && format !== "markdown" && format !== "docx")) {
    respondJson(response, 404, { error: "Report not found." });
    return;
  }

  const saved = await loadReport(outputDir, id);
  if (!saved) {
    respondJson(response, 404, { error: "Report not found." });
    return;
  }

  if (format === "json") {
    respond(response, 200, "application/json; charset=utf-8", saved.json, {
      "Content-Disposition": downloadName(id, "json"),
    });
    return;
  }

  if (format === "markdown") {
    const markdown = await readRegularFile(path.join(outputDir, `${id}.md`));
    if (markdown === null) {
      respondJson(response, 404, { error: "Markdown report not found." });
      return;
    }
    respond(response, 200, "text/markdown; charset=utf-8", markdown, {
      "Content-Disposition": downloadName(id, "md"),
    });
    return;
  }

  if (format === "docx") {
    const document = await readDocxFile(outputDir, id);
    if (document === null) {
      respondJson(response, 404, { error: "Word report not found." });
      return;
    }
    respond(response, 200, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", document, {
      "Content-Disposition": downloadName(id, "docx"),
    });
    return;
  }

  respondJson(response, 200, { ...saved.report, hasDocx: await hasDocxFile(outputDir, id), evidenceInsights: buildEvidenceInsights(saved.report) });
}

export async function startReportViewer(options: ViewerOptions = {}): Promise<{ server: Server; url: string; outputDir: string }> {
  const outputDir = path.resolve(options.outputDir ?? "reports");
  const port = options.port ?? 4173;
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("Viewer port must be a whole number from 0 to 65535.");
  }

  const server = createServer((request, response) => {
    handleRequest(request, response, outputDir).catch((error: unknown) => {
      console.error(`Viewer request failed: ${error instanceof Error ? error.message : String(error)}`);
      if (!response.headersSent) {
        respondJson(response, 500, { error: "Could not read reports." });
      } else {
        response.end();
      }
    });
  });

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, "127.0.0.1", () => {
        server.off("error", reject);
        resolve();
      });
    });
  } catch (error) {
    if (isRecord(error) && error.code === "EADDRINUSE") {
      throw new Error(`Port ${port} is already in use. Try another port with --port.`, { cause: error });
    }
    throw error;
  }

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Could not determine the viewer address.");
  }

  return { server, url: `http://127.0.0.1:${address.port}/`, outputDir };
}

export function parseViewerArgs(argv: string[]): ViewerOptions {
  const options: ViewerOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const separatorIndex = argv[index].indexOf("=");
    const flag = separatorIndex === -1 ? argv[index] : argv[index].slice(0, separatorIndex);
    const inlineValue = separatorIndex === -1 ? undefined : argv[index].slice(separatorIndex + 1);
    if (flag !== "--output-dir" && flag !== "-o" && flag !== "--port") {
      throw new Error(`Unknown viewer option: ${argv[index]}. Run view --help for usage.`);
    }

    const value = inlineValue ?? argv[++index];
    if (!value || value.startsWith("--")) {
      throw new Error(`Option ${flag} requires a value.`);
    }

    if (flag === "--port") {
      const port = Number(value);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("Viewer port must be a whole number from 1 to 65535.");
      }
      options.port = port;
    } else {
      options.outputDir = value;
    }
  }
  return options;
}

export async function runViewerCli(argv: string[]) {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log("Usage: market-research-agent view [--output-dir <path>] [--port <number>]\n\nOpen the shown local URL to read saved reports. Press Ctrl+C to stop the viewer.");
    return;
  }

  const viewer = await startReportViewer(parseViewerArgs(argv));
  console.log(`Report viewer: ${viewer.url}`);
  console.log(`Reading reports from: ${viewer.outputDir}`);
  console.log("Press Ctrl+C to stop.");
}
