/*
 * GAPAWA — moteur de rendu partagé.
 * Utilisé à l'identique par : la génération statique (scripts/build.mjs), le rendu serveur
 * Netlify (netlify/edge-functions/home.mjs), l'aperçu de l'administration et la version Claude.
 * Aucune dépendance, aucun accès au DOM : uniquement des chaînes, toutes échappées.
 */

export const SCHEMA_VERSION = 2;

export const SECTIONS = [
  ['accueil', 'Accueil'], ['demarche', 'Notre démarche'], ['poles', 'Nos pôles'],
  ['services', 'Prestations'], ['secteurs', "Secteurs d'activité"], ['zone', "Zone d'intervention"],
  ['references', 'Réalisations'], ['partenaires', 'Partenaires'], ['contact', 'Contact']
];

/* ------------------------------------------------------------------ défauts */
export const DEFAULTS = {
  schema: 2,
  meta: {
    siteUrl: 'https://gapawa.com',
    title: 'GAPAWA SMART ENGINEERING SARL — Ingénierie, travaux et maintenance industriels au Nord-Cameroun',
    description: "Cabinet d'études, travaux et maintenance industriels, fourniture d'équipements et quincaillerie générale. Basée à Figuil (Mayo-Louti), GAPAWA intervient dans le Grand Nord camerounais et en zone CEMAC.",
    ogImage: ''
  },
  brand: {
    name: 'GAPAWA SMART ENGINEERING', nameAccent: 'SARL', location: 'Figuil · Cameroun', logoUrl: '',
    about: "Ingénierie, travaux et maintenance industriels, fourniture d'équipements et quincaillerie générale, depuis Figuil, au cœur du bassin industriel du Nord-Cameroun."
  },
  theme: { night: '#0C1B2E', ochre: '#D9822B', teal: '#1F4E5F', sand: '#E0A54A', green: '#3F6E4D', brick: '#8C3A2B' },
  visible: { chiffres: true, demarche: true, poles: true, services: true, secteurs: true, zone: true, references: true, partenaires: true, contact: true },
  topbar: { show: true, text: 'Figuil, Mayo-Louti — Région du Nord, Cameroun' },
  nav: [
    { label: 'Accueil', target: 'accueil' }, { label: 'Nos pôles', target: 'poles' },
    { label: 'Services', target: 'services' }, { label: 'Références', target: 'references' },
    { label: "Zone d'intervention", target: 'zone' }
  ],
  navCta: { label: 'Nous contacter', target: 'contact' },
  hero: {
    eyebrow: 'Ingénierie · Travaux & maintenance industriels · Fourniture · Quincaillerie',
    titleLine1: 'Un seul partenaire technique,', titleLine2: "de l'étude jusqu'à la maintenance.",
    body: "GAPAWA SMART ENGINEERING conçoit, construit, équipe et entretient les installations industrielles et les infrastructures du Grand Nord camerounais. Quatre pôles réunis dans une même entreprise : un seul interlocuteur, responsable du résultat, de l'avant-projet jusqu'au contrat de maintenance annuel.",
    btn1Label: 'Voir nos services', btn1Target: 'services',
    btn2Label: 'Demander un devis', btn2Target: 'contact',
    where: 'Figuil, Mayo-Louti — Région du Nord, Cameroun', showScene: true, image: '', imageAlt: ''
  },
  chiffres: { items: [
    { value: '4', label: "pôles d'activité intégrés" },
    { value: '1', label: "interlocuteur unique, de l'étude à la maintenance" },
    { value: '3', label: 'régions du Grand Nord couvertes' },
    { value: 'CEMAC', label: 'Cameroun, Tchad, République Centrafricaine' }
  ] },
  demarche: { eyebrow: 'Notre démarche', title: 'Une chaîne de valeur intégrée',
    intro: "Une même affaire peut mobiliser nos quatre pôles. La marge reste dans l'entreprise à chaque étape, et vous gardez un seul interlocuteur responsable du résultat.",
    steps: [] },
  poles: { eyebrow: 'Nos activités', title: 'Quatre pôles complémentaires', intro: '', ctaLabel: 'Demander un devis', items: [] },
  services: { eyebrow: 'Prestations', title: 'Ce que nous faisons, concrètement', intro: '',
    atoutsTitle: 'Pourquoi nous confier vos projets', groups: [], atouts: [] },
  secteurs: { eyebrow: "Secteurs d'activité", title: 'Les industries que nous accompagnons',
    intro: "Des installations de production aux infrastructures publiques, nous intervenons là où la disponibilité des équipements conditionne l'activité.",
    items: [
      { title: 'Cimenteries et carrières', text: 'Maintenance des installations de broyage, de convoyage et de stockage ; génie civil et chaudronnerie sur site.', image: '' },
      { title: 'Industries extractives', text: 'Fondations de machines, structures métalliques, alimentation électrique et pièces de rechange.', image: '' },
      { title: 'Agro-industries', text: "Usines d'égrenage et unités agroalimentaires : maintenance, électricité industrielle et arrêts de campagne.", image: '' },
      { title: 'Énergie', text: 'Groupes électrogènes, postes HTA/BT, systèmes solaires hybrides et pompage solaire.', image: '' },
      { title: 'Collectivités et administrations', text: "Études, maîtrise d'œuvre, hydraulique, électrification rurale et bâtiments publics.", image: '' },
      { title: 'BTP et distribution', text: 'Matériaux, outillage et approvisionnement des chantiers, avec livraison et comptes professionnels.', image: '' }
    ],
    tagsTitle: 'Ils peuvent aussi nous solliciter', tags: [] },
  zone: { eyebrow: 'Couverture', title: "Zone d'intervention", intro: '', blocks: [],
    corridorTitle: 'Le corridor logistique qui traverse notre zone',
    corridor: [
      { name: 'Douala', note: "Port d'entrée des équipements", highlight: false },
      { name: 'Ngaoundéré', note: 'Adamaoua', highlight: false },
      { name: 'Garoua', note: 'Région du Nord', highlight: false },
      { name: 'Figuil', note: "Siège et base d'intervention", highlight: true },
      { name: "N'Djaména", note: 'Tchad', highlight: false }
    ] },
  references: { eyebrow: 'Réalisations', title: 'Références récentes',
    intro: "Une sélection de chantiers et de missions. Chaque fiche présente le maître d'ouvrage, la nature des travaux et l'année de réalisation.",
    emptyLabel: 'Référence en cours de documentation', note: '', items: [] },
  partenaires: { eyebrow: 'Réseau', title: 'Nos partenaires', intro: '', note: '', items: [] },
  contact: { eyebrow: 'Contact', title: 'Parlons de votre projet', intro: '',
    phone: '', email: '', whatsapp: '', address: '', hours: '',
    legal: [{ label: 'RCCM', value: '' }, { label: 'NIU', value: '' }],
    form: { enabled: true, title: 'Écrivez-nous',
      intro: 'Décrivez votre besoin : nous revenons vers vous avec une proposition technique et un devis détaillé.',
      subjects: ['Demande de devis', 'Étude et ingénierie', 'Travaux industriels', 'Maintenance industrielle', "Fourniture d'équipements", 'Quincaillerie et matériaux', 'Autre demande'],
      success: 'Merci, votre message a bien été transmis. Nous vous répondons dans les meilleurs délais.',
      consent: "J'accepte que mes informations soient utilisées pour traiter ma demande." } },
  footer: { left: 'GAPAWA SMART ENGINEERING SARL — Figuil, Mayo-Louti, Région du Nord, Cameroun',
    right: 'Ingénierie · Travaux & maintenance industriels · Fourniture · Quincaillerie' }
};

