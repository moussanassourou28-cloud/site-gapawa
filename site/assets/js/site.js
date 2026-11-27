/*
 * GAPAWA — interactions du site public.
 * Aucun code d'administration ici : sur Netlify, l'administration est une page distincte (/administration)
 * protégée côté serveur. Seule exception : dans l'aperçu hébergé par claude.ai, l'administration
 * s'ouvre via #administration et reste soumise au contrôle canEdit() de la plateforme.
 */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- en-tête : ombre au défilement ---------- */
const hdr = $('[data-hdr]');
const onScroll = () => { if (hdr) hdr.classList.toggle('is-scrolled', window.scrollY > 8); };
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- menu mobile ---------- */
const menuBtn = $('[data-menu-btn]'), menu = $('[data-menu]');
const mq = window.matchMedia('(max-width: 1080px)');
function setMenu(open, { focus = true } = {}) {
  if (!menu || !menuBtn) return;
  if (open && hdr) document.documentElement.style.setProperty('--nav-top', Math.max(0, hdr.getBoundingClientRect().bottom) + 'px');
  document.body.classList.add('menu-anim'); clearTimeout(setMenu.t); setMenu.t = setTimeout(() => document.body.classList.remove('menu-anim'), 320);
  menu.classList.toggle('is-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('menu-open', open);
  const txt = $('.menu-btn-txt', menuBtn); if (txt) txt.textContent = open ? 'Fermer' : 'Menu';
  if (open && focus) { const first = $('a', menu); if (first) first.focus(); }
  if (!open && focus && document.activeElement && menu.contains(document.activeElement)) menuBtn.focus();
}
if (menuBtn && menu) {
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false, { focus: false }); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false);
    if (e.key === 'Tab' && menuBtn.getAttribute('aria-expanded') === 'true' && mq.matches) {
      const focusables = [menuBtn, ...$$('a', menu)];
      const i = focusables.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); focusables[focusables.length - 1].focus(); }
      else if (!e.shiftKey && i === focusables.length - 1) { e.preventDefault(); focusables[0].focus(); }
    }
  });
  mq.addEventListener('change', (e) => { if (!e.matches) setMenu(false, { focus: false }); });
}

/* ---------- section active dans le menu ---------- */
const navLinks = $$('[data-nav]');
if ('IntersectionObserver' in window && navLinks.length) {
  const byId = new Map(navLinks.map((a) => [a.dataset.nav, a]));
  const visible = new Map();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => visible.set(en.target.id, en.isIntersecting ? en.intersectionRatio : 0));
    let best = null, ratio = 0;
    visible.forEach((r, id) => { if (r > ratio) { ratio = r; best = id; } });
    navLinks.forEach((a) => a.removeAttribute('aria-current'));
    if (best && byId.get(best)) byId.get(best).setAttribute('aria-current', 'true');
  }, { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.01, 0.25] });
  byId.forEach((_, id) => { const sec = document.getElementById(id); if (sec) io.observe(sec); });
}

/* ---------- apparition douce : jouée à l'entrée à l'écran, jamais de contenu masqué au repos ---------- */
if (!reduceMotion && 'IntersectionObserver' in window) {
  const items = $$('[data-reveal]').filter((el) => el.getBoundingClientRect().top > window.innerHeight);
  const ro = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('rv-play'); ro.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -6% 0px' });
  items.forEach((el) => ro.observe(el));
}

/* ---------- liens « Demander un devis » : préremplissage du formulaire ---------- */
const form = $('[data-contact-form]');
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-subject]');
  if (!a || !form) return;
  const sel = form.elements.sujet, msg = form.elements.message;
  if (sel && a.dataset.subject) {
    const opt = Array.from(sel.options).find((o) => o.value === a.dataset.subject || o.text === a.dataset.subject);
    if (opt) sel.value = opt.value;
  }
  if (msg && a.dataset.message && (!msg.value.trim() || msg.dataset.prefilled === '1')) {
    msg.value = a.dataset.message + '\n'; msg.dataset.prefilled = '1';
  }
});

