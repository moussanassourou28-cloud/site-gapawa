import { json, fail, sameOriginWrite } from './_lib/http.mjs';
import { clearCookie } from './_lib/auth.mjs';

export default async (req) => {
  if (req.method !== 'POST') return fail(405, 'Méthode non autorisée', { allow: 'POST' });
  if (!sameOriginWrite(req)) return fail(403, 'Requête refusée.');
  return json({ ok: true }, 200, { 'set-cookie': clearCookie() });
};
export const config = { path: '/api/logout' };
