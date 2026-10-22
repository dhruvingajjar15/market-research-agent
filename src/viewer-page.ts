/** The self-contained, read-only browser page for saved research reports. */
export function renderViewerPage(): string {
  return String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Research reports | Market Research Agent</title>
  <style>
    :root {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #17253a;
      background: #f4f6f9;
      font-synthesis: none;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }
    * { box-sizing: border-box; }
    body { margin: 0; }
    button, input { font: inherit; }
    button { cursor: pointer; }
    a { color: #155aa8; }
    a:hover { color: #0d447e; }
    :focus-visible { outline: 3px solid #77b6ff; outline-offset: 3px; }
    [hidden] { display: none !important; }
    .skip-link {
      position: absolute; z-index: 10; left: 1rem; top: -5rem;
      padding: .7rem 1rem; border-radius: .5rem; background: white; color: #173a67;
    }
    .skip-link:focus { top: 1rem; }
    .app-shell { min-height: 100vh; display: grid; grid-template-columns: minmax(290px, 340px) minmax(0, 1fr); }
    .sidebar {
      position: sticky; top: 0; height: 100vh; overflow-y: auto;
      padding: 2rem 1.25rem 1.5rem; color: #eaf1fc; background: #14253e;
      border-right: 1px solid #2b4160;
    }
    .brand { display: flex; align-items: center; gap: .8rem; margin-bottom: 2.25rem; }
    .brand-mark {
      width: 2.35rem; height: 2.35rem; display: grid; place-items: center; flex: 0 0 auto;
      border-radius: .72rem; background: #6db3ff; color: #102541; font-weight: 850; letter-spacing: -.12em;
      box-shadow: 0 5px 20px #07142260;
    }
    .brand-name { font-size: .98rem; font-weight: 750; letter-spacing: -.01em; }
    .brand-subtitle { margin-top: .16rem; color: #a6b8d1; font-size: .77rem; }
    .sidebar-heading-row { display: flex; align-items: baseline; justify-content: space-between; gap: .75rem; }
    .sidebar h2 { margin: 0 0 .8rem; font-size: 1rem; letter-spacing: -.01em; }
    .report-count { color: #afc1da; font-size: .77rem; white-space: nowrap; }
    .search-label { display: block; margin: .65rem 0 .45rem; color: #c5d3e5; font-size: .78rem; font-weight: 650; }
    .search-input {
      width: 100%; min-height: 2.65rem; padding: .65rem .8rem;
      border: 1px solid #45607f; border-radius: .65rem; color: #f8fbff; background: #203650;
    }
    .search-input::placeholder { color: #a9bed4; }
    .search-input:focus { border-color: #79baff; outline: 2px solid #79baff; outline-offset: 1px; }
    .sidebar-status { min-height: 1.35rem; margin: .6rem 0 .35rem; color: #b9c9dd; font-size: .75rem; }
    .sidebar-status.error { color: #ffd2c8; }
    .report-list { display: grid; gap: .55rem; }
    .report-item {
      width: 100%; padding: .9rem .95rem; border: 1px solid #344d6a; border-radius: .8rem;
      text-align: left; color: #e9f1fc; background: #1a304c;
      transition: background .15s, border-color .15s, transform .15s;
    }
    .report-item:hover { background: #274465; border-color: #668cb5; transform: translateY(-1px); }
    .report-item[aria-current="true"] { background: #e8f2ff; color: #122b4a; border-color: #a8d2ff; box-shadow: 0 4px 14px #07142245; }
    .report-item-type { display: block; margin-bottom: .35rem; font-size: .7rem; font-weight: 750; letter-spacing: .085em; text-transform: uppercase; color: #9ecafa; }
    .report-item[aria-current="true"] .report-item-type { color: #225d9a; }
    .report-item-question { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 3; font-size: .9rem; font-weight: 650; line-height: 1.4; overflow-wrap: anywhere; }
    .report-item-date { display: block; margin-top: .55rem; font-size: .73rem; color: #b2c6df; }
    .report-item[aria-current="true"] .report-item-date { color: #526c87; }
    .sidebar-empty { padding: 1rem .2rem; color: #b8c9dd; font-size: .86rem; line-height: 1.55; }
    .sidebar-foot { margin-top: 1.8rem; padding-top: 1rem; border-top: 1px solid #39516b; color: #a9bbd1; font-size: .76rem; line-height: 1.5; }
    .main { min-width: 0; padding: 0 clamp(1.25rem, 4vw, 4rem) 5rem; }
    .topbar { min-height: 5.4rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; max-width: 1100px; margin: 0 auto; border-bottom: 1px solid #dde4ec; }
    .topbar-title { color: #61738a; font-size: .82rem; font-weight: 750; letter-spacing: .095em; text-transform: uppercase; }
    .topbar-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: .75rem; }
    .topbar-link { color: #20598f; font-size: .82rem; font-weight: 750; text-decoration: none; }
    .topbar-link:hover { text-decoration: underline; }
    .live-indicator { display: flex; align-items: center; gap: .45rem; color: #64768d; font-size: .76rem; white-space: nowrap; }
    .live-indicator::before { content: ""; width: .45rem; height: .45rem; border-radius: 50%; background: #32a277; }
    .notice { max-width: 1100px; margin: 1rem auto 0; padding: .78rem 1rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: #e7f2ff; border: 1px solid #c2dcf8; border-radius: .75rem; color: #214a79; font-size: .85rem; }
    .notice button { padding: .43rem .7rem; border: 1px solid #90bce8; border-radius: .45rem; background: white; color: #14528d; font-weight: 700; white-space: nowrap; }
    .report-view { max-width: 1100px; margin: 0 auto; }
    .report { padding-top: 2.5rem; }
    .eyebrow { margin: 0 0 .75rem; color: #356fae; font-size: .75rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
    h1 { max-width: 900px; margin: 0; font-size: clamp(2rem, 3.6vw, 3.4rem); line-height: 1.14; letter-spacing: -.045em; overflow-wrap: anywhere; }
    .report-intro { max-width: 720px; margin: .85rem 0 0; color: #61738a; font-size: 1.02rem; line-height: 1.6; }
    .meta-row { display: flex; flex-wrap: wrap; align-items: center; gap: .55rem; margin-top: 1.5rem; }
    .meta-chip { display: inline-flex; align-items: center; gap: .35rem; padding: .45rem .7rem; border: 1px solid #d9e2ec; border-radius: 99px; background: #fff; color: #3d516a; font-size: .78rem; font-weight: 600; }
    .confidence-high { color: #126b4c; background: #eaf8ef; border-color: #c3ebd2; }
    .confidence-medium { color: #805914; background: #fff7de; border-color: #f2dfaa; }
    .confidence-low { color: #9a4338; background: #fff0ed; border-color: #f6c9c2; }
    .report-actions { display: flex; flex-wrap: wrap; gap: .65rem; margin: 1.6rem 0 0; }
    .action-link { display: inline-flex; align-items: center; justify-content: center; min-height: 2.55rem; padding: .55rem .9rem; border: 1px solid #bdd0e5; border-radius: .58rem; color: #20598f; background: white; text-decoration: none; font-size: .83rem; font-weight: 750; }
    .action-link:hover { background: #eef6ff; text-decoration: none; }
    .action-link.primary { background: #215d9f; color: white; border-color: #215d9f; }
    .action-link.primary:hover { background: #164d88; color: white; }
    .jump-links { display: flex; flex-wrap: wrap; align-items: center; gap: .45rem 1rem; margin: 1.7rem 0 2.1rem; padding: .8rem 0; border-top: 1px solid #dce4ed; border-bottom: 1px solid #dce4ed; font-size: .8rem; }
    .jump-links strong { margin-right: .2rem; color: #60738a; }
    .jump-links a { font-weight: 650; text-decoration: none; }
    .jump-links a:hover { text-decoration: underline; }
    .content-section { margin-top: 2.35rem; scroll-margin-top: 1.5rem; }
    .content-section h2 { margin: 0 0 1.15rem; font-size: 1.35rem; line-height: 1.3; letter-spacing: -.025em; }
    .section-note { margin: -.7rem 0 1.2rem; color: #64768a; font-size: .86rem; line-height: 1.55; }
    .summary-card { padding: clamp(1.2rem, 2.5vw, 2rem); background: white; border: 1px solid #dce4ed; border-left: 4px solid #4589cd; border-radius: .85rem; box-shadow: 0 6px 24px #1a355308; }
    .summary-card p { margin: 0; font-size: 1.04rem; line-height: 1.8; white-space: pre-wrap; overflow-wrap: anywhere; }
    .coverage-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .8rem; margin-bottom: 1rem; }
    .coverage-stat { min-width: 0; padding: 1rem 1.15rem; border: 1px solid #dce4ed; border-radius: .75rem; background: white; }
    .coverage-stat strong { display: block; color: #183f6d; font-size: clamp(1.45rem, 2.2vw, 2rem); line-height: 1.2; font-variant-numeric: tabular-nums; }
    .coverage-stat span { display: block; margin-top: .25rem; color: #556b82; font-size: .82rem; line-height: 1.4; }
    .coverage-charts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .9rem; }
    .coverage-chart { min-width: 0; margin: 0; padding: 1.2rem; border: 1px solid #dce4ed; border-radius: .8rem; background: white; }
    .coverage-chart h3 { margin: 0; color: #1d3959; font-size: 1rem; line-height: 1.35; }
    .coverage-chart p { margin: .45rem 0 0; color: #60748a; font-size: .79rem; line-height: 1.5; }
    .chart-legend { display: flex; flex-wrap: wrap; gap: .45rem 1rem; margin: .85rem 0 1.1rem; color: #3f556d; font-size: .75rem; }
    .chart-legend span { display: inline-flex; align-items: center; gap: .4rem; }
    .chart-key { width: .8rem; height: .8rem; flex: 0 0 auto; border-radius: .15rem; background: #3277b8; }
    .chart-key.repeated { background: repeating-linear-gradient(135deg, #667c91 0, #667c91 3px, #c3d0dc 3px, #c3d0dc 6px); }
    .chart-key.domain { background: #218879; }
    .chart-list { display: grid; gap: 1rem; margin: 1rem 0 0; padding: 0; list-style: none; }
    .chart-row { min-width: 0; }
    .chart-row-heading { display: flex; justify-content: space-between; align-items: baseline; gap: .5rem; line-height: 1.4; }
    .chart-row-heading strong { min-width: 0; color: #233d59; font-size: .82rem; font-weight: 680; overflow-wrap: anywhere; }
    .chart-row-heading span { flex: 0 0 auto; color: #345574; font-size: .78rem; font-weight: 750; font-variant-numeric: tabular-nums; }
    .chart-track { display: flex; width: 100%; height: .95rem; margin-top: .35rem; overflow: hidden; border: 1px solid #d3dde7; border-radius: .25rem; background: #eef2f6; }
    .chart-segment { display: block; height: 100%; min-width: 0; }
    .chart-segment.first { background: #3277b8; }
    .chart-segment.repeated { background: repeating-linear-gradient(135deg, #667c91 0, #667c91 3px, #c3d0dc 3px, #c3d0dc 6px); }
    .chart-segment.domain { background: #218879; }
    .chart-row-detail { margin-top: .2rem; color: #66798d; font-size: .72rem; line-height: 1.45; font-variant-numeric: tabular-nums; }
    .chart-axis { display: flex; justify-content: space-between; gap: 1rem; margin-top: .8rem; padding-top: .5rem; border-top: 1px solid #e5ebf1; color: #6a7c90; font-size: .7rem; font-variant-numeric: tabular-nums; }
    .coverage-observations { margin-top: .9rem; padding: 1.1rem 1.2rem; border: 1px solid #cbdedb; border-radius: .75rem; background: #f4faf8; }
    .coverage-observations h3 { margin: 0 0 .55rem; color: #205c54; font-size: .95rem; }
    .coverage-observations ul { margin: 0; padding-left: 1.25rem; }
    .coverage-observations li { margin: .3rem 0; color: #36594f; font-size: .85rem; line-height: 1.55; overflow-wrap: anywhere; }
    .item-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .85rem; margin: 0; padding: 0; list-style: none; }
    .item-grid li { min-width: 0; padding: 1.1rem 1.2rem; background: #fff; border: 1px solid #dce4ed; border-radius: .75rem; box-shadow: 0 4px 16px #1a355306; }
    .item-grid p { margin: 0; line-height: 1.65; white-space: pre-wrap; overflow-wrap: anywhere; }
    .item-grid .item-number { display: block; margin-bottom: .55rem; color: #3372b2; font-size: .74rem; font-weight: 850; letter-spacing: .08em; }
    .compact-list { display: grid; gap: .7rem; margin: 0; padding: 0; list-style: none; }
    .compact-list li { padding: 1rem 1.1rem; border: 1px solid #dce4ed; border-radius: .68rem; background: white; line-height: 1.65; white-space: pre-wrap; overflow-wrap: anywhere; }
    .dual-sections { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.2rem; }
    .dual-sections .content-section { min-width: 0; }
    .warning-box { margin: 2rem 0 0; padding: 1.15rem 1.25rem; border: 1px solid #edd7a8; border-radius: .75rem; background: #fff9e9; color: #674d1b; }
    .warning-box h2 { margin: 0 0 .65rem; font-size: 1rem; }
    .warning-box ul { margin: 0; padding-left: 1.2rem; }
    .warning-box li { margin-top: .3rem; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; }
    .evidence-section { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #dce4ed; }
    .source-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .85rem; }
    .source-card { min-width: 0; padding: 1.05rem 1.15rem; border: 1px solid #dce4ed; border-radius: .75rem; background: white; }
    .source-card h3 { margin: 0; font-size: .98rem; line-height: 1.45; overflow-wrap: anywhere; }
    .source-card h3 a { text-decoration-thickness: 1px; text-underline-offset: 3px; }
    .source-host { margin: .3rem 0 0; color: #67798c; font-size: .77rem; overflow-wrap: anywhere; }
    .source-context { margin-top: .75rem; padding-top: .65rem; border-top: 1px solid #e8edf2; }
    .source-context summary { width: fit-content; color: #245f9d; font-size: .79rem; font-weight: 700; cursor: pointer; }
    .source-context summary:hover { text-decoration: underline; }
    .source-snippet { margin: .7rem 0 0; color: #42556c; font-size: .86rem; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
    .source-queries { margin: .7rem 0 0; color: #61748b; font-size: .76rem; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }
    .query-list { margin: 0; padding-left: 1.45rem; color: #3e5269; }
    .query-list li { margin: .45rem 0; line-height: 1.6; overflow-wrap: anywhere; }
    .search-result-group { margin-top: .75rem; border: 1px solid #dce4ed; border-radius: .7rem; background: white; overflow: hidden; }
    .search-result-group summary { padding: 1rem 1.15rem; color: #183d67; font-weight: 700; line-height: 1.45; cursor: pointer; overflow-wrap: anywhere; }
    .search-result-group summary:hover { background: #f4f8fc; }
    .search-result-group[open] summary { border-bottom: 1px solid #e5ebf1; }
    .search-result-list { margin: 0; padding: .3rem 1.15rem .6rem; list-style: none; }
    .search-result-list li { padding: .75rem 0; border-bottom: 1px solid #edf1f5; }
    .search-result-list li:last-child { border-bottom: 0; }
    .search-result-list a, .search-result-list strong { font-size: .9rem; overflow-wrap: anywhere; }
    .search-result-list p { margin: .3rem 0 0; color: #53687e; font-size: .82rem; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; }
    .muted { color: #65778a; line-height: 1.6; }
    .state-card { max-width: 710px; margin: clamp(3rem, 9vh, 6rem) auto; padding: clamp(1.5rem, 4vw, 2.5rem); border: 1px solid #dce4ed; border-radius: 1rem; background: white; box-shadow: 0 12px 35px #1a35530b; }
    .state-card h1 { font-size: clamp(1.5rem, 3vw, 2.2rem); }
    .state-card p { color: #556a81; line-height: 1.7; }
    .state-card code { display: block; width: fit-content; max-width: 100%; margin-top: 1rem; padding: .75rem .9rem; border-radius: .5rem; background: #f1f5f9; color: #273d56; white-space: pre-wrap; overflow-wrap: anywhere; }
    .retry-button { margin-top: .45rem; padding: .68rem .95rem; border: 0; border-radius: .5rem; background: #215d9f; color: white; font-weight: 700; }
    @media (max-width: 1050px) {
      .item-grid, .source-grid, .coverage-charts { grid-template-columns: 1fr; }
    }
    @media (max-width: 760px) {
      .app-shell { display: block; }
      .sidebar { position: static; height: auto; padding: 1.2rem; }
      .brand { margin-bottom: 1.3rem; }
      .report-list { max-height: 15rem; overflow-y: auto; }
      .sidebar-foot { display: none; }
      .main { padding: 0 1.2rem 3rem; }
      .topbar { min-height: 4.2rem; }
      .report { padding-top: 1.8rem; }
      .dual-sections { grid-template-columns: 1fr; gap: 0; }
      .notice { align-items: flex-start; }
      .coverage-stats { grid-template-columns: 1fr; gap: .5rem; }
      .coverage-stat { display: flex; align-items: baseline; gap: .75rem; padding: .75rem 1rem; }
      .coverage-stat span { margin-top: 0; }
    }
    @media print {
      :root { background: white; }
      .app-shell { display: block; }
      .sidebar, .topbar, .notice, .report-actions, .jump-links, .skip-link { display: none !important; }
      .main { padding: 0; }
      .report { padding-top: 0; }
      .content-section, .source-card, .item-grid li, .coverage-chart, .coverage-observations { break-inside: avoid; }
      .summary-card, .item-grid li, .source-card, .compact-list li { box-shadow: none; }
      .chart-segment, .chart-key { print-color-adjust: exact; }
      .source-context summary { display: none; }
      .search-result-group:not([open]) .search-result-list { display: block; }
    }
  </style>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to report</a>
  <div class="app-shell">
    <aside class="sidebar" aria-label="Saved reports">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">M</div>
        <div><div class="brand-name">Market Research Agent</div><div class="brand-subtitle">Saved research reports</div></div>
      </div>
      <div class="sidebar-heading-row"><h2>Reports</h2><span class="report-count" id="report-count"></span></div>
      <label class="search-label" for="report-search">Find a report</label>
      <input class="search-input" id="report-search" type="search" placeholder="Search questions or topics" autocomplete="off">
      <div class="sidebar-status" id="sidebar-status" role="status" aria-live="polite"></div>
      <nav class="report-list" id="report-list" aria-label="Choose a report"></nav>
      <p class="sidebar-foot">This page shows reports saved by the CLI. The list refreshes automatically while it is open.</p>
    </aside>
    <main class="main" id="main-content" tabindex="-1">
      <div class="topbar"><span class="topbar-title">Research library</span><div class="topbar-actions"><a class="topbar-link" href="/docx">Open a DOCX file</a><span class="live-indicator">Auto refresh on</span></div></div>
      <div class="notice" id="latest-notice" hidden></div>
      <div class="report-view" id="report-view" aria-live="polite" aria-busy="true"></div>
    </main>
  </div>
  <script>
    (() => {
      "use strict";
      const listElement = document.getElementById("report-list");
      const countElement = document.getElementById("report-count");
      const searchElement = document.getElementById("report-search");
      const statusElement = document.getElementById("sidebar-status");
      const viewElement = document.getElementById("report-view");
      const noticeElement = document.getElementById("latest-notice");
      const reportCache = new Map();
      let reports = [];
      let selectedId = null;
      let manualSelection = false;
      let requestSequence = 0;
      let refreshing = false;

      function node(tag, className, content) {
        const item = document.createElement(tag);
        if (className) item.className = className;
        if (content !== undefined && content !== null) item.textContent = String(content);
        return item;
      }

      function text(value, fallback) {
        return typeof value === "string" && value.trim() ? value.trim() : fallback;
      }

      function items(value) {
        return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()) : [];
      }

      function objects(value) {
        return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];
      }

      function nonNegativeCount(value) {
        return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;
      }

      function countLabel(value) {
        return new Intl.NumberFormat().format(value);
      }

      function linkCountLabel(value) {
        return countLabel(value) + (value === 1 ? " link" : " links");
      }

      function readableType(value) {
        const names = {
          competitor: "Competitor research",
          customer_pain: "Customer pain",
          monetization: "Monetization",
          trend: "Market trends",
          mvp: "MVP research",
          investor_risk: "Investor risk"
        };
        return names[value] || text(value, "Research report").replaceAll("_", " ");
      }

      function formattedDate(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "Date unavailable";
        return new Intl.DateTimeFormat(undefined, {
          year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit"
        }).format(date);
      }

      function safeUrl(value) {
        if (typeof value !== "string") return null;
        try {
          const url = new URL(value);
          return url.protocol === "https:" || url.protocol === "http:" ? url : null;
        } catch {
          return null;
        }
      }

      function linkedTitle(title, url) {
        const safe = safeUrl(url);
        if (!safe) return node("strong", "", text(title, "Untitled source"));
        const link = node("a", "", text(title, safe.hostname));
        link.href = safe.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        return link;
      }

      function urlId() {
        return new URL(location.href).searchParams.get("report");
      }

      function setUrl(id, push) {
        const next = new URL(location.href);
        next.searchParams.set("report", id);
        next.hash = "";
        if (next.href === location.href) return;
        history[push ? "pushState" : "replaceState"](null, "", next);
      }

      function stateCard(title, description, command, retry) {
        const card = node("div", "state-card");
        card.append(node("h1", "", title), node("p", "", description));
        if (command) card.append(node("code", "", command));
        if (retry) {
          const button = node("button", "retry-button", "Try again");
          button.type = "button";
          button.addEventListener("click", typeof retry === "function" ? retry : () => refreshReports(true));
          card.append(button);
        }
        viewElement.replaceChildren(card);
        viewElement.setAttribute("aria-busy", "false");
      }

      function renderList() {
        countElement.textContent = String(reports.length) + (reports.length === 1 ? " report" : " reports");
        const search = searchElement.value.trim().toLowerCase();
        const matching = reports.filter((report) =>
          [report.researchQuestion, readableType(report.researchType), report.id]
            .some((part) => String(part || "").toLowerCase().includes(search))
        );
        const fragment = document.createDocumentFragment();
        if (!matching.length) {
          fragment.append(node("p", "sidebar-empty", reports.length ? "No reports match this search." : "No saved reports yet."));
        }
        for (const report of matching) {
          const button = node("button", "report-item");
          button.type = "button";
          button.setAttribute("aria-current", String(report.id === selectedId));
          button.setAttribute("aria-label", "Open " + text(report.researchQuestion, "Untitled research report"));
          button.append(
            node("span", "report-item-type", readableType(report.researchType)),
            node("span", "report-item-question", text(report.researchQuestion, "Untitled research report")),
            node("span", "report-item-date", formattedDate(report.generatedAt))
          );
          button.addEventListener("click", () => selectReport(report.id, true, true));
          fragment.append(button);
        }
        listElement.replaceChildren(fragment);
      }

      function updateNotice() {
        noticeElement.replaceChildren();
        const latest = reports[0];
        if (!latest || !selectedId || latest.id === selectedId) {
          noticeElement.hidden = true;
          return;
        }
        noticeElement.hidden = false;
        noticeElement.append(node("span", "", "A newer report is available."));
        const button = node("button", "", "View latest");
        button.type = "button";
        button.addEventListener("click", () => selectReport(latest.id, true, true));
        noticeElement.append(button);
      }

      function addMeta(parent, content, className) {
        parent.append(node("span", "meta-chip" + (className ? " " + className : ""), content));
      }

      function addJumpLinks(parent) {
        const links = node("nav", "jump-links");
        links.setAttribute("aria-label", "Report sections");
        links.append(node("strong", "", "Jump to"));
        for (const [label, id] of [["Summary", "summary"], ["Evidence analysis", "coverage"], ["Findings", "findings"], ["Recommendations", "recommendations"], ["Sources", "evidence"]]) {
          const link = node("a", "", label);
          link.href = "#" + id;
          links.append(link);
        }
        parent.append(links);
      }

      function section(parent, id, title, note) {
        const element = node("section", "content-section");
        element.id = id;
        element.append(node("h2", "", title));
        if (note) element.append(node("p", "section-note", note));
        parent.append(element);
        return element;
      }

      function renderItems(parent, values, numbered) {
        if (!values.length) {
          parent.append(node("p", "muted", "No items were included in this section."));
          return;
        }
        const list = node(numbered ? "ol" : "ul", numbered ? "item-grid" : "compact-list");
        values.forEach((value, index) => {
          const item = node("li");
          if (numbered) item.append(node("span", "item-number", "INSIGHT " + String(index + 1).padStart(2, "0")));
          item.append(node("p", "", value));
          list.append(item);
        });
        parent.append(list);
      }

      function chartAxis(parent, maximum) {
        const axis = node("div", "chart-axis");
        axis.setAttribute("aria-label", "Source link count scale");
        axis.append(node("span", "", "0"));
        if (maximum > 1) axis.append(node("span", "", countLabel(Math.round(maximum / 2))));
        axis.append(node("span", "", countLabel(maximum)));
        parent.append(axis);
      }

      function chartSegment(track, value, maximum, className) {
        const segment = node("span", "chart-segment " + className);
        segment.style.width = maximum ? String(Math.min(100, value / maximum * 100)) + "%" : "0%";
        track.append(segment);
      }

      function renderCoverageInsights(parent, value) {
        const coverage = section(parent, "coverage", "Evidence analysis", "These charts describe how the report's saved source links are distributed across search queries and websites.");
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          coverage.append(node("p", "muted", "Source coverage data are unavailable for this report."));
          return;
        }

        const stats = node("div", "coverage-stats");
        for (const [number, label] of [
          [nonNegativeCount(value.sourceCount), "Saved source links"],
          [nonNegativeCount(value.domainCount), "Websites represented"],
          [nonNegativeCount(value.multiQuerySourceCount), "Sources found by multiple queries"]
        ]) {
          const stat = node("div", "coverage-stat");
          stat.append(node("strong", "", countLabel(number)), node("span", "", label));
          stats.append(stat);
        }
        coverage.append(stats);

        const charts = node("div", "coverage-charts");
        const queryChart = node("section", "coverage-chart");
        queryChart.append(node("h3", "", "Source appearances by search query"));
        queryChart.append(node("p", "", "Each link is first seen in one query; appearances in later queries are repeated."));
        const queryRows = objects(value.queryCoverage).map((entry) => {
          const firstSeen = nonNegativeCount(entry.firstSeen);
          const repeated = nonNegativeCount(entry.repeated);
          return { label: text(entry.query, "Untitled query"), firstSeen, repeated, total: firstSeen + repeated };
        });
        const queryMaximum = queryRows.reduce((largest, row) => Math.max(largest, row.total), 0);
        if (queryMaximum) {
          const legend = node("div", "chart-legend");
          for (const [className, label] of [["first", "First seen"], ["repeated", "Seen earlier"]]) {
            const key = node("span");
            key.append(node("i", "chart-key " + className), node("span", "", label));
            legend.append(key);
          }
          queryChart.append(legend);
          const list = node("ul", "chart-list");
          queryRows.forEach((row) => {
            const item = node("li", "chart-row");
            const heading = node("div", "chart-row-heading");
            heading.append(node("strong", "", row.label), node("span", "", linkCountLabel(row.total)));
            const track = node("div", "chart-track");
            track.setAttribute("aria-hidden", "true");
            chartSegment(track, row.firstSeen, queryMaximum, "first");
            chartSegment(track, row.repeated, queryMaximum, "repeated");
            item.append(heading, track, node("div", "chart-row-detail", countLabel(row.firstSeen) + " first seen · " + countLabel(row.repeated) + " seen earlier"));
            list.append(item);
          });
          queryChart.append(list);
          chartAxis(queryChart, queryMaximum);
        } else {
          queryChart.append(node("p", "muted", "No source links were recorded across the search queries."));
        }
        charts.append(queryChart);

        const domainChart = node("section", "coverage-chart");
        domainChart.append(node("h3", "", "Saved sources by website"));
        domainChart.append(node("p", "", "Unique saved source links for each website."));
        const domainRows = objects(value.domainCoverage)
          .map((entry) => ({ label: text(entry.domain, "Unknown website"), count: nonNegativeCount(entry.count) }))
          .filter((entry) => entry.count > 0)
          .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
        const visibleDomains = domainRows.slice(0, 7);
        if (domainRows.length > 7) {
          visibleDomains.push({
            label: "Other source groups (" + countLabel(domainRows.length - 7) + ")",
            count: domainRows.slice(7).reduce((sum, row) => sum + row.count, 0)
          });
        }
        const domainMaximum = visibleDomains.reduce((largest, row) => Math.max(largest, row.count), 0);
        if (domainMaximum) {
          const legend = node("div", "chart-legend");
          const key = node("span");
          key.append(node("i", "chart-key domain"), node("span", "", "Saved source links"));
          legend.append(key);
          domainChart.append(legend);
          const list = node("ul", "chart-list");
          visibleDomains.forEach((row) => {
            const item = node("li", "chart-row");
            const heading = node("div", "chart-row-heading");
            heading.append(node("strong", "", row.label), node("span", "", linkCountLabel(row.count)));
            const track = node("div", "chart-track");
            track.setAttribute("aria-hidden", "true");
            chartSegment(track, row.count, domainMaximum, "domain");
            item.append(heading, track);
            list.append(item);
          });
          domainChart.append(list);
          chartAxis(domainChart, domainMaximum);
        } else {
          domainChart.append(node("p", "muted", "No website counts were recorded for the saved sources."));
        }
        charts.append(domainChart);
        coverage.append(charts);

        const observations = items(value.observations);
        if (observations.length) {
          const note = node("aside", "coverage-observations");
          note.append(node("h3", "", "What the source coverage shows"));
          const list = node("ul");
          observations.forEach((observation) => list.append(node("li", "", observation)));
          note.append(list);
          coverage.append(note);
        }
      }

      function renderSources(parent, sources) {
        const sourceSection = section(parent, "sources", "Sources used", "Links open the original pages in a new tab.");
        if (!sources.length) {
          sourceSection.append(node("p", "muted", "No sources were recorded for this report."));
          return;
        }
        const grid = node("div", "source-grid");
        sources.forEach((source) => {
          const card = node("article", "source-card");
          const heading = node("h3");
          heading.append(linkedTitle(source.title, source.url));
          card.append(heading);
          const url = safeUrl(source.url);
          if (url) card.append(node("p", "source-host", url.hostname));
          const queries = items(source.queries);
          if (text(source.snippet, "") || queries.length) {
            const context = node("details", "source-context");
            context.append(node("summary", "", "Read source context"));
            if (text(source.snippet, "")) context.append(node("p", "source-snippet", source.snippet));
            if (queries.length) context.append(node("p", "source-queries", "Found with: " + queries.join(" · ")));
            card.append(context);
          }
          grid.append(card);
        });
        sourceSection.append(grid);
      }

      function renderSearchResults(parent, searchResults) {
        const sectionElement = section(parent, "search-results", "Search results", "Expand a query to review the evidence returned for it.");
        if (!searchResults.length) {
          sectionElement.append(node("p", "muted", "No search results were recorded for this report."));
          return;
        }
        searchResults.forEach((group) => {
          const details = node("details", "search-result-group");
          const results = objects(group.results);
          details.append(node("summary", "", text(group.query, "Untitled query") + " (" + results.length + ")"));
          const list = node("ul", "search-result-list");
          if (!results.length) list.append(node("li", "muted", "No results recorded for this query."));
          results.forEach((result) => {
            const item = node("li");
            item.append(linkedTitle(result.title, result.url));
            if (text(result.snippet, "")) item.append(node("p", "", result.snippet));
            list.append(item);
          });
          details.append(list);
          sectionElement.append(details);
        });
      }

      function renderReport(report, id) {
        const analysis = report.analysis && typeof report.analysis === "object" ? report.analysis : {};
        const sources = objects(report.sourcesUsed);
        const findings = items(analysis.keyFindings);
        const recommendations = items(analysis.recommendations);
        const risks = items(analysis.risks);
        const opportunities = items(analysis.opportunities);
        const warnings = items(report.validationWarnings);
        const article = node("article", "report");
        article.append(node("p", "eyebrow", readableType(report.researchType)));
        article.append(node("h1", "", text(report.researchQuestion, "Untitled research report")));
        article.append(node("p", "report-intro", "A structured review of the question, conclusions, and supporting evidence."));

        const meta = node("div", "meta-row");
        meta.setAttribute("aria-label", "Report details");
        addMeta(meta, formattedDate(report.generatedAt));
        const confidence = text(analysis.confidenceScore, "unknown").toLowerCase();
        addMeta(meta, "Confidence: " + confidence, ["high", "medium", "low"].includes(confidence) ? "confidence-" + confidence : "");
        addMeta(meta, sources.length + (sources.length === 1 ? " source" : " sources"));
        if (warnings.length) addMeta(meta, warnings.length + (warnings.length === 1 ? " warning" : " warnings"));
        article.append(meta);

        const actions = node("div", "report-actions");
        const markdown = node("a", "action-link primary", "Download Markdown");
        markdown.href = "/api/reports/" + encodeURIComponent(id) + "/markdown";
        markdown.download = id + ".md";
        const json = node("a", "action-link", "Download JSON");
        json.href = "/api/reports/" + encodeURIComponent(id) + "/json";
        json.download = id + ".json";
        actions.append(markdown, json);
        if (report.hasDocx) {
          const preview = node("a", "action-link", "View Word document");
          preview.href = "/docx?report=" + encodeURIComponent(id);
          const docx = node("a", "action-link", "Download DOCX");
          docx.href = "/api/reports/" + encodeURIComponent(id) + "/docx";
          docx.download = id + ".docx";
          actions.append(preview, docx);
        }
        article.append(actions);
        addJumpLinks(article);

        if (warnings.length) {
          const warningBox = node("aside", "warning-box");
          warningBox.append(node("h2", "", "Validation warnings"));
          const list = node("ul");
          warnings.forEach((warning) => list.append(node("li", "", warning)));
          warningBox.append(list);
          article.append(warningBox);
        }

        const summary = section(article, "summary", "Executive summary");
        const summaryCard = node("div", "summary-card");
        summaryCard.append(node("p", "", text(analysis.executiveSummary, "No summary was included in this report.")));
        summary.append(summaryCard);
        renderCoverageInsights(article, report.evidenceInsights);
        renderItems(section(article, "findings", "Key findings"), findings, true);
        renderItems(section(article, "recommendations", "Recommendations"), recommendations, true);

        const dual = node("div", "dual-sections");
        renderItems(section(dual, "risks", "Risks"), risks, false);
        renderItems(section(dual, "opportunities", "Opportunities"), opportunities, false);
        article.append(dual);

        const evidence = node("div", "evidence-section");
        evidence.id = "evidence";
        evidence.append(node("p", "eyebrow", "Research trail"));
        evidence.append(node("h2", "", "Evidence and search history"));
        renderSources(evidence, sources);
        const queries = items(report.generatedQueries);
        const querySection = section(evidence, "queries", "Search queries");
        if (queries.length) {
          const queryList = node("ol", "query-list");
          queries.forEach((query) => queryList.append(node("li", "", query)));
          querySection.append(queryList);
        } else querySection.append(node("p", "muted", "No search queries were recorded for this report."));
        renderSearchResults(evidence, objects(report.searchResults));
        article.append(evidence);
        viewElement.replaceChildren(article);
        viewElement.setAttribute("aria-busy", "false");
      }

      async function selectReport(id, manual, updateUrl) {
        if (!reports.some((report) => report.id === id)) return;
        const changed = selectedId !== id;
        selectedId = id;
        manualSelection = manual;
        if (updateUrl) setUrl(id, manual);
        renderList();
        updateNotice();
        if (manual && updateUrl) {
          const main = document.getElementById("main-content");
          main.focus({ preventScroll: true });
          if (window.matchMedia("(max-width: 760px)").matches) main.scrollIntoView({ block: "start" });
          else window.scrollTo({ top: 0, behavior: "auto" });
        }
        if (!changed && reportCache.has(id)) return;
        const sequence = ++requestSequence;
        if (reportCache.has(id)) {
          renderReport(reportCache.get(id), id);
          return;
        }
        stateCard("Loading report…", "Retrieving the saved report from this computer.");
        viewElement.setAttribute("aria-busy", "true");
        try {
          const response = await fetch("/api/reports/" + encodeURIComponent(id), { cache: "no-store" });
          if (!response.ok) throw new Error("Report request failed (" + response.status + ").");
          const data = await response.json();
          if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("The saved report is not valid JSON report data.");
          reportCache.set(id, data);
          if (sequence === requestSequence && selectedId === id) renderReport(data, id);
        } catch (error) {
          if (sequence === requestSequence && selectedId === id) {
            stateCard("Couldn't open this report", error instanceof Error ? error.message : "An unknown error occurred.", null, () => selectReport(id, manualSelection, false));
          }
        }
      }

      async function refreshReports(showError) {
        if (refreshing) return;
        refreshing = true;
        if (!reports.length) {
          statusElement.textContent = "Loading reports…";
          if (showError) stateCard("Loading reports…", "Looking for completed research reports.");
        }
        try {
          const response = await fetch("/api/reports", { cache: "no-store" });
          if (!response.ok) throw new Error("Report list request failed (" + response.status + ").");
          const data = await response.json();
          if (!Array.isArray(data)) throw new Error("The report list is not valid.");
          reports = data.filter((report) => report && typeof report.id === "string" && report.id).sort((a, b) => {
            const left = Date.parse(a.generatedAt) || 0;
            const right = Date.parse(b.generatedAt) || 0;
            return right - left;
          });
          statusElement.textContent = reports.length ? "Newest first" : "Waiting for the first report";
          statusElement.classList.remove("error");
          renderList();
          if (!reports.length) {
            selectedId = null;
            manualSelection = false;
            updateNotice();
            stateCard("No reports yet", "Generate a report with the CLI, then leave this page open. Completed reports will appear here automatically.", 'npm run research -- competitor "your research question"');
            return;
          }
          const requestedId = !selectedId ? urlId() : null;
          const requestedExists = requestedId && reports.some((report) => report.id === requestedId);
          const selectedExists = selectedId && reports.some((report) => report.id === selectedId);
          const nextId = requestedExists ? requestedId :
            selectedExists && manualSelection ? selectedId : reports[0].id;
          const isManual = Boolean(requestedExists) || Boolean(selectedExists && manualSelection);
          if (nextId !== selectedId) await selectReport(nextId, isManual, true);
          else updateNotice();
        } catch (error) {
          statusElement.textContent = "Could not refresh reports. Retrying automatically.";
          statusElement.classList.add("error");
          if (!reports.length || showError) {
            stateCard("Couldn't load reports", error instanceof Error ? error.message : "An unknown error occurred.", null, true);
          }
        } finally {
          refreshing = false;
        }
      }

      searchElement.addEventListener("input", renderList);
      function followLocation() {
        const id = urlId();
        if (id && id !== selectedId) selectReport(id, true, false);
        else if (!id && reports.length) selectReport(reports[0].id, false, false);
      }
      window.addEventListener("popstate", followLocation);
      window.addEventListener("hashchange", followLocation);
      let printOpenedDetails = [];
      window.addEventListener("beforeprint", () => {
        printOpenedDetails = Array.from(document.querySelectorAll("details:not([open])"));
        printOpenedDetails.forEach((details) => { details.open = true; });
      });
      window.addEventListener("afterprint", () => {
        printOpenedDetails.forEach((details) => { details.open = false; });
        printOpenedDetails = [];
      });
      refreshReports(true);
      window.setInterval(() => refreshReports(false), 5000);
    })();
  </script>
</body>
</html>`;
}
