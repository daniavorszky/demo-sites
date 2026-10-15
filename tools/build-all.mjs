#!/usr/bin/env node
/**
 * Construiește toate demo-urile din clients/<slug>/home.json în dist/<slug>/ și un index privat la dist/index.html.
 * Folosit de Cloudflare Pages ca build command: `npm run build:all`, output: `dist`.
 *
 *   node tools/build-all.mjs            # toți clienții
 *   node tools/build-all.mjs just4kids  # doar unul (restul din dist rămân)
 */
import { readdirSync, existsSync, cpSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { beacon, refTag } from "./beacon.mjs";
import { PRESETS, presetOf } from "./presets.mjs";

const only = process.argv[2];
const slugs = readdirSync("clients", { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join("clients", d.name, "home.json")))
  .map((d) => d.name)
  .filter((s) => !only || s === only);

if (!slugs.length) { console.error("Niciun client găsit în clients/"); process.exit(1); }
mkdirSync("dist", { recursive: true });

const built = [];
const readClient = (slug) => { const cj = join("clients", slug, "client.json"); return existsSync(cj) ? JSON.parse(readFileSync(cj, "utf8")) : {}; };

// Un build Astro pentru un home.json, publicat la `base`.
function buildOne(home, client, out, base) {
  home.demo = { ...(home.demo || {}), ...(client.company ? { company: client.company } : {}), ...(client.contact ? { contact: client.contact } : {}) };
  writeFileSync("src/data/home.json", JSON.stringify(home, null, 2));
  rmSync(out, { recursive: true, force: true });
  execSync(`npx astro build --outDir ${out}`, { stdio: "inherit", env: { ...process.env, BASE: base } });
}

for (const slug of slugs) {
  const src = join("clients", slug, "home.json");
  const out = join("dist", slug);
  console.log(`\n▶ ${slug}`);
  const home = JSON.parse(readFileSync(src, "utf8"));
  const client = readClient(slug);
  buildOne(structuredClone(home), client, out, `/${slug}/`);
  built.push({ slug, name: home.site.name, source: home.source?.url, date: home.source?.extractedAt?.slice(0, 10), company: client.company || home.site.name, contact: client.contact });
}

// Demo-uri statice (ex. exporturi Shuffle) din static/<slug>/ → copiate ca atare în dist/<slug>/.
const statics = existsSync("static") ? readdirSync("static", { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];
for (const slug of statics) {
  const out = join("dist", slug);
  rmSync(out, { recursive: true, force: true });
  cpSync(join("static", slug), out, { recursive: true });
  const metaPath = join("static", slug, "_meta.json");
  const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, "utf8")) : {};
  const idx = join(out, "index.html");
  if (existsSync(idx)) {
    const html = readFileSync(idx, "utf8");
    if (!html.includes('fetch("/api/view"')) writeFileSync(idx, html.replace("</body>", beacon(meta.company || meta.label || slug) + "\n</body>"));
  }
  built.push({ slug, name: meta.label || slug, source: meta.source, date: meta.note, company: meta.company, contact: meta.contact });
  console.log(`\n▶ ${slug} (static)`);
}

