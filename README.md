# demo-sites — demo-uri de homepage pentru clienți, publicate pe demo.digitalguild.agency

Iei homepage-ul existent al unui client, îl pui pe un design curat, **fără să atingi conținutul**, și îi trimiți un link.
Conținutul rămâne verbatim; schimbarea lui e upsell-ul.

## Ce e înăuntru

| Fișier | Rol |
| --- | --- |
| `tools/extract.mjs` | Scoate conținutul brut al unui homepage în `raw.json` (texte, imagini, meniu, contact), în ordinea din DOM. Nu interpretează. |
| `MAPPING_PROMPT.md` | Promptul pentru Claude Code: transformă `raw.json` în `src/data/home.json` după reguli stricte (nimic inventat, nimic tăiat). |
| `src/data/home.schema.json` | Schema de conținut: 11 tipuri de secțiuni. |
| `tools/validate.mjs` | Verifică `home.json` contra schemei **și** că fiecare text există în `raw.json`. Prinde orice rescriere. |
| `src/components/sections/*.astro` | Un component per tip de secțiune. Citesc doar din JSON. |
| `src/pages/index.astro` | Compune pagina din `home.json`: o secțiune apare doar dacă există în JSON. |
| `src/styles/global.css` | Trei skin-uri (`calm`, `bold`, `warm`) ca variabile CSS; se alege din `home.json → site.skin`. |
| `clients/<slug>/home.json` | Un folder per client. `_exemplu` = toate secțiunile (date fictive); `devadent`, `just4kids` = teste reale. |
| `tools/build-all.mjs` | Construiește toate demo-urile în `dist/<slug>/` + index privat. E build command-ul din Cloudflare Pages. |

## Fluxul pentru un client (5 pași)

```bash
npm install                                  # o singură dată

# 1. Extracție (10 min)
node tools/extract.mjs https://site-client.ro        # → raw.json
# dacă site-ul randează totul din JS și raw.json iese gol: salvează pagina din browser (Ctrl+S, „HTML only”) și
node tools/extract.mjs pagina.html https://site-client.ro

# 2. Mapare (15–30 min, în Claude Code)
#    Deschide Claude Code în folderul ăsta și lipește conținutul din MAPPING_PROMPT.md.
#    Rezultat: src/data/home.json

# 3. Verificare (1 min)
node tools/validate.mjs                      # schema + „nimic inventat”

# 4. Build + verificare vizuală (5 min)
npm run dev                                  # http://localhost:4321
#    schimbă site.skin în home.json dacă vrei alt look (calm / bold / warm)

# 5. Publicare (2 min) — Cloudflare Pages e conectat la repo-ul GitHub `demo-sites`
mkdir clients/numeclient && mv src/data/home.json raw.json clients/numeclient/
git add clients/numeclient && git commit -m "demo: numeclient" && git push
#    Cloudflare rulează `npm run build:all` și publică la https://demo.digitalguild.agency/numeclient/
#    Index privat (noindex): https://demo.digitalguild.agency/
```

Pentru lucru local pe un client existent: `node tools/use.mjs clients/numeclient/home.json && npm run dev`.

Ca să vezi un exemplu fără să extragi nimic:

```bash
node tools/use.mjs clients/_exemplu/home.json && npm run dev
node tools/use.mjs clients/just4kids/home.json && npm run dev
```

## Setarea Cloudflare Pages (o singură dată)

1. GitHub: repo privat `demo-sites` (din acest folder: `git init && git add . && git commit -m init`, apoi `gh repo create demo-sites --private --source=. --push` sau push manual).
2. Cloudflare → Workers & Pages → Create → Pages → **Connect to Git** → alege `demo-sites`.
3. Build settings: Framework preset **None**; Build command `npm run build:all`; Build output directory `dist`; Node version: variabila `NODE_VERSION` = `22`.
4. După primul deploy: Custom domains → `demo.digitalguild.agency` (Cloudflare adaugă CNAME-ul singur dacă domeniul e în cont).
5. Opțional, ca demo-urile să nu fie accesibile oricui: Settings → **Access policy** (Cloudflare Access, gratuit până la 50 de utilizatori) sau lasă-le publice, dar neindexate (`robots.txt` + `X-Robots-Tag` sunt deja setate).

Fiecare `git push` pe `main` republică tot. Un demo vechi se scoate ștergând folderul lui din `clients/`.

## Regulile (le respectă și promptul, și validatorul)

1. **Nimic inventat.** Dacă sursa nu are testimoniale, demo-ul nu are testimoniale.
2. **Nimic tăiat.** Text prea lung pentru o secțiune scurtă → secțiune `longText` imediat după, integral.
3. **Secțiune goală = secțiune inexistentă.** Fără placeholder-e.
4. **Imagini sub 800px lățime nu intră în hero.** Hero-ul devine tipografic; pozele merg în galerie.
5. **Footer de demo fix:** „Conținutul este cel de pe site-ul actual, neschimbat.” Clientul vede exact ce i-ai promis.

## Ce am învățat din testul real (devadent.ro)

- Site WordPress 2017 cu Slider Revolution: **textul din slider nu există în HTML**, meniul e randat din JS, pagina nu are h1.
  Hero-ul a venit din `<title>` + meta description. Asta e normal pentru site-urile vechi — nu e eșec, e argumentul de vânzare.
- Validatorul a prins prima mea „corecție” (am schimbat un `;` în `,` în adresă). Bun semn: funcționează.
- Un homepage subțire dă un demo subțire. **Nu umple golul.** Golul e exact ce îi arăți clientului când vinzi pachetul de conținut.

## Calificare pentru demo gratuit

Faci demo gratuit doar dacă `extract.mjs` scoate conținut lizibil în 10 minute. Dacă site-ul e Elementor/Divi/Wix cu DOM
haotic sau totul e în slidere JS, demo-ul se face contra cost sau deloc.

## Legătura cu Lexington (Faza 1)

Componentele de aici sunt **ale tale** și sunt intenționat simple. Când cumperi Lexington, nu înlocuiești kitul: iei secțiuni
din temele lor (prin Lexington MCP, `get_sections`) și le adaptezi să citească aceleași câmpuri din `home.json`.
Schema rămâne, designul se îmbogățește. Așa se păstrează principiul „un singur motor, mai multe skin-uri”.

Din documentația lor: temele au `src/components/` (componente refolosibile), `src/content/` (collections pentru blog, echipă,
testimoniale) și `src/data/` (fișiere de date); textele din secțiunile de homepage sunt în `.astro`, nu în date — exact
partea pe care o înlocuiești cu `home.json`.

## Adaptare rapidă

- **Skin nou:** adaugi un bloc `[data-skin="numele-tau"]` în `src/styles/global.css`. Atât.
- **Tip de secțiune nou:** component nou în `src/components/sections/`, o linie în `map` din `index.astro`, definiție în schemă.
- **Agenția din footer:** `home.json → demo.agency`.
