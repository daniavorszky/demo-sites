// Shared by /api/view (Slack + counter) and the panel.
export const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|slack|whatsapp|telegram|discord|linkedin|skype|outlook|safelinks|proofpoint|mimecast|barracuda|headless|lighthouse|curl|wget|python|go-http/i;

export function device(ua: string): string {
  const d = /iPad|Tablet/i.test(ua) ? "tabletă" : /Mobi|Android|iPhone/i.test(ua) ? "mobil" : "desktop";
  const b = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "alt browser";
  return `${d}, ${b}`;
}