// Variante de design (client.json → "variante": true): același conținut în toate skin-urile,
// la /_v/<slug>/<skin>/ + pagina de comparație /_v/<slug>/. Calea /_v/ nu e numărată în panou.
for (const slug of slugs.length ? readdirSync("clients").filter((d) => existsSync(join("clients", d, "client.json"))) : []) {
  const client = readClient(slug);
  if (!client.variante || (only && only !== slug && only !== client.landing?.newPath)) continue;
  const target = client.landing?.newPath && existsSync(join("clients", client.landing.newPath, "home.json")) ? client.landing.newPath : slug;
  if (!existsSync(join("clients", target, "home.json"))) continue; // client nou, încă fără home.json
  const home = JSON.parse(readFileSync(join("clients", target, "home.json"), "utf8"));
  const current = presetOf(home.site);
  const names = Object.keys(PRESETS);
  rmSync(join("dist", "_v", slug), { recursive: true, force: true });
  for (const skin of names) {
    console.log(`\n▶ ${slug} · varianta ${skin}`);
    const h = structuredClone(home); h.site.skin = PRESETS[skin].skin; h.site.layout = PRESETS[skin].layout;
    buildOne(h, client, join("dist", "_v", slug, skin), `/_v/${slug}/${skin}/`);
  }
  const cards = names.map((skin) => `<figure class="${skin === current ? "on" : ""}">
  <figcaption><strong>${skin}</strong>${skin === current ? " <span>· folosit acum</span>" : ""}<a href="/_v/${slug}/${skin}/" target="_blank">deschide ↗</a></figcaption>
  <div class="frame"><iframe src="/_v/${slug}/${skin}/" loading="lazy" tabindex="-1" title="${skin}"></iframe></div>
  <code>npm run reskin -- ${slug} ${skin}</code>
</figure>`).join("\n");
  writeFileSync(join("dist", "_v", slug, "index.html"), `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Variante ${client.company || slug}</title>
<style>body{font:15px/1.5 system-ui;margin:32px auto;max-width:1240px;padding:0 20px;color:#222;background:#f4f2ee}h1{font-size:24px;margin:0 0 4px}p{color:#666;margin:0 0 24px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(560px,1fr));gap:24px}
figure{margin:0;background:#fff;border:2px solid #e2ded6;border-radius:14px;padding:14px}figure.on{border-color:#2f6b4f}
figcaption{display:flex;gap:8px;align-items:baseline;margin-bottom:10px;font-size:16px}figcaption span{color:#2f6b4f;font-size:13px}figcaption a{margin-left:auto;font-size:14px}
.frame{width:100%;aspect-ratio:1280/800;overflow:hidden;border-radius:8px;border:1px solid #e2ded6;position:relative}
.frame iframe{width:1280px;height:800px;border:0;transform-origin:0 0;position:absolute;inset:0;pointer-events:none}
code{display:block;margin-top:10px;font-size:13px;color:#555;background:#f4f2ee;padding:6px 8px;border-radius:6px}</style></head>
<body><h1>Variante de design — ${client.company || slug}</h1><p>Același conținut, verificat, în fiecare variantă de design (culori + așezare). Alege una și rulează comanda de sub ea (sau spune-i lui Claude).</p>
<div class="grid">${cards}</div>
<script>function fit(){document.querySelectorAll(".frame").forEach(function(f){f.querySelector("iframe").style.transform="scale("+f.clientWidth/1280+")"})}addEventListener("resize",fit);fit();</script>
</body></html>`);
}

// Index privat (noindex) cu toate demo-urile existente în dist/.
const all = readdirSync("dist", { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== "_v").map((d) => d.name).sort();
const variante = existsSync("dist/_v") ? readdirSync("dist/_v") : [];
const rows = all.map((slug) => {
  const b = built.find((x) => x.slug === slug);
  const label = b ? `${b.name} <span style="color:#777">· ${b.source ?? ""} · ${b.date ?? ""}</span>` : slug;
  const r = b && slug.endsWith("-propunere") ? refTag(b.contact, b.company) : "";
  const share = r ? ` <br><small>link de trimis: <code>https://demo.digitalguild.agency/${slug}/?r=${r}</code></small>` : "";
  const v = variante.includes(slug) ? ` · <a href="/_v/${slug}/?eu=1">variante de design</a>` : "";
  return `<li><a href="/${slug}/?eu=1">${slug}</a> — ${label}${v}${share}</li>`;
}).join("\n");
writeFileSync("dist/index.html", `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Demo sites</title><style>body{font:16px/1.6 system-ui;max-width:720px;margin:48px auto;padding:0 20px;color:#222}li{margin:8px 0}</style></head><body><h1>Demo-uri de homepage</h1><ul>${rows}</ul></body></html>`);
writeFileSync("dist/robots.txt", "User-agent: *\nDisallow: /\n");
writeFileSync("dist/_headers", "/*\n  X-Robots-Tag: noindex, nofollow\n");
console.log(`\nGata: ${built.map((b) => b.slug).join(", ")} → dist/`);
