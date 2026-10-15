#!/usr/bin/env node
/**
 * Raport de fidelitate pentru un export Shuffle (sau orice HTML) față de raw.json al clientului.
 *   node tools/fidelity.mjs <index.html> <raw.json>
 * Spune: cât din textul sursei se regăsește, ce blocuri lipsesc, ce text e inventat, câte imagini sunt din sursă vs. stock.
 */
import { readFileSync } from "node:fs";
import * as cheerio from "cheerio";

const [html, rawPath] = process.argv.slice(2);
if (!html || !rawPath) { console.error("Folosire: node tools/fidelity.mjs <index.html> <raw.json>"); process.exit(1); }
const raw = JSON.parse(readFileSync(rawPath, "utf8"));
const $ = cheerio.load(readFileSync(html, "utf8"));
$("script,style,noscript").remove();

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[„”"'«»;:,.!?()\-–—/]/g, " ").replace(/\s+/g, " ").trim();
const srcTexts = [];
for (const b of raw.blocks || []) { if (b.text) srcTexts.push(b.text); if (Array.isArray(b.items)) srcTexts.push(...b.items); }
const srcNorm = srcTexts.map(norm).filter((t) => t.length > 3);
const srcJoined = " " + srcNorm.join(" ") + " ";

// 1. text din sursă regăsit în HTML
const outText = " " + norm($("body").text()) + " ";
const missing = [], found = [];
for (const [i, t] of srcNorm.entries()) (outText.includes(" " + t + " ") || outText.includes(t)) ? found.push(i) : missing.push(i);

// 2. text din HTML care nu e în sursă (inventat / rescris), în bucăți de 6 cuvinte
const invented = new Set();
$("h1,h2,h3,h4,p,li,a,span,blockquote,figcaption,td").each((_, el) => {
  const t = norm($(el).clone().children().remove().end().text());
  if (!t || t.length < 12) return;
  const w = t.split(" ");
  if (w.length < 4) { if (!srcJoined.includes(" " + t + " ")) invented.add(t); return; }
  for (let i = 0; i + 6 <= w.length; i += 6) { const c = w.slice(i, i + 6).join(" "); if (!srcJoined.includes(c)) { invented.add(t.slice(0, 90)); break; } }
});

// 3. imagini
const srcImgs = new Set((raw.blocks || []).filter((b) => b.type === "img").map((b) => b.src).concat(raw.images || []).filter(Boolean));
const srcHost = raw.site?.url ? new URL(raw.site.url).hostname.replace(/^www\./, "") : "";
const imgs = $("img").map((_, el) => $(el).attr("src") || $(el).attr("data-src") || "").get().filter(Boolean);
const fromSite = imgs.filter((s) => srcImgs.has(s) || (srcHost && s.includes(srcHost)));
const stock = imgs.filter((s) => !fromSite.includes(s));

const pct = srcNorm.length ? Math.round((100 * found.length) / srcNorm.length) : 0;
console.log(`Text sursă regăsit: ${found.length}/${srcNorm.length} blocuri (${pct}%)`);
console.log(`Imagini: ${fromSite.length} din site, ${stock.length} stock/altele din ${imgs.length}`);
console.log(`Text inventat/rescris: ${invented.size} fragmente`);
if (missing.length) { console.log("\n— LIPSESC din design:"); for (const i of missing) console.log("  · " + srcTexts[srcNorm.indexOf(srcNorm[i])]?.slice(0, 100)); }
if (invented.size) { console.log("\n— INVENTAT/RESCRIS:"); for (const t of invented) console.log("  · " + t); }
if (stock.length) { console.log("\n— IMAGINI STOCK:"); for (const s of stock.slice(0, 15)) console.log("  · " + s.slice(0, 100)); }
process.exit(missing.length || invented.size || stock.length ? 2 : 0);
