#!/usr/bin/env node
/**
 * Capturi pentru landing-ul de propunere: clients/<slug>/shots/{before,after}-{fold,full}.jpg
 *   npm i --no-save playwright   (o singură dată, local; nu e dependență a build-ului)
 *   node tools/shots.mjs <slug> <urlActual> <urlPropunere>
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const [slug, before, after] = process.argv.slice(2);
if (!slug || !before || !after) { console.error("Folosire: node tools/shots.mjs <slug> <urlActual> <urlPropunere>"); process.exit(1); }
const dir = `clients/${slug}/shots`; mkdirSync(dir, { recursive: true });
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
async function shoot(url, name) {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto(url + (url.includes("?") ? "&" : "?") + "eu=1", { waitUntil: "networkidle", timeout: 90000 }).catch(() => {});
  await p.addStyleTag({ content: "*{opacity:1!important;transition:none!important;animation:none!important}.et_pb_section,.et_pb_row,.et_pb_module,.et-waypoint{opacity:1!important;visibility:visible!important}" }).catch(() => {});
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 150)); } window.scrollTo(0, 0); });
  await p.waitForTimeout(2500);
  await p.evaluate(() => document.querySelectorAll("video").forEach((v) => { v.pause(); }));
  await p.screenshot({ path: `${dir}/${name}-fold.jpg`, type: "jpeg", quality: 85 });
  await p.screenshot({ path: `${dir}/${name}-full.jpg`, type: "jpeg", quality: 80, fullPage: true });
  await p.close(); console.log("ok", name);
}
await shoot(before, "before"); await shoot(after, "after"); await b.close();
