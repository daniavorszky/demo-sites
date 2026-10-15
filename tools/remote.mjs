#!/usr/bin/env node
/**
 * Trimite o cerere de captură către GitHub Actions și așteaptă rezultatul (sandbox-ul nu ajunge la site-urile clienților).
 *   node tools/remote.mjs <slug> --extract <url> [--page <url> …] [--shot before=<url>] [--shot after=build:<demoSlug>]
 * Scrie requests/<slug>.json, face commit + push, apoi trage repo-ul până apare clients/<slug>/capture.json nou.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const slug = args[0];
if (!slug) { console.error("Folosire: node tools/remote.mjs <slug> [--extract <url>] [--shot nume=<url>|nume=build:<demo>]"); process.exit(1); }
const req = { slug, shots: [] };
for (let i = 1; i < args.length; i++) {
  if (args[i] === "--extract") req.extract = args[++i];
  else if (args[i] === "--page") (req.pages ||= []).push(args[++i]);
  else if (args[i] === "--shot") { const [name, v] = args[++i].split(/=(.*)/s); req.shots.push(v.startsWith("build:") ? { name, build: v.slice(6) } : { name, url: v }); }
}
mkdirSync("requests", { recursive: true });
req.id = Date.now().toString(36);
writeFileSync(`requests/${slug}.json`, JSON.stringify(req, null, 2) + "\n");
const sh = (c) => execSync(c, { stdio: "pipe" }).toString().trim();
sh(`git add requests/${slug}.json && git commit -q -m "capture request: ${slug}" && git push -q`);
console.log(`Cerere trimisă (${req.id}); aștept GitHub Actions…`);

const statusFile = `clients/${slug}/capture.json`;
const t0 = Date.now();
while (Date.now() - t0 < 15 * 60 * 1000) {
  await new Promise((r) => setTimeout(r, 20000));
  try { sh("git pull -q --rebase"); } catch { continue; }
  if (existsSync(statusFile)) {
    const st = JSON.parse(readFileSync(statusFile, "utf8"));
    if (st.request?.id === req.id) {
      console.log("Gata:", st.ok.join(", ") || "-");
      if (st.errors.length) { console.log("Erori:", st.errors.join(" | ")); process.exit(2); }
      process.exit(0);
    }
  }
  process.stdout.write(".");
}
console.error("\nTimeout: verifică tab-ul Actions din GitHub (workflow „capture”).");
process.exit(3);
