(function () {
const config = window.CHOOSER_CONFIG || {};
const manifestUrl = config.manifestUrl || "/choose/manifest.json";
const pageId = config.pageId;

const titleEl = document.getElementById("title");
const subtitleEl = document.getElementById("subtitle");
const gridEl = document.getElementById("grid");
const errorEl = document.getElementById("error");
const backEl = document.getElementById("back");

if (!pageId) {
showError("Missing chooser page configuration.");
return;
}

init();

async function init() {
try {
const res = await fetch(manifestUrl, { cache: "no-store" });
if (!res.ok) throw new Error(`HTTP ${res.status}`);

const manifest = await res.json();
const page = manifest?.pages?.[pageId];

if (!page) {
showError(`Page "${pageId}" not found in manifest.`);
return;
}

applyPageTheme(page);
renderPage(page);
} catch (err) {
console.error(err);
showError(`Cannot load chooser manifest: ${manifestUrl}`);
}
}

function applyPageTheme(page) {
const theme = page.theme || "root";
document.body.className = `theme-${theme}`;
}

function renderPage(page) {
if (titleEl) {
titleEl.textContent = page.title || "Choose";
}

if (subtitleEl) {
subtitleEl.textContent = page.subtitle || "";
}

renderBack(page.back);
renderItems(page.items);
}

function renderBack(back) {
if (!backEl) return;

if (!back || !back.path) {
backEl.style.display = "none";
return;
}

backEl.style.display = "";
backEl.textContent = back.title || "← Back";
backEl.href = buildUrl(back.path, back.args);
}

function renderItems(items) {
if (!gridEl) return;

if (!Array.isArray(items) || items.length === 0) {
gridEl.innerHTML = `<div class="muted">No options configured.</div>`;
return;
}

gridEl.innerHTML = items.map(renderItemCard).join("");
}

function renderItemCard(item) {
const title = escapeHtml(item.title || item.id || "Untitled");
const theme = escapeHtml(item.theme || "");
const href = escapeHtml(buildUrl(item.path || "#", item.args));

const classes = ["card"];
if (theme) classes.push(`theme-${theme}`);

//return `<a class="${classes.join(" ")}" href="${href}">${title}</a>`;
return `<a class="${classes.join(" ")}" href="${href}"><span class="card-label">${title}</span></a>`;
}

function buildUrl(path, args) {
const url = new URL(path, window.location.origin);

if (args && typeof args === "object") {
for (const [key, value] of Object.entries(args)) {
if (value !== undefined && value !== null) {
url.searchParams.set(key, String(value));
}
}
}

return url.pathname + url.search;
}

function showError(message) {
if (errorEl) {
errorEl.style.display = "";
errorEl.textContent = message;
}
}

function escapeHtml(value) {
return String(value)
.replaceAll("&", "&amp;")
.replaceAll("<", "&lt;")
.replaceAll(">", "&gt;")
.replaceAll('"', "&quot;")
.replaceAll("'", "&#039;");
}
})();