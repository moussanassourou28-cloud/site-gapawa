/*
 * POST /api/media      : téléversement d'une image (session obligatoire, contrôle CSRF, types et taille vérifiés).
 * GET  /api/media/:id  : diffusion publique de l'image (les images du site sont publiques par nature).
 */
import { randomBytes } from 'node:crypto';
import { json, fail, sameOriginWrite } from './_lib/http.mjs';
import { getSession } from './_lib/auth.mjs';
import { mediaStore } from './_lib/store.mjs';

const MAX = 5 * 1024 * 1024;
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/svg+xml': 'svg' };

function sniff(buf) {
  const b = new Uint8Array(buf.slice(0, 16));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  const head = new TextDecoder().decode(buf.slice(0, 2048)).trim().toLowerCase();
  if ((head.startsWith('<svg') || head.startsWith('<?xml')) && head.includes('<svg')) return 'image/svg+xml';
  return null;
}

export default async (req, context) => {
  const id = context && context.params && context.params.id;

  if (req.method === 'GET' && id) {
    if (!/^[a-f0-9]{24}\.(jpg|png|webp|svg)$/.test(id)) return new Response('Introuvable', { status: 404 });
    const entry = await mediaStore().getWithMetadata(id, { type: 'arrayBuffer' });
    if (!entry) return new Response('Introuvable', { status: 404 });
    const type = (entry.metadata && entry.metadata.type) || 'application/octet-stream';
    return new Response(entry.data, { headers: {
      'content-type': type,
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
      // une image ne doit jamais pouvoir exécuter de script, même ouverte directement (cas des SVG)
      'content-security-policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
      'cross-origin-resource-policy': 'same-origin'
    } });
  }

  if (req.method === 'POST' && !id) {
    const session = getSession(req);
    if (!session) return fail(401, 'Session expirée ou absente. Reconnectez-vous.');
    if (!sameOriginWrite(req)) return fail(403, 'Requête refusée.');
    let form;
    try { form = await req.formData(); } catch { return fail(400, 'Envoi illisible.'); }
    const file = form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') return fail(400, 'Aucun fichier reçu.');
    if (file.size > MAX) return fail(413, 'Image trop lourde (5 Mo maximum).');
    const buf = await file.arrayBuffer();
    const type = sniff(buf);
    if (!type || !TYPES[type]) return fail(415, 'Format non accepté. Utilisez JPG, PNG, WebP ou SVG.');
    if (type === 'image/svg+xml') {
      const txt = new TextDecoder().decode(buf).toLowerCase();
      if (/<script|javascript:|\son[a-z]+\s*=|<foreignobject/.test(txt)) return fail(415, 'Ce SVG contient du code actif et a été refusé.');
    }
    const key = randomBytes(12).toString('hex') + '.' + TYPES[type];
    await mediaStore().set(key, buf, { metadata: { type, name: String(file.name || '').slice(0, 120), by: session.user, at: new Date().toISOString() } });
    return json({ ok: true, url: '/api/media/' + key });
  }

  return fail(405, 'Méthode non autorisée', { allow: 'GET, POST' });
};
export const config = { path: ['/api/media', '/api/media/:id'] };
