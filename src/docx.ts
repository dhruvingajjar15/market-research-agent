import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  TextRun,
  UnderlineType,
} from "docx";
import type { ResearchReport, SearchResult } from "./index.js";

const FONT = "Aptos";
const COLOR = {
  ink: "172B46",
  muted: "5B6C80",
  accent: "087F8C",
  divider: "DCE5ED",
  warning: "8A5600",
  warningBackground: "FFF4DE",
  success: "28704E",
} as const;

function run(text: string, options: { bold?: boolean; color?: string; size?: number } = {}) {
  return new TextRun({
    text,
    font: FONT,
    size: options.size ?? 21,
    color: options.color ?? COLOR.ink,
    bold: options.bold,
  });
}

function sectionHeading(title: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    keepNext: true,
    spacing: { before: 340, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: COLOR.divider, space: 8 } },
    children: [run(title, { bold: true, color: COLOR.ink, size: 30 })],
  });
}

function subsectionHeading(title: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    keepNext: true,
    spacing: { before: 220, after: 100 },
    children: [run(title, { bold: true, color: COLOR.ink, size: 24 })],
  });
}

function body(text: string, color: string = COLOR.ink) {
  return new Paragraph({
    spacing: { after: 140, line: 300 },
    children: [run(text, { color })],
  });
}

function bulletList(items: string[]) {
  if (items.length === 0) {
    return [body("None reported.", COLOR.muted)];
  }

  return items.map((item) => new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 105, line: 295 },
    children: [run(item)],
  }));
}

function detail(label: string, value: string) {
  return new Paragraph({
    spacing: { after: 85, line: 280 },
    children: [
      run(`${label}  `, { bold: true, color: COLOR.muted, size: 19 }),
      run(value, { size: 20 }),
    ],
  });
}

function sourceLink(title: string, url: string) {
  const linkText = title.trim() || url;

  // Only valid web URLs become relationships in the Word file. The original URL
  // is still printed below the title if a saved report contains unusual input.
  let target: string;
  try {
    const parsed = new URL(url.trim());
    if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || !parsed.hostname) {
      return run(linkText, { bold: true });
    }
    target = parsed.toString();
  } catch {
    return run(linkText, { bold: true });
  }

  return new ExternalHyperlink({ link: target, children: [new TextRun({
    text: linkText,
    font: FONT,
    size: 21,
    bold: true,
    color: COLOR.accent,
    underline: { type: UnderlineType.SINGLE, color: COLOR.accent },
  })] });
}

function sourceEntry(source: SearchResult, index: number, queries?: string[]) {
  const paragraphs = [
    new Paragraph({
      keepNext: true,
      spacing: { before: 145, after: 55 },
      children: [
        run(`${index + 1}.  `, { bold: true, color: COLOR.muted, size: 20 }),
        sourceLink(source.title, source.url),
      ],
    }),
    new Paragraph({
      spacing: { after: 65 },
      children: [run(source.url, { color: COLOR.muted, size: 17 })],
    }),
  ];

  if (source.snippet.trim()) {
    paragraphs.push(new Paragraph({
      spacing: { after: 75, line: 280 },
      children: [run(source.snippet, { color: COLOR.ink, size: 19 })],
    }));
  }

  if (queries && queries.length > 0) {
    paragraphs.push(new Paragraph({
      spacing: { after: 130 },
      children: [
        run("Found by:  ", { bold: true, color: COLOR.muted, size: 17 }),
        run(queries.join("; "), { color: COLOR.muted, size: 17 }),
      ],
    }));
  }

  return paragraphs;
}

