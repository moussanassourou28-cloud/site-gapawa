/* Réponses HTTP communes aux fonctions de l'API. */
export const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY'
};

export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...SECURITY_HEADERS, ...extra }
  });
}

export const fail = (status, message, extra) => json({ ok: false, error: message }, status, extra);

/** Protection CSRF : en-tête personnalisé obligatoire + origine identique (le cookie est déjà SameSite=Strict). */
export function sameOriginWrite(req) {
  if (req.headers.get('x-gapawa-request') !== '1') return false;
  const origin = req.headers.get('origin');
  if (!origin) return true; // certains navigateurs omettent Origin en same-origin ; l'en-tête personnalisé suffit alors
  try { return new URL(origin).host === new URL(req.url).host; } catch { return false; }
}

export function clientIp(req, context) {
  return (context && context.ip) || req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'inconnu';
}
