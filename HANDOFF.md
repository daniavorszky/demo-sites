# HANDOFF — demo-sites (propuneri de homepage pentru clienți)

Ultima actualizare: 2026-10-15. Proprietar: Dan (Digital Guild / NEOCOMM BUSINESS DISTRIBUTION S.R.L.).

## Obiectiv

Produsul validat: clienți cu site-uri pe care nu le mai pot administra → le refacem static (Astro + Git + Cloudflare) și le dăm
un agent AI (Formwise, white-label, BYOK, prin MCP) pentru modificări. Acest repo e **pâlnia de vânzare**: pentru fiecare
prospect facem un homepage nou **cu conținutul lui exact** (rescrierea conținutului = upsell), îl publicăm privat și îi trimitem
un **landing de propunere** cu link urmărit (deschideri în panou + Slack).

## Decizii luate

| Decizie | Motiv |
| --- | --- |
| Conținut **verbatim** — nimic inventat, nimic tăiat; validatorul o impune | Promisiunea către client; conținutul nou e upsell |
| Un singur motor (Astro 7 + Tailwind 4, `home.json` → componente) + skin-uri, nu template-uri importate | Fidelitate garantată, cost 0 per client |
| Hosting: **Cloudflare Pages + GitHub** (nu Netlify) | Setat deja; Dan a cerut explicit |
| Repo separat de `dga-propuneri` (propunerile agenției) | Fluxuri diferite; panoul de deschideri e comun (același KV) |
| **Shuffle doar pentru clienți calzi**, nu pentru prospectare | Test 15 oct: ~319k tokeni ≈ 8–11 $/generare, 67% text, 0 imagini din site, „34K” în loc de „J4K” |
| Landing **fără** slider before/after — doar captura above-the-fold a propunerii + 2 coloane + CTA | Cererea lui Dan (nu arătăm vizual site-ul vechi în hero) |
| Redesign = alegere dintre **9 variante** (skin + așezare), nu regenerare | Instant, gratuit, conținutul rămâne verificat |
| Extracția și capturile rulează în **GitHub Actions**, nu în sandbox | Sandbox-ul Claude are allowlist de domenii; așa nu mai adaugi domenii per client |
| Fără Cloudflare Access pe demo-uri; doar `noindex` + link urmărit | Dan nu vrea acces cu email |

## Fluxul (3 pași din partea lui Dan)

1. Dan dă: **URL, numele firmei, persoana de contact**.
2. Claude: captură prin GitHub Actions → mapare în `home.json` → validare → push → îi dă linkul **paginii de variante**
   `https://demo.digitalguild.agency/_v/<slug>/?eu=1`.
3. Dan alege varianta → Claude rulează `finalizeaza` → îi dă **linkul de trimis** `https://demo.digitalguild.agency/<slug>-propunere/?r=Contact_Firma`.

## Ce e construit

Repo: `github.com/daniavorszky/demo-sites` (branch `main`). Pe Mac: `~/Code/demo-sites` (fă `git pull`).
Publicat la `https://demo.digitalguild.agency/` (Cloudflare Pages, proiect `demo-sites`, build `npm run build:all`, output `dist`, `NODE_VERSION=22`).

```
clients/<slug>/
  client.json        url, company, contact, variante (true până la alegere), landing { newPath, varianta }
  raw.json           extracția (blocuri HTML + pages[] randate după porți de vârstă/cookies + renderedImages)
  rendered.txt       textul vizibil al paginilor extrase
  home.json          conținutul demo-ului (schema src/data/home.schema.json)
  shots/             before-*/after-* (fold + full) pentru landing
  capture.json       starea ultimei cereri de captură
static/<slug>/       pagini statice copiate ca atare (exporturi Shuffle, landinguri <slug>-propunere); beacon injectat la build
requests/            cereri de captură; le consumă workflow-ul `capture`
src/                 motorul Astro: layouts/Layout.astro (header, footer, beacon), components/sections/*.astro, styles/global.css (skin-uri)
functions/api/view.ts  Pages Function: numără deschiderile în KV `demo:<slug>`, trimite Slack (nu și când ?via=propunere)
tools/
  new-client.mjs     (local, interactiv) client.json + extracție
  remote.mjs         trimite o cerere în requests/ și așteaptă GitHub Actions  → npm run capture
  capture.mjs        rulează în Actions: extracție, porți de vârstă/cookies, pagini în plus, capturi, build:<demo>
  extract.mjs        extracția HTML brut → raw.json
  validate.mjs       schema + „nimic inventat” (fiecare text există în raw.json)
  build-all.mjs      toate demo-urile + static/ + variantele /_v/<slug>/ + index privat
  presets.mjs        cele 9 variante (skin × hero × servicii)
  reskin.mjs         schimbă varianta unui demo deja finalizat
  finalize.mjs       aplică varianta, oprește variantele, capturi, landing, link de trimis
  landing.mjs        generează static/<slug>-propunere/ din client.json + agency.json + shots/
  shots.mjs          capturi locale (doar pentru site-uri accesibile din sandbox)
  fidelity.mjs       raport de fidelitate pentru exporturi Shuffle față de raw.json
  beacon.mjs         scriptul de urmărire + refTag(contact, firmă)
agency.json          numele agenției, telefon 0722 961 963, WhatsApp 40722961963, email
.github/workflows/capture.yml   pornește la push în requests/*.json; commit „[skip ci] capture: …”
MAPPING_PROMPT.md    regulile de mapare raw.json → home.json
```

