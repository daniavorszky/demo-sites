#!/usr/bin/env node
/**
 * Pasul final, după ce ai ales varianta de design:
 *   node tools/finalize.mjs <slug> <varianta> [--push]
 * Aplică varianta pe demo, oprește pagina de variante (build mai rapid), face capturile (site actual + propunere),
 * generează landingul /<slug>-propunere/ cu datele din client.json și afișează linkul de trimis clientului.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync, spawn } from "node:child_process";
import { PRESETS } from "./presets.mjs";
import { refTag } from "./beacon.mjs";

const [slug, variant] = process.argv.slice(2);
const push = process.argv.includes("--push");
if (!slug || !PRESETS[variant]) { console.error(`Folosire: node tools/finalize.mjs <slug> <varianta> [--push]\nVariante: ${Object.keys(PRESETS).join(", ")}`); process.exit(1); }

const cp = `clients/${slug}/client.json`;
const client = JSON.parse(readFileSync(cp, "utf8"));
const target = client.landing?.newPath && existsSync(`clients/${client.landing.newPath}/home.json`) ? client.landing.newPath : slug;
const hp = `clients/${target}/home.json`;
const home = JSON.parse(readFileSync(hp, "utf8"));
home.site.skin = PRESETS[variant].skin;
home.site.layout = PRESETS[variant].layout;
writeFileSync(hp, JSON.stringify(home, null, 2) + "\n");

client.variante = false;
client.landing = { ...(client.landing || {}), newPath: target, varianta: variant };
writeFileSync(cp, JSON.stringify(client, null, 2) + "\n");
console.log(`${target}: varianta ${variant}; pagina de variante oprită.`);

execSync(`node tools/build-all.mjs ${target}`, { stdio: "inherit" });
const port = 5200 + Math.floor(Math.random() * 500);
const srv = spawn("npx", ["serve", "dist", "-l", String(port)], { stdio: "ignore", detached: true });
await new Promise((r) => setTimeout(r, 3000));
try {
  execSync(`node tools/shots.mjs ${slug} ${JSON.stringify(client.url)} http://localhost:${port}/${target}/`, { stdio: "inherit" });
  execSync(`node tools/landing.mjs ${slug}`, { stdio: "inherit" });
} finally { try { process.kill(-srv.pid); } catch {} }

const link = `https://demo.digitalguild.agency/${slug}-propunere/?r=${refTag(client.contact, client.company)}`;
if (push) execSync(`git add clients/${slug} clients/${target} static/${slug}-propunere && git commit -m "propunere ${slug}: ${variant}" && git push`, { stdio: "inherit" });
console.log(`\n${push ? "Publicat (în ~2 min)." : "Gata local; publică cu git push."}`);
console.log(`Verifică: https://demo.digitalguild.agency/${slug}-propunere/?eu=1`);
console.log(`Link de trimis lui ${client.contact || "client"}: ${link}`);
