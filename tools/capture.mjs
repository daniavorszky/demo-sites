#!/usr/bin/env node
/**
 * Rulează în GitHub Actions (acces la orice site), nu în sandbox. Procesează fiecare requests/<slug>.json:
 *   { "slug": "davino",
 *     "extract": "https://davino.ro/",                         // opțional → clients/<slug>/raw.json (+ imagini randate)
 *     "pages": ["https://davino.ro/vinul"],                    // opțional: alte pagini, randate, în raw.json → pages
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

// Trece de porțile de vârstă (vinuri, tutun) și de bannerele de cookies, ca să vedem site-ul real.
async function passGates(p) {
  for (const re of ["^(am|i am|sunt) (peste )?18|^(da|yes)\\b|over 18|majorat", "accept|sunt de acord|agree|^ok$", "intr[aă] [iî]n (website|site)|enter (the )?(site|website)|^intr[aă]$|^continu"]) {
    const clicked = await p.evaluate((src) => {
      const re = new RegExp(src, "i");
      const lbl = (e) => (e.id && document.querySelector(`label[for="${e.id}"]`)?.innerText) || "";
      for (const e of document.querySelectorAll("label, input[type=radio], input[type=checkbox], button, a, [role=button], input[type=submit]")) {
        const t = ((e.innerText || e.value || "") + " " + lbl(e)).trim();
        if (re.test(t) && !/^(nu|no|not)\b/i.test(t)) { e.click(); return t.slice(0, 40); }
      }
      return null;
    }, re).catch(() => null);
    if (clicked) { console.log("  gate:", clicked); await p.waitForTimeout(1200); }
  }
  await p.waitForLoadState("networkidle").catch(() => {});
}

// Blocurile vizibile ale paginii, în ordine (după JS și după porți) — pentru site-urile unde HTML-ul brut e gol.
async function renderedBlocks(p) {
  return p.evaluate(() => {
    const out = [], seen = new Set();
    document.querySelectorAll("h1,h2,h3,h4,h5,p,li,blockquote,figcaption,td,img").forEach((e) => {
      if (e.closest("script,style,noscript")) return;
      const st = getComputedStyle(e); if (st.display === "none" || st.visibility === "hidden") return;
      if (e.tagName === "IMG") { if (e.naturalWidth >= 200) out.push({ kind: "img", src: e.currentSrc || e.src, alt: e.alt, width: e.naturalWidth, height: e.naturalHeight }); return; }
      if (e.tagName === "LI" && e.querySelector("p,li")) return;
      const t = (e.innerText || "").trim(); if (!t || t.length < 2 || seen.has(t)) return;
      seen.add(t); out.push({ kind: e.tagName.toLowerCase(), text: t, inNav: !!e.closest("nav,header,footer") });
    });
    return out;
  });
}

async function shoot(url, dir, name) {
  const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto(url + (url.includes("?") ? "&" : "?") + "eu=1", { waitUntil: "networkidle", timeout: 90000 }).catch(() => {});
  await passGates(p);
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
  await passGates(p);
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 200)); } });
  await p.waitForTimeout(2000);
  const out = await p.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")].map((i) => ({ src: i.currentSrc || i.src, width: i.naturalWidth, height: i.naturalHeight, alt: i.alt, kind: "img" })).filter((i) => i.width >= 200);
    const bgs = [...document.querySelectorAll("*")].map((e) => { const m = getComputedStyle(e).backgroundImage.match(/url\("?(.*?)"?\)/); return m && /\.(jpe?g|png|webp|avif)/i.test(m[1]) ? { src: m[1], kind: "background", near: (e.innerText || "").trim().slice(0, 80) } : null; }).filter(Boolean);
    const seen = new Set(); return [...imgs, ...bgs].filter((i) => !seen.has(i.src) && seen.add(i.src));
  });
  const text = await p.evaluate(() => document.body.innerText);
  const blocks = await renderedBlocks(p);
  const title = await p.title();
  await p.close();
  return { images: out, text, blocks, title };
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
        raw.pages = [{ url: req.extract, title: r.title, blocks: r.blocks }];
        let txt = `### ${req.extract}\n${r.text}\n`;
        for (const u of req.pages || []) {
          const q = await renderedImages(u);
          raw.pages.push({ url: u, title: q.title, blocks: q.blocks, images: q.images });
          txt += `\n### ${u}\n${q.text}\n`;
        }
        writeFileSync(`${dir}/raw.json`, JSON.stringify(raw, null, 2));
        writeFileSync(`${dir}/rendered.txt`, txt);
        status.ok.push(`extract (${r.blocks.length} blocuri, ${r.images.length} imagini; ${(req.pages || []).length} pagini în plus)`);
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