**Skin-uri:** `editorial` (Fraunces + Figtree, crem, verde), `calm`, `bold`, `warm`. **Așezări:** hero `split | cover | centered`,
servicii `columns | cards | rows`. **Secțiuni:** hero, services, about, list (cu imagine opțională), longText, team, testimonials,
gallery, partners, faq, cta, contact.

**Urmărire:** beacon client-side (o dată pe sesiune) → `/api/view` → KV `DESCHIDERI` (id `b7bbecd0c39e4526a978ade23fd0f1ee`, comun cu
dga-propuneri) → Slack. `?eu=1` marchează browserul tău (nu te numără), `?eu=0` anulează, `?r=Nume` = cine a deschis,
`?via=propunere` = deschis din landing (numărat, fără Slack). Panoul: `https://propuneri.digitalguild.agency/<PANOU_CALE>/`.

## Stadiu clienți

| Client | Stadiu | Linkuri |
| --- | --- | --- |
| Just4Kids (contact Florin) | Finalizat, varianta editorial, gata de trimis | `/just4kids-propunere/?r=Florin_Just4Kids` · demo `/just4kids-editorial/` |
| Davino (contact Stefan) | Demo + variante publicate; **așteaptă alegerea variantei** | `/_v/davino/?eu=1` |
| devadent, _exemplu | Teste vechi | — |

Note Davino: homepage-ul are doar hero-ul; restul secțiunilor (Vinuri, Terroir, Experienta, Contact) vin verbatim din paginile
lor; site cu poartă 18+; al doilea sediu (Ceptura) nu încape în componenta de contact (o singură adresă) — de rezolvat la nevoie.

## Ce a rămas de făcut

- [ ] Davino: Dan alege varianta → `npm run finalizeaza -- davino <varianta> --push` (capturile „after” rulează acum în
      GitHub Actions prin `remote.mjs`; „before” există deja din capture). Prima rulare reală — urmărește tab-ul Actions.
- [x] `finalize.mjs`: capturi prin GitHub Actions implicit (cere `--push`); `--local` păstrează varianta cu `shots.mjs`. (2026-10-15)
- [x] Componenta contact: `addresses[]` cu `label` verbatim (Davino: Bucuresti + Ceptura); validator OK, build:all OK. (2026-10-15)
- [ ] `PANOU_CALE` în Cloudflare (demo-sites) trebuie să fie doar calea (`panou-…`), nu URL întreg — codul tolerează, dar corectează.
- [ ] Opțional: preluat imagini mai mari din site (hero-ul J4K are doar 1024 px, se vede moale în variantele `cover`).
- [ ] Opțional: întrebările Formwise pentru AppSumo (versiunea ≤850 caractere e în conversația din 15 oct), decizie template-uri
      (Tailwind Plus recomandat dacă se cumpără), ~1,25M tokeni Shuffle rămași pentru clienți calzi.
- [ ] Documente: business plan („Static Site + AI Edits — Concept & 90-Day Plan”) și „Landing de propunere — sumar și flux” (Claude Docs).

## Constrângeri și preferințe de lucru

- Comunicare în **română**; pași „cât mai detaliat și acționabil” când Dan îi cere; răspunsuri scurte, bottom-line first.
- **Conținutul clientului nu se atinge** (nici alt-uri inventate — validatorul le prinde). Ce lipsește se notează în `source.notes`.
- Nu Netlify. GitHub + Cloudflare Pages.
- Dan nu vrea pași manuali repetitivi (ex. domenii în Capabilities per client) — automatizează.
- Cost per client cât mai aproape de 0; fără generări plătite fără acordul lui.
- Cu `wrangler.toml` în repo, variabilele din dashboard de tip **Text** se șterg la deploy → se pun ca **Secret**
  (`SLACK_WEBHOOK_URL`, `PANOU_CALE`).
- Deschide-ți propriile linkuri cu `?eu=1`.
- Pe Mac mini, clona `~/Code/demo-sites` merge local (după `npm ci` pe macOS — `node_modules` din clona Linux nu are binarele rolldown).

## Comenzi

```bash
npm install
# client nou (din sandbox, fără acces direct la site):
node tools/remote.mjs <slug> --extract https://site.ro/ [--page https://site.ro/despre …] --shot before=https://site.ro/
#   → clients/<slug>/raw.json, rendered.txt, shots/before-*; apoi mapare (MAPPING_PROMPT.md) → clients/<slug>/home.json
node tools/use.mjs clients/<slug>/home.json && node tools/validate.mjs src/data/home.json clients/<slug>/raw.json
node tools/build-all.mjs <slug>          # build local al unui client (+ variante dacă variante:true)
git add -A && git commit -m "demo: <slug>" && git push   # Cloudflare publică în ~3–5 min
# după alegerea variantei:
npm run finalizeaza -- <slug> <varianta> --push          # capturi în Actions (--local = shots.mjs local); variante: editorial, editorial-cover, editorial-centered, calm,
                                                          # calm-centered, bold-cover, bold-rows, warm, warm-cover
npm run reskin -- <slug> <varianta> --push               # schimbă varianta după finalizare
npm run build:all                                         # tot site-ul (ce rulează Cloudflare)
node tools/fidelity.mjs <export.html> clients/<slug>/raw.json   # verificare export Shuffle
npx @shuffle-dev/cli redesign create <url> "<prompt>" -m claude-opus-5-5 --download <dir> --screenshot   # doar clienți calzi
```
