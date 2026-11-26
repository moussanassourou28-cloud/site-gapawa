import { json, fail, sameOriginWrite, clientIp } from './_lib/http.mjs';
import { attemptLogin, sessionCookie } from './_lib/auth.mjs';

export default async (req, context) => {
  if (req.method !== 'POST') return fail(405, 'Méthode non autorisée', { allow: 'POST' });
  if (!sameOriginWrite(req)) return fail(403, 'Requête refusée.');
  let body;
  try { body = await req.json(); } catch { return fail(400, 'Requête invalide.'); }
  const r = await attemptLogin(body && body.username, body && body.password, clientIp(req, context));
  if (!r.ok) return fail(r.status, r.error);
  return json({ ok: true, user: r.user }, 200, { 'set-cookie': sessionCookie(r.token) });
};
export const config = { path: '/api/login' };