/* ------------------------------------------------------------------ migration */
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const str = (v, d = '') => (typeof v === 'string' ? v : (typeof v === 'number' ? String(v) : d));
const list = (v) => (Array.isArray(v) ? v : []);
const clone = (v) => JSON.parse(JSON.stringify(v));

function deepFill(target, defaults) {
  // complète `target` avec les clés manquantes de `defaults`, sans écraser l'existant
  for (const k of Object.keys(defaults)) {
    const d = defaults[k];
    if (!(k in target) || target[k] === undefined || target[k] === null) target[k] = clone(d);
    else if (isObj(d) && isObj(target[k])) deepFill(target[k], d);
  }
  return target;
}

/** Convertit n'importe quelle version du contenu (v1 de l'artefact, v2) vers le schéma courant. */
export function migrate(raw) {
  const src = isObj(raw) ? clone(raw) : {};
  let c = src;
  if (!src.schema || src.schema < 2) {
    c = { schema: 2 };
    c.brand = isObj(src.brand) ? src.brand : {};
    c.theme = isObj(src.theme) ? src.theme : {};
    c.visible = isObj(src.visible) ? { ...src.visible } : {};
    if ('references' in c.visible) c.visible.partenaires = c.visible.references;
    if (isObj(src.references) && isObj(src.references.partners) && src.references.partners.show === false) c.visible.partenaires = false;
    c.nav = list(src.nav); c.navCta = isObj(src.navCta) ? src.navCta : undefined;
    c.hero = isObj(src.hero) ? src.hero : undefined;
    c.demarche = isObj(src.demarche) ? src.demarche : undefined;
    c.poles = isObj(src.poles) ? src.poles : undefined;
    c.services = isObj(src.services) ? src.services : undefined;
    if (isObj(src.zone)) {
      c.zone = { eyebrow: src.zone.eyebrow, title: src.zone.title, intro: src.zone.intro, blocks: list(src.zone.blocks) };
      c.secteurs = { tags: list(src.zone.tags) };
    }
    if (isObj(src.references)) {
      const r = src.references;
      c.references = { eyebrow: r.eyebrow, title: r.title, intro: r.intro || undefined, note: r.note,
        items: list(r.items).map((it) => ({ title: str(it.title), client: str(it.client), objet: str(it.objet), annee: str(it.annee), lieu: '', secteur: '', image: '' })) };
      if (isObj(r.partners)) {
        c.partenaires = { title: r.partners.title, intro: r.partners.intro, note: r.partners.note,
          items: list(r.partners.items).map((p) => ({ name: str(p.name), logoUrl: str(p.logoUrl), url: '' })) };
      }
    }
    if (isObj(src.contact)) {
      const k = src.contact, out = { eyebrow: k.eyebrow, title: k.title, intro: k.intro, legal: [] };
      for (const row of list(k.rows)) {
        const lab = str(row.label).toLowerCase(), val = str(row.value);
        if (/t[ée]l[ée]phone|^t[ée]l/.test(lab)) out.phone = val;
        else if (/mail/.test(lab)) out.email = val;
        else if (/whats/.test(lab)) out.whatsapp = val;
        else if (/adresse/.test(lab)) out.address = val;
        else if (/horaire/.test(lab)) out.hours = val;
        else out.legal.push({ label: str(row.label), value: val });
      }
      c.contact = out;
    }
    c.footer = isObj(src.footer) ? src.footer : undefined;
    for (const k of Object.keys(c)) if (c[k] === undefined) delete c[k];
  }
  // nettoyage des clés indéfinies imbriquées, puis complétion avec les défauts
  c = JSON.parse(JSON.stringify(c));
  deepFill(c, DEFAULTS);
  // listes : si la v1 ne les fournissait pas, reprendre les défauts non vides
  c.schema = SCHEMA_VERSION;
  return c;
}

