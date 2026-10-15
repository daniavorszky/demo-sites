#!/usr/bin/env node
/**
 * Extrage conținutul brut al unui homepage într-un raw.json pe care agentul îl mapează pe home.json.
 *
 *   node tools/extract.mjs https://exemplu.ro              → scrie raw.json
 *   node tools/extract.mjs https://exemplu.ro out.json     → scrie out.json
 *   node tools/extract.mjs ./pagina.html https://exemplu.ro → citește HTML local, rezolvă URL-urile față de baza dată
 *
 * Nu interpretează nimic: scoate blocurile în ordinea din DOM, cu textul, imaginile, linkurile și
 * datele de contact. Interpretarea (ce e hero, ce e serviciu) o face agentul cu MAPPING_PROMPT.md.
 */
import { load } from "cheerio";
import { readFileSync, writeFileSync } from "node:fs";

const [, , input, arg2] = process.argv;
if (!input) {
  console.error("Folosire: node tools/extract.mjs <url | fisier.html> [out.json | url-de-baza]");
  process.exit(1);
}

const isUrl = /^https?:\/\//i.test(input);
let html, baseUrl, outFile = "raw.json";
if (isUrl) {
  baseUrl = input;
  if (arg2) outFile = arg2;
  const res = await fetch(input, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; demo-kit-extract/1.0)" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} la ${input}`);
  html = await res.text();
  baseUrl = res.url || input;
} else {
  html = readFileSync(input, "utf8");
  baseUrl = arg2 || "https://example.invalid/";
}

const $ = load(html);
const abs = (u) => { try { return u ? new URL(u, baseUrl).href : undefined; } catch { return u; } };
const clean = (s) => (s || "").replace(/\s+/g, " ").trim();

// 1. Zgomot: scripturi, stiluri, cookie banners, elemente ascunse.
$("script, style, noscript, svg, iframe[src*='google.com/recaptcha'], [aria-hidden='true']").remove();
$("[class*='cookie'], [id*='cookie'], [class*='gdpr'], [id*='gdpr']").remove();

// 2. Meta + identitate
const site = {
  title: clean($("title").first().text()),
  metaDescription: clean($('meta[name="description"]').attr("content")),
  ogImage: abs($('meta[property="og:image"]').attr("content")),
  lang: $("html").attr("lang") || undefined,
  logo: abs(
    $("header img, [class*='logo'] img, a[href='/'] img").first().attr("src") ||
    $("header img, [class*='logo'] img").first().attr("data-src")
  ),
};

// 3. Navigație (prima <nav> sau header)
const nav = [];
const seenNav = new Set();
$("nav a, header a").each((_, a) => {
  const label = clean($(a).text());
  const href = abs($(a).attr("href"));
  if (!label || !href || label.length > 40 || seenNav.has(label)) return;
  seenNav.add(label);
  nav.push({ label, href });
});

// 4. Contact: telefon, email, adresă, program (regex pe tot textul + linkuri tel:/mailto:)
const bodyText = clean($("body").text());
const contact = {
  phones: [...new Set([
    ...$("a[href^='tel:']").map((_, a) => $(a).attr("href").replace("tel:", "")).get(),
    ...(bodyText.match(/(?:\+4|0)\s?[0-9][0-9 .-]{8,12}[0-9]/g) || []),
  ].map(clean))].slice(0, 5),
  emails: [...new Set([
    ...$("a[href^='mailto:']").map((_, a) => $(a).attr("href").replace("mailto:", "").split("?")[0]).get(),
    ...(bodyText.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || []),
  ].map(clean))].slice(0, 5),
  addressCandidates: [...new Set((bodyText.match(/(?:Str\.|Strada|Bd\.|Bulevardul|Calea|Aleea|Nr\.|Sat|Com\.)[^.|]{10,120}/g) || []).map(clean))].slice(0, 5),
  hoursCandidates: [...new Set((bodyText.match(/(?:Luni|L-V|Lun|Program)[^.|]{5,80}/gi) || []).map(clean))].slice(0, 5),
  mapEmbed: abs($("iframe[src*='google.com/maps']").attr("src")),
  social: Object.fromEntries(
    ["facebook", "instagram", "linkedin", "youtube", "tiktok", "whatsapp"]
      .map((k) => [k, abs($(`a[href*='${k}.com'], a[href*='wa.me']`).filter((_, a) => $(a).attr("href").includes(k) || (k === "whatsapp" && $(a).attr("href").includes("wa.me"))).first().attr("href"))])
      .filter(([, v]) => v)
  ),
};

