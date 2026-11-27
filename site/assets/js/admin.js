/*
 * GAPAWA — tableau de bord d'administration.
 *
 * Deux environnements, une seule interface :
 *   - Netlify (https://gapawa.com/administration) : connexion obligatoire ; chaque lecture privée et chaque
 *     écriture est vérifiée côté serveur (cookie de session signé, contrôle CSRF, contrôle de version).
 *   - Aperçu hébergé par claude.ai (#administration) : droits vérifiés par window.claude.use('user').canEdit()
 *     avant l'ouverture ET avant chaque publication.
 * Nulle part l'interface n'est modifiable par défaut : sans session valide, rien n'est éditable ni publiable.
 */
import { migrate, renderBody, renderDocument, themeCss, buildClaudeDocument, SECTIONS, telHref, mailHref, waHref, safeMedia } from './render.mjs';

const DRAFT_KEY = 'gapawa-admin-draft-v2';
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* idem */ } }
};

/* ============================================================ utilitaires DOM */
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) { if (kid == null || kid === false) continue; el.append(kid.nodeType ? kid : document.createTextNode(String(kid))); }
  return el;
}
const clear = (n) => { while (n.firstChild) n.removeChild(n.firstChild); };
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const fmtDate = (iso) => { if (!iso) return ''; try { return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }); } catch { return iso; } };
let uid = 0; const nid = (p) => `gpa-${p}-${++uid}`;

/* ============================================================ adaptateurs */
async function api(path, opts = {}) {
  const headers = { 'x-gapawa-request': '1', ...(opts.headers || {}) };
  if (opts.body && !(opts.body instanceof FormData)) headers['content-type'] = 'application/json';
  const res = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...opts, headers });
  let data = null; try { data = await res.json(); } catch { /* corps vide */ }
  return { ok: res.ok, status: res.status, data: data || {} };
}

