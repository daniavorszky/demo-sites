#!/usr/bin/env node
/**
 * Construiește toate demo-urile din clients/<slug>/home.json în dist/<slug>/ și un index privat la dist/index.html.
 * Folosit de Cloudflare Pages ca build command: `npm run build:all`, output: `dist`.
 *
 *   node tools/build-all.mjs            # toți clienții
 *   node tools/build-all.mjs just4kids  # doar unul (restul din dist rămân)
 */
import { readdirSync, existsSync, copyFileSync, cpSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const only = process.argv[2];
const slugs = readdirSync("clients", { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join("clients", d.name, "home.json")))
  .map((d) => d.name)
  .filter((s) => !only || s === only);

if (!slugs.length) { console.error("Niciun client găsit în clients/"); process.exit(1); }
mkdirSync("dist", { recursive: true });

const built = [];
for (const slug of slugs) {
  const src = join("clients", slug, "home.json");
  copyFileSync(src, "src/data/home.json");
  const out = join("dist", slug);
  rmSync(out, { recursive: true, force: true });
  console.log(`\n▶ ${slug}`);
  execSync(`npx astro build --outDir ${out}`, { stdio: "inherit", env: { ...process.env, BASE: `/${slug}/` } });
  const home = JSON.parse(readFileSync(src, "utf8"));
  built.push({ slug, name: home.site.name, source: home.source?.url, date: home.source?.extractedAt?.slice(0, 10) });
}

// Demo-uri statice (ex. exporturi Shuffle) din static/<slug>/ → copiate ca atare în dist/<slug>/.
const statics = existsSync("static") ? readdirSync("static", { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];
for (const slug of statics) {
  const out = join("dist", slug);
  rmSync(out, { recursive: true, force: true });
  cpSync(join("static", slug), out, { recursive: true });
  const metaPath = join("static", slug, "_meta.json");
  const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, "utf8")) : {};
  built.push({ slug, name: meta.label || slug, source: meta.source, date: meta.note });
  console.log(`\n▶ ${slug} (static)`);
}

// Index privat (noindex) cu toate demo-urile existente în dist/.
const all = readdirSync("dist", { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
const rows = all.map((slug) => {
  const b = built.find((x) => x.slug === slug);
  const label = b ? `${b.name} <span style="color:#777">· ${b.source ?? ""} · ${b.date ?? ""}</span>` : slug;
  return `<li><a href="/${slug}/">${slug}</a> — ${label}</li>`;
}).join("\n");
writeFileSync("dist/index.html", `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Demo sites</title><style>body{font:16px/1.6 system-ui;max-width:720px;margin:48px auto;padding:0 20px;color:#222}li{margin:8px 0}</style></head><body><h1>Demo-uri de homepage</h1><ul>${rows}</ul></body></html>`);
writeFileSync("dist/robots.txt", "User-agent: *\nDisallow: /\n");
writeFileSync("dist/_headers", "/*\n  X-Robots-Tag: noindex, nofollow\n");
console.log(`\nGata: ${built.map((b) => b.slug).join(", ")} → dist/`);