/* ---------- formulaire de contact ---------- */
if (form) {
  const status = $('[data-form-status]', form), success = $('[data-form-success]', form);
  const btn = $('button[type="submit"]', form);
  const msgs = {
    nom: 'Indiquez votre nom.', email: 'Indiquez une adresse e-mail valide.',
    sujet: "Choisissez l'objet de votre demande.", message: 'Décrivez votre besoin (10 caractères minimum).',
    consentement: 'Votre accord est nécessaire pour traiter la demande.'
  };
  const setErr = (field, text) => {
    const box = field.closest('.f'); let err = box && box.querySelector('.f-err');
    if (text) {
      field.setAttribute('aria-invalid', 'true');
      if (box && !err) { err = document.createElement('p'); err.className = 'f-err'; err.id = field.id + '-err'; box.appendChild(err); }
      if (err) { err.textContent = text; field.setAttribute('aria-describedby', err.id); }
    } else {
      field.removeAttribute('aria-invalid'); field.removeAttribute('aria-describedby');
      if (err) err.remove();
    }
  };
  const check = (field) => {
    let bad = false;
    if (field.type === 'checkbox') bad = field.required && !field.checked;
    else if (field.required && !field.value.trim()) bad = true;
    else if (field.type === 'email' && field.value && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(field.value.trim())) bad = true;
    else if (field.name === 'message' && field.value.trim().length < 10) bad = true;
    setErr(field, bad ? (msgs[field.name] || 'Champ invalide.') : '');
    return !bad;
  };
  ['nom', 'email', 'sujet', 'message', 'consentement'].forEach((n) => {
    const f = form.elements[n]; if (!f) return;
    if (f.type === 'checkbox' || f.tagName === 'SELECT') f.addEventListener('change', () => check(f));
    else f.addEventListener('blur', (e) => {
      // Ne pas déplacer le bouton d'envoi sous le pointeur : l'envoi revalide de toute façon tous les champs.
      if (e.relatedTarget && e.relatedTarget.type === 'submit') return;
      setTimeout(() => check(f), 200);
    });
    f.addEventListener('input', () => { if (f.getAttribute('aria-invalid') === 'true') check(f); });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (status) { status.textContent = ''; status.classList.remove('is-error'); }
    const fields = ['nom', 'email', 'sujet', 'message', 'consentement'].map((n) => form.elements[n]).filter(Boolean);
    const results = fields.map((f) => check(f));           // tous les champs sont vérifiés et signalés
    const firstBad = fields[results.indexOf(false)];
    if (firstBad) { firstBad.focus(); if (status) { status.textContent = 'Merci de corriger les champs signalés.'; status.classList.add('is-error'); } return; }
    if (form.elements['bot-field'] && form.elements['bot-field'].value) return; // robot
    if (form.dataset.preview === '1') {
      if (status) status.textContent = "Aperçu : l'envoi du formulaire sera actif une fois le site déployé sur Netlify.";
      return;
    }
    btn.disabled = true; const label = btn.textContent; btn.textContent = 'Envoi en cours…';
    try {
      const fd = new FormData(form);
      // 1) Enregistrement côté serveur : la demande apparaît dans l'administration (rubrique « Demandes reçues »).
      let saved = false, refusal = '';
      try {
        const r = await fetch('/api/requests', { method: 'POST', headers: { 'content-type': 'application/json', 'x-gapawa-request': '1' }, body: JSON.stringify(Object.fromEntries(fd)) });
        if (r.ok) saved = true;
        else if (r.status === 422 || r.status === 429) { const d = await r.json().catch(() => ({})); refusal = d.error || ''; }
      } catch { /* serveur injoignable : on s'appuie sur Netlify Forms */ }
      if (refusal) { const err = new Error(refusal); err.userMessage = refusal; throw err; }
      // 2) Copie vers Netlify Forms (notifications par e-mail, export CSV) ; suffit à elle seule si l'étape 1 a échoué.
      let forwarded = false;
      try {
        const res = await fetch('/__forms.html', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fd).toString() });
        forwarded = res.ok;
      } catch { /* ignoré si l'étape 1 a réussi */ }
      if (!saved && !forwarded) throw new Error('envoi impossible');
      form.reset(); delete form.elements.message.dataset.prefilled;
      $$('.f-err', form).forEach((n) => n.remove());
      if (success) { success.hidden = false; success.setAttribute('tabindex', '-1'); success.focus(); }
      if (status) status.textContent = '';
    } catch (err) {
      if (status) {
        status.classList.add('is-error');
        status.textContent = err && err.userMessage ? err.userMessage : "L'envoi n'a pas abouti. Réessayez dans un instant ou contactez-nous directement par téléphone ou par e-mail.";
      }
    } finally { btn.disabled = false; btn.textContent = label; }
  });
}

/* ---------- aperçu hébergé par claude.ai : administration via #administration ---------- */
if (typeof (window.claude && window.claude.use) === 'function') {
  let mounted = null;
  const route = async () => {
    if (location.hash === '#administration') {
      if (!mounted) {
        const mod = await import(new URL('./admin.js', import.meta.url).href);
        mounted = await mod.mountAdmin({ mode: 'claude' });
      }
    } else if (mounted) { mounted.unmount(); mounted = null; }
  };
  window.addEventListener('hashchange', route);
  route();
}
