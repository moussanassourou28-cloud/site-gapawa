/*
 * GET  /api/content : contenu publié (public — c'est le contenu du site).
 * PUT  /api/content : publication (session obligatoire + contrôle CSRF + contrôle de version).
 */
import { randomBytes } from 'node:crypto';
import { json, fail, sameOriginWrite } from './_lib/http.mjs';
import { getSession } from './_lib/auth.mjs';
import { contentStore } from './_lib/store.mjs';
import { migrate } from '../../site/assets/js/render.mjs';

const MAX_BYTES = 600 * 1024, KEEP_HISTORY = 20;

function validate(node, depth = 0) {
  if (depth > 8) throw new Error('structure trop profonde');
  if (node === null || typeof node === 'boolean' || typeof node === 'number') return;
  if (typeof node === 'string') { if (node.length > 8000) throw new Error('texte trop long'); return; }
  if (Array.isArray(node)) { if (node.length > 80) throw new Error('liste trop longue'); node.forEach((n) => validate(n, depth + 1)); return; }
  if (typeof node === 'object') {
    const keys = Object.keys(node);
    if (keys.length > 60) throw new Error('trop de champs');
    for (const k of keys) { if (!/^[A-Za-z0-9_]{1,40}$/.test(k)) throw new Error('champ invalide'); validate(node[k], depth + 1); }
    return;
  }
  throw new Error('valeur invalide');
}

export default async (req) => {
  const store = contentStore();

  if (req.method === 'GET') {
    const cur = await store.get('current', { type: 'json' });
    if (cur && cur.content) return json({ ok: true, content: cur.content, version: cur.version, updatedAt: cur.updatedAt, updatedBy: cur.updatedBy, source: 'publie' });
    let def = null;
    try { const r = await fetch(new URL('/content/default.json', req.url)); if (r.ok) def = await r.json(); } catch { /* ignoré */ }
    return json({ ok: true, content: def, version: null, updatedAt: null, updatedBy: null, source: 'initial' });
  }

  if (req.method === 'PUT') {
    const session = getSession(req);                       // droits vérifiés à chaque opération
    if (!session) return fail(401, 'Session expirée ou absente. Reconnectez-vous.');
    if (!sameOriginWrite(req)) return fail(403, 'Requête refusée.');
    const raw = await req.text();
    if (raw.length > MAX_BYTES) return fail(413, 'Contenu trop volumineux.');
    let body;
    try { body = JSON.parse(raw); } catch { return fail(400, 'Contenu illisible.'); }
    if (!body || typeof body.content !== 'object') return fail(400, 'Contenu manquant.');
    let content;
    try { validate(body.content); content = migrate(body.content); validate(content); }
    catch (e) { return fail(422, 'Contenu refusé : ' + e.message + '.'); }

    const cur = await store.get('current', { type: 'json' });
    const currentVersion = cur ? cur.version : null;
    if ((body.baseVersion || null) !== currentVersion) {
      return fail(409, 'Le site a été publié depuis un autre poste entre-temps. Rechargez le contenu publié avant de republier.', {});
    }
    const now = new Date().toISOString();
    if (cur) {
      await store.setJSON(`history/${now.replace(/[:.]/g, '-')}_${cur.version}`, cur, { metadata: { updatedAt: cur.updatedAt, updatedBy: cur.updatedBy } });
      const { blobs } = await store.list({ prefix: 'history/' });
      const old = blobs.map((b) => b.key).sort().reverse().slice(KEEP_HISTORY);
      await Promise.all(old.map((k) => store.delete(k)));
    }
    const next = { content, version: randomBytes(8).toString('hex'), updatedAt: now, updatedBy: session.user };
    await store.setJSON('current', next);
    return json({ ok: true, version: next.version, updatedAt: next.updatedAt, updatedBy: next.updatedBy });
  }

  return fail(405, 'Méthode non autorisée', { allow: 'GET, PUT' });
};
export const config = { path: '/api/content' };
