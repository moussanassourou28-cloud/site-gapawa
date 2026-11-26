/* Historique des publications (20 dernières) — réservé aux administrateurs connectés. */
import { json, fail } from './_lib/http.mjs';
import { getSession } from './_lib/auth.mjs';
import { contentStore } from './_lib/store.mjs';

export default async (req, context) => {
  if (req.method !== 'GET') return fail(405, 'Méthode non autorisée', { allow: 'GET' });
  if (!getSession(req)) return fail(401, 'Session expirée ou absente. Reconnectez-vous.');
  const store = contentStore();
  const id = context && context.params && context.params.id;
  if (id) {
    if (!/^[A-Za-z0-9_-]{10,120}$/.test(id)) return fail(400, 'Identifiant invalide.');
    const entry = await store.get('history/' + id, { type: 'json' });
    return entry ? json({ ok: true, ...entry }) : fail(404, 'Version introuvable.');
  }
  const { blobs } = await store.list({ prefix: 'history/' });
  const keys = blobs.map((b) => b.key).sort().reverse().slice(0, 20);
  const items = await Promise.all(keys.map(async (k) => {
    const m = await store.getMetadata(k);
    return { id: k.slice('history/'.length), updatedAt: m && m.metadata ? m.metadata.updatedAt : null, updatedBy: m && m.metadata ? m.metadata.updatedBy : null };
  }));
  return json({ ok: true, items });
};
export const config = { path: ['/api/history', '/api/history/:id'] };
