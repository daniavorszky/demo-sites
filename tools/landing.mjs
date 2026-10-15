#!/usr/bin/env node
/**
 * Generează landing page-ul de propunere pentru un client: static/<slug>-propunere/index.html
 *   node tools/landing.mjs <slug>
 * Citește clients/<slug>/client.json (url, company, contact, landing: { newPath, title?, intro? })
 * și capturile din clients/<slug>/shots/{before,after}-{fold,full}.jpg (vezi tools/shots.mjs).
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const slug = process.argv[2];
if (!slug) { console.error("Folosire: node tools/landing.mjs <slug>"); process.exit(1); }
const c = JSON.parse(readFileSync(`clients/${slug}/client.json`, "utf8"));
const agency = JSON.parse(readFileSync("agency.json", "utf8"));
const L = c.landing || {};
const newUrl = (L.newUrl || `/${L.newPath || slug}/`) + "?via=propunere";
const company = c.company || slug;
const title = L.title || `Site-ul ${company}, regândit`;
const intro = L.intro || "Același conținut, un design nou.";
const waText = encodeURIComponent(`Bună, am văzut propunerea pentru ${company} și aș vrea să discutăm.`);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

const out = `static/${slug}-propunere`;
mkdirSync(out, { recursive: true });
for (const f of ["after-fold.jpg", "before-full.jpg", "after-full.jpg"]) {
  const src = `clients/${slug}/shots/${f}`;
  if (!existsSync(src)) { console.error(`Lipsește ${src}`); process.exit(1); }
  copyFileSync(src, join(out, f));
}
writeFileSync(join(out, "_meta.json"), JSON.stringify({ label: `Propunere ${company}`, company, contact: c.contact || "", source: c.url, note: "landing before/after" }, null, 2));

const html = `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)} — propunere ${esc(agency.name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600&family=Fraunces:ital,opsz,wght@0,9..144,500;1,9..144,500&display=swap" rel="stylesheet">
<style>
:root{--bg:#f6f2ea;--bg-alt:#efe9df;--ink:#2a2622;--ink-soft:#6b645c;--rule:#dcd5c9;--accent:#2f6b4f;--accent-ink:#fff;--wa:#1f8f4e}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 Figtree,system-ui,sans-serif}
h1,h2{font-family:Fraunces,Georgia,serif;font-weight:500;letter-spacing:-.01em;line-height:1.1;margin:0}
.wrap{max-width:1180px;margin:0 auto;padding:0 20px}
header{display:flex;justify-content:space-between;align-items:center;padding:18px 0;border-bottom:1px solid var(--rule)}
header .brand{font-family:Fraunces,serif;font-size:20px}
header .for{font-size:14px;color:var(--ink-soft)}
.hero{padding:56px 0 28px;text-align:center}
.kicker{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);font-weight:600}
h1{font-size:clamp(34px,5.5vw,60px);margin:12px 0 14px}
h1 em{font-style:italic;color:var(--accent)}
.hero p{max-width:620px;margin:0 auto;color:var(--ink-soft);font-size:18px}
/* screenshot */
.shot{display:block;margin:28px auto 0;border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 24px 60px rgba(42,38,34,.18);border:1px solid var(--rule);text-decoration:none;transition:transform .2s}
.shot:hover{transform:translateY(-3px)}
.shot .chrome{display:flex;align-items:center;gap:6px;padding:10px 14px;background:var(--bg-alt);border-bottom:1px solid var(--rule)}
.shot .chrome span{width:10px;height:10px;border-radius:50%;background:#d6cfc3}
.shot .chrome em{margin-left:10px;font-style:normal;font-size:12px;color:var(--ink-soft)}
.shot img{display:block;width:100%;height:auto}
.hint a{color:var(--accent);font-weight:600;text-decoration:none}
/* slider (nefolosit) */
.ba{position:relative;aspect-ratio:16/10;border-radius:18px;overflow:hidden;box-shadow:0 24px 60px rgba(42,38,34,.18);background:#ddd;user-select:none;touch-action:none;margin:28px auto 0}
.ba img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top;display:block;pointer-events:none}
.ba .after{clip-path:inset(0 0 0 var(--x,50%))}
.ba .bar{position:absolute;top:0;bottom:0;left:var(--x,50%);width:2px;background:#fff;transform:translateX(-1px);box-shadow:0 0 0 1px rgba(0,0,0,.12)}
.ba .knob{position:absolute;top:50%;left:var(--x,50%);width:48px;height:48px;border-radius:50%;background:#fff;transform:translate(-50%,-50%);display:grid;place-items:center;box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:ew-resize;font-size:18px;color:var(--ink)}
.ba .tag{position:absolute;top:14px;padding:6px 12px;border-radius:999px;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;background:rgba(42,38,34,.78);color:#fff}
.ba .tag.l{left:14px}.ba .tag.r{right:14px;background:var(--accent)}
.ba input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:ew-resize;margin:0}
.hint{text-align:center;color:var(--ink-soft);font-size:14px;margin:14px 0 0}
/* columns */
.cols{display:grid;grid-template-columns:1fr 1fr;gap:28px;padding:56px 0}
@media(max-width:800px){.cols{grid-template-columns:1fr}}
.card{background:#fff;border:1px solid var(--rule);border-radius:18px;padding:22px;display:flex;flex-direction:column;gap:14px}
.card h2{font-size:26px}
.card .sub{color:var(--ink-soft);font-size:14px;margin:-8px 0 0}
.frame{height:520px;overflow-y:auto;border:1px solid var(--rule);border-radius:12px;background:var(--bg-alt)}
.frame img{width:100%;display:block}
.btn{display:inline-flex;align-items:center;gap:8px;padding:12px 20px;border-radius:999px;font-weight:600;text-decoration:none;border:1.5px solid var(--ink);color:var(--ink);align-self:flex-start}
.btn.primary{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
.btn.wa{background:var(--wa);border-color:var(--wa);color:#fff}
.btn.big{font-size:18px;padding:16px 28px}
/* cta */
.cta{background:var(--accent);color:#fff;border-radius:24px;padding:56px 28px;text-align:center;margin-bottom:56px}
.cta h2{font-size:clamp(28px,4vw,42px);color:#fff}
.cta p{max-width:560px;margin:12px auto 26px;color:rgba(255,255,255,.85)}
.cta .row{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.cta .btn{border-color:#fff;color:#fff}.cta .btn.wa{background:#fff;border-color:#fff;color:var(--accent)}
footer{border-top:1px solid var(--rule);padding:22px 0 40px;color:var(--ink-soft);font-size:13px;text-align:center}
</style>
</head>
<body>
<div class="wrap">
  <header><div class="brand">${esc(agency.name)}</div><div class="for">Propunere pentru <strong>${esc(company)}</strong></div></header>

  <section class="hero">
    <div class="kicker">Propunere de design</div>
    <h1>${esc(title).replace(/,\s*(\S+)$/, ', <em>$1</em>')}</h1>
    <p>${esc(intro)}</p>
    <a class="shot" href="${esc(newUrl)}" target="_blank" rel="noopener" aria-label="Deschide propunerea">
      <div class="chrome"><span></span><span></span><span></span><em>${esc((c.url || "").replace(/^https?:\/\//, "").replace(/\/$/, ""))}</em></div>
      <img src="after-fold.jpg" alt="Propunerea ${esc(agency.name)} pentru ${esc(company)}">
    </a>
    <p class="hint"><a href="${esc(newUrl)}" target="_blank" rel="noopener">Vezi propunerea completă ↗</a></p>
  </section>

  <section class="cols">
    <div class="card">
      <h2>Site-ul actual</h2>
      <p class="sub">${esc(c.url || "")}</p>
      <div class="frame"><img src="before-full.jpg" alt="Pagina întreagă a site-ului actual" loading="lazy"></div>
      <a class="btn" href="${esc(c.url || "#")}" target="_blank" rel="noopener">Deschide site-ul actual ↗</a>
    </div>
    <div class="card">
      <h2>Propunerea noastră</h2>
      <p class="sub">Același conținut, prezentat altfel</p>
      <div class="frame"><img src="after-full.jpg" alt="Pagina întreagă a propunerii" loading="lazy"></div>
      <a class="btn primary" href="${esc(newUrl)}" target="_blank" rel="noopener">Deschide propunerea ↗</a>
    </div>
  </section>

  <section class="cta" id="contact">
    <h2>Vrei să discutăm?</h2>
    <p>Îți spunem în 15 minute ce presupune trecerea la noul site: etape, durată, cost. Fără obligații.</p>
    <div class="row">
      <a class="btn wa big" href="https://wa.me/${esc(agency.whatsapp)}?text=${waText}" target="_blank" rel="noopener">Scrie-ne pe WhatsApp</a>
      <a class="btn big" href="tel:${esc(agency.phone.replace(/\s+/g, ""))}">Sună: ${esc(agency.phone)}</a>
    </div>
  </section>

  <footer>Propunere pregătită de <a href="${esc(agency.url)}" style="color:inherit">${esc(agency.name)}</a> pentru ${esc(company)}${c.contact ? ` · în atenția ${esc(c.contact)}` : ""}. Pagină privată, neindexată.</footer>
</div>
<script>
(function(){try{var r=new URLSearchParams(location.search).get("r");if(!r)return;
document.querySelectorAll('a[href*="via=propunere"]').forEach(function(a){a.href=a.href+"&r="+encodeURIComponent(r)})}catch(e){}})();
</script>
</body>
</html>
`;
writeFileSync(join(out, "index.html"), html);
console.log(`Scris ${out}/index.html → https://demo.digitalguild.agency/${slug}-propunere/`);
