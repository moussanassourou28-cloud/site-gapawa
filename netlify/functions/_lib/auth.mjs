/*
 * Authentification de l'administration — entièrement côté serveur.
 * - Aucun mot de passe dans le code : seules des empreintes PBKDF2 salées sont lues depuis les variables
 *   d'environnement Netlify (ADMIN_USER + ADMIN_PASSWORD_HASH, ou ADMIN_ACCOUNTS pour plusieurs comptes).
 * - Session : cookie __Host- HttpOnly, Secure, SameSite=Strict, signé HMAC-SHA256 avec SESSION_SECRET.
 * - Changer un mot de passe invalide les sessions du compte ; changer SESSION_SECRET les invalide toutes.
 * - Limitation des tentatives : 5 échecs par adresse IP sur 15 minutes, puis blocage 15 minutes.
 */
import { createHmac, createHash, pbkdf2 as pbkdf2cb, timingSafeEqual, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import { authStore } from './store.mjs';

const pbkdf2 = promisify(pbkdf2cb);
export const COOKIE = '__Host-gapawa_session';
const SESSION_SECONDS = 8 * 60 * 60;
const MAX_FAILS = 5, WINDOW_MS = 15 * 60 * 1000;
const DUMMY = 'pbkdf2_sha256$310000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

const b64u = (buf) => Buffer.from(buf).toString('base64url');
const sha = (s) => createHash('sha256').update(s).digest('hex');

function accounts() {
  const out = [];
  const multi = (process.env.ADMIN_ACCOUNTS || '').trim();
  if (multi) {
    for (const part of multi.split(';')) {
      const i = part.indexOf(':');
      if (i > 0) out.push({ user: part.slice(0, i).trim(), hash: part.slice(i + 1).trim() });
    }
  } else if (process.env.ADMIN_USER && process.env.ADMIN_PASSWORD_HASH) {
    out.push({ user: process.env.ADMIN_USER.trim(), hash: process.env.ADMIN_PASSWORD_HASH.trim() });
  }
  return out.filter((a) => /^[A-Za-z0-9._@-]{2,80}$/.test(a.user) && a.hash.startsWith('pbkdf2_sha256$'));
}

export function isConfigured() {
  return (process.env.SESSION_SECRET || '').length >= 32 && accounts().length > 0;
}

export async function hashPassword(password, iterations = 310000) {
  const salt = randomBytes(16);
  const dk = await pbkdf2(password, salt, iterations, 32, 'sha256');
  return `pbkdf2_sha256$${iterations}$${b64u(salt)}$${b64u(dk)}`;
}

async function verifyHash(password, stored) {
  const parts = String(stored).split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha256') return false;
  const iters = Number(parts[1]);
  if (!Number.isInteger(iters) || iters < 100000 || iters > 5000000) return false;
  const salt = Buffer.from(parts[2], 'base64url'), expected = Buffer.from(parts[3], 'base64url');
  if (!salt.length || expected.length !== 32) return false;
  const dk = await pbkdf2(String(password), salt, iters, 32, 'sha256');
  return timingSafeEqual(dk, expected);
}

function sign(payload) {
  return createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest();
}

function readCookie(req, name) {
  const raw = req.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}

export function sessionCookie(token) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}
export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

/** Vérifie la session portée par la requête. Retourne { user } ou null. Appelée avant chaque opération sensible. */
export function getSession(req) {
  if (!isConfigured()) return null;
  const token = readCookie(req, COOKIE);
  const dot = token.indexOf('.');
  if (dot < 1) return null;
  const payload = token.slice(0, dot), sig = Buffer.from(token.slice(dot + 1), 'base64url');
  const expected = sign(payload);
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;
  let data;
  try { data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch { return null; }
  if (!data || typeof data.exp !== 'number' || data.exp * 1000 < Date.now()) return null;
  const acc = accounts().find((a) => a.user === data.u);
  if (!acc || sha(acc.hash).slice(0, 16) !== data.k) return null; // mot de passe changé → session invalide
  return { user: acc.user, exp: data.exp };
}

function issueToken(acc) {
  const now = Math.floor(Date.now() / 1000);
  const payload = b64u(JSON.stringify({ u: acc.user, iat: now, exp: now + SESSION_SECONDS, k: sha(acc.hash).slice(0, 16), n: b64u(randomBytes(9)) }));
  return payload + '.' + b64u(sign(payload));
}

async function throttleState(ipKey) {
  try {
    const rec = await authStore().get('ratelimit/' + ipKey, { type: 'json' });
    if (!rec) return { count: 0, first: Date.now() };
    if (Date.now() - rec.first > WINDOW_MS) return { count: 0, first: Date.now() };
    return rec;
  } catch { return { count: 0, first: Date.now() }; }
}

/** Tente une connexion. Retourne { ok, token?, user?, status, error? }. */
export async function attemptLogin(username, password, ip) {
  if (!isConfigured()) return { ok: false, status: 503, error: "L'administration n'est pas encore configurée sur ce site." };
  const ipKey = sha(String(ip)).slice(0, 32);
  const state = await throttleState(ipKey);
  if (state.count >= MAX_FAILS) {
    const wait = Math.ceil((state.first + WINDOW_MS - Date.now()) / 60000);
    return { ok: false, status: 429, error: `Trop de tentatives. Réessayez dans ${Math.max(1, wait)} minute(s).` };
  }
  const acc = accounts().find((a) => a.user.toLowerCase() === String(username || '').trim().toLowerCase());
  const good = await verifyHash(String(password || ''), acc ? acc.hash : DUMMY); // temps constant même si le compte n'existe pas
  if (!acc || !good) {
    try { await authStore().setJSON('ratelimit/' + ipKey, { count: state.count + 1, first: state.first }); } catch { /* best effort */ }
    return { ok: false, status: 401, error: 'Identifiant ou mot de passe incorrect.' };
  }
  try { await authStore().delete('ratelimit/' + ipKey); } catch { /* best effort */ }
  return { ok: true, status: 200, user: acc.user, token: issueToken(acc) };
}
