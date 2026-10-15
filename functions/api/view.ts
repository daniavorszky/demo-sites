// Notificare Slack + contor la deschiderea unui demo. Pagina trimite un beacon la /api/view (src/layouts/Layout.astro).
// Scrie în KV-ul partajat cu dga-propuneri (binding DESCHIDERI) sub cheia "demo:<slug>", ca să apară în același panou.
import { BOTS, device } from "../_lib/device";

interface Env { DESCHIDERI: KVNamespace; SLACK_WEBHOOK_URL?: string }

// Diagnostic: GET /api/view?test=1 trimite un mesaj de test pe Slack și raportează dacă variabila și KV-ul sunt vizibile.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  if (url.searchParams.get("test") !== "1") return new Response(null, { status: 405 });
  const hook = env.SLACK_WEBHOOK_URL || "";
  let slack = "variabila lipseste";
  if (hook) {
    try {
      const r = await fetch(hook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "Test demo-sites: Slack functioneaza." }) });
      slack = `${r.status} ${(await r.text()).slice(0, 60)}`;
    } catch (e) { slack = `eroare fetch: ${String(e).slice(0, 80)}`; }
  }
  return Response.json({ slackVar: hook ? `setata (${hook.length} caractere, incepe cu ${hook.slice(0, 26)})` : "lipseste", slack, kv: !!env.DESCHIDERI });
};

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
  const text = `*Demo ${client}* a fost deschis${who ? ` de *${who}*` : ""}\n${time} · ${place} · ${device(ua)}\n<${url}?eu=1|${url}>`;
  if (env.SLACK_WEBHOOK_URL) {
    waitUntil(fetch(env.SLACK_WEBHOOK_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) }).catch(() => {}));
  }
  return new Response(null, { status: 204 });
};
