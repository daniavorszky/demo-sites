#!/usr/bin/env node
/**
 * Rulează în GitHub Actions (acces la orice site), nu în sandbox. Procesează fiecare requests/<slug>.json:
 *   { "slug": "davino",
 *     "extract": "https://davino.ro/",                         // opțional → clients/<slug>/raw.json (+ imagini randate)
 *     "shots": [ { "name": "before", "url": "https://davino.ro/" },
 *                { "name": "after",  "build": "davino" } ] }     // build = construiește demo-ul local și îl fotografiază
 * Rezultat: fișierele în clients/<slug>/, starea în clients/<slug>/capture.json; cererea se șterge.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { execSync, spawn } from "node:child_process";
import { chromium } from "playwright";

const reqs = existsSync("requests") ? readdirSync("requests").filter((f) => f.endsWith(".json")) : [];
if (!reqs.length) { console.log("Nicio cerere."); process.exit(0); }
const browser = await chromium.launch();

async function shoot(url, dir, name) {
  const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto(url + (url.includes("?") ? "&" : "?") + "eu=1", { waitUntil: "networkidle", timeout: 90000 }).catch(() => {});
  await p.addStyleTag({ content: "*{opacity:1!important;transition:none!important;animation:none!important}.et_pb_section,.et_pb_row,.et_pb_module,.et-waypoint{opacity:1!important;visibility:visible!important}" }).catch(() => {});
  await p.evaluate(async () => { document.querySelectorAll('img[loading="lazy"]').forEach((i) => (i.loading = "eager")); for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 150)); } window.scrollTo(0, 0); });
  await p.waitForTimeout(2500);
  await p.evaluate(() => { document.querySelectorAll("div").forEach((d) => { if (/^Deschideri ignorate/.test(d.textContent || "") && d.children.length === 0) d.remove(); }); document.querySelectorAll("video").forEach((v) => v.pause()); });
  await p.screenshot({ path: `${dir}/${name}-fold.jpg`, type: "jpeg", quality: 85 });
  await p.screenshot({ path: `${dir}/${name}-full.jpg`, type: "jpeg", quality: 80, fullPage: true });
  await p.close();
}

// Imaginile pe care pagina le afișează efectiv (inclusiv fundaluri CSS, lazy-load) — HTML-ul brut nu le arată mereu.
async function renderedImages(url) {
  const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto(url, { waitUntil: "networkidle", timeout: 90000 }).catch(() => {});
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 200)); } });
  await p.waitForTimeout(2000);
  const out = await p.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")].map((i) => ({ src: i.currentSrc || i.src, width: i.naturalWidth, height: i.naturalHeight, alt: i.alt, kind: "img" })).filter((i) => i.width >= 200);
    const bgs = [...document.querySelectorAll("*")].map((e) => { const m = getComputedStyle(e).backgroundImage.match(/url\("?(.*?)"?\)/); return m && /\.(jpe?g|png|webp|avif)/i.test(m[1]) ? { src: m[1], kind: "background", near: (e.innerText || "").trim().slice(0, 80) } : null; }).filter(Boolean);
    const seen = new Set(); return [...imgs, ...bgs].filter((i) => !seen.has(i.src) && seen.add(i.src));
  });
  const text = await p.evaluate(() => document.body.innerText);
  await p.close();
  return { images: out, text };
}

const serve = (port) => { const s = spawn("npx", ["serve", "dist", "-l", String(port)], { stdio: "ignore", detached: true }); return s; };

for (const f of reqs) {
  const req = JSON.parse(readFileSync(`requests/${f}`, "utf8"));
  const slug = req.slug || f.replace(/\.json$/, "");
  const dir = `clients/${slug}`, shotsDir = `${dir}/shots`;
  mkdirSync(shotsDir, { recursive: true });
  const status = { at: new Date().toISOString(), request: req, ok: [], errors: [] };
  try {
    if (req.extract) {
      try {
        execSync(`node tools/extract.mjs ${JSON.stringify(req.extract)} ${dir}/raw.json`, { stdio: "inherit" });
        const raw = JSON.parse(readFileSync(`${dir}/raw.json`, "utf8"));
        const r = await renderedImages(req.extract);
        raw.renderedImages = r.images;
        writeFileSync(`${dir}/raw.json`, JSON.stringify(raw, null, 2));
        writeFileSync(`${dir}/rendered.txt`, r.text);
        status.ok.push(`extract (${r.images.length} imagini randate)`);
      } catch (e) { status.errors.push(`extract: ${e.message}`); }
    }
    for (const s of req.shots || []) {
      try {
        let url = s.url, srv;
        if (s.build) {
          execSync(`node tools/build-all.mjs ${s.build}`, { stdio: "inherit" });
          srv = serve(5400); await new Promise((r) => setTimeout(r, 3000));
          url = `http://localhost:5400/${s.build}/`;
        }
        try { await shoot(url, shotsDir, s.name); } finally { if (srv) try { process.kill(-srv.pid); } catch {} }
        status.ok.push(`shot ${s.name}`);
      } catch (e) { status.errors.push(`shot ${s.name}: ${e.message}`); }
    }
  } finally {
    writeFileSync(`${dir}/capture.json`, JSON.stringify(status, null, 2));
    rmSync(`requests/${f}`);
    console.log(slug, status.ok, status.errors);
  }
}
await browser.close();
