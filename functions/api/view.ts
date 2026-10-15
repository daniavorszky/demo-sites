// Notificare Slack + contor la deschiderea unui demo. Pagina trimite un beacon la /api/view (src/layouts/Layout.astro).
// Scrie în KV-ul partajat cu dga-propuneri (binding DESCHIDERI) sub cheia "demo:<slug>", ca să apară în același panou.
import { BOTS, device } from "../_lib/device";

interface Env { DESCHIDERI: KVNamespace; SLACK_WEBHOOK_URL?: string; PANOU_CALE?: string }

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const ua = request.headers.get("user-agent") || "";
  if (!ua || BOTS.test(ua)) return new Response(null, { status: 204 });

  let body: { path?: string; r?: string; name?: string } = {};
  try { body = await request.json(); } catch { return new Response(null, { status: 400 }); }

  const path = String(body.path || "").slice(0, 120);
  const m = path.match(/^\/([a-z0-9-]+)\/?$/i);
  if (!m || m[1].startsWith("_")) return new Response(null, { status: 204 }); // _exemplu nu se numără
  const slug = m[1];
  const client = String(body.name || "").replace(/[^\p{L}\p{N} .&_-]/gu, "").slice(0, 60) || slug.toUpperCase();
  const who = String(body.r || "").replace(/[^\p{L}\p{N} ._-]/gu, "").slice(0, 40);

  const cf = (request as unknown as { cf?: { city?: string; country?: string } }).cf || {};
  const place = [cf.city, cf.country].filter(Boolean).join(", ") || "locație necunoscută";
  const time = new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", dateStyle: "short", timeStyle: "short" }).format(new Date());

  const key = `demo:${slug}`;
  try {
    const prev = (await env.DESCHIDERI.get(key, "json") as Record<string, any>) || {};
    const persoane = { ...(prev.persoane || {}) };
    if (who) persoane[who] = (persoane[who] || 0) + 1;
    await env.DESCHIDERI.put(key, JSON.stringify({
      tip: "demo", slug, client, id: "",
      deschideri: (prev.deschideri || 0) + 1,
      prima: prev.prima || new Date().toISOString(),
      ultima: new Date().toISOString(),
      ultimaDe: who, ultimaLoc: place, ultimulDispozitiv: device(ua),
      persoane,
    }));
  } catch (e) { console.error("contor deschideri:", e); }

  const url = `https://demo.digitalguild.agency/${slug}/`;
  // Panoul e cel din dga-propuneri; PANOU_CALE (secret) trebuie să aibă aceeași valoare ca acolo.
  // Acceptă fie calea goală ("panou-abc"), fie URL-ul complet al panoului; păstrează doar ultimul segment.
  const cale = (env.PANOU_CALE || "").replace(/^https?:\/\/[^/]+/, "").replace(/^\/+|\/+$/g, "").split("/").pop() || "";
  const panou = cale ? ` · <https://propuneri.digitalguild.agency/${cale}/|Panou deschideri>` : "";
  const text = `*Demo ${client}* a fost deschis${who ? ` de *${who}*` : ""}\n${time} · ${place} · ${device(ua)}\n<${url}?eu=1|${url}>${panou}`;
  if (env.SLACK_WEBHOOK_URL) {
    waitUntil(fetch(env.SLACK_WEBHOOK_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) }).catch(() => {}));
  }
  return new Response(null, { status: 204 });
};
