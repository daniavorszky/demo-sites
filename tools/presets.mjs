// Presetări de design = skin (culori, fonturi) + așezare (hero, servicii). Conținutul nu se schimbă.
// Ordinea de aici e ordinea de pe pagina de variante (/_v/<slug>/).
export const PRESETS = {
  "editorial":          { skin: "editorial", layout: { hero: "split",    services: "columns" } },
  "editorial-cover":    { skin: "editorial", layout: { hero: "cover",    services: "rows" } },
  "editorial-centered": { skin: "editorial", layout: { hero: "centered", services: "cards" } },
  "calm":               { skin: "calm",      layout: { hero: "split",    services: "columns" } },
  "calm-centered":      { skin: "calm",      layout: { hero: "centered", services: "cards" } },
  "bold-cover":         { skin: "bold",      layout: { hero: "cover",    services: "cards" } },
  "bold-rows":          { skin: "bold",      layout: { hero: "centered", services: "rows" } },
  "warm":               { skin: "warm",      layout: { hero: "split",    services: "cards" } },
  "warm-cover":         { skin: "warm",      layout: { hero: "cover",    services: "columns" } },
};
export const presetOf = (site) => Object.entries(PRESETS).find(([, p]) =>
  p.skin === (site.skin || "calm") && p.layout.hero === (site.layout?.hero || "split") && p.layout.services === (site.layout?.services || "columns"))?.[0];