const NetlifyAdapter = {
  kind: 'netlify',
  async session() {
    try {
      const r = await api('/api/session');
      if (r.status === 404 || typeof r.data.configured !== 'boolean') return { backend: false };
      return { backend: true, configured: r.data.configured, authenticated: !!r.data.authenticated, user: r.data.user };
    } catch { return { backend: false, offline: true }; }
  },
  login: (username, password) => api('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => api('/api/logout', { method: 'POST' }),
  async load() {
    const r = await api('/api/content');
    if (!r.ok) throw new Error(r.data.error || 'Lecture du contenu impossible');
    let c = r.data.content;
    if (!c) { const d = await fetch('/content/default.json', { cache: 'no-store' }); c = d.ok ? await d.json() : {}; }
    return { content: migrate(c), version: r.data.version || null, updatedAt: r.data.updatedAt, updatedBy: r.data.updatedBy };
  },
  async save(content, baseVersion) {
    const s = await this.session();                       // vérification préalable…
    if (!s.authenticated) return { ok: false, status: 401, data: { error: 'Session expirée.' } };
    return api('/api/content', { method: 'PUT', body: JSON.stringify({ content, baseVersion }) }); // …puis contrôle serveur
  },
  upload(blob, name) { const fd = new FormData(); fd.append('file', blob, name); return api('/api/media', { method: 'POST', body: fd }); },
  history: () => api('/api/history'),
  historyGet: (id) => api('/api/history/' + encodeURIComponent(id)),
  requests: {
    list: () => api('/api/requests'),
    update: (id, patch) => api('/api/requests/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(patch) }),
    remove: (id) => api('/api/requests/' + encodeURIComponent(id), { method: 'DELETE' })
  },
  previewDoc: (content) => renderDocument(content, { mode: 'preview' }).replace('<head>', `<head><base href="${location.origin}/">`),
  siteHref: '/'
};

const ClaudeAdapter = {
  kind: 'claude', _art: null, _assets: null,
  async rights() {
    try { const u = await window.claude.use('user'); return !!(u && typeof u.canEdit === 'function' && await u.canEdit()); }
    catch { return false; }
  },
  async session() {
    const can = await this.rights();
    if (can) {
      this._art = await Promise.resolve(window.claude.use('artifact')).catch(() => null);
      this._assets = await Promise.resolve(window.claude.use('assets')).catch(() => null);
    }
    return { backend: true, configured: true, authenticated: can, user: can ? 'Éditeur claude.ai' : null, denied: !can };
  },
  async load() {
    const el = document.getElementById('gpw-content');
    const c = el ? JSON.parse(el.textContent) : {};
    return { content: migrate(c), version: 'claude', updatedAt: null, updatedBy: null };
  },
  async save(content) {
    if (!(await this.rights())) return { ok: false, status: 403, data: { error: 'Droits de modification insuffisants.' } };
    if (!this._art) return { ok: false, status: 503, data: { error: 'Publication indisponible dans cette vue.' } };
    let base = null;
    try { const r = await fetch('index.html', { cache: 'no-store' }); if (r.ok) base = await r.text(); } catch { /* base reconstruite */ }
    try {
      await this._art.publish(buildClaudeDocument(content, base));
      return { ok: true, status: 200, data: { version: 'claude', updatedAt: new Date().toISOString() } };
    } catch (e) {
      const code = e && e.code;
      return { ok: false, status: code === 'conflict' ? 409 : (code === 'not_granted' || code === 'not_writer') ? 403 : 500, data: { error: 'Publication refusée (' + (code || 'erreur') + ').' } };
    }
  },
  async upload(blob, name) {
    if (!this._assets) return { ok: false, status: 503, data: { error: 'Téléversement indisponible dans cette vue.' } };
    try { const r = await this._assets.upload(new File([blob], name, { type: blob.type })); return { ok: true, status: 200, data: { url: r.url } }; }
    catch (e) { return { ok: false, status: 500, data: { error: 'Téléversement refusé (' + ((e && e.code) || 'erreur') + ').' } }; }
  },
  history: null, historyGet: null, requests: null, previewDoc: null, siteHref: '#accueil'
};

/* ============================================================ préparation des images */
async function prepareImage(file, maxSide) {
  if (file.type === 'image/svg+xml') return { blob: file, name: file.name };
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Format non accepté. Utilisez JPG, PNG, WebP ou SVG.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Image illisible.')); i.src = url; });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    if (scale === 1 && file.size < 450 * 1024) return { blob: file, name: file.name };
    const cv = document.createElement('canvas');
    cv.width = Math.round(img.naturalWidth * scale); cv.height = Math.round(img.naturalHeight * scale);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    let blob = await new Promise((r) => cv.toBlob(r, 'image/webp', 0.84));
    if (!blob || blob.type !== 'image/webp') blob = await new Promise((r) => cv.toBlob(r, file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.86));
    const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
    return { blob, name: file.name.replace(/\.[^.]+$/, '') + '.' + ext };
  } finally { URL.revokeObjectURL(url); }
}

/* ============================================================ application */
export async function mountAdmin({ mode, root } = {}) {
  const adapter = mode === 'claude' ? ClaudeAdapter : NetlifyAdapter;
  const overlay = !root;
  if (overlay) {
    root = h('div', { class: 'gpa gpa-overlay', role: 'region', 'aria-label': 'Administration du site' });
    document.body.appendChild(root);
    document.documentElement.classList.add('gpa-locked');
    if (!document.querySelector('link[data-gpa-css]')) {
      document.head.appendChild(h('link', { rel: 'stylesheet', href: new URL('../css/admin.css', import.meta.url).href, 'data-gpa-css': '1' }));
    }
  } else root.classList.add('gpa');

  const S = { session: null, content: null, publishedJson: '', version: null, updatedAt: null, updatedBy: null, tab: 'overview', busy: false, status: null, newRequests: 0 };
  const toasts = h('div', { class: 'gpa-toasts', 'aria-live': 'polite' });
  let pillEl = null, publishBtn = null, previewFrame = null, mainEl = null;
  const appSnapshot = mode === 'claude' && document.getElementById('gpw-app') ? document.getElementById('gpw-app').innerHTML : null;

  /* ---------- notifications ---------- */
  function toast(text, { error = false, action, ms = 4200 } = {}) {
    const t = h('div', { class: 'gpa-toast' + (error ? ' is-err' : ''), role: error ? 'alert' : 'status' }, h('span', { style: 'flex:1' }, text));
    if (action) t.append(h('button', { type: 'button', onclick: () => { action.fn(); t.remove(); } }, action.label));
    toasts.append(t); setTimeout(() => t.remove(), ms);
  }
  function confirmDialog(title, text, okLabel = 'Confirmer') {
    return new Promise((resolve) => {
      const close = (v) => { m.remove(); document.removeEventListener('keydown', esc); resolve(v); };
      const esc = (e) => { if (e.key === 'Escape') close(false); };
      const ok = h('button', { class: 'gpa-btn gpa-btn--primary', type: 'button', onclick: () => close(true) }, okLabel);
      const m = h('div', { class: 'gpa-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'gpa-dlg-t' },
        h('div', { class: 'gpa-dialog' }, h('h2', { id: 'gpa-dlg-t' }, title), h('p', null, text),
          h('div', { class: 'gpa-dlg-actions' }, h('button', { class: 'gpa-btn', type: 'button', onclick: () => close(false) }, 'Annuler'), ok)));
      document.addEventListener('keydown', esc); root.append(m); ok.focus();
    });
  }

  /* ---------- état ---------- */
  const isDirty = () => !!S.content && JSON.stringify(S.content) !== S.publishedJson;
  const writeDraft = () => {
    if (!S.content) return;
    if (isDirty()) store.set(DRAFT_KEY, { content: S.content, baseVersion: S.version, savedAt: new Date().toISOString(), env: adapter.kind });
    else store.del(DRAFT_KEY);
  };
  const saveDraft = debounce(writeDraft, 400);
  const refreshPreview = debounce(() => { if (previewFrame) paintPreview(); }, 450);
  function changed() { if (!S.busy) S.status = null; paintStatus(); saveDraft(); refreshPreview(); }
  function setStatus(kind, text) { S.status = kind ? { kind, text } : null; paintStatus(); }
  function paintStatus() {
    if (!pillEl) return;
    let cls = 'gpa-pill', txt = 'À jour';
    if (S.status) { cls += S.status.kind === 'err' ? ' is-err' : ' is-ok'; txt = S.status.text; }
    else if (isDirty()) { cls += ' is-dirty'; txt = 'Modifications non publiées'; }
    else if (S.updatedAt) txt = 'Publié le ' + new Date(S.updatedAt).toLocaleDateString('fr-FR');
    pillEl.className = cls; pillEl.textContent = txt;
    if (publishBtn) publishBtn.disabled = S.busy;
  }
  window.addEventListener('beforeunload', onBeforeUnload);
  window.addEventListener('pagehide', writeDraft);
  function onBeforeUnload(e) { writeDraft(); if (isDirty()) { e.preventDefault(); e.returnValue = ''; } }

  /* ---------- champs ---------- */
  const F = {
    text(label, obj, key, o = {}) {
      const id = nid('t'), inp = h('input', { class: 'gpa-in', id, type: o.type || 'text', value: obj[key] ?? '', placeholder: o.placeholder, maxlength: o.max ? String(o.max * 2) : null, autocomplete: 'off', inputmode: o.inputmode });
      const counter = o.max ? h('span', { class: 'gpa-count' }) : null;
      const err = h('p', { class: 'gpa-err', hidden: true });
      const sync = () => {
        if (counter) { counter.textContent = `${inp.value.length} / ${o.max}`; counter.classList.toggle('is-over', inp.value.length > o.max); }
        const msg = o.validate ? o.validate(inp.value) : '';
        err.hidden = !msg; err.textContent = msg || ''; inp.setAttribute('aria-invalid', msg ? 'true' : 'false');
      };
      inp.addEventListener('input', () => { obj[key] = inp.value; sync(); if (o.onInput) o.onInput(inp.value); changed(); });
      sync();
      return h('div', { class: 'gpa-f' }, h('label', { for: id }, h('span', null, label), counter), inp, err, o.hint ? h('p', { class: 'gpa-hint' }, o.hint) : null);
    },
    area(label, obj, key, o = {}) {
      const id = nid('a'), ta = h('textarea', { class: 'gpa-in', id, rows: String(o.rows || 3) }); ta.value = obj[key] ?? '';
      const counter = o.max ? h('span', { class: 'gpa-count' }) : null;
      const sync = () => { if (counter) { counter.textContent = `${ta.value.length} / ${o.max}`; counter.classList.toggle('is-over', ta.value.length > o.max); } };
      ta.addEventListener('input', () => { obj[key] = ta.value; sync(); changed(); }); sync();
      return h('div', { class: 'gpa-f' }, h('label', { for: id }, h('span', null, label), counter), ta, o.hint ? h('p', { class: 'gpa-hint' }, o.hint) : null);
    },
    lines(label, obj, key, o = {}) {
      const id = nid('l'), arr = Array.isArray(obj[key]) ? obj[key] : [];
      const ta = h('textarea', { class: 'gpa-in', id, rows: String(Math.max(3, arr.length + 1)) }); ta.value = arr.join('\n');
      ta.addEventListener('input', () => { obj[key] = ta.value.split('\n').map((s) => s.trim()).filter(Boolean); changed(); });
      return h('div', { class: 'gpa-f' }, h('label', { for: id }, label), ta, h('p', { class: 'gpa-hint' }, o.hint || 'Un élément par ligne.'));
    },
    toggle(label, obj, key, o = {}) {
      const id = nid('c'), cb = h('input', { type: 'checkbox', id }); cb.checked = obj[key] !== false;
      cb.addEventListener('change', () => { obj[key] = cb.checked; changed(); if (o.onChange) o.onChange(); });
      return h('div', { class: 'gpa-f' }, h('label', { class: 'gpa-check', for: id }, cb, h('span', null, label)), o.hint ? h('p', { class: 'gpa-hint' }, o.hint) : null);
    },
    select(label, obj, key, options, o = {}) {
      const id = nid('s'), sel = h('select', { class: 'gpa-in', id });
      for (const [v, t] of options) { const op = h('option', { value: v }, t); if ((obj[key] || '') === v) op.selected = true; sel.append(op); }
      const warn = h('p', { class: 'gpa-hint' });
      const sync = () => { const m = o.warn ? o.warn(sel.value) : ''; warn.textContent = m || ''; warn.hidden = !m; };
      sel.addEventListener('change', () => { obj[key] = sel.value; sync(); changed(); }); sync();
      return h('div', { class: 'gpa-f' }, h('label', { for: id }, label), sel, warn);
    },
    color(label, obj, key, fallback) {
      const id = nid('k'), picker = h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(obj[key] || '') ? obj[key] : fallback, 'aria-label': label + ' (sélecteur)' });
      const txt = h('input', { class: 'gpa-in', id, value: obj[key] || '', placeholder: fallback, maxlength: '7' });
      picker.addEventListener('input', () => { obj[key] = picker.value; txt.value = picker.value; changed(); });
      txt.addEventListener('input', () => { obj[key] = txt.value.trim(); if (/^#[0-9a-f]{6}$/i.test(txt.value.trim())) picker.value = txt.value.trim(); changed(); });
      return h('div', { class: 'gpa-f' }, h('label', { for: id }, label), h('div', { class: 'gpa-color' }, picker, txt));
    },
    image(label, obj, key, o = {}) {
      const thumb = h('div', { class: 'gpa-thumb' + (o.logo ? ' gpa-thumb--logo' : '') });
      const file = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/svg+xml', hidden: true, 'aria-label': label });
      const pick = h('button', { class: 'gpa-btn gpa-btn--sm', type: 'button' });
      const remove = h('button', { class: 'gpa-btn gpa-btn--sm gpa-btn--danger', type: 'button' }, 'Retirer');
      const paint = () => {
        clear(thumb);
        const u = safeMedia(obj[key]);
        if (u) thumb.append(h('img', { src: u, alt: '' })); else thumb.append('Aucune image');
        pick.textContent = u ? "Remplacer l'image" : 'Choisir une image';
        remove.disabled = !u;
      };
      pick.addEventListener('click', () => file.click());
      remove.addEventListener('click', () => { const prev = obj[key]; obj[key] = ''; paint(); changed(); toast('Image retirée.', { action: { label: 'Annuler', fn: () => { obj[key] = prev; paint(); changed(); } } }); });
      file.addEventListener('change', async () => {
        const f = file.files && file.files[0]; file.value = '';
        if (!f) return;
        if (f.size > 25 * 1024 * 1024) { toast('Fichier trop lourd (25 Mo maximum avant optimisation).', { error: true }); return; }
        pick.disabled = true; pick.textContent = 'Optimisation…';
        try {
          const { blob, name } = await prepareImage(f, o.logo ? 800 : 2000);
          if (blob.size > 5 * 1024 * 1024) throw new Error('Image trop lourde après optimisation (5 Mo maximum).');
          pick.textContent = 'Envoi…';
          const r = await adapter.upload(blob, name);
          if (r.status === 401) { onSessionLost(); return; }
          if (!r.ok || !r.data.url) throw new Error(r.data.error || "L'envoi a échoué.");
          obj[key] = r.data.url; paint(); changed(); toast('Image enregistrée. Elle sera visible sur le site après publication.');
        } catch (e) { toast(e.message || "L'envoi a échoué.", { error: true }); }
        finally { pick.disabled = false; paint(); }
      });
      paint();
      return h('div', { class: 'gpa-f' }, h('span', { class: 'gpa-lab' }, label), h('div', { class: 'gpa-img' }, thumb, pick, remove, file),
        o.hint ? h('p', { class: 'gpa-hint' }, o.hint) : null);
    }
  };

  function repeat(list, o) {
    const box = h('div');
    const paint = () => {
      clear(box);
      list.forEach((item, i) => {
        const up = h('button', { class: 'gpa-ico', type: 'button', title: 'Monter', 'aria-label': 'Monter cet élément', disabled: i === 0 }, '↑');
        const dn = h('button', { class: 'gpa-ico', type: 'button', title: 'Descendre', 'aria-label': 'Descendre cet élément', disabled: i === list.length - 1 }, '↓');
        const rm = h('button', { class: 'gpa-ico gpa-ico--del', type: 'button', title: 'Supprimer', 'aria-label': 'Supprimer cet élément', disabled: o.min && list.length <= o.min }, '✕');
        up.addEventListener('click', () => { list.splice(i - 1, 0, list.splice(i, 1)[0]); changed(); paint(); });
        dn.addEventListener('click', () => { list.splice(i + 1, 0, list.splice(i, 1)[0]); changed(); paint(); });
        rm.addEventListener('click', () => {
          const [removed] = list.splice(i, 1); changed(); paint();
          toast('Élément supprimé.', { action: { label: 'Annuler', fn: () => { list.splice(i, 0, removed); changed(); paint(); } }, ms: 7000 });
        });
        const body = h('div', { class: 'gpa-item-b' });
        o.build(item, body, i);
        box.append(h('div', { class: 'gpa-item' }, h('div', { class: 'gpa-item-h' },
          h('span', { class: 'gpa-item-t' }, h('small', null, String(i + 1).padStart(2, '0')), o.title(item, i) || 'Sans titre'), up, dn, rm), body));
      });
      const add = h('button', { class: 'gpa-add', type: 'button', disabled: o.max && list.length >= o.max }, o.addLabel || '+ Ajouter');
      add.addEventListener('click', () => { list.push(o.make()); changed(); paint(); const items = box.querySelectorAll('.gpa-item'); const last = items[items.length - 1]; if (last) { const f = last.querySelector('input,textarea,select'); if (f) f.focus(); } });
      box.append(add);
    };
    paint();
    return box;
  }
  const card = (title, desc, ...kids) => h('section', { class: 'gpa-card' }, title ? h('h2', null, title) : null, desc ? h('p', { class: 'gpa-desc' }, desc) : null, kids);
  const row = (...k) => h('div', { class: 'gpa-row' }, k);
  const sectionOptions = SECTIONS;
  const hiddenWarn = (v) => (v !== 'accueil' && S.content.visible[v] === false ? 'Cette section est masquée : le lien ne sera pas affiché tant qu\'elle reste masquée.' : '');
  const headCard = (S2, title = 'En-tête de la section') => card(title, null,
    row(F.text('Sur-titre', S2, 'eyebrow'), F.text('Titre', S2, 'title')), F.area("Texte d'introduction", S2, 'intro', { rows: 3 }));

  /* ---------- liste de contrôle ---------- */
  function checklist(c) {
    const filled = (v) => String(v || '').trim().length > 0;
    const legalMissing = c.contact.legal.filter((l) => !filled(l.value)).map((l) => l.label);
    const polesPhotos = c.poles.items.filter((p) => safeMedia(p.image)).length;
    const refsDone = c.references.items.filter((r) => filled(r.client) || filled(r.objet)).length;
    const partners = c.partenaires.items.filter((p) => filled(p.name) || safeMedia(p.logoUrl)).length;
    return [
      { ok: !!safeMedia(c.brand.logoUrl), t: "Logo de l'entreprise", d: 'Remplace le monogramme « G » dans l\'en-tête et le pied de page.', tab: 'identite' },
      { ok: !!telHref(c.contact.phone), t: 'Numéro de téléphone', d: 'Active le bouton d\'appel et le lien dans la barre supérieure.', tab: 'contact' },
      { ok: !!mailHref(c.contact.email), t: 'Adresse e-mail', d: 'Active le lien « mailto » et l\'adresse dans le pied de page.', tab: 'contact' },
      { ok: !!waHref(c.contact.whatsapp), t: 'Numéro WhatsApp', d: 'Active l\'ouverture d\'une conversation WhatsApp.', tab: 'contact' },
      { ok: filled(c.contact.address) && filled(c.contact.hours), t: 'Adresse postale et horaires', d: 'Affichés dans le bloc contact.', tab: 'contact' },
      { ok: !legalMissing.length, t: 'Mentions légales', d: legalMissing.length ? 'À compléter : ' + legalMissing.join(', ') + '.' : 'RCCM et NIU renseignés.', tab: 'contact' },
      { ok: !!safeMedia(c.hero.image), t: "Photo du bandeau d'accueil", d: 'Une vraie photo de chantier ou d\'installation renforce fortement la crédibilité.', tab: 'accueil' },
      { ok: polesPhotos === c.poles.items.length && c.poles.items.length > 0, t: 'Photos des pôles', d: `${polesPhotos} / ${c.poles.items.length} pôles illustrés.`, tab: 'poles' },
      { ok: refsDone > 0 && refsDone === c.references.items.length, t: 'Références documentées', d: `${refsDone} / ${c.references.items.length} fiches renseignées.`, tab: 'references' },
      { ok: partners > 0 && partners === c.partenaires.items.length, t: 'Partenaires', d: `${partners} / ${c.partenaires.items.length} emplacements renseignés.`, tab: 'partenaires' }
    ];
  }

  /* ---------- demandes reçues (formulaire de contact) ---------- */
  const REQ_STATUS = { nouveau: 'Nouvelle', en_cours: 'En cours', traite: 'Traitée', archive: 'Archivée' };
  const RQ = { items: null, filter: 'actives', q: '', open: null };
  async function refreshRequestCount() {
    if (!adapter.requests) return;
    try {
      const r = await adapter.requests.list();
      if (r.ok) { RQ.items = r.data.items || []; S.newRequests = RQ.items.filter((i) => i.status === 'nouveau').length; }
    } catch { /* silencieux : le badge reste à jour au prochain passage */ }
  }
  function csvOf(items) {
    const cols = [['createdAt', 'Date'], ['status', 'Statut'], ['nom', 'Nom'], ['societe', 'Société'], ['email', 'E-mail'], ['telephone', 'Téléphone'], ['sujet', 'Objet'], ['message', 'Message'], ['note', 'Note interne']];
    const esc = (v) => { let t = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return '"' + t.replace(/"/g, '""') + '"'; };
    const rows = items.map((i) => cols.map(([k]) => esc(k === 'status' ? REQ_STATUS[i.status] || i.status : k === 'createdAt' ? fmtDate(i.createdAt) : i[k])).join(';'));
    return '﻿' + cols.map(([, l]) => esc(l)).join(';') + '\r\n' + rows.join('\r\n');
  }
  function renderRequests(m) {
    if (!adapter.requests) {
      m.append(card('Demandes reçues', "Les demandes envoyées depuis le formulaire « Nous contacter » sont consultables ici une fois le site publié sur https://gapawa.com/administration. Dans cet aperçu, aucun message n'est enregistré."));
      return;
    }
    const box = h('div', null, h('p', { class: 'gpa-desc' }, 'Chargement des demandes…'));
    m.append(box);
    const load = async () => {
      const r = await adapter.requests.list();
      if (r.status === 401) { onSessionLost(); return; }
      if (!r.ok) { clear(box); box.append(card(null, null, h('p', { class: 'gpa-err' }, r.data.error || 'Impossible de lire les demandes.'), h('button', { class: 'gpa-btn gpa-btn--sm', type: 'button', onclick: load }, 'Réessayer'))); return; }
      RQ.items = r.data.items || [];
      S.newRequests = RQ.items.filter((i) => i.status === 'nouveau').length;
      paint();
    };
    const setBadge = () => {
      S.newRequests = RQ.items.filter((i) => i.status === 'nouveau').length;
      const tab = root.querySelector('.gpa-tab[aria-current="page"]');
      if (tab) { const old = tab.querySelector('.gpa-badge--new'); if (old) old.remove(); if (S.newRequests) tab.append(h('span', { class: 'gpa-badge gpa-badge--new' }, String(S.newRequests))); }
      const n = (st) => String(RQ.items.filter((i) => i.status === st).length);
      box.querySelectorAll('[data-rq-count]').forEach((el) => { const k = el.dataset.rqCount; el.textContent = k === 'total' ? String(RQ.items.length) : n(k); });
    };
    function visible() {
      const q = RQ.q.trim().toLowerCase();
      return RQ.items.filter((i) => {
        if (RQ.filter === 'actives' && i.status === 'archive') return false;
        if (RQ.filter !== 'actives' && RQ.filter !== 'toutes' && i.status !== RQ.filter) return false;
        if (!q) return true;
        return [i.nom, i.societe, i.email, i.telephone, i.sujet, i.message, i.note].some((v) => String(v || '').toLowerCase().includes(q));
      });
    }
    function paint() {
      clear(box);
      const items = RQ.items;
      const count = (s) => items.filter((i) => i.status === s).length;
      box.append(h('div', { class: 'gpa-kpis gpa-kpis--rq' },
        h('div', { class: 'gpa-kpi' }, h('b', { 'data-rq-count': 'nouveau' }, String(count('nouveau'))), h('span', null, 'à traiter')),
        h('div', { class: 'gpa-kpi' }, h('b', { 'data-rq-count': 'en_cours' }, String(count('en_cours'))), h('span', null, 'en cours')),
        h('div', { class: 'gpa-kpi' }, h('b', { 'data-rq-count': 'total' }, String(items.length)), h('span', null, 'au total'))));

      const filters = [['actives', 'Actives'], ['nouveau', 'Nouvelles'], ['en_cours', 'En cours'], ['traite', 'Traitées'], ['archive', 'Archivées'], ['toutes', 'Toutes']];
      const search = h('input', { class: 'gpa-in gpa-rq-search', type: 'search', placeholder: 'Rechercher un nom, une société, un mot…', 'aria-label': 'Rechercher dans les demandes', value: RQ.q });
      const listEl = h('div', { class: 'gpa-rq-list' });
      search.addEventListener('input', debounce(() => { RQ.q = search.value; paintList(); }, 200));
      const exportBtn = h('button', { class: 'gpa-btn gpa-btn--sm', type: 'button', onclick: () => {
        const rows = visible(); if (!rows.length) { toast('Aucune demande à exporter.'); return; }
        const url = URL.createObjectURL(new Blob([csvOf(rows)], { type: 'text/csv;charset=utf-8' }));
        const a = h('a', { href: url, download: 'demandes-gapawa-' + new Date().toISOString().slice(0, 10) + '.csv' }); document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      } }, 'Exporter (Excel / CSV)');
      box.append(card(null, null,
        h('div', { class: 'gpa-rq-tools' },
          h('div', { class: 'gpa-chips', role: 'group', 'aria-label': 'Filtrer par statut' }, filters.map(([v, l]) =>
            h('button', { class: 'gpa-chip', type: 'button', 'aria-pressed': RQ.filter === v ? 'true' : 'false', onclick: () => { RQ.filter = v; paint(); } },
              l, v !== 'actives' && v !== 'toutes' ? h('span', { 'data-rq-count': v }, String(count(v))) : null))),
          h('div', { class: 'gpa-rq-actions' }, search, exportBtn, h('button', { class: 'gpa-btn gpa-btn--sm', type: 'button', onclick: load }, 'Actualiser'))),
        listEl));
      function paintList() {
        clear(listEl);
        const rows = visible();
        if (!items.length) { listEl.append(h('p', { class: 'gpa-rq-empty' }, "Aucune demande reçue pour le moment. Les messages envoyés depuis « Nous contacter » apparaîtront ici.")); return; }
        if (!rows.length) { listEl.append(h('p', { class: 'gpa-rq-empty' }, 'Aucune demande ne correspond à ce filtre.')); return; }
        rows.forEach((it) => listEl.append(requestItem(it)));
      }
      paintList();
    }
    function requestItem(it) {
      const open = RQ.open === it.id;
      const statusSel = h('select', { class: 'gpa-in gpa-rq-status', 'aria-label': 'Statut de la demande de ' + it.nom },
        Object.entries(REQ_STATUS).map(([v, l]) => { const o = h('option', { value: v }, l); if (v === it.status) o.selected = true; return o; }));
      statusSel.addEventListener('change', async () => {
        const prev = it.status; statusSel.disabled = true;
        const r = await adapter.requests.update(it.id, { status: statusSel.value });
        statusSel.disabled = false;
        if (r.status === 401) { onSessionLost(); return; }
        if (!r.ok) { statusSel.value = prev; toast(r.data.error || 'Mise à jour impossible.', { error: true }); return; }
        Object.assign(it, r.data.item); setBadge(); toast('Statut : ' + REQ_STATUS[it.status] + '.');
        if (RQ.filter !== 'toutes' && !(RQ.filter === 'actives' && it.status !== 'archive') && RQ.filter !== it.status) paint();
        else el.className = 'gpa-rq is-' + it.status + (RQ.open === it.id ? ' is-open' : '');
      });
      const summary = h('button', { class: 'gpa-rq-head', type: 'button', 'aria-expanded': open ? 'true' : 'false', onclick: () => {
        RQ.open = RQ.open === it.id ? null : it.id;
        const fresh = requestItem(it); el.replaceWith(fresh);
        if (RQ.open === it.id && it.status === 'nouveau') { statusAuto(it, fresh); }
      } },
        h('span', { class: 'gpa-rq-dot', 'aria-hidden': 'true' }),
        h('span', { class: 'gpa-rq-who' }, h('b', null, it.nom), h('small', null, [it.societe, it.sujet].filter(Boolean).join(' · '))),
        h('span', { class: 'gpa-rq-when' }, fmtDate(it.createdAt)));
      const el = h('article', { class: 'gpa-rq is-' + it.status + (open ? ' is-open' : '') },
        h('div', { class: 'gpa-rq-top' }, summary, statusSel));
      if (open) {
        const tel = telHref(it.telephone), mail = mailHref(it.email), wa = waHref(it.telephone);
        const note = h('textarea', { class: 'gpa-in', rows: '3', id: 'rq-note-' + it.id, maxlength: '2000', placeholder: 'Ex. : rappelé le 28/11, devis envoyé…' }); note.value = it.note || '';
        const saveNote = h('button', { class: 'gpa-btn gpa-btn--sm', type: 'button', onclick: async () => {
          saveNote.disabled = true; const r = await adapter.requests.update(it.id, { note: note.value }); saveNote.disabled = false;
          if (r.status === 401) { onSessionLost(); return; }
          if (!r.ok) { toast(r.data.error || 'Enregistrement impossible.', { error: true }); return; }
          Object.assign(it, r.data.item); toast('Note enregistrée.');
        } }, 'Enregistrer la note');
        const del = h('button', { class: 'gpa-btn gpa-btn--sm gpa-btn--danger', type: 'button', onclick: async () => {
          if (!(await confirmDialog('Supprimer cette demande ?', 'La demande de ' + it.nom + ' sera effacée définitivement. Pour la garder sans l\'afficher, choisissez plutôt le statut « Archivée ».', 'Supprimer'))) return;
          const r = await adapter.requests.remove(it.id);
          if (r.status === 401) { onSessionLost(); return; }
          if (!r.ok) { toast(r.data.error || 'Suppression impossible.', { error: true }); return; }
          RQ.items = RQ.items.filter((x) => x.id !== it.id); RQ.open = null; setBadge(); paint(); toast('Demande supprimée.');
        } }, 'Supprimer');
        const replySubject = 'Votre demande — ' + (it.sujet || 'GAPAWA SMART ENGINEERING');
        el.append(h('div', { class: 'gpa-rq-body' },
          h('dl', { class: 'gpa-rq-dl' },
            h('dt', null, 'E-mail'), h('dd', null, mail ? h('a', { href: mail + '?subject=' + encodeURIComponent(replySubject) }, it.email) : it.email),
            h('dt', null, 'Téléphone'), h('dd', null, it.telephone ? (tel ? h('a', { href: tel }, it.telephone) : it.telephone) : '—'),
            h('dt', null, 'Société'), h('dd', null, it.societe || '—'),
            h('dt', null, 'Objet'), h('dd', null, it.sujet || '—'),
            h('dt', null, 'Reçue le'), h('dd', null, fmtDate(it.createdAt))),
          h('div', { class: 'gpa-rq-msg' }, it.message),
          h('div', { class: 'gpa-rq-quick' },
            mail ? h('a', { class: 'gpa-btn gpa-btn--sm gpa-btn--primary', href: mail + '?subject=' + encodeURIComponent(replySubject) }, 'Répondre par e-mail') : null,
            tel ? h('a', { class: 'gpa-btn gpa-btn--sm', href: tel }, 'Appeler') : null,
            wa ? h('a', { class: 'gpa-btn gpa-btn--sm', href: wa, target: '_blank', rel: 'noopener' }, 'WhatsApp') : null),
          h('div', { class: 'gpa-f' }, h('label', { for: 'rq-note-' + it.id }, 'Note interne (visible uniquement dans l\'administration)'), note),
          h('div', { class: 'gpa-rq-foot' }, saveNote,
            h('span', { class: 'gpa-hint' }, it.updatedBy ? 'Dernière mise à jour par ' + it.updatedBy + ', le ' + fmtDate(it.updatedAt) : ''), del)));
      }
      return el;
    }
    async function statusAuto(it, el) {
      // ouvrir une nouvelle demande la passe automatiquement « En cours »
      const r = await adapter.requests.update(it.id, { status: 'en_cours' });
      if (!r.ok) return;
      Object.assign(it, r.data.item); setBadge();
      const sel = el.querySelector('.gpa-rq-status'); if (sel) sel.value = it.status;
      el.className = 'gpa-rq is-' + it.status + ' is-open';
    }
    if (RQ.items) paint();
    load();
  }

  /* ---------- panneaux ---------- */
  const PANELS = [
    { id: 'overview', group: 'Général', label: 'Tableau de bord', render(m) {
      const items = checklist(S.content), missing = items.filter((i) => !i.ok).length;
      m.append(h('div', { class: 'gpa-kpis' },
        h('div', { class: 'gpa-kpi' }, h('b', null, S.updatedAt ? new Date(S.updatedAt).toLocaleDateString('fr-FR') : 'Jamais'),
          h('span', null, S.updatedAt ? 'Dernière publication' + (S.updatedBy ? ' par ' + S.updatedBy : '') : 'Le site affiche encore son contenu initial')),
        h('div', { class: 'gpa-kpi' }, h('b', null, isDirty() ? 'Brouillon' : 'À jour'), h('span', null, isDirty() ? 'Des modifications attendent la publication' : 'Le site public correspond à cet éditeur')),
        h('div', { class: 'gpa-kpi' }, h('b', null, String(missing)), h('span', null, missing ? 'informations à compléter' : 'Toutes les informations clés sont renseignées'))));
      m.append(card('Informations à compléter', "Tant qu'une coordonnée manque, l'action correspondante est désactivée sur le site et signalée « À renseigner ».",
        h('ul', { class: 'gpa-todo' }, items.map((i) => h('li', null, h('span', { class: 'gpa-dot ' + (i.ok ? 'is-ok' : 'is-miss'), 'aria-hidden': 'true' }),
          h('span', { class: 't' }, i.t, h('small', null, (i.ok ? 'Renseigné. ' : '') + i.d)),
          h('button', { class: 'gpa-btn gpa-btn--sm', type: 'button', onclick: () => go(i.tab) }, i.ok ? 'Modifier' : 'Compléter'))))));
      if (adapter.kind === 'netlify') m.append(card('Formulaire de contact', null,
        h('p', { class: 'gpa-desc' }, "Les messages envoyés depuis le site sont reçus dans l'espace Netlify du site (rubrique Forms). Pour les recevoir par e-mail, ajoutez une notification « Email » dans Netlify : Project configuration → Notifications → Emails and webhooks.")));
    } },
    { id: 'identite', group: 'Général', label: 'Identité et référencement', render(m) {
      const b = S.content.brand, meta = S.content.meta, t = S.content.theme;
      m.append(card('Identité', 'Nom affiché dans l\'en-tête, le pied de page et les résultats de recherche.',
        row(F.text('Nom de l\'entreprise', b, 'name'), F.text('Mot mis en couleur', b, 'nameAccent', { hint: 'Par exemple « SARL ».' })),
        F.text("Sous-titre sous le nom", b, 'location'),
        F.area('Présentation courte (pied de page)', b, 'about', { rows: 3, max: 260 }),
        F.image('Logo', b, 'logoUrl', { logo: true, hint: 'PNG à fond transparent ou SVG, format carré de préférence. Sans logo, un monogramme est affiché.' })));
      m.append(card('Référencement et partage', 'Ce que Google et les réseaux sociaux affichent pour votre site.',
        F.text('Titre de la page', meta, 'title', { max: 70, hint: 'Idéalement 50 à 65 caractères.' }),
        F.area('Description', meta, 'description', { rows: 3, max: 160, hint: 'Idéalement 120 à 160 caractères.' }),
        F.text('Adresse du site', meta, 'siteUrl', { placeholder: 'https://gapawa.com', validate: (v) => (v && !/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}\/?$/i.test(v.trim()) ? 'Adresse attendue au format https://votre-domaine.com' : '') }),
        F.image('Image de partage (1200 × 630 px)', meta, 'ogImage', { hint: 'Affichée lors du partage d\'un lien sur WhatsApp, LinkedIn ou Facebook. Sans image, une vignette aux couleurs de GAPAWA est utilisée.' })));
      m.append(card('Couleurs', 'Les couleurs de la charte. Vérifiez la lisibilité dans l\'aperçu après chaque changement.',
        h('div', { class: 'gpa-row3' }, F.color('Bleu nuit (fonds)', t, 'night', '#0C1B2E'), F.color('Ocre (accent, boutons)', t, 'ochre', '#D9822B'), F.color('Sable (texte sur fond sombre)', t, 'sand', '#E0A54A'),
          F.color('Bleu pétrole', t, 'teal', '#1F4E5F'), F.color('Vert', t, 'green', '#3F6E4D'), F.color('Brique', t, 'brick', '#8C3A2B'))));
      const v = S.content.visible;
      m.append(card('Sections affichées', 'Une section masquée disparaît du site, du menu et du pied de page.',
        h('div', { class: 'gpa-switches' }, [['chiffres', 'Repères chiffrés'], ['demarche', 'Notre démarche'], ['poles', 'Nos pôles'], ['services', 'Prestations'], ['secteurs', "Secteurs d'activité"],
          ['zone', "Zone d'intervention"], ['references', 'Réalisations'], ['partenaires', 'Partenaires'], ['contact', 'Contact']].map(([k, l]) => F.toggle(l, v, k)))));
    } },
    { id: 'navigation', group: 'Général', label: 'Navigation', render(m) {
      m.append(card('Barre supérieure', null, F.toggle('Afficher la barre supérieure', S.content.topbar, 'show'), F.text('Texte (localisation)', S.content.topbar, 'text',
        { hint: 'Le téléphone et l\'e-mail s\'y ajoutent automatiquement dès qu\'ils sont renseignés.' })));
      m.append(card('Menu principal', 'Chaque entrée fait défiler la page jusqu\'à la section choisie.', repeat(S.content.nav, {
        title: (it) => it.label, addLabel: '+ Ajouter une entrée', max: 9, make: () => ({ label: 'Nouvelle entrée', target: 'accueil' }),
        build: (it, b) => b.append(row(F.text('Libellé', it, 'label'), F.select('Section visée', it, 'target', sectionOptions, { warn: hiddenWarn })))
      })));
      m.append(card("Bouton d'appel à l'action", null, row(F.text('Libellé', S.content.navCta, 'label'), F.select('Section visée', S.content.navCta, 'target', sectionOptions, { warn: hiddenWarn }))));
    } },
    { id: 'accueil', group: 'Contenus', label: 'Accueil', render(m) {
      const H = S.content.hero;
      m.append(card("Bandeau d'accueil", 'La première chose que voit un visiteur : qui vous êtes, ce que vous faites, où.',
        F.text('Sur-titre', H, 'eyebrow'), row(F.text('Titre — première ligne', H, 'titleLine1'), F.text('Titre — seconde ligne (en couleur)', H, 'titleLine2')),
        F.area("Texte d'introduction", H, 'body', { rows: 4, max: 420 }), F.text('Mention de localisation', H, 'where')));
      m.append(card('Boutons', null, row(F.text('Bouton principal — libellé', H, 'btn1Label'), F.select('Bouton principal — destination', H, 'btn1Target', sectionOptions, { warn: hiddenWarn })),
        row(F.text('Bouton secondaire — libellé', H, 'btn2Label'), F.select('Bouton secondaire — destination', H, 'btn2Target', sectionOptions, { warn: hiddenWarn }))));
      m.append(card('Visuel', 'Avec une photo, elle occupe tout le bandeau sous un voile bleu nuit. Sans photo, une illustration industrielle est affichée.',
        F.image('Photo de fond', H, 'image', { hint: 'Format paysage, 2000 px de large conseillé. Préférez une photo réelle de vos chantiers ou installations.' }),
        F.text('Description de la photo (accessibilité)', H, 'imageAlt', { hint: 'Par exemple : « Équipe GAPAWA lors d\'un arrêt d\'usine à Figuil ».' }),
        F.toggle("Afficher l'illustration industrielle quand il n'y a pas de photo", H, 'showScene')));
    } },
    { id: 'chiffres', group: 'Contenus', label: 'Repères chiffrés', render(m) {
      m.append(h('div', { class: 'gpa-banner gpa-banner--info' }, h('span', { class: 'grow' }, "N'indiquez que des données exactes et vérifiables (nombre de pôles, zones couvertes, années d'activité…). Aucun chiffre de performance ne doit être estimé.")));
      m.append(card('Repères sous le bandeau', null, repeat(S.content.chiffres.items, {
        title: (it) => `${it.value || ''} ${it.label || ''}`.trim(), addLabel: '+ Ajouter un repère', max: 4, make: () => ({ value: '', label: '' }),
        build: (it, b) => b.append(row(F.text('Valeur', it, 'value', { max: 8 }), F.text('Libellé', it, 'label')))
      })));
    } },
    { id: 'demarche', group: 'Contenus', label: 'Démarche', render(m) {
      m.append(headCard(S.content.demarche));
      m.append(card('Étapes', null, repeat(S.content.demarche.steps, {
        title: (it) => it.title, addLabel: '+ Ajouter une étape', max: 6, make: () => ({ n: '', title: 'Nouvelle étape', text: '' }),
        build: (it, b) => b.append(row(F.text('Numéro affiché', it, 'n', { hint: 'Laisser vide pour une numérotation automatique.' }), F.text('Titre', it, 'title')), F.area('Description', it, 'text', { rows: 2 }))
      })));
    } },
    { id: 'poles', group: 'Contenus', label: "Pôles d'activité", render(m) {
      m.append(headCard(S.content.poles));
      m.append(card('Lien de chaque carte', 'Ouvre le formulaire de contact avec l\'objet « Demande de devis » et le pôle prérempli.', F.text('Libellé du lien', S.content.poles, 'ctaLabel')));
      m.append(card('Pôles', null, repeat(S.content.poles.items, {
        title: (it) => it.title, addLabel: '+ Ajouter un pôle', max: 8, make: () => ({ title: 'Nouveau pôle', color: '#D9822B', image: '', bullets: [] }),
        build: (it, b) => b.append(row(F.text('Titre', it, 'title'), F.color('Couleur du pôle', it, 'color', '#D9822B')),
          F.image('Photo', it, 'image', { hint: 'Format paysage. Sans photo, une plaque graphique numérotée est affichée.' }), F.lines('Prestations listées', it, 'bullets'))
      })));
    } },
    { id: 'services', group: 'Contenus', label: 'Prestations', render(m) {
      m.append(headCard(S.content.services));
      m.append(card('Groupes de prestations', null, repeat(S.content.services.groups, {
        title: (it) => it.title, addLabel: '+ Ajouter un groupe', max: 8, make: () => ({ title: 'Nouveau groupe', bullets: [] }),
        build: (it, b) => b.append(F.text('Titre', it, 'title'), F.lines('Prestations', it, 'bullets'))
      })));
      m.append(card('Bandeau « Pourquoi nous confier vos projets »', null, F.text('Titre du bandeau', S.content.services, 'atoutsTitle'), repeat(S.content.services.atouts, {
        title: (it) => it.title, addLabel: '+ Ajouter un atout', max: 8, make: () => ({ title: 'Nouvel atout', text: '' }),
        build: (it, b) => b.append(F.text('Titre', it, 'title'), F.area('Texte', it, 'text', { rows: 2 }))
      })));
    } },
    { id: 'secteurs', group: 'Contenus', label: "Secteurs d'activité", render(m) {
      m.append(headCard(S.content.secteurs));
      m.append(card('Secteurs', null, repeat(S.content.secteurs.items, {
        title: (it) => it.title, addLabel: '+ Ajouter un secteur', max: 9, make: () => ({ title: 'Nouveau secteur', text: '', image: '' }),
        build: (it, b) => b.append(F.text('Titre', it, 'title'), F.area('Description', it, 'text', { rows: 2 }), F.image('Photo', it, 'image'))
      })));
      m.append(card('Autres clients', null, F.text('Titre de la liste', S.content.secteurs, 'tagsTitle'), F.lines('Étiquettes', S.content.secteurs, 'tags')));
    } },
    { id: 'zone', group: 'Contenus', label: "Zone d'intervention", render(m) {
      m.append(headCard(S.content.zone));
      m.append(card('Zones couvertes', null, repeat(S.content.zone.blocks, {
        title: (it) => it.label, addLabel: '+ Ajouter une zone', max: 8, make: () => ({ label: 'Nouvelle zone', text: '' }),
        build: (it, b) => b.append(F.text('Intitulé', it, 'label'), F.area('Description', it, 'text', { rows: 2 }))
      })));
      m.append(card('Corridor logistique', 'Schéma des villes étapes, de la côte jusqu\'au Tchad.', F.text('Titre du schéma', S.content.zone, 'corridorTitle'), repeat(S.content.zone.corridor, {
        title: (it) => it.name, addLabel: '+ Ajouter une étape', max: 10, make: () => ({ name: '', note: '', highlight: false }),
        build: (it, b) => b.append(row(F.text('Ville', it, 'name'), F.text('Précision', it, 'note')), F.toggle('Mettre en évidence (siège, base)', it, 'highlight'))
      })));
    } },
    { id: 'references', group: 'Contenus', label: 'Réalisations', render(m) {
      m.append(headCard(S.content.references));
      m.append(card('Fiches de référence', "Une fiche sans maître d'ouvrage ni objet s'affiche comme « en cours de documentation ». N'y inscrivez que des chantiers réels, avec l'accord du client.",
        repeat(S.content.references.items, {
          title: (it) => it.objet || it.title, addLabel: '+ Ajouter une référence', max: 24,
          make: () => ({ title: 'Nouvelle référence', objet: '', client: '', lieu: '', secteur: '', annee: '', image: '' }),
          build: (it, b) => b.append(F.text('Intitulé des travaux', it, 'objet', { hint: 'Titre affiché sur la fiche. Par exemple : « Réhabilitation du poste HTA/BT ».' }),
            row(F.text("Maître d'ouvrage / client", it, 'client'), F.text('Lieu', it, 'lieu')), row(F.text('Secteur ou pôle', it, 'secteur'), F.text('Année', it, 'annee', { max: 9 })),
            F.text('Libellé provisoire (si la fiche est vide)', it, 'title'), F.image('Photo du chantier', it, 'image'))
        }),
        F.text('Texte affiché pour une fiche vide', S.content.references, 'emptyLabel'), F.text('Note sous les références', S.content.references, 'note')));
    } },
    { id: 'partenaires', group: 'Contenus', label: 'Partenaires', render(m) {
      m.append(headCard(S.content.partenaires));
      m.append(card('Partenaires', "Logo en priorité ; à défaut, le nom s'affiche. Un emplacement vide est signalé « Emplacement partenaire ».",
        repeat(S.content.partenaires.items, {
          title: (it) => it.name, addLabel: '+ Ajouter un partenaire', max: 24, make: () => ({ name: '', logoUrl: '', url: '' }),
          build: (it, b) => b.append(row(F.text('Nom', it, 'name'), F.text('Site web (facultatif)', it, 'url', { placeholder: 'https://', validate: (v) => (v && !/^https:\/\//i.test(v.trim()) ? 'Adresse attendue au format https://…' : '') })),
            F.image('Logo', it, 'logoUrl', { logo: true }))
        }), F.text('Note sous les logos', S.content.partenaires, 'note')));
    } },
    { id: 'contact', group: 'Contenus', label: 'Contact et formulaire', render(m) {
      const K = S.content.contact;
      m.append(headCard(K, 'En-tête du bloc contact'));
      m.append(card('Coordonnées', 'Chaque coordonnée renseignée active le bouton correspondant sur le site.',
        row(F.text('Téléphone', K, 'phone', { type: 'tel', inputmode: 'tel', placeholder: '+237 6XX XX XX XX', validate: (v) => (v.trim() && !telHref(v) ? 'Numéro incomplet.' : '') }),
          F.text('E-mail', K, 'email', { type: 'email', placeholder: 'contact@gapawa.com', validate: (v) => (v.trim() && !mailHref(v) ? 'Adresse e-mail invalide.' : '') })),
        F.text('WhatsApp', K, 'whatsapp', { inputmode: 'tel', placeholder: '+237 6XX XX XX XX', hint: "Numéro au format international, avec l'indicatif 237.", validate: (v) => (v.trim() && !waHref(v) ? 'Numéro incomplet (indicatif international requis).' : '') }),
        F.area('Adresse', K, 'address', { rows: 2 }), F.text('Horaires', K, 'hours', { placeholder: 'Du lundi au samedi, 7 h 30 – 17 h 30' })));
      m.append(card('Mentions légales', null, repeat(K.legal, {
        title: (it) => it.label, addLabel: '+ Ajouter une mention', max: 8, make: () => ({ label: '', value: '' }),
        build: (it, b) => b.append(row(F.text('Intitulé', it, 'label'), F.text('Valeur', it, 'value')))
      })));
      const FM = K.form;
      m.append(card('Formulaire de contact', adapter.kind === 'netlify' ? 'Les messages sont collectés par Netlify Forms (voir le tableau de bord).' : 'Le formulaire fonctionne une fois le site déployé sur Netlify.',
        F.toggle('Afficher le formulaire', FM, 'enabled'), F.text('Titre', FM, 'title'), F.area('Introduction', FM, 'intro', { rows: 2 }),
        F.lines('Objets proposés', FM, 'subjects', { hint: 'Un objet par ligne. Conservez « Demande de devis » : les boutons de devis le présélectionnent.' }),
        F.area('Texte de consentement', FM, 'consent', { rows: 2 }), F.area('Message de confirmation', FM, 'success', { rows: 2 })));
    } },
    { id: 'pied', group: 'Contenus', label: 'Pied de page', render(m) {
      m.append(card('Pied de page', 'La présentation courte se modifie dans « Identité et référencement ».',
        F.text('Ligne de copyright (après « © année »)', S.content.footer, 'left'), F.text('Slogan sous le logo', S.content.footer, 'right')));
    } },
    { id: 'demandes', group: 'Clients', label: 'Demandes reçues', intro: 'Messages envoyés par les visiteurs depuis la section « Nous contacter ». Ils ne sont visibles que par les administrateurs connectés.', render: renderRequests },
    { id: 'historique', group: 'Outils', label: 'Historique', render(m) {
      if (!adapter.history) { m.append(card('Historique', 'Dans cet aperçu, chaque publication crée une nouvelle version de la page, consultable depuis l\'historique des versions de claude.ai.')); return; }
      const list = h('ul', { class: 'gpa-hist' }, h('li', null, 'Chargement…'));
      m.append(card('20 dernières versions publiées', "Charger une version la place dans l'éditeur ; elle ne remplace le site qu'après un clic sur « Publier ».", list));
      adapter.history().then((r) => {
        clear(list);
        if (r.status === 401) { onSessionLost(); return; }
        if (!r.ok || !r.data.items || !r.data.items.length) { list.append(h('li', null, 'Aucune version antérieure pour le moment.')); return; }
        r.data.items.forEach((it) => list.append(h('li', null, h('span', { class: 't' }, fmtDate(it.updatedAt) || it.id, h('small', null, it.updatedBy ? 'Publiée par ' + it.updatedBy : '')),
          h('button', { class: 'gpa-btn gpa-btn--sm', type: 'button', onclick: async () => {
            if (!(await confirmDialog('Charger cette version ?', "Le contenu actuel de l'éditeur sera remplacé. Rien n'est publié tant que vous ne cliquez pas sur « Publier ».", 'Charger'))) return;
            const v = await adapter.historyGet(it.id);
            if (v.status === 401) { onSessionLost(); return; }
            if (!v.ok || !v.data.content) { toast('Version illisible.', { error: true }); return; }
            S.content = migrate(v.data.content); changed(); toast('Version chargée dans l\'éditeur. Vérifiez l\'aperçu puis publiez.'); go('overview');
          } }, 'Charger'))));
      }).catch(() => { clear(list); list.append(h('li', null, "Impossible de lire l'historique.")); });
    } }
  ];

  /* ---------- rendu principal ---------- */
  function go(tab) { S.tab = tab; paintEditor(); window.scrollTo(0, 0); if (mainEl) { const hd = mainEl.querySelector('h1'); if (hd) hd.focus(); } }

  function topBar() {
    pillEl = h('span', { class: 'gpa-pill', role: 'status' });
    publishBtn = h('button', { class: 'gpa-btn gpa-btn--primary', type: 'button', onclick: publish }, 'Publier les modifications');
    const view = adapter.kind === 'netlify'
      ? h('a', { class: 'gpa-btn gpa-btn--dark', href: adapter.siteHref, target: '_blank', rel: 'noopener' }, 'Voir le site publié')
      : h('a', { class: 'gpa-btn gpa-btn--dark', href: '#accueil' }, 'Quitter l\'administration');
    const preview = h('button', { class: 'gpa-btn gpa-btn--dark', type: 'button', onclick: openPreview }, 'Aperçu');
    const out = adapter.kind === 'netlify' ? h('button', { class: 'gpa-btn gpa-btn--dark', type: 'button', onclick: logout, title: S.session && S.session.user ? 'Connecté : ' + S.session.user : null }, 'Se déconnecter') : null;
    return h('header', { class: 'gpa-top' }, h('div', { class: 'gpa-top-in' },
      h('div', { class: 'gpa-title' }, h('span', { class: 'gpa-mono', 'aria-hidden': 'true' }, 'G'), h('span', null, h('strong', null, 'Administration'), h('span', null, S.session && S.session.user ? S.session.user : 'GAPAWA'))),
      h('div', { class: 'gpa-actions' }, pillEl, preview, view, publishBtn, out)));
  }

  function paintEditor() {
    clear(root);
    root.append(topBar());
    const side = h('nav', { class: 'gpa-side', 'aria-label': "Rubriques de l'administration" });
    let group = '';
    const missing = checklist(S.content).filter((i) => !i.ok).length;
    PANELS.forEach((p) => {
      if (p.group !== group) { group = p.group; side.append(h('p', { class: 'gpa-group' }, group)); }
      side.append(h('button', { class: 'gpa-tab', type: 'button', 'aria-current': S.tab === p.id ? 'page' : null, onclick: () => go(p.id) },
        h('span', null, p.label), p.id === 'overview' && missing ? h('span', { class: 'gpa-badge' }, String(missing)) : null,
        p.id === 'demandes' && S.newRequests ? h('span', { class: 'gpa-badge gpa-badge--new', title: 'Nouvelles demandes' }, String(S.newRequests)) : null));
    });
    const tabSel = h('select', { class: 'gpa-in gpa-tabselect', 'aria-label': 'Choisir une rubrique', onchange: (e) => go(e.target.value) },
      PANELS.map((p) => { const o = h('option', { value: p.id }, p.group + ' — ' + p.label); if (p.id === S.tab) o.selected = true; return o; }));
    mainEl = h('main', { class: 'gpa-main' });
    const panel = PANELS.find((p) => p.id === S.tab) || PANELS[0];
    mainEl.append(tabSel, h('div', { class: 'gpa-h' }, h('div', null, h('h1', { tabindex: '-1' }, panel.label),
      h('p', null, panel.intro || 'Les modifications sont enregistrées en brouillon sur ce poste, puis appliquées au site lorsque vous cliquez sur « Publier les modifications ».'))));
    const draft = store.get(DRAFT_KEY);
    if (S.tab === 'overview' && draft && draft.content && draft.env === adapter.kind && JSON.stringify(migrate(draft.content)) !== JSON.stringify(S.content)) {
      const stale = draft.baseVersion !== S.version;
      mainEl.append(h('div', { class: 'gpa-banner ' + (stale ? 'gpa-banner--warn' : 'gpa-banner--info') },
        h('span', { class: 'grow' }, `Un brouillon non publié du ${fmtDate(draft.savedAt)} a été retrouvé sur ce poste.` + (stale ? ' Attention : le site a été republié depuis.' : '')),
        h('button', { class: 'gpa-btn gpa-btn--sm', type: 'button', onclick: () => { S.content = migrate(draft.content); changed(); paintEditor(); toast('Brouillon restauré.'); } }, 'Reprendre le brouillon'),
        h('button', { class: 'gpa-btn gpa-btn--sm', type: 'button', onclick: () => { store.del(DRAFT_KEY); paintEditor(); } }, "L'ignorer")));
    }
    panel.render(mainEl);
    root.append(h('div', { class: 'gpa-layout' }, side, mainEl), toasts);
    paintStatus();
  }

  /* ---------- aperçu ---------- */
  let previewEl = null, previewWidth = '100%';
  function paintPreview() {
    if (!previewFrame) return;
    let y = 0; try { y = previewFrame.contentWindow.scrollY; } catch { /* inaccessible */ }
    previewFrame.onload = () => { try { previewFrame.contentWindow.scrollTo(0, y); } catch { /* idem */ } };
    previewFrame.srcdoc = adapter.previewDoc(S.content);
  }
  function openPreview() {
    if (adapter.kind === 'claude') { inlinePreview(); return; }
    const devices = [['Ordinateur', '100%'], ['Tablette', '820px'], ['Mobile', '390px']];
    previewFrame = h('iframe', { title: 'Aperçu du site avec les modifications non publiées' });
    previewFrame.style.maxWidth = previewWidth;
    const seg = h('div', { class: 'gpa-seg', role: 'group', 'aria-label': "Largeur d'écran" }, devices.map(([l, w]) => h('button', { type: 'button', 'aria-pressed': String(previewWidth === w),
      onclick: (e) => { previewWidth = w; previewFrame.style.maxWidth = w; seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); } }, l)));
    const closeBtn = h('button', { class: 'gpa-btn gpa-btn--dark', type: 'button', onclick: closePreview }, "Fermer l'aperçu");
    previewEl = h('div', { class: 'gpa-preview', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Aperçu' },
      h('div', { class: 'gpa-preview-bar' }, h('strong', null, isDirty() ? 'Aperçu — modifications non publiées' : 'Aperçu — identique au site publié'), seg, closeBtn),
      h('div', { class: 'gpa-preview-stage' }, previewFrame));
    root.append(previewEl); paintPreview(); closeBtn.focus();
    document.addEventListener('keydown', previewEsc);
  }
  function previewEsc(e) { if (e.key === 'Escape') closePreview(); }
  function closePreview() { if (previewEl) previewEl.remove(); previewEl = null; previewFrame = null; document.removeEventListener('keydown', previewEsc); }
  function inlinePreview() {
    const app = document.getElementById('gpw-app'), theme = document.getElementById('gpw-theme');
    if (!app) return;
    app.innerHTML = renderBody(S.content, { mode: 'claude' });
    if (theme) theme.textContent = themeCss(S.content);
    root.hidden = true; document.documentElement.classList.remove('gpa-locked');
    const bar = h('div', { class: 'gpa', style: 'position:fixed;left:0;right:0;bottom:0;z-index:1500;min-height:0;background:transparent' },
      h('div', { class: 'gpa-toast', style: 'margin:12px;justify-content:space-between' }, h('span', null, 'Aperçu des modifications non publiées'),
        h('button', { type: 'button', onclick: () => { bar.remove(); root.hidden = false; document.documentElement.classList.add('gpa-locked'); } }, "Revenir à l'administration")));
    document.body.append(bar); window.scrollTo(0, 0);
  }

  /* ---------- publication ---------- */
  async function publish() {
    if (S.busy) return;
    if (!isDirty()) { toast('Aucune modification à publier.'); return; }
    S.busy = true; setStatus('ok', 'Publication…');
    try {
      const r = await adapter.save(S.content, S.version);
      if (r.ok) {
        S.publishedJson = JSON.stringify(S.content); S.version = r.data.version || S.version; S.updatedAt = r.data.updatedAt; S.updatedBy = r.data.updatedBy || S.updatedBy;
        store.del(DRAFT_KEY); setStatus('ok', 'Publié'); toast('Modifications publiées. Le site public est à jour.');
        setTimeout(() => setStatus(null), 3000);
        if (S.tab === 'overview') paintEditor();
      } else if (r.status === 401) { setStatus('err', 'Session expirée'); onSessionLost(); }
      else if (r.status === 409) {
        setStatus('err', 'Conflit de version');
        const reload = await confirmDialog('Le site a été publié depuis un autre poste', "Vos modifications restent enregistrées en brouillon sur ce poste. Rechargez la version en ligne, puis reprenez votre brouillon depuis le tableau de bord si besoin.", 'Recharger la version en ligne');
        if (reload) await loadContent();
      } else { setStatus('err', 'Échec de la publication'); toast(r.data.error || 'La publication a échoué.', { error: true, ms: 7000 }); }
    } catch { setStatus('err', 'Réseau indisponible'); toast('Connexion impossible. Vos modifications sont conservées en brouillon.', { error: true }); }
    finally { S.busy = false; paintStatus(); }
  }

  /* ---------- session ---------- */
  async function logout() {
    if (isDirty() && !(await confirmDialog('Se déconnecter ?', 'Des modifications ne sont pas publiées. Elles restent enregistrées en brouillon sur ce poste.', 'Se déconnecter'))) return;
    await adapter.logout(); S.session = null; S.content = null; closePreview(); paintLogin();
  }
  function onSessionLost() { toast('Votre session a expiré. Reconnectez-vous : vos modifications sont conservées en brouillon.', { error: true, ms: 8000 }); writeDraft(); closePreview(); paintLogin(); }

  function authShell(...kids) {
    clear(root);
    root.append(h('div', { class: 'gpa-auth' }, h('div', { class: 'gpa-auth-card' },
      h('div', { class: 'gpa-title' }, h('span', { class: 'gpa-mono', 'aria-hidden': 'true' }, 'G'), h('span', null, h('strong', null, 'GAPAWA'), h('span', null, 'Smart Engineering SARL'))), kids)), toasts);
  }
  function paintLogin(message) {
    const err = h('p', { class: 'gpa-err', role: 'alert', hidden: !message }, message || '');
    const u = h('input', { class: 'gpa-in', id: 'gpa-user', name: 'username', autocomplete: 'username', required: true, autocapitalize: 'none', spellcheck: 'false' });
    const p = h('input', { class: 'gpa-in', id: 'gpa-pass', name: 'password', type: 'password', autocomplete: 'current-password', required: true });
    const btn = h('button', { class: 'gpa-btn gpa-btn--primary', type: 'submit' }, 'Se connecter');
    const form = h('form', { novalidate: true, onsubmit: async (e) => {
      e.preventDefault(); err.hidden = true;
      if (!u.value.trim() || !p.value) { err.textContent = 'Saisissez votre identifiant et votre mot de passe.'; err.hidden = false; return; }
      btn.disabled = true; btn.textContent = 'Vérification…';
      try {
        const r = await adapter.login(u.value.trim(), p.value);
        if (r.ok) { p.value = ''; await start(); return; }
        err.textContent = r.data.error || 'Connexion impossible.'; err.hidden = false;
      } catch { err.textContent = 'Le serveur ne répond pas. Réessayez dans un instant.'; err.hidden = false; }
      btn.disabled = false; btn.textContent = 'Se connecter';
    } },
    h('div', { class: 'gpa-f' }, h('label', { for: 'gpa-user' }, 'Identifiant'), u),
    h('div', { class: 'gpa-f' }, h('label', { for: 'gpa-pass' }, 'Mot de passe'), p), err, btn);
    authShell(h('h1', null, 'Connexion à l\'administration'), h('p', null, 'Accès réservé aux administrateurs autorisés du site.'), form,
      h('p', { class: 'gpa-auth-foot' }, h('a', { href: '/' }, 'Retour au site')));
    u.focus();
  }
  function paintNotConfigured() {
    authShell(h('h1', null, 'Administration non configurée'),
      h('p', null, "Le site est en ligne, mais aucun compte administrateur n'a encore été défini côté serveur. Pour l'activer, le responsable technique doit :"),
      h('ol', { class: 'gpa-steps' },
        h('li', null, 'générer l\'empreinte du mot de passe avec ', h('code', null, 'npm run hash-password'), ' ;'),
        h('li', null, 'renseigner dans Netlify (Project configuration → Environment variables) : ', h('code', null, 'ADMIN_USER'), ', ', h('code', null, 'ADMIN_PASSWORD_HASH'), ' et ', h('code', null, 'SESSION_SECRET'), ' ;'),
        h('li', null, 'redéployer le site.')),
      h('p', { class: 'gpa-auth-foot' }, h('a', { href: '/' }, 'Retour au site')));
  }
  function paintNoBackend() {
    authShell(h('h1', null, 'Serveur d\'administration introuvable'),
      h('p', null, "Les fonctions serveur du site ne répondent pas. C'est le cas si le site a été déployé par simple glisser-déposer : ce mode publie les pages, mais pas les fonctions qui protègent et enregistrent l'administration."),
      h('p', null, 'Déployez le projet depuis un dépôt Git relié à Netlify, ou avec Netlify CLI (netlify deploy --build --prod). Aucune modification n\'est possible tant que ce serveur n\'est pas en place.'),
      h('p', { class: 'gpa-auth-foot' }, h('a', { href: '/' }, 'Retour au site')));
  }
  function paintDenied() {
    authShell(h('h1', null, 'Accès refusé'), h('p', null, "Vous n'avez pas les droits de modification sur ce site. Demandez à son propriétaire de vous accorder un accès en écriture."),
      h('p', { class: 'gpa-auth-foot' }, h('a', { href: '#accueil' }, 'Retour au site')));
  }

  async function loadContent() {
    const d = await adapter.load();
    S.content = d.content; S.publishedJson = JSON.stringify(d.content); S.version = d.version; S.updatedAt = d.updatedAt; S.updatedBy = d.updatedBy;
    paintEditor();
    if (adapter.requests) refreshRequestCount().then(() => { if (S.newRequests && S.tab !== 'demandes') { paintEditor(); toast(S.newRequests + ' nouvelle(s) demande(s) client à traiter.', { action: { label: 'Voir', fn: () => go('demandes') }, ms: 9000 }); } });
  }

  async function start() {
    clear(root); root.append(h('div', { class: 'gpa-boot' }, 'Vérification des droits…'));
    const s = await adapter.session();
    S.session = s;
    if (!s.backend) { paintNoBackend(); return; }
    if (!s.configured) { paintNotConfigured(); return; }
    if (!s.authenticated) { if (adapter.kind === 'claude') paintDenied(); else paintLogin(); return; }
    try { await loadContent(); }
    catch (e) { authShell(h('h1', null, 'Contenu illisible'), h('p', null, e.message || 'Le contenu publié ne peut pas être lu.')); }
  }

  await start();

  return {
    unmount() {
      closePreview(); writeDraft(); window.removeEventListener('beforeunload', onBeforeUnload); window.removeEventListener('pagehide', writeDraft);
      if (overlay) { root.remove(); document.documentElement.classList.remove('gpa-locked'); }
      document.querySelectorAll('.gpa-toast').forEach((n) => n.closest('.gpa') !== root && n.parentElement && n.parentElement.remove());
      if (appSnapshot != null && mode === 'claude') {
        const app = document.getElementById('gpw-app'); if (app) app.innerHTML = appSnapshot;
        const el = document.getElementById('gpw-content'), theme = document.getElementById('gpw-theme');
        if (theme && el) { try { theme.textContent = themeCss(JSON.parse(el.textContent)); } catch { /* inchangé */ } }
      }
    }
  };
}

/* Page /administration sur Netlify */
if (document.documentElement.dataset.adminPage === 'netlify') {
  mountAdmin({ mode: 'netlify', root: document.getElementById('gpw-admin') });
}
