# Prompt de mapare: homepage existent → `home.json`

Folosit cu Claude Code (sau orice agent) după ce `tools/extract.mjs` a produs `raw.json`.
Copiază tot textul de mai jos în agent, apoi atașează `raw.json`.

---

Ești responsabil cu maparea conținutului unui homepage existent pe schema `src/data/home.schema.json`.
Rezultatul este fișierul `src/data/home.json`. Lucrezi strict cu ce există în `raw.json`.

## Reguli absolute

1. **Nu inventa.** Niciun text, număr, nume, testimonial, serviciu sau imagine care nu apare în `raw.json`.
   Dacă schema are un câmp și sursa nu are conținut pentru el, câmpul lipsește.
2. **Nu tăia, nu rescrie, nu „îmbunătăți”.** Textul se copiază verbatim, inclusiv greșelile.
   Singurele transformări permise: eliminarea spațiilor duble și a textului de UI
   („Citește mai mult”, „Click aici”, cookie banner, meniu, footer legal).
3. **Secțiune fără conținut = secțiune care nu există.** Nu pune placeholder-e, nu pune „Lorem ipsum”.
4. **Text prea lung pentru secțiunea scurtă → `longText`.** Dacă un bloc „despre noi” are peste ~80 de cuvinte,
   pune primele 1–2 propoziții în `about.paragraphs[0]` și TOT restul, integral, într-o secțiune `longText`
   imediat după. Notează mutarea în `source.notes`.
5. **Ordinea secțiunilor = ordinea din sursă**, cu o singură excepție: `contact` merge întotdeauna ultimul.
6. **Imaginile se păstrează cu URL absolut din sursă.** Dacă `raw.json` dă dimensiuni sub 800px lățime
   pentru imaginea de hero, notează în `source.notes` „hero image sub 800px” și NU o pune în `hero.image`
   (hero-ul va fi tipografic). O pui în `gallery` dacă există galerie.
7. **Fiecare secțiune are `_source`:** o descriere scurtă de unde vine (ex. „blocul 4–7 din raw, h2 «Servicii»”).
8. **Limba**: cea a sursei. Nu traduce.

## Cum clasifici blocurile din `raw.json`

| Semnal în sursă | Tip de secțiune |
| --- | --- |
| Primul h1 + textul imediat de sub el + primul buton | `hero` |
| h2 urmat de 3+ elemente repetitive cu titlu (carduri, listă de servicii, iconițe) | `services` |
| h2 de tip „Despre”, „Cine suntem”, „Povestea noastră” + paragrafe | `about` (+ `longText` dacă e lung) |
| Nume de persoane + funcții (+ poze) | `team` |
| Citate cu nume de client, ghilimele, stele | `testimonials` |
| 4+ imagini consecutive fără text | `gallery` |
| Logo-uri de firme/certificări | `partners` |
| Perechi întrebare/răspuns | `faq` |
| Un singur titlu + un buton, spre final | `cta` |
| Telefon, email, adresă, program | `contact` (mai multe sedii → `addresses[]`, cu `label` exact ca pe site, ex. orașul) |
| Listă de dotări, etape, beneficii, activități (nu servicii vândute) + paragrafele din jur | `list` (paragraphs → listTitle → items → outro) |
| Orice paragraf lung care nu intră în cele de mai sus | `longText` |

Dacă un bloc nu se potrivește nicăieri și nu e text de UI, pune-l în `longText` — nu îl arunca.

## Output

1. Scrie `src/data/home.json` valid conform schemei.
2. Scrie în `source.notes` tot ce ai mutat, omis sau nu ai putut mapa, ca listă scurtă.
3. Răspunde în chat cu: numărul de secțiuni rezultate, lista tipurilor în ordine, și notele.
   Nu rezuma conținutul.

## Verificare înainte de a termina

- Rulează `node tools/validate.mjs` — trebuie să treacă.
- Caută în `home.json` orice text care nu apare în `raw.json`. Dacă găsești, șterge-l.
