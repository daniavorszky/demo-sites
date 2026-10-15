#!/usr/bin/env node
/**
 * Schimbă designul propunerii unui client, fără să atingă conținutul.
 *   node tools/reskin.mjs <slug> <skin> [--push]
 * <slug> = clientul din landing (ex. just4kids); dacă landing-ul arată alt demo (client.json → landing.newPath),
 * se schimbă skin-ul acelui demo. Apoi: build, captură nouă above-the-fold, landing regenerat, opțional commit+push.
 * Variantele disponibile le vezi la https://demo.digitalguild.agency/_v/<slug>/
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync, spawn } from "node:child_process";
import { PRESETS } from "./presets.mjs";

const [slug, skin] = process.argv.slice(2);
const push = process.argv.includes("--push");
if (!slug || !PRESETS[skin]) { console.error(`Folosire: node tools/reskin.mjs <slug> <varianta> [--push]\nVariante: ${Object.keys(PRESETS).join(", ")}`); process.exit(1); }

const client = JSON.parse(readFileSync(`clients/${slug}/client.json`, "utf8"));
const target = client.landing?.newPath && existsSync(`clients/${client.landing.newPath}/home.json`) ? client.landing.newPath : slug;
const hp = `clients/${target}/home.json`;
const home = JSON.parse(readFileSync(hp, "utf8"));
console.log(`${target}: ${home.site.skin || "calm"} → ${skin}`);
home.site.skin = PRESETS[skin].skin;
home.site.layout = PRESETS[skin].layout;
writeFileSync(hp, JSON.stringify(home, null, 2) + "\n");

execSync(`node tools/build-all.mjs ${target}`, { stdio: "inherit" });
const port = 5200 + Math.floor(Math.random() * 500);
const srv = spawn("npx", ["serve", "dist", "-l", String(port)], { stdio: "ignore", detached: true });
await new Promise((r) => setTimeout(r, 3000));
try {
  execSync(`node tools/shots.mjs ${slug} - http://localhost:${port}/${target}/`, { stdio: "inherit" });
  execSync(`node tools/landing.mjs ${slug}`, { stdio: "inherit" });
} finally { try { process.kill(-srv.pid); } catch {} }

if (push) {
  execSync(`git add clients/${target}/home.json clients/${slug}/shots static/${slug}-propunere && git commit -m "reskin ${target}: ${skin}" && git push`, { stdio: "inherit" });
  console.log(`\nPublicat. Landing: https://demo.digitalguild.agency/${slug}-propunere/ (în ~2 min)`);
} else console.log(`\nGata local. Publică cu: git add -A && git commit -m "reskin ${target}: ${skin}" && git push`);
