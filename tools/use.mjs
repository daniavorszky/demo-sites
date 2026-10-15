#!/usr/bin/env node
// Pune un home.json de demo pe poziție: node tools/use.mjs examples/devadent/home.json
import { copyFileSync } from "node:fs";
const src = process.argv[2];
if (!src) { console.error("Folosire: node tools/use.mjs <cale/home.json>"); process.exit(1); }
copyFileSync(src, "src/data/home.json");
console.log(`src/data/home.json ← ${src}`);
