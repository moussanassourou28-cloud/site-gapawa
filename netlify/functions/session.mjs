import { json } from './_lib/http.mjs';
import { getSession, isConfigured } from './_lib/auth.mjs';

export default async (req) => {
  if (req.method !== 'GET') return json({ ok: false, error: 'Méthode non autorisée' }, 405, { allow: 'GET' });
  const s = getSession(req);
  return json({ ok: true, configured: isConfigured(), authenticated: !!s, user: s ? s.user : null, expires: s ? s.exp : null });
};
export const config = { path: '/api/session' };