// 5. Blocuri de conținut în ordinea din DOM, din <main> dacă există, altfel <body> fără header/footer.
const root = $("main").length ? $("main") : $("body");
root.find("header, nav, footer").remove();

const blocks = [];
let i = 0;
const push = (b) => { if (b.text || b.src || b.items?.length) blocks.push({ i: i++, ...b }); };

const walk = (el) => {
  const $el = $(el);
  const tag = el.tagName?.toLowerCase();
  if (!tag) return;
  if (/^h[1-6]$/.test(tag)) return push({ kind: tag, text: clean($el.text()) });
  if (tag === "p") {
    const t = clean($el.text());
    if (t.length > 2) push({ kind: "p", text: t, words: t.split(" ").length });
    return;
  }
  if (tag === "blockquote") return push({ kind: "quote", text: clean($el.text()) });
  if (tag === "img" || tag === "picture") {
    const img = tag === "img" ? $el : $el.find("img").first();
    const src = abs(img.attr("src") || img.attr("data-src") || img.attr("data-lazy-src"));
    if (!src || /\.(svg|gif)(\?|$)/i.test(src) && !/logo/i.test(src)) return;
    return push({ kind: "img", src, alt: clean(img.attr("alt")), width: Number(img.attr("width")) || undefined, height: Number(img.attr("height")) || undefined });
  }
  if (tag === "ul" || tag === "ol") {
    const items = $el.children("li").map((_, li) => clean($(li).text())).get().filter(Boolean);
    if (items.length) return push({ kind: "list", items });
    return;
  }
  if (tag === "a" && $el.children().length === 0) {
    const t = clean($el.text());
    const cls = ($el.attr("class") || "") + " " + ($el.attr("role") || "");
    if (t && (/btn|button|cta/i.test(cls) || t.length < 40)) push({ kind: "link", text: t, href: abs($el.attr("href")), button: /btn|button|cta/i.test(cls) });
    return;
  }
  if (tag === "table") return push({ kind: "table", text: clean($el.text()) });
  // Secțiuni: marcăm granițele ca să vadă agentul grupările din sursă.
  if (tag === "section" || ($el.attr("id") && ["div", "article"].includes(tag) && $el.children().length > 2)) {
    push({ kind: "section-start", id: $el.attr("id") || undefined, class: ($el.attr("class") || "").slice(0, 80) || undefined });
    $el.children().each((_, c) => walk(c));
    return push({ kind: "section-end" });
  }
  $el.children().each((_, c) => walk(c));
};
root.children().each((_, c) => walk(c));

// 6. Text liber neprins de walk (span-uri în div-uri goale) — ca plasă de siguranță.
const leftovers = [];
root.find("div, span").each((_, el) => {
  const $el = $(el);
  if ($el.children().length) return;
  const t = clean($el.text());
  if (t.length > 25 && !blocks.some((b) => b.text === t)) leftovers.push(t);
});

const raw = {
  source: { url: baseUrl, extractedAt: new Date().toISOString(), blocks: blocks.length },
  site,
  nav,
  contact,
  blocks,
  leftovers: [...new Set(leftovers)].slice(0, 60),
};
writeFileSync(outFile, JSON.stringify(raw, null, 2));
console.log(`OK → ${outFile}: ${blocks.length} blocuri, ${nav.length} linkuri de meniu, ${contact.phones.length} telefoane, ${blocks.filter((b) => b.kind === "img").length} imagini`);
