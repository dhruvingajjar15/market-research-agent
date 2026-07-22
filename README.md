<div align="center">

# Market Research Agent

**Turn any market question into a sourced research report from your terminal.**

Five targeted searches. One structured analysis. Markdown and JSON you own.

[![Node.js 18+](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
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
| **Local reports** | Writes a readable Markdown report and the complete structured data as JSON. |
| **Flexible CLI** | Supports positional arguments, named flags, short flags, and a custom output directory. |

## Quick Start

### 1. Install

```bash
npm install
cp .env.example .env
```

On Windows Command Prompt, use `copy .env.example .env` for the second command.

### 2. Add API keys

Open `.env` and replace the example values:

```dotenv
OPENAI_API_KEY=your-openai-api-key
TAVILY_API_KEY=your-tavily-api-key

# Optional: use another OpenAI model available to your account.
# OPENAI_MODEL=gpt-4o-mini
```

You need [OpenAI](https://platform.openai.com/api-keys) and [Tavily](https://app.tavily.com/) API keys. Requests may incur charges from those providers.

### 3. Run your first report

```bash
npm run research -- competitor "meal planning apps for busy families"
```

The finished `.md` and `.json` files will appear in `reports/`.

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

Use positional arguments:

```bash
market-research-agent <research-type> "<research-question>"
```

When working from this repository, run the same command through npm:

```bash
npm run research -- trend "electric bike adoption"
```

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

See every option:

```bash
market-research-agent --help
# or
npm run research -- --help
```

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
          ┌───┴───┐
          ▼       ▼
      Markdown   JSON
```

Search-result text is treated as untrusted evidence, not as instructions. The agent sends the search snippets to OpenAI with the research question, then normalizes the model response before creating the report.

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

Files use the research type and an ISO timestamp so consecutive runs do not overwrite one another:

```text
reports/
├── competitor-2026-07-22T14-30-00-000Z.json
└── competitor-2026-07-22T14-30-00-000Z.md
```

## Install as a Global CLI

The package exposes both `market-research-agent` and the shorter `market-research` command. After the repository is published on GitHub, install it directly by replacing `YOUR_USERNAME` below:

```bash
npm install --global github:YOUR_USERNAME/market-research-agent
market-research-agent --help
market-research trend "home fitness subscriptions"
```

Create a `.env` file in the directory where you run the CLI, or export `OPENAI_API_KEY` and `TAVILY_API_KEY` in your shell. Reports are saved relative to that working directory.

The project also works with npm-compatible package managers:

```bash
pnpm install
pnpm research competitor "meal planning apps"

yarn install
yarn research competitor "meal planning apps"

bun install
bun run research -- competitor "meal planning apps"
```

## Project Structure

```text
market-research-agent/
├── src/
│   └── index.ts          # CLI, search, analysis, validation, and report generation
├── tests/
│   └── cli.test.ts       # Node test suite for the CLI's core behavior
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

- **Runtime:** Node.js 18 or newer
- **Language:** TypeScript with strict type checking
- **Web search:** Tavily Search API
- **Analysis:** OpenAI SDK; `gpt-4o-mini` by default, configurable with `OPENAI_MODEL`
- **Testing:** Built-in Node.js test runner
- **Storage:** Local Markdown and JSON files—no database required

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

1. **Your reports stay local.** Generated Markdown and JSON files are written to your chosen output directory.
2. **Research queries leave your machine.** The CLI sends generated queries to Tavily and sends the returned search snippets to OpenAI for analysis. Review both providers' privacy and retention policies before researching sensitive topics.
3. **AI output can be wrong.** Models may misread evidence, omit context, or produce unsupported conclusions. Validate decision-critical claims with primary sources.
4. **You are responsible for usage.** Follow applicable laws, website terms, and API-provider terms when using the tool.

## License

Released under the [MIT License](LICENSE).
