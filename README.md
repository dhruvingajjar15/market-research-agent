<div align="center">

# Market Research Agent

**Turn any market question into a sourced research report from your terminal.**

Five targeted searches. One structured analysis. Local Markdown, JSON, and optional Word documents you own.

[![Node.js 22+](https://img.shields.io/badge/Node.js-22%2B-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![OpenAI](https://img.shields.io/badge/Analysis-OpenAI-000000?style=flat&logo=openai&logoColor=white)](https://platform.openai.com/)
[![Tavily](https://img.shields.io/badge/Search-Tavily-4F46E5?style=flat)](https://tavily.com/)
[![CLI](https://img.shields.io/badge/Interface-CLI-4EAA25?style=flat&logo=gnubash&logoColor=white)](#usage)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat)](LICENSE)

</div>

---

## What Is This?

Market Research Agent is a standalone TypeScript CLI that turns a research question into a structured, source-linked report. Give it a topic and a research angle; it builds five focused searches, gathers web results with Tavily, and asks OpenAI to synthesize the evidence.

Use it to explore any product, market, industry, audience, or customer problem. The agent does not assume who you are or what you are building—the question supplies the context.

> **Human review matters.** The report is a research starting point, not a substitute for primary-source verification or professional advice. Check important claims against the included links before making decisions.

## Features

| Feature | Description |
| --- | --- |
| **Six research modes** | Choose competitor, customer pain, monetization, trend, MVP, or investor risk research. |
| **Focused search plan** | Generates five queries tailored to the selected research mode. |
| **Web evidence** | Uses Tavily to retrieve up to five results for each query. |
| **AI synthesis** | Uses the OpenAI SDK to extract findings, recommendations, risks, opportunities, and a confidence rating. |
| **Source cleanup** | Removes duplicate links, strips common tracking parameters, and records which queries returned each source. |
| **Evidence warning** | Flags reports containing fewer than five unique sources. |
| **Local reports** | Writes a readable Markdown report and complete structured data as JSON; optionally creates a formatted Word document (`.docx`). |
| **Export saved reports** | Converts a saved report JSON file to `.docx` without new API calls. |
| **Local report viewer** | Opens saved reports and their Word documents in a browser, with a scannable summary, recommendations, source links, and expandable evidence. |
| **Evidence charts** | Shows which searches contributed sources, where links are concentrated by website, and short explanations of those patterns. |
| **Flexible CLI** | Supports positional arguments, named flags, short flags, and a custom output directory. |

## Quick Start

The npm registry release is pending, and these CLI fixes have not yet been pushed to the public GitHub repository. The GitHub install below will work after they are pushed. Until then, use [a local checkout](#local-development).

### 1. Install the CLI

Install [Node.js 22 or newer](https://nodejs.org/en/download) and [Git](https://git-scm.com/downloads), then run:

```bash
node --version
git --version
npm install --global github:dhruvingajjar15/market-research-agent
```

The shorter registry command, `npm install --global market-research-agent`, will work after the package is published to npm.

### 2. Add API keys

Create a `.env` file in the directory where you will run the command and add your keys:

```dotenv
OPENAI_API_KEY=your-openai-api-key
TAVILY_API_KEY=your-tavily-api-key

# Optional: use another OpenAI model available to your account.
# OPENAI_MODEL=gpt-4o-mini
```

Get keys from [OpenAI](https://platform.openai.com/api-keys) and [Tavily](https://app.tavily.com/). You can also set `OPENAI_API_KEY` and `TAVILY_API_KEY` as shell environment variables instead of using `.env`. Keep your keys private. Requests may incur charges from those providers.

### 3. Run your first report

```bash
market-research-agent competitor "meal planning apps"
```

The finished Markdown (`.md`) and JSON (`.json`) reports are saved locally in `reports/` under the directory where you ran the command.

To create a formatted Word document in the same directory as well, add `--format docx`:

```bash
market-research-agent competitor "meal planning apps" --format docx
```

### 4. Read reports in your browser

Run this in a terminal from the same directory, then open the local URL it prints:

```bash
market-research-agent view
```

The viewer shows your newest report first. It checks for newly generated reports while open, so you can run another research command in a second terminal and see the new report appear. Select an older report from the list whenever you need it. The browser UI reads completed local reports; research still runs through the CLI. Press `Ctrl+C` in the viewer terminal to stop it.

When a report has a `.docx` file with the same filename stem in the viewer's report directory, select the report and choose **View Word document** to see the actual saved file in the browser. Choose **Download DOCX** to save that file. For a Word document elsewhere, including one created with `export --output`, follow the always-visible **Open a DOCX file** link and choose the file on the preview page. This opens the file directly in your browser; you do not need to move it into `reports/` or have its JSON report alongside it. The browser preview can differ from the exact layout in Microsoft Word; use the saved `.docx` in a Word-compatible editor when precise pagination matters.

The evidence charts use the saved source links and search-query history. They show source coverage and website diversity, with a short explanation beside the charts. They do not estimate market size or demand.

If you saved reports elsewhere, point the viewer at the same directory:

```bash
market-research-agent view --output-dir ./research-output
```

Use `--port 4300` if the default port (`4173`) is already in use. The viewer listens only on your computer at `127.0.0.1`.

## Research Types

| Type | Use it to explore |
| --- | --- |
| `competitor` | Alternatives, positioning, capabilities, pricing, reviews, and differentiation |
| `customer_pain` | Frustrations, complaints, unmet needs, and problems customers want solved |
| `monetization` | Pricing benchmarks, revenue models, paid offerings, and willingness to pay |
| `trend` | Current momentum, emerging behavior, market shifts, and adoption patterns |
| `mvp` | Lean first releases, minimum feature sets, and early product scope |
| `investor_risk` | Market, startup, go-to-market, regulatory, and adoption risks |

## Usage

After installing the CLI, run it from any directory:

```bash
market-research-agent <research-type> "<research-question>"
market-research-agent trend "electric bike adoption"
```

The shorter command `market-research` works too.

Named and short flags work too:

```bash
market-research-agent \
  --research-type=monetization \
  --research-question="AI note-taking tools"

market-research-agent \
  -t customer_pain \
  -q "online language learning"
```

Choose where reports are saved:

```bash
market-research-agent \
  mvp \
  "personal finance tools for freelancers" \
  --output-dir ./research-output
```

Create a Word document during a new research run:

```bash
market-research-agent trend "electric bike adoption" --format docx
```

This writes the usual `.json` and `.md` files plus a matching `.docx` file. The document has a prominent title block, report details, confidence and validation notes, section headings, bullet lists, linked sources, search evidence, a header, and page numbers. `.docx` is the current Word format; this command does not create a legacy `.doc` file.

You can convert an existing saved JSON report later without API keys or another web search. Replace `report.json` below with the `.json` path printed by your research run:

```bash
market-research-agent export ./reports/report.json
market-research-agent export ./reports/report.json --output ./research-output/competitor-brief.docx
```

Without `--output`, export puts the `.docx` next to the input JSON with the same filename stem. Export refuses to overwrite an existing destination; choose another filename if one already exists. The saved JSON and Markdown files are left as they are.

To preview either kind of Word document, run `market-research-agent view`. A same-stem DOCX in the viewer's report directory appears with its report; use **Open a DOCX file** and the preview page's file chooser for a custom export path or any other local `.docx` file. The preview renders the saved document itself, so you see its headings and document content rather than a new report generated from JSON.

See every option:

```bash
market-research-agent --help
```

To use these commands from a local checkout, prefix them with `npm run research --`, for example `npm run research -- trend "electric bike adoption" --format docx` or `npm run research -- export ./reports/report.json`. To browse reports, run `npm run view`. Pass viewer options after `--`, for example `npm run view -- --output-dir ./research-output`.

## How It Works

```text
Your research type + question
              │
              ▼
    ┌───────────────────┐
    │  Build 5 focused  │
    │  search queries   │
    └─────────┬─────────┘
              │
              ▼
    ┌───────────────────┐
    │  Search the web   │
    │  with Tavily      │
    └─────────┬─────────┘
              │
              ▼
    ┌───────────────────┐
    │  Deduplicate and  │
    │  validate sources │
    └─────────┬─────────┘
              │
              ▼
    ┌───────────────────┐
    │  Analyze evidence │
    │  with OpenAI      │
    └─────────┬─────────┘
              │
       ┌───┴────┐
       ▼        ▼
   Markdown    JSON ───► Local report viewer
                │                  ▲
                └──────► Word export (.docx)
                                  │
                           Browser DOCX preview

   --format docx also creates Word output
   during the research run
```

Search-result text is treated as untrusted evidence, not as instructions. The agent sends the search snippets to OpenAI with the research question, then normalizes the model response before creating the report.
The viewer reads saved JSON and same-stem DOCX files from your report directory. Its file chooser reads other local DOCX files in your browser. Previewing does not send a document or API keys to a hosting service.

## Design Documentation

- [System design](docs/SYSTEM_DESIGN.md) describes the CLI's scope, external services, data flow, outputs, and failure behavior.
- [Architecture design](docs/ARCHITECTURE.md) maps those behaviors to the current TypeScript implementation and report data model.

## Report Contents

Every report includes:

- Report metadata and confidence rating
- Source-count validation
- Executive summary
- Key findings and recommendations
- Risks and opportunities
- Deduplicated source links
- Generated search queries
- Search results and snippets

The `.docx` rendering includes these contents in a Word layout with clear headings, lists, source hyperlinks, report metadata, validation notes, and page numbers. It is generated from the same report data as the JSON and Markdown files.

The local viewer places the summary and action sections first, keeps source evidence close at hand, and lets you download the original JSON and Markdown files. When a matching DOCX exists, it also offers **View Word document** and **Download DOCX**. The **Open a DOCX file** link leads to a file chooser that previews a local Word file even without a matching report. The viewer displays validation warnings when the evidence is thin.
Its charts make the report's evidence coverage easier to assess without adding unverified numbers to the research conclusions.

Files use the research type, an ISO timestamp, and a unique ID so consecutive runs do not overwrite one another:

```text
reports/
├── competitor-2026-07-22T14-30-00-000Z-550e8400-e29b-41d4-a716-446655440000.json
├── competitor-2026-07-22T14-30-00-000Z-550e8400-e29b-41d4-a716-446655440000.md
└── competitor-2026-07-22T14-30-00-000Z-550e8400-e29b-41d4-a716-446655440000.docx  # With --format docx or default export
```

## Local Development

To work from source, clone this repository and run the CLI from its directory:

```bash
npm install
cp .env.example .env
```

On Windows Command Prompt, use `copy .env.example .env`. Add your API keys to `.env`, then run:

```bash
npm run research -- competitor "meal planning apps"
```

`npm install` in a checkout installs its dependencies but does not add `market-research-agent` to your shell's command path. For a bare command from this checkout, run `npm run build` and then `npm install --global .` in the repository directory. If you use nvm, select the same Node.js version in later terminal sessions so the global command stays available.

## Project Structure

```text
market-research-agent/
├── docs/
│   ├── SYSTEM_DESIGN.md  # System boundary, data flow, and operating behavior
│   └── ARCHITECTURE.md   # Components, interactions, and data contracts
├── src/
│   ├── index.ts             # CLI, search, analysis, validation, and report generation
│   ├── docx.ts              # Styled Word document rendering
│   ├── export.ts            # Convert saved JSON reports to Word documents
│   ├── docx-preview-page.ts # Local browser page and script for viewing Word files
│   ├── report-insights.ts   # Chart data and factual evidence observations
│   ├── viewer.ts            # Local report viewer server and saved-report API
│   └── viewer-page.ts       # Browser report layout and interactions
├── tests/
│   ├── cli.test.ts          # Node test suite for the CLI's core behavior
│   ├── report-insights.test.ts # Evidence chart calculations
│   └── viewer.test.ts       # Tests for the local report viewer
├── .env.example          # Safe API-key template
├── .gitignore            # Excludes secrets, builds, and generated reports
├── AGENTS.md             # Project development guidelines
├── LICENSE               # MIT license
├── package.json          # Package metadata, commands, and dependencies
├── tsconfig.json         # Type-checking configuration
├── tsconfig.build.json   # Production build configuration
└── README.md             # Project documentation
```

Generated `dist/` and `reports/` directories are intentionally excluded from source control.

## Tech Stack

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI_SDK-000000?style=flat&logo=openai&logoColor=white)](https://github.com/openai/openai-node)
[![Tavily](https://img.shields.io/badge/Tavily_API-4F46E5?style=flat)](https://docs.tavily.com/)

- **Runtime:** Node.js 22 or newer
- **Language:** TypeScript with strict type checking
- **Web search:** Tavily Search API
- **Analysis:** OpenAI SDK; `gpt-4o-mini` by default, configurable with `OPENAI_MODEL`
- **Testing:** Built-in Node.js test runner
- **Storage:** Local Markdown and JSON files, plus optional Word documents—no database required
- **Viewer:** Local Node.js server and browser page; `docx-preview` renders saved Word files in the browser without hosting

## Development

Run the complete local check:

```bash
npm run typecheck
npm test
npm run build
```

Preview the files that would be included in an npm package:

```bash
npm pack --dry-run
```

## Data and API Disclaimer

This is a local, open-source command-line tool, not a hosted service.

1. **Your reports stay local.** Generated Markdown, JSON, and optional Word files are written to your chosen output directory. Export reads a saved JSON file and writes a local `.docx` file. The viewer serves matching DOCX files only to your local browser; the file chooser reads other DOCX files in that browser without uploading them to the viewer or a remote service.
2. **Research queries leave your machine.** The CLI sends generated queries to Tavily and sends the returned search snippets to OpenAI for analysis. Review both providers' privacy and retention policies before researching sensitive topics.
3. **AI output can be wrong.** Models may misread evidence, omit context, or produce unsupported conclusions. Validate decision-critical claims with primary sources.
4. **You are responsible for usage.** Follow applicable laws, website terms, and API-provider terms when using the tool.

## License

Released under the [MIT License](LICENSE).
