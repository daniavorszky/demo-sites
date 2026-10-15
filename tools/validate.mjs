#!/usr/bin/env node
/**
 * Validează src/data/home.json contra schemei și verifică regula „nimic inventat”
 * comparând textele din home.json cu raw.json (dacă există).
 *
 *   node tools/validate.mjs [home.json] [raw.json]
 */
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync, existsSync } from "node:fs";

const homePath = process.argv[2] || "src/data/home.json";
const rawPath = process.argv[3] || "raw.json";

const schema = JSON.parse(readFileSync("src/data/home.schema.json", "utf8"));
const home = JSON.parse(readFileSync(homePath, "utf8"));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const ok = ajv.validate(schema, home);
if (!ok) {
  console.error("Schema: EROARE");
  for (const e of ajv.errors) console.error(`  ${e.instancePath || "/"} ${e.message}`);
  process.exit(1);
}
console.log(`Schema: OK (${home.sections.length} secțiuni: ${home.sections.map((s) => s.type).join(", ")})`);

if (!existsSync(rawPath)) {
  console.log(`raw.json lipsă (${rawPath}) — sar peste verificarea „nimic inventat”.`);
  process.exit(0);
}

// Toate textele din raw, normalizate, într-un singur corpus.
const raw = JSON.parse(readFileSync(rawPath, "utf8"));
// Normalizare: minuscule, fără punctuație (o virgulă în loc de punct și virgulă nu e conținut nou), spații simple.
const norm = (s) => String(s).toLowerCase().replace(/[„”"'«»;:,.!?()\-–—/]/g, " ").replace(/\s+/g, " ").trim();
const corpus = norm(JSON.stringify(raw));

// Toate string-urile de conținut din home.json (ignorăm chei tehnice).
const skipKeys = new Set(["type", "_source", "href", "src", "extractedAt", "url", "notes", "language", "mapEmbed", "logo"]);
const strings = [];
const walk = (v, k) => {
  if (typeof v === "string") { if (!skipKeys.has(k) && v.trim().length > 3) strings.push(v); return; }
  if (Array.isArray(v)) return v.forEach((x) => walk(x, k));
  if (v && typeof v === "object") return Object.entries(v).forEach(([kk, vv]) => walk(vv, kk));
};
walk(home.sections, "sections");
walk(home.site, "site");
walk(home.nav, "nav");

// Un text e „găsit” dacă fiecare fragment de ~6 cuvinte apare în corpus (tolerăm lipirea/despărțirea paragrafelor).
const missing = [];
for (const s of strings) {
  const words = norm(s).split(" ");
  const chunks = [];
  for (let i = 0; i < words.length; i += 6) chunks.push(words.slice(i, i + 6).join(" "));
  const bad = chunks.filter((c) => c.length > 8 && !corpus.includes(c));
  if (bad.length) missing.push({ text: s.slice(0, 90), fragments: bad.slice(0, 2) });
}
if (missing.length) {
  console.error(`Conținut negăsit în raw.json: ${missing.length} text(e). Verifică — poate fi inventat sau rescris:`);
  for (const m of missing) console.error(`  • "${m.text}"  ← ${m.fragments.join(" | ")}`);
  process.exit(2);
}
console.log(`Nimic inventat: OK (${strings.length} texte verificate contra raw.json)`);