/** Render one complete market research report as a formatted Word document. */
export async function renderDocx(report: ResearchReport): Promise<Buffer> {
  const confidence = report.analysis.confidenceScore;
  const confidenceColor = confidence === "high" ? COLOR.success : confidence === "low" ? COLOR.warning : COLOR.accent;
  const researchType = report.researchType.replace(/_/g, " ");
  const content: Paragraph[] = [
    new Paragraph({
      spacing: { after: 85 },
      children: [run("RESEARCH BRIEF", { bold: true, color: COLOR.accent, size: 18 })],
    }),
    new Paragraph({
      spacing: { after: 110 },
      keepNext: true,
      children: [run("Market Research Report", { bold: true, color: COLOR.ink, size: 44 })],
    }),
    new Paragraph({
      spacing: { after: 260, line: 350 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLOR.accent, space: 14 } },
      children: [run(report.researchQuestion, { color: COLOR.muted, size: 26 })],
    }),
    sectionHeading("Report Details"),
    detail("Research type", researchType),
    detail("Research question", report.researchQuestion),
    detail("Generated at", report.generatedAt),
    new Paragraph({
      spacing: { after: 85 },
      children: [
        run("Confidence  ", { bold: true, color: COLOR.muted, size: 19 }),
        run(confidence.charAt(0).toUpperCase() + confidence.slice(1), { bold: true, color: confidenceColor, size: 20 }),
      ],
    }),
    detail("Analysis source", report.analysis.source),
    detail("Unique sources", String(report.sourcesUsed.length)),
    sectionHeading("Validation"),
  ];

  if (report.validationWarnings.length === 0) {
    content.push(body("No validation warnings.", COLOR.success));
  } else {
    for (const warning of report.validationWarnings) {
      content.push(new Paragraph({
        spacing: { before: 70, after: 100, line: 295 },
        indent: { left: 200, right: 120 },
        border: { left: { style: BorderStyle.SINGLE, size: 20, color: COLOR.warning, space: 10 } },
        shading: { fill: COLOR.warningBackground },
        children: [run(`Warning: ${warning}`, { color: COLOR.warning, size: 20 })],
      }));
    }
  }

  content.push(sectionHeading("Executive Summary"));
  for (const paragraph of report.analysis.executiveSummary.split(/\r?\n\s*\r?\n/)) {
    content.push(body(paragraph.trim()));
  }

  for (const [heading, items] of [
    ["Key Findings", report.analysis.keyFindings],
    ["Recommendations", report.analysis.recommendations],
    ["Risks", report.analysis.risks],
    ["Opportunities", report.analysis.opportunities],
  ] as const) {
    content.push(sectionHeading(heading), ...bulletList(items));
  }

  content.push(sectionHeading("Sources Used"));
  if (report.sourcesUsed.length === 0) {
    content.push(body("No sources found.", COLOR.muted));
  } else {
    report.sourcesUsed.forEach((source, index) => content.push(...sourceEntry(source, index, source.queries)));
  }

  content.push(sectionHeading("Search Queries"), ...bulletList(report.generatedQueries));
  content.push(sectionHeading("Search Results"));
  if (report.searchResults.length === 0) {
    content.push(body("No search results recorded.", COLOR.muted));
  }
  for (const item of report.searchResults) {
    content.push(subsectionHeading(item.query));
    if (item.results.length === 0) {
      content.push(body("No unique sources returned for this query.", COLOR.muted));
    } else {
      item.results.forEach((result, index) => content.push(...sourceEntry(result, index)));
    }
  }

  const document = new Document({
    title: `Market Research Report: ${report.researchQuestion}`,
    subject: report.researchType,
    creator: "Market Research Agent",
    description: "Market research analysis with source evidence and search history.",
    sections: [{
      properties: { page: { margin: { top: 1100, bottom: 1100, left: 1200, right: 1200, header: 520, footer: 520 } } },
      headers: { default: new Header({ children: [
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 5, color: COLOR.divider, space: 7 } },
          spacing: { after: 60 },
          children: [run("MARKET RESEARCH  /  REPORT", { bold: true, color: COLOR.muted, size: 15 })],
        }),
      ] }) },
      footers: { default: new Footer({ children: [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          border: { top: { style: BorderStyle.SINGLE, size: 5, color: COLOR.divider, space: 7 } },
          children: [
            run("Page ", { color: COLOR.muted, size: 16 }),
            new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: COLOR.muted }),
          ],
        }),
      ] }) },
      children: content,
    }],
  });

  return Packer.toBuffer(document);
}
