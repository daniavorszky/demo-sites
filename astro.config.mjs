import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// BASE este setat de tools/build-all.mjs la /<slug>/ pentru fiecare client; local rămâne "/".
const base = process.env.BASE || "/";
export default defineConfig({
  output: "static",
  base,
  vite: { plugins: [tailwindcss()] },
});
