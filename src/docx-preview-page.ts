/** Local, read-only Word preview. The browser script is served separately for a narrow CSP. */
export function renderDocxPreviewPage(): string {
  return String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Word preview | Market Research Agent</title>
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
    a { color: #155aa8; }
    a:hover { color: #0d447e; }
    :focus-visible { outline: 3px solid #77b6ff; outline-offset: 3px; }
    [hidden] { display: none !important; }
    .skip-link {
      position: absolute; z-index: 10; left: 1rem; top: -5rem;
      padding: .7rem 1rem; border-radius: .5rem; background: white; color: #173a67;
    }
    .skip-link:focus { top: 1rem; }
    .topbar { background: #14253e; color: #edf5ff; }
    .topbar-inner {
      max-width: 1480px; min-height: 5.1rem; margin: 0 auto; padding: 1rem clamp(1rem, 3vw, 2.5rem);
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    }
    .brand { display: flex; align-items: center; gap: .8rem; min-width: 0; }
    .brand-mark {
      width: 2.35rem; height: 2.35rem; display: grid; place-items: center; flex: 0 0 auto;
      border-radius: .72rem; background: #6db3ff; color: #102541; font-weight: 850; letter-spacing: -.12em;
    }
    .brand-name { font-size: .97rem; font-weight: 750; letter-spacing: -.01em; }
    .brand-subtitle { margin-top: .12rem; color: #a6b8d1; font-size: .77rem; }
    .back-link {
      display: inline-flex; align-items: center; gap: .4rem; flex: 0 0 auto;
      padding: .55rem .7rem; border: 1px solid #536b88; border-radius: .55rem;
      color: #e2efff; text-decoration: none; font-size: .82rem; font-weight: 650;
    }
    .back-link:hover { color: white; background: #274465; }
    .page { max-width: 1480px; margin: 0 auto; padding: 0 clamp(1rem, 3vw, 2.5rem) 4rem; }
    .intro { padding: clamp(1.5rem, 3vw, 2.6rem) 0 1.55rem; }
    .eyebrow { margin: 0 0 .7rem; color: #356fae; font-size: .74rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
    h1 { margin: 0; font-size: clamp(1.8rem, 3.2vw, 2.8rem); line-height: 1.15; letter-spacing: -.04em; }
    .intro p:last-child { max-width: 690px; margin: .65rem 0 0; color: #5e7188; font-size: .95rem; line-height: 1.65; }
    .controls {
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem 1.5rem;
      padding: 1.15rem 1.3rem; border: 1px solid #d8e3ee; border-radius: .85rem;
      background: white; box-shadow: 0 5px 20px #173a6708;
    }
    .controls h2 { margin: 0; font-size: .94rem; line-height: 1.4; }
    .controls p { margin: .25rem 0 0; color: #60748a; font-size: .78rem; line-height: 1.5; }
    .actions { display: flex; align-items: center; flex-wrap: wrap; gap: .6rem; }
    .file-button, .download-link {
      display: inline-flex; justify-content: center; align-items: center; min-height: 2.65rem;
      padding: .6rem .9rem; border-radius: .57rem; font-size: .83rem; font-weight: 750;
      text-decoration: none; cursor: pointer;
    }
    .file-button { border: 1px solid #215d9f; background: #215d9f; color: white; }
    .file-button:hover { background: #164d88; }
    .file-button:focus-within { outline: 3px solid #77b6ff; outline-offset: 3px; }
    .download-link { border: 1px solid #bdd0e5; background: white; color: #20598f; }
    .download-link:hover { background: #eef6ff; text-decoration: none; }
    .visually-hidden {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
    }
    .workspace { margin-top: 1.15rem; overflow: hidden; border: 1px solid #d8e3ee; border-radius: .85rem; background: #e9eef4; }
    .workspace-head {
      min-height: 3.7rem; display: flex; align-items: center; gap: .8rem; padding: .8rem 1.25rem;
      border-bottom: 1px solid #d8e3ee; background: white;
    }
    .workspace-label {
      display: inline-flex; align-items: center; gap: .45rem; padding: .33rem .55rem;
      border-radius: .4rem; background: #e7f2ff; color: #245b95;
      font-size: .72rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase;
    }
    .workspace-label::before { content: ""; width: .4rem; height: .4rem; border-radius: 50%; background: #2d84cb; }
    .document-name { min-width: 0; overflow: hidden; color: #354b63; font-size: .83rem; text-overflow: ellipsis; white-space: nowrap; }
    .status {
      min-height: 1.4rem; margin: 0; padding: .7rem 1.25rem; background: #f9fbfd;
      border-bottom: 1px solid #d8e3ee; color: #536b82; font-size: .81rem; line-height: 1.5;
    }
    .status.error { color: #9a4338; background: #fff3f0; border-color: #f3d0ca; }
    .empty-state {
      max-width: 460px; margin: clamp(3rem, 8vw, 6rem) auto; padding: 0 1.5rem; text-align: center;
    }
    .empty-icon {
      width: 3.6rem; height: 4.3rem; margin: 0 auto 1.25rem; padding: 1.15rem .8rem;
      border: 2px solid #aec4d9; border-radius: .4rem; background: #fff; box-shadow: 0 8px 22px #25486a17;
    }
    .empty-icon span { display: block; height: .17rem; margin-bottom: .45rem; border-radius: 1rem; background: #b8cce0; }
    .empty-icon span:last-child { width: 65%; }
    .empty-state h2 { margin: 0; color: #2c4a68; font-size: 1.13rem; }
    .empty-state p { margin: .55rem 0 0; color: #61788e; font-size: .87rem; line-height: 1.6; }
    .preview { min-height: 15rem; overflow-x: auto; padding: 1.5rem 1rem 2rem; }
    .preview .docx-wrapper { background: transparent !important; padding: 0 !important; }
    .preview .docx-wrapper > section.docx {
      margin: 0 auto 1.3rem !important; box-shadow: 0 7px 30px #20384f26 !important;
    }
    .preview .docx-wrapper > section.docx:last-child { margin-bottom: 0 !important; }
    @media (max-width: 620px) {
      .topbar-inner { align-items: flex-start; }
      .brand-name { font-size: .87rem; }
      .back-link { font-size: .76rem; }
      .page { padding-bottom: 2rem; }
      .controls { align-items: stretch; }
      .actions { width: 100%; }
      .file-button, .download-link { flex: 1 1 auto; }
      .preview { padding: .8rem .5rem 1.25rem; }
    }
    @media print {
      :root { background: white; }
      .topbar, .intro, .controls, .workspace-head, .status, .empty-state, .skip-link { display: none !important; }
      .page { max-width: none; padding: 0; }
      .workspace { margin: 0; border: 0; overflow: visible; }
      .preview { min-height: 0; padding: 0; overflow: visible; }
      .preview .docx-wrapper { zoom: 1 !important; }
      .preview .docx-wrapper > section.docx { box-shadow: none !important; }
    }
  </style>
  <script defer src="/assets/jszip.min.js"></script>
  <script defer src="/assets/docx-preview.min.js"></script>
  <script defer src="/assets/docx-preview-client.js"></script>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to Word preview</a>
  <header class="topbar"><div class="topbar-inner">
    <div class="brand"><div class="brand-mark" aria-hidden="true">M</div><div><div class="brand-name">Market Research Agent</div><div class="brand-subtitle">Word document preview</div></div></div>
    <a class="back-link" id="back-link" href="/">← Back to reports</a>
  </div></header>
  <main class="page" id="main-content">
    <div class="intro">
      <p class="eyebrow">Local document viewer</p>
      <h1>Read the Word report</h1>
      <p>Review the formatted pages in your browser, or choose a Word report saved anywhere on your computer.</p>
    </div>
    <section class="controls" aria-label="Open a Word document">
      <div><h2>Open another .docx file</h2><p>Choose a local export, including files saved outside the reports folder. Maximum size: 20 MiB.</p></div>
      <div class="actions">
        <label class="file-button" for="docx-file">Choose Word file<input class="visually-hidden" id="docx-file" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"></label>
        <a class="download-link" id="download-link" href="#" download hidden>Download .docx</a>
      </div>
    </section>
    <section class="workspace" aria-label="Word document pages">
      <div class="workspace-head"><span class="workspace-label">Preview</span><strong class="document-name" id="document-name">No document open</strong></div>
      <p class="status" id="preview-status" role="status" aria-live="polite">Choose a Word file to see its pages here.</p>
      <div class="empty-state" id="empty-state">
        <div class="empty-icon" aria-hidden="true"><span></span><span></span><span></span></div>
        <h2 id="empty-title">Your pages will appear here</h2>
        <p id="empty-description">Open a .docx file above, or choose a Word report from the research library.</p>
      </div>
      <div class="preview" id="docx-container" aria-label="Rendered Word document" aria-busy="false" hidden></div>
    </section>
  </main>
</body>
</html>`;
}

/** Plain browser JavaScript, served as a local asset without inline script execution. */
export function renderDocxPreviewScript(): string {
  return String.raw`(() => {
  "use strict";

  const MAX_DOCX_BYTES = 20 * 1024 * 1024;
  const REPORT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
  const fileInput = document.getElementById("docx-file");
  const downloadLink = document.getElementById("download-link");
  const backLink = document.getElementById("back-link");
  const nameElement = document.getElementById("document-name");
  const statusElement = document.getElementById("preview-status");
  const emptyState = document.getElementById("empty-state");
  const emptyTitle = document.getElementById("empty-title");
  const emptyDescription = document.getElementById("empty-description");
  const preview = document.getElementById("docx-container");
  let loadSequence = 0;
  let pageWidth = 0;

  function setStatus(message, error) {
    statusElement.textContent = message;
    statusElement.classList.toggle("error", Boolean(error));
    statusElement.setAttribute("role", error ? "alert" : "status");
  }

  function showEmpty(title, description) {
    emptyTitle.textContent = title;
    emptyDescription.textContent = description;
    emptyState.hidden = false;
    preview.hidden = true;
    preview.setAttribute("aria-busy", "false");
  }

  function beginLoad(name) {
    const sequence = ++loadSequence;
    nameElement.textContent = name;
    downloadLink.hidden = true;
    downloadLink.removeAttribute("href");
    preview.hidden = true;
    preview.replaceChildren();
    preview.setAttribute("aria-busy", "true");
    emptyState.hidden = true;
    pageWidth = 0;
    setStatus("Opening Word document…", false);
    return sequence;
  }

  function failLoad(sequence, message) {
    if (sequence !== loadSequence) return;
    setStatus(message, true);
    showEmpty("Could not open this document", "Choose a valid .docx file and try again.");
  }

  function safeHttpUrl(raw) {
    if (typeof raw !== "string") return null;
    try {
      const url = new URL(raw.trim());
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  }

  function sanitizeLinks(root) {
    for (const link of root.querySelectorAll("a")) {
      const safeUrl = safeHttpUrl(link.getAttribute("href"));
      if (safeUrl) {
        link.href = safeUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      } else {
        link.removeAttribute("href");
        link.removeAttribute("target");
        link.removeAttribute("rel");
      }
    }
  }

  function fitPages() {
    if (!pageWidth || preview.hidden) return;
    const wrapper = preview.querySelector(".docx-wrapper");
    if (!wrapper) return;
    const available = Math.max(1, preview.clientWidth - 16);
    wrapper.style.zoom = String(Math.min(1, Math.max(0.5, available / pageWidth)));
  }

  async function showDocument(bytes, name, sequence, reportId) {
    if (sequence !== loadSequence) return;
    if (bytes.byteLength > MAX_DOCX_BYTES) {
      failLoad(sequence, "This Word file is larger than 20 MiB. Choose a smaller .docx file.");
      return;
    }
    if (reportId) {
      downloadLink.href = "/api/reports/" + encodeURIComponent(reportId) + "/docx";
      downloadLink.download = reportId + ".docx";
      downloadLink.hidden = false;
    }
    if (bytes.byteLength < 4 || new Uint8Array(bytes, 0, 4).some((byte, index) => byte !== [80, 75, 3, 4][index])) {
      failLoad(sequence, "This does not appear to be a valid .docx file. Choose a Word document in the current .docx format.");
      return;
    }
    if (!window.docx || typeof window.docx.renderAsync !== "function") {
      failLoad(sequence, "The Word preview could not start. Reload this page and try again.");
      return;
    }

    const stage = document.createElement("div");
    try {
      await window.docx.renderAsync(bytes, stage, stage, { renderAltChunks: false });
    } catch {
      failLoad(sequence, "This file could not be displayed. Check that it is a valid .docx file, then try again.");
      return;
    }
    if (sequence !== loadSequence) return;

    sanitizeLinks(stage);
    preview.replaceChildren(stage);
    preview.hidden = false;
    preview.setAttribute("aria-busy", "false");
    const sections = preview.querySelectorAll(".docx-wrapper > section.docx");
    pageWidth = Math.max(0, ...Array.from(sections, (section) => section.getBoundingClientRect().width));
    fitPages();
    emptyState.hidden = true;
    nameElement.textContent = name;
    setStatus("Document ready. Use the page scroll bar if you need a closer view on a small screen.", false);
  }

  async function openLocalFile(file) {
    const sequence = beginLoad(file.name || "Local Word document");
    if (!/\.docx$/i.test(file.name || "")) {
      failLoad(sequence, "Choose a .docx file. Older .doc files cannot be previewed here.");
      return;
    }
    if (file.size > MAX_DOCX_BYTES) {
      failLoad(sequence, "This Word file is larger than 20 MiB. Choose a smaller .docx file.");
      return;
    }
    try {
      const bytes = await file.arrayBuffer();
      await showDocument(bytes, file.name, sequence, null);
    } catch {
      failLoad(sequence, "Could not read this local file. Check that it is accessible and try again.");
    }
  }

  async function openSavedReport(id) {
    const sequence = beginLoad(id + ".docx");
    try {
      const response = await fetch("/api/reports/" + encodeURIComponent(id) + "/docx", { cache: "no-store" });
      if (sequence !== loadSequence) return;
      if (response.status === 404) {
        failLoad(sequence, "No Word file was found for this report. Choose a local .docx file, or generate this report with --format docx.");
        return;
      }
      if (response.status === 413) {
        failLoad(sequence, "This Word file is larger than 20 MiB. Choose a smaller .docx file.");
        return;
      }
      if (!response.ok) {
        failLoad(sequence, "Could not load this Word file. Try again or choose a local .docx file.");
        return;
      }
      const declaredSize = Number(response.headers.get("content-length"));
      if (Number.isFinite(declaredSize) && declaredSize > MAX_DOCX_BYTES) {
        failLoad(sequence, "This Word file is larger than 20 MiB. Choose a smaller .docx file.");
        return;
      }
      const bytes = await response.arrayBuffer();
      await showDocument(bytes, id + ".docx", sequence, id);
    } catch {
      failLoad(sequence, "Could not load this Word file. Check that the report viewer is still running and try again.");
    }
  }

  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = "";
    if (file) void openLocalFile(file);
  });

  preview.addEventListener("click", (event) => {
    const target = event.target;
    const link = target && target.closest ? target.closest("a") : null;
    if (!link || !preview.contains(link)) return;
    const safeUrl = safeHttpUrl(link.getAttribute("href"));
    if (!safeUrl) {
      event.preventDefault();
      return;
    }
    link.href = safeUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });

  if (typeof ResizeObserver === "function") {
    new ResizeObserver(fitPages).observe(preview);
  } else {
    window.addEventListener("resize", fitPages);
  }

  const params = new URLSearchParams(window.location.search);
  if (params.has("report")) {
    const id = params.get("report");
    if (!id || !REPORT_ID_PATTERN.test(id)) {
      setStatus("This report link is invalid. Choose a local .docx file or return to reports.", true);
      showEmpty("Invalid report link", "The report identifier in this link cannot be used.");
    } else {
      backLink.href = "/?report=" + encodeURIComponent(id);
      void openSavedReport(id);
    }
  }
})();`;
}