/* ------------------------------------------------------------------ sécurité */
export function esc(v) {
  return str(v).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
export function safeMedia(u) {
  const s = str(u).trim();
  if (/^https:\/\/[^\s"'<>]+$/i.test(s)) return s;
  if (/^\/(api\/media|_blob)\/[A-Za-z0-9._\-\/]+$/.test(s)) return s;
  if (/^\/assets\/img\/[A-Za-z0-9._\-]+$/.test(s)) return s;
  return '';
}
export function safeLink(u) {
  const s = str(u).trim();
  return /^https:\/\/[^\s"'<>]+$/i.test(s) ? s : '';
}
export function safeColor(c, fallback) {
  const s = str(c).trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s) ? s : fallback;
}
const digits = (s) => str(s).replace(/[^\d+]/g, '');
export function telHref(phone) {
  const d = digits(phone);
  return d.replace(/\D/g, '').length >= 6 ? 'tel:' + d : '';
}
export function mailHref(email) {
  const s = str(email).trim();
  return /^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i.test(s) ? 'mailto:' + s : '';
}
export function waHref(num) {
  const d = str(num).replace(/\D/g, '');
  return d.length >= 8 ? 'https://wa.me/' + d : '';
}
export function jsonForScript(obj) {
  const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
  return JSON.stringify(obj).split('<').join('\\u003c').split(LS).join('\\u2028').split(PS).join('\\u2029');
}

/* ------------------------------------------------------------------ outils de rendu */
const sectionOn = (c, id) => id === 'accueil' || c.visible[id] !== false;
const nl = (s) => esc(s);

function scene() {
  return '<svg class="hero-scene" viewBox="0 0 320 200" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">' +
    '<defs><linearGradient id="gpw-met" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#263449"/><stop offset="1" stop-color="#132238"/></linearGradient></defs>' +
    '<g stroke="#3A4B63" stroke-width="1.1" fill="url(#gpw-met)">' +
    '<path d="M16 184 V88 a15 15 0 0 1 30 0 V184 Z"/><path d="M52 184 V102 a12 12 0 0 1 24 0 V184 Z"/>' +
    '<path d="M118 184 V146 h78 v38 Z"/><path d="M118 146 l13 -14 13 14 13 -14 13 14 13 -14 13 14 Z"/><path d="M200 184 V74 h11 v110 Z"/></g>' +
    '<g stroke="#4B5D77" stroke-width="1.1" fill="none"><path d="M74 124 L118 156"/>' +
    '<path d="M236 184 L247 64 M276 184 L265 64 M247 64 h18"/><path d="M241 150 L271 150 M243 120 L269 120 M245 92 L267 92"/>' +
    '<path d="M238 168 L270 150 M270 168 L240 150 M242 150 L270 120 M270 150 L242 120 M244 120 L268 92 M268 120 L244 92"/>' +
    '<path d="M240 70 L231 58 M272 70 L281 58"/></g>' +
    '<g stroke="#D9822B" stroke-width="1.6" fill="none"><path d="M78 116 L122 148"/><path d="M200 92 h11 M200 104 h11"/></g>' +
    '<g stroke="#4B5D77" stroke-width="1" fill="url(#gpw-met)"><path d="M276 178 l12 -16 h14 l-12 16 Z"/><path d="M292 178 l12 -16 h14 l-12 16 Z"/><path d="M270 162 l12 -16 h14 l-12 16 Z"/></g>' +
    '<path d="M0 184 H320" stroke="#E0A54A" stroke-width="1" opacity=".55"/></svg>';
}

function head(eyebrow, title, intro, idBase, extraClass = '') {
  let out = `<header class="sec-head${extraClass ? ' ' + extraClass : ''}">`;
  if (eyebrow) out += `<p class="eyebrow">${nl(eyebrow)}</p>`;
  if (title) out += `<h2 id="${idBase}-titre">${nl(title)}</h2>`;
  if (intro) out += `<p class="sec-intro">${nl(intro)}</p>`;
  return out + '</header>';
}

function brandMark(c) {
  const logo = safeMedia(c.brand.logoUrl);
  const initial = esc((str(c.brand.name).trim()[0] || 'G').toUpperCase());
  const mark = logo
    ? `<span class="brand-logo"><img src="${esc(logo)}" alt="" width="44" height="44" decoding="async"></span>`
    : `<span class="brand-mono" aria-hidden="true">${initial}</span>`;
  return `<a class="brand" href="#accueil" aria-label="${esc(c.brand.name + ' ' + c.brand.nameAccent)} — retour à l'accueil">${mark}` +
    `<span class="brand-txt"><span class="brand-name">${nl(c.brand.name)}${c.brand.nameAccent ? ' <span class="brand-accent">' + nl(c.brand.nameAccent) + '</span>' : ''}</span>` +
    (c.brand.location ? `<span class="brand-sub">${nl(c.brand.location)}</span>` : '') + '</span></a>';
}

/* ------------------------------------------------------------------ sections */
function renderHeader(c) {
  const items = list(c.nav).filter((n) => sectionOn(c, n.target));
  const k = c.contact, tel = telHref(k.phone), mail = mailHref(k.email);
  let top = '';
  if (c.topbar.show !== false) {
    top = `<div class="topbar"><div class="wrap topbar-in"><span class="topbar-loc">${nl(c.topbar.text)}</span><span class="topbar-links">` +
      (tel ? `<a href="${esc(tel)}">${nl(k.phone)}</a>` : '') +
      (mail ? `<a href="${esc(mail)}">${nl(k.email)}</a>` : '') + '</span></div></div>';
  }
  const cta = c.navCta && c.navCta.label && sectionOn(c, c.navCta.target)
    ? `<a class="btn btn-primary nav-cta" href="#${esc(c.navCta.target)}"${c.navCta.target === 'contact' ? ' data-subject="Demande de devis"' : ''}>${nl(c.navCta.label)}</a>` : '';
  return top + `<header class="hdr" data-hdr><div class="wrap hdr-in">${brandMark(c)}` +
    `<button class="menu-btn" type="button" aria-controls="menu-principal" aria-expanded="false" data-menu-btn>` +
    '<span class="menu-btn-bars" aria-hidden="true"><span></span><span></span><span></span></span><span class="menu-btn-txt">Menu</span></button>' +
    `<nav class="nav" id="menu-principal" aria-label="Navigation principale" data-menu><ul class="nav-list">` +
    items.map((n) => `<li><a href="#${esc(n.target)}" data-nav="${esc(n.target)}">${nl(n.label)}</a></li>`).join('') +
    `</ul>${cta}</nav></div></header>`;
}

function renderHero(c) {
  const H = c.hero, img = safeMedia(H.image);
  const btn = (label, target, cls, subject) => (label && sectionOn(c, target)
    ? `<a class="btn ${cls}" href="#${esc(target)}"${subject ? ` data-subject="${esc(subject)}"` : ''}>${nl(label)}</a>` : '');
  let media = '';
  if (img) media = `<img class="hero-img" src="${esc(img)}" alt="${esc(H.imageAlt)}" fetchpriority="high" decoding="async">`;
  else if (H.showScene !== false) media = scene();
  return `<section class="hero${img ? ' hero--photo' : ''}" id="accueil" aria-labelledby="accueil-titre">${media}<div class="hero-veil" aria-hidden="true"></div>` +
    `<div class="wrap hero-in"><div class="hero-copy">` +
    (H.eyebrow ? `<p class="eyebrow eyebrow--light">${nl(H.eyebrow)}</p>` : '') +
    `<h1 id="accueil-titre">${nl(H.titleLine1)}${H.titleLine2 ? `<span class="hero-accent">${nl(H.titleLine2)}</span>` : ''}</h1>` +
    (H.body ? `<p class="hero-lede">${nl(H.body)}</p>` : '') +
    `<div class="hero-actions">${btn(H.btn1Label, H.btn1Target, 'btn-primary btn-lg')}${btn(H.btn2Label, H.btn2Target, 'btn-ghost btn-lg', H.btn2Target === 'contact' ? 'Demande de devis' : '')}</div>` +
    (H.where ? `<p class="hero-where"><span class="pin" aria-hidden="true"></span>${nl(H.where)}</p>` : '') +
    '</div></div></section>';
}

function renderChiffres(c) {
  const items = list(c.chiffres.items).filter((i) => str(i.value) || str(i.label));
  if (!sectionOn(c, 'chiffres') || !items.length) return '';
  return `<section class="facts" aria-label="Repères"><div class="wrap"><ul class="facts-list">` +
    items.map((i) => `<li><span class="facts-val">${nl(i.value)}</span><span class="facts-lab">${nl(i.label)}</span></li>`).join('') +
    '</ul></div></section>';
}

function renderDemarche(c) {
  if (!sectionOn(c, 'demarche')) return '';
  const S = c.demarche;
  return `<section class="band" id="demarche" aria-labelledby="demarche-titre"><div class="wrap">${head(S.eyebrow, S.title, S.intro, 'demarche')}` +
    `<ol class="steps">` + list(S.steps).map((s, i) =>
      `<li class="step" data-reveal><span class="step-n">${nl(s.n || String(i + 1).padStart(2, '0'))}</span><h3>${nl(s.title)}</h3><p>${nl(s.text)}</p></li>`).join('') +
    '</ol></div></section>';
}

function renderPoles(c) {
  if (!sectionOn(c, 'poles')) return '';
  const P = c.poles, contactOn = sectionOn(c, 'contact');
  return `<section class="band band--tint" id="poles" aria-labelledby="poles-titre"><div class="wrap">${head(P.eyebrow, P.title, P.intro, 'poles')}` +
    '<div class="poles">' + list(P.items).map((p, i) => {
      const img = safeMedia(p.image), col = safeColor(p.color, '#D9822B'), num = String(i + 1).padStart(2, '0');
      const visual = img
        ? `<div class="pole-media"><img src="${esc(img)}" alt="" loading="lazy" decoding="async"></div>`
        : `<div class="pole-media pole-media--plate" style="--pc:${col}" aria-hidden="true"><span class="pole-plate-n">${num}</span></div>`;
      return `<article class="pole" style="--pc:${col}" data-reveal>${visual}<div class="pole-body">` +
        `<p class="pole-n"><span class="pole-dot" aria-hidden="true"></span>Pôle ${num}</p><h3>${nl(p.title)}</h3>` +
        '<ul class="ticks">' + list(p.bullets).map((b) => `<li>${nl(b)}</li>`).join('') + '</ul>' +
        (contactOn && P.ctaLabel ? `<a class="link-arrow" href="#contact" data-subject="Demande de devis" data-message="${esc('Pôle concerné : ' + str(p.title))}">${nl(P.ctaLabel)}<span class="visually-hidden"> — ${nl(p.title)}</span></a>` : '') +
        '</div></article>';
    }).join('') + '</div></div></section>';
}

function renderServices(c) {
  if (!sectionOn(c, 'services')) return '';
  const V = c.services;
  let out = `<section class="band${list(V.atouts).length ? ' band--flush' : ''}" id="services" aria-labelledby="services-titre"><div class="wrap">${head(V.eyebrow, V.title, V.intro, 'services')}` +
    '<div class="svc-grid">' + list(V.groups).map((g, i) =>
      `<div class="svc" data-reveal><p class="svc-n">${String(i + 1).padStart(2, '0')}</p><h3>${nl(g.title)}</h3><ul class="ticks">` +
      list(g.bullets).map((b) => `<li>${nl(b)}</li>`).join('') + '</ul></div>').join('') + '</div></div>';
  if (list(V.atouts).length) {
    out += `<div class="atouts"><div class="wrap">` + (V.atoutsTitle ? `<h3 class="atouts-title">${nl(V.atoutsTitle)}</h3>` : '') +
      '<ul class="atouts-list">' + list(V.atouts).map((a) => `<li data-reveal><strong>${nl(a.title)}</strong><p>${nl(a.text)}</p></li>`).join('') +
      '</ul></div></div>';
  }
  return out + '</section>';
}

function renderSecteurs(c) {
  if (!sectionOn(c, 'secteurs')) return '';
  const S = c.secteurs;
  return `<section class="band band--tint" id="secteurs" aria-labelledby="secteurs-titre"><div class="wrap">${head(S.eyebrow, S.title, S.intro, 'secteurs')}` +
    '<ul class="sectors">' + list(S.items).map((s, i) => {
      const img = safeMedia(s.image);
      return `<li class="sector${img ? ' sector--photo' : ''}" data-reveal>` +
        (img ? `<img src="${esc(img)}" alt="" loading="lazy" decoding="async">` : `<span class="sector-n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>`) +
        `<div class="sector-body"><h3>${nl(s.title)}</h3><p>${nl(s.text)}</p></div></li>`;
    }).join('') + '</ul>' +
    (list(S.tags).length ? `<div class="tags-wrap">${S.tagsTitle ? `<p class="tags-title">${nl(S.tagsTitle)}</p>` : ''}<ul class="tags">` +
      list(S.tags).map((t) => `<li>${nl(t)}</li>`).join('') + '</ul></div>' : '') +
    '</div></section>';
}

function renderZone(c) {
  if (!sectionOn(c, 'zone')) return '';
  const Z = c.zone, stops = list(Z.corridor).filter((s) => str(s.name));
  return `<section class="band" id="zone" aria-labelledby="zone-titre"><div class="wrap zone-grid"><div>${head(Z.eyebrow, Z.title, Z.intro, 'zone')}` +
    '<ul class="zone-blocks">' + list(Z.blocks).map((b) => `<li data-reveal><span class="zone-lab">${nl(b.label)}</span><p>${nl(b.text)}</p></li>`).join('') + '</ul></div>' +
    (stops.length ? `<figure class="corridor" data-reveal><figcaption>${nl(Z.corridorTitle)}</figcaption><ol>` +
      stops.map((s) => `<li class="${s.highlight ? 'is-base' : ''}"><span class="stop-dot" aria-hidden="true"></span><span class="stop-name">${nl(s.name)}</span>${s.note ? `<span class="stop-note">${nl(s.note)}</span>` : ''}</li>`).join('') +
      '</ol></figure>' : '') +
    '</div></section>';
}

function renderReferences(c) {
  if (!sectionOn(c, 'references')) return '';
  const R = c.references;
  return `<section class="band band--tint" id="references" aria-labelledby="references-titre"><div class="wrap">${head(R.eyebrow, R.title, R.intro, 'references')}` +
    '<div class="refs">' + list(R.items).map((r) => {
      const img = safeMedia(r.image), filled = str(r.client).trim() || str(r.objet).trim();
      const meta = [['Maître d\'ouvrage', r.client], ['Lieu', r.lieu], ['Année', r.annee]].filter((m) => str(m[1]).trim());
      return `<article class="ref${filled ? '' : ' ref--empty'}" data-reveal>` +
        (img ? `<div class="ref-media"><img src="${esc(img)}" alt="" loading="lazy" decoding="async"></div>` : '<div class="ref-media ref-media--plate" aria-hidden="true"></div>') +
        '<div class="ref-body">' + (r.secteur ? `<p class="ref-tag">${nl(r.secteur)}</p>` : '') +
        `<h3>${nl(filled ? (r.objet || r.title) : (r.title || 'Référence'))}</h3>` +
        (filled ? '<dl class="ref-meta">' + meta.map((m) => `<div><dt>${nl(m[0])}</dt><dd>${nl(m[1])}</dd></div>`).join('') + '</dl>'
          : `<p class="ref-pending">${nl(R.emptyLabel)}</p>`) +
        '</div></article>';
    }).join('') + '</div>' + (R.note ? `<p class="note">${nl(R.note)}</p>` : '') + '</div></section>';
}

function renderPartenaires(c) {
  if (!sectionOn(c, 'partenaires')) return '';
  const P = c.partenaires;
  return `<section class="band" id="partenaires" aria-labelledby="partenaires-titre"><div class="wrap">${head(P.eyebrow, P.title, P.intro, 'partenaires')}` +
    '<ul class="logos">' + list(P.items).map((p, i) => {
      const logo = safeMedia(p.logoUrl), link = safeLink(p.url), name = str(p.name).trim();
      const inner = logo ? `<img src="${esc(logo)}" alt="${esc(name || 'Partenaire ' + (i + 1))}" loading="lazy" decoding="async">`
        : (name ? `<span class="logo-name">${nl(name)}</span>` : `<span class="logo-empty">Emplacement partenaire</span>`);
      return `<li class="logo${!logo && !name ? ' logo--empty' : ''}">` +
        (link ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">${inner}<span class="visually-hidden"> (nouvel onglet)</span></a>` : inner) + '</li>';
    }).join('') + '</ul>' + (P.note ? `<p class="note">${nl(P.note)}</p>` : '') + '</div></section>';
}

function contactAction(href, label, value, kind, external) {
  if (href) {
    return `<a class="cta-line cta-line--${kind}" href="${esc(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>` +
      `<span class="cta-ico" aria-hidden="true"></span><span><span class="cta-lab">${nl(label)}</span><span class="cta-val">${nl(value)}</span></span>` +
      (external ? '<span class="visually-hidden"> (nouvel onglet)</span>' : '') + '</a>';
  }
  return `<div class="cta-line cta-line--${kind} is-off" aria-disabled="true"><span class="cta-ico" aria-hidden="true"></span>` +
    `<span><span class="cta-lab">${nl(label)}</span><span class="cta-val">À renseigner</span></span></div>`;
}

export function renderContactForm(c, opts = {}) {
  const F = c.contact.form, subjects = list(F.subjects).filter((s) => str(s).trim());
  const preview = opts.mode === 'claude' || opts.mode === 'preview';
  return `<form class="cform" name="contact" method="POST" action="/merci/" data-netlify="true" netlify-honeypot="bot-field" data-contact-form${preview ? ' data-preview="1"' : ''} novalidate>` +
    '<input type="hidden" name="form-name" value="contact">' +
    '<p class="hp" aria-hidden="true"><label>Ne pas remplir <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>' +
    (F.title ? `<h3 class="cform-title">${nl(F.title)}</h3>` : '') + (F.intro ? `<p class="cform-intro">${nl(F.intro)}</p>` : '') +
    '<div class="cform-grid">' +
    '<div class="f"><label for="cf-nom">Nom et prénom <span class="req" aria-hidden="true">*</span></label><input id="cf-nom" name="nom" type="text" autocomplete="name" required maxlength="120"></div>' +
    '<div class="f"><label for="cf-societe">Société / organisme</label><input id="cf-societe" name="societe" type="text" autocomplete="organization" maxlength="160"></div>' +
    '<div class="f"><label for="cf-email">E-mail <span class="req" aria-hidden="true">*</span></label><input id="cf-email" name="email" type="email" autocomplete="email" required maxlength="160"></div>' +
    '<div class="f"><label for="cf-tel">Téléphone</label><input id="cf-tel" name="telephone" type="tel" autocomplete="tel" maxlength="40" inputmode="tel"></div>' +
    '<div class="f f--full"><label for="cf-sujet">Objet de la demande <span class="req" aria-hidden="true">*</span></label><select id="cf-sujet" name="sujet" required>' +
    '<option value="">Choisir…</option>' + subjects.map((s) => `<option>${nl(s)}</option>`).join('') + '</select></div>' +
    '<div class="f f--full"><label for="cf-message">Votre message <span class="req" aria-hidden="true">*</span></label><textarea id="cf-message" name="message" rows="5" required minlength="10" maxlength="4000"></textarea></div>' +
    `<div class="f f--full f--check"><input id="cf-consent" name="consentement" type="checkbox" value="oui" required><label for="cf-consent">${nl(F.consent)}</label></div>` +
    '</div><div class="cform-foot"><button class="btn btn-primary btn-lg" type="submit">Envoyer le message</button>' +
    '<p class="cform-status" role="status" aria-live="polite" data-form-status></p></div>' +
    `<p class="cform-success" data-form-success hidden>${nl(F.success)}</p></form>`;
}

function renderContact(c, opts) {
  if (!sectionOn(c, 'contact')) return '';
  const K = c.contact;
  const legal = list(K.legal).filter((l) => str(l.label).trim());
  return `<section class="contact" id="contact" aria-labelledby="contact-titre"><div class="wrap contact-grid"><div class="contact-info">` +
    head(K.eyebrow, K.title, K.intro, 'contact', 'sec-head--light') +
    '<div class="cta-lines">' +
    contactAction(telHref(K.phone), 'Téléphone', K.phone, 'tel') +
    contactAction(mailHref(K.email), 'E-mail', K.email, 'mail') +
    contactAction(waHref(K.whatsapp), 'WhatsApp', K.whatsapp, 'wa', true) + '</div>' +
    '<dl class="coords">' +
    `<div><dt>Adresse</dt><dd>${str(K.address).trim() ? nl(K.address) : '<span class="pending">À renseigner</span>'}</dd></div>` +
    `<div><dt>Horaires</dt><dd>${str(K.hours).trim() ? nl(K.hours) : '<span class="pending">À renseigner</span>'}</dd></div>` +
    legal.map((l) => `<div><dt>${nl(l.label)}</dt><dd>${str(l.value).trim() ? nl(l.value) : '<span class="pending">À renseigner</span>'}</dd></div>`).join('') +
    '</dl></div>' +
    (K.form.enabled !== false ? `<div class="contact-form">${renderContactForm(c, opts)}</div>` : '') +
    '</div></section>';
}

function renderFooter(c, opts) {
  const K = c.contact, tel = telHref(K.phone), mail = mailHref(K.email), wa = waHref(K.whatsapp);
  const navItems = list(c.nav).filter((n) => sectionOn(c, n.target));
  const year = opts.year || new Date().getFullYear();
  return '<footer class="ftr"><div class="wrap ftr-grid">' +
    `<div class="ftr-brand">${brandMark(c)}${c.brand.about ? `<p>${nl(c.brand.about)}</p>` : ''}${c.footer.right ? `<p class="ftr-tag">${nl(c.footer.right)}</p>` : ''}</div>` +
    '<nav class="ftr-col" aria-label="Plan du site"><p class="ftr-h">Navigation</p><ul>' +
    navItems.map((n) => `<li><a href="#${esc(n.target)}">${nl(n.label)}</a></li>`).join('') + '</ul></nav>' +
    (sectionOn(c, 'poles') ? '<div class="ftr-col"><p class="ftr-h">Nos pôles</p><ul>' +
      list(c.poles.items).map((p) => `<li><a href="#poles">${nl(p.title)}</a></li>`).join('') + '</ul></div>' : '') +
    '<div class="ftr-col"><p class="ftr-h">Contact</p><ul>' +
    (str(K.address).trim() ? `<li>${nl(K.address)}</li>` : (c.topbar.text ? `<li>${nl(c.topbar.text)}</li>` : '')) +
    (tel ? `<li><a href="${esc(tel)}">${nl(K.phone)}</a></li>` : '') +
    (mail ? `<li><a href="${esc(mail)}">${nl(K.email)}</a></li>` : '') +
    (wa ? `<li><a href="${esc(wa)}" target="_blank" rel="noopener noreferrer">WhatsApp<span class="visually-hidden"> (nouvel onglet)</span></a></li>` : '') +
    (sectionOn(c, 'contact') ? '<li><a href="#contact">Formulaire de contact</a></li>' : '') +
    '</ul></div></div>' +
    `<div class="ftr-bottom"><div class="wrap ftr-bottom-in"><p>© ${esc(year)} ${nl(c.footer.left)}</p>` +
    '<a class="to-top" href="#accueil">Haut de page</a></div></div></footer>';
}

/** Corps complet de la page publique. */
export function renderBody(raw, opts = {}) {
  const c = migrate(raw);
  return '<a class="skip" href="#contenu">Aller au contenu</a>' + renderHeader(c) +
    '<main id="contenu">' + renderHero(c) + renderChiffres(c) + renderDemarche(c) + renderPoles(c) + renderServices(c) +
    renderSecteurs(c) + renderZone(c) + renderReferences(c) + renderPartenaires(c) + renderContact(c, opts) + '</main>' +
    renderFooter(c, opts);
}

/** Variables de couleur éditables, appliquées par-dessus la feuille de style. */
export function themeCss(raw) {
  const t = migrate(raw).theme, d = DEFAULTS.theme;
  return ':root{' + ['night', 'ochre', 'teal', 'sand', 'green', 'brick']
    .map((k) => `--${k}:${safeColor(t[k], d[k])}`).join(';') + '}';
}

export function structuredData(c) {
  const K = c.contact, base = str(c.meta.siteUrl).replace(/\/+$/, '') || DEFAULTS.meta.siteUrl;
  const logo = safeMedia(c.brand.logoUrl);
  const data = {
    '@context': 'https://schema.org', '@type': 'Organization',
    name: (str(c.brand.name) + ' ' + str(c.brand.nameAccent)).trim(),
    url: base + '/', description: str(c.meta.description),
    address: { '@type': 'PostalAddress', addressLocality: 'Figuil', addressRegion: 'Nord', addressCountry: 'CM' },
    areaServed: ['Cameroun', 'Tchad', 'République centrafricaine']
  };
  if (logo) data.logo = logo.startsWith('http') ? logo : base + logo;
  if (telHref(K.phone)) data.telephone = str(K.phone);
  if (mailHref(K.email)) data.email = str(K.email);
  return data;
}

/** Document HTML complet (génération statique et rendu serveur Netlify). */
export function renderDocument(raw, opts = {}) {
  const c = migrate(raw);
  const base = (str(c.meta.siteUrl).replace(/\/+$/, '') || DEFAULTS.meta.siteUrl);
  const og = safeMedia(c.meta.ogImage) || '/assets/img/og-default.jpg';
  const ogAbs = og.startsWith('http') ? og : base + og;
  const v = opts.assetVersion ? '?v=' + encodeURIComponent(opts.assetVersion) : '';
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
    `<title>${esc(c.meta.title)}</title><meta name="description" content="${esc(c.meta.description)}">` +
    `<link rel="canonical" href="${esc(base)}/"><meta name="robots" content="index,follow">` +
    `<meta name="theme-color" content="${esc(safeColor(c.theme.night, DEFAULTS.theme.night))}">` +
    '<meta property="og:type" content="website"><meta property="og:locale" content="fr_FR">' +
    `<meta property="og:site_name" content="${esc((c.brand.name + ' ' + c.brand.nameAccent).trim())}">` +
    `<meta property="og:title" content="${esc(c.meta.title)}"><meta property="og:description" content="${esc(c.meta.description)}">` +
    `<meta property="og:url" content="${esc(base)}/"><meta property="og:image" content="${esc(ogAbs)}">` +
    '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' +
    '<meta name="twitter:card" content="summary_large_image">' +
    `<meta name="twitter:title" content="${esc(c.meta.title)}"><meta name="twitter:description" content="${esc(c.meta.description)}">` +
    `<meta name="twitter:image" content="${esc(ogAbs)}">` +
    '<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml"><link rel="icon" href="/assets/img/favicon-32.png" sizes="32x32" type="image/png">' +
    '<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">' +
    '<link rel="preload" href="/assets/fonts/archivo-var.woff2" as="font" type="font/woff2" crossorigin>' +
    '<link rel="preload" href="/assets/fonts/plex-sans-400.woff2" as="font" type="font/woff2" crossorigin>' +
    `<link rel="stylesheet" href="/assets/css/site.css${v}"><style>${themeCss(c)}</style>` +
    `<script type="application/ld+json">${jsonForScript(structuredData(c))}</script>` +
    `<script type="module" src="/assets/js/site.js${v}"></script>` +
    '</head><body>' + renderBody(c, opts) + '</body></html>';
}

/* ------------------------------------------------------------------ version claude.ai */
/** Contenu de page pour l'aperçu hébergé par claude.ai (chemins relatifs, marqueurs de remplacement). */
export function renderClaudeShell(raw) {
  const c = migrate(raw);
  return `<title>${esc((c.brand.name + ' ' + c.brand.nameAccent).trim())}</title>` +
    '<meta name="claude:viewport-fit-sides" content="cover">' +
    '<link rel="stylesheet" href="assets/css/site.css">' +
    `<!--gpw:theme--><style id="gpw-theme">${themeCss(c)}</style><!--/gpw:theme-->` +
    `<!--gpw:app--><div id="gpw-app">${renderBody(c, { mode: 'claude' })}</div><!--/gpw:app-->` +
    `<script type="application/json" id="gpw-content">${jsonForScript(c)}</script>` +
    '<script type="module" src="assets/js/site.js"></script>';
}
export const CLAUDE_HEAD = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>' +
  ':root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}' +
  'html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}' +
  'img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>';

/** Régénère le document complet de l'aperçu claude.ai à partir d'une base existante (ou de zéro). */
export function buildClaudeDocument(raw, baseDoc) {
  const c = migrate(raw);
  const swap = (doc, start, end, inner) => {
    const i = doc.indexOf(start), j = doc.indexOf(end);
    return i > -1 && j > i ? doc.slice(0, i + start.length) + inner + doc.slice(j) : null;
  };
  if (typeof baseDoc === 'string') {
    let d = swap(baseDoc, '<!--gpw:app-->', '<!--/gpw:app-->', `<div id="gpw-app">${renderBody(c, { mode: 'claude' })}</div>`);
    if (d) d = swap(d, '<!--gpw:theme-->', '<!--/gpw:theme-->', `<style id="gpw-theme">${themeCss(c)}</style>`);
    if (d) {
      const k = d.indexOf('id="gpw-content">'), e = k > -1 ? d.indexOf('</script>', k) : -1;
      if (k > -1 && e > -1) return d.slice(0, k + 17) + jsonForScript(c) + d.slice(e);
    }
  }
  return CLAUDE_HEAD + renderClaudeShell(c) + '</body></html>';
}
