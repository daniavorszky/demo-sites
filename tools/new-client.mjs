#!/usr/bin/env node
/**
 * Pornește un client nou: cere URL, numele firmei și persoana de contact, creează clients/<slug>/client.json
 * și rulează extracția. Apoi urmează maparea (MAPPING_PROMPT.md) → home.json.
 *
 *   node tools/new-client.mjs <slug>
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { refTag } from "./beacon.mjs";

const slug = process.argv[2];
if (!slug || !/^[a-z0-9-]+$/.test(slug)) { console.error("Folosire: node tools/new-client.mjs <slug>   (litere mici, cifre, cratimă)"); process.exit(1); }
const rl = createInterface({ input: stdin, output: stdout });
const url = (await rl.question("URL-ul site-ului actual: ")).trim();
const company = (await rl.question("Numele firmei (cum apare în email): ")).trim();
const contact = (await rl.question("Persoana de contact (prenume nume): ")).trim();
rl.close();

mkdirSync(`clients/${slug}`, { recursive: true });
const client = { url, company, contact, variante: true, createdAt: new Date().toISOString().slice(0, 10) };
writeFileSync(`clients/${slug}/client.json`, JSON.stringify(client, null, 2) + "\n");
console.log(`\nclients/${slug}/client.json scris.`);
try {
  execSync(`node tools/extract.mjs ${JSON.stringify(url)} clients/${slug}/raw.json`, { stdio: "inherit" });
} catch { console.error("Extracția a eșuat — vezi README (site randat din JS → salvează pagina și rulează extract.mjs pe fișier)."); }
console.log(`\nUrmează: deschide Claude Code, lipește MAPPING_PROMPT.md, cu raw.json din clients/${slug}/ → src/data/home.json → mută-l în clients/${slug}/home.json.`);
console.log(`Variante de design (după publish): https://demo.digitalguild.agency/_v/${slug}/?eu=1`);
console.log(`Link de trimis după publish: https://demo.digitalguild.agency/${slug}/?r=${refTag(contact, company)}`);
