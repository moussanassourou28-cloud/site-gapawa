/*
 * Rendu serveur de la page d'accueil à partir du contenu publié dans Netlify Blobs.
 * Toute modification publiée depuis /administration est donc visible immédiatement, et indexable.
 * En l'absence de contenu publié, ou en cas d'incident, la page statique site/index.html est servie.
 */
import { renderDocument } from '../../site/assets/js/render.mjs';
import { ASSET_VERSION } from './_version.mjs';

const HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'public, max-age=0, must-revalidate',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'SAMEORIGIN',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'self'; base-uri 'self'; object-src 'none'"
};

/** Lit le contenu publié : directement dans Netlify Blobs, sinon via l'API serveur, sinon rien (page statique). */
async function readPublished(request) {
  try {
    const { getStore } = await import('@netlify/blobs');
    return await getStore({ name: 'gapawa-content', consistency: 'strong' }).get('current', { type: 'json' });
  } catch (err) {
    console.warn('Lecture directe du stockage impossible, repli sur /api/content :', err && err.message);
    const r = await fetch(new URL('/api/content', request.url), { headers: { accept: 'application/json' } });
    if (!r.ok) return null;
    const d = await r.json();
    return d && d.version ? d : null;
  }
}

export default async (request) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') return;
  try {
    const entry = await readPublished(request);
    if (!entry || !entry.content) return; // rien de publié : page statique
    const html = renderDocument(entry.content, { assetVersion: ASSET_VERSION });
    return new Response(request.method === 'HEAD' ? null : html, { headers: { ...HEADERS, etag: '"' + entry.version + '"' } });
  } catch (err) {
    console.error('Rendu serveur indisponible, page statique servie :', err && err.message);
    return;
  }
};
export const config = { path: '/', method: ['GET', 'HEAD'] };
