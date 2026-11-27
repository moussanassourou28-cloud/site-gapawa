/*
 * Demandes reçues par le formulaire « Nous contacter ».
 *   POST   /api/requests       : dépôt d'une demande (public — contrôles anti-robot, limitation par IP, validation stricte).
 *   GET    /api/requests       : liste des demandes (administrateur connecté uniquement).
 *   PATCH  /api/requests/:id   : statut et note interne (administrateur + CSRF).
 *   DELETE /api/requests/:id   : suppression définitive (administrateur + CSRF).
 * Les demandes sont stockées côté serveur (Netlify Blobs, magasin « gapawa-requests »), jamais dans le code public.
 * L'adresse IP n'est pas conservée : seule une empreinte tronquée sert à la limitation, puis expire.
 */
import { createHash, randomBytes } from 'node:crypto';
import { json, fail, sameOriginWrite, clientIp } from './_lib/http.mjs';
import { getSession } from './_lib/auth.mjs';
import { requestsStore } from './_lib/store.mjs';

export const STATUSES = ['nouveau', 'en_cours', 'traite', 'archive'];
const MAX_PER_HOUR = 5, HOUR = 60 * 60 * 1000, MAX_LIST = 500;
const ID_RE = /^r\d{14}-[a-f0-9]{8}$/;
const EMAIL_RE = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,180}\.[A-Za-z]{2,24}$/;

const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);

function parseSubmission(b) {
  const r = {
    nom: clean(b.nom, 120), societe: clean(b.societe, 160), email: clean(b.email, 160),
    telephone: clean(b.telephone, 40), sujet: clean(b.sujet, 120), message: clean(b.message, 4000)
  };
  if (r.nom.length < 2) return { error: 'Merci d\'indiquer votre nom.' };
  if (!EMAIL_RE.test(r.email)) return { error: 'Adresse e-mail invalide.' };
  if (r.telephone && !/^[0-9+().\s-]{6,40}$/.test(r.telephone)) return { error: 'Numéro de téléphone invalide.' };
  if (!r.sujet) return { error: 'Merci de choisir l\'objet de votre demande.' };
  if (r.message.length < 10) return { error: 'Votre message est trop court.' };
  if (String(b.consentement || '') !== 'oui') return { error: 'Le consentement est requis pour traiter votre demande.' };
  return { value: r };
}

async function underLimit(store, ip) {
  const key = 'ratelimit/' + createHash('sha256').update('req:' + ip).digest('hex').slice(0, 32);
  let rec = null;
  try { rec = await store.get(key, { type: 'json' }); } catch { /* ignoré */ }
  if (!rec || Date.now() - rec.first > HOUR) rec = { count: 0, first: Date.now() };
  if (rec.count >= MAX_PER_HOUR) return false;
  rec.count += 1;
  try { await store.setJSON(key, rec); } catch { /* best effort */ }
  return true;
}

function newId() {
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  const ts = `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
  return `r${ts}-${randomBytes(4).toString('hex')}`;
}

export default async (req, context) => {
  const store = requestsStore();
  const id = context && context.params && context.params.id;

  /* ---------- dépôt public ---------- */
  if (req.method === 'POST' && !id) {
    if (!sameOriginWrite(req)) return fail(403, 'Requête refusée.');
    const raw = await req.text();
    if (raw.length > 12000) return fail(413, 'Message trop long.');
    let body;
    try { body = JSON.parse(raw); } catch { return fail(400, 'Requête invalide.'); }
    if (!body || typeof body !== 'object') return fail(400, 'Requête invalide.');
    if (body['bot-field']) return json({ ok: true });                 // robot : on répond « ok » sans rien enregistrer
    const parsed = parseSubmission(body);
    if (parsed.error) return fail(422, parsed.error);
    if (!(await underLimit(store, clientIp(req, context)))) return fail(429, 'Trop de messages envoyés depuis cette connexion. Réessayez dans une heure ou appelez-nous.');
    const now = new Date().toISOString();
    const entry = { id: newId(), createdAt: now, ...parsed.value, status: 'nouveau', note: '', updatedAt: now, updatedBy: null };
    await store.setJSON('req/' + entry.id, entry);
    return json({ ok: true }, 201);
  }

  /* ---------- tout le reste : administrateur connecté ---------- */
  const session = getSession(req);
  if (!session) return fail(401, 'Session expirée ou absente. Reconnectez-vous.');

  if (req.method === 'GET' && !id) {
    const { blobs } = await store.list({ prefix: 'req/' });
    const keys = blobs.map((b) => b.key).sort().reverse().slice(0, MAX_LIST);
    const items = (await Promise.all(keys.map((k) => store.get(k, { type: 'json' }).catch(() => null)))).filter(Boolean);
    const counts = Object.fromEntries(STATUSES.map((s) => [s, items.filter((i) => i.status === s).length]));
    return json({ ok: true, items, counts, total: blobs.length });
  }

  if (!id || !ID_RE.test(id)) return fail(400, 'Identifiant invalide.');
  if (!sameOriginWrite(req)) return fail(403, 'Requête refusée.');
  const key = 'req/' + id;

  if (req.method === 'PATCH') {
    const cur = await store.get(key, { type: 'json' });
    if (!cur) return fail(404, 'Demande introuvable.');
    let body;
    try { body = await req.json(); } catch { return fail(400, 'Requête invalide.'); }
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) return fail(422, 'Statut inconnu.');
      cur.status = body.status;
    }
    if (body.note !== undefined) cur.note = clean(body.note, 2000);
    cur.updatedAt = new Date().toISOString(); cur.updatedBy = session.user;
    await store.setJSON(key, cur);
    return json({ ok: true, item: cur });
  }

  if (req.method === 'DELETE') {
    await store.delete(key);
    return json({ ok: true });
  }

  return fail(405, 'Méthode non autorisée', { allow: 'GET, POST, PATCH, DELETE' });
};
export const config = { path: ['/api/requests', '/api/requests/:id'] };
