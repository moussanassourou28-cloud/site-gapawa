/*
 * Génération statique : produit site/index.html (version servie si le rendu serveur est indisponible,
 * et lue par Netlify Forms pour détecter le formulaire), les pages annexes, le sitemap et robots.txt.
 * Commande : npm run build
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { migrate, renderDocument, renderContactForm, esc } from '../site/assets/js/render.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...s) => path.join(root, ...s);

const content = migrate(JSON.parse(await readFile(p('content', 'content.json'), 'utf8')));
const hash = createHash('sha1');
for (const f of ['site/assets/css/site.css', 'site/assets/js/site.js', 'site/assets/js/render.mjs']) hash.update(await readFile(p(f)));
const assetVersion = hash.digest('hex').slice(0, 10);
const base = (content.meta.siteUrl || 'https://gapawa.com').replace(/\/+$/, '');

await writeFile(p('site', 'index.html'), renderDocument(content, { assetVersion }));
await mkdir(p('site', 'content'), { recursive: true });
await writeFile(p('site', 'content', 'default.json'), JSON.stringify(content));
await writeFile(p('site', 'asset-version.txt'), assetVersion);
await writeFile(p('netlify', 'edge-functions', '_version.mjs'), `export const ASSET_VERSION = ${JSON.stringify(assetVersion)};\n`);

/* Squelette du formulaire pour Netlify Forms (la page d'accueil est rendue côté serveur). */
await writeFile(p('site', '__forms.html'),
  '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Formulaires</title></head><body hidden>' +
  renderContactForm(content, { mode: 'netlify' }) + '</body></html>');

const simplePage = (title, heading, text, cta) =>
  '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  `<title>${esc(title)}</title><meta name="robots" content="noindex"><link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">` +
  `<link rel="stylesheet" href="/assets/css/site.css?v=${assetVersion}"></head><body><main class="simple"><div>` +
  `<h1>${esc(heading)}</h1><p>${esc(text)}</p><a class="btn btn-primary btn-lg" href="${esc(cta[1])}">${esc(cta[0])}</a></div></main></body></html>`;

await mkdir(p('site', 'merci'), { recursive: true });
await writeFile(p('site', 'merci', 'index.html'), simplePage('Message envoyé — GAPAWA', 'Merci, votre message a bien été transmis.',
  content.contact.form.success || 'Nous vous répondons dans les meilleurs délais.', ["Retour à l'accueil", '/']));
await writeFile(p('site', '404.html'), simplePage('Page introuvable — GAPAWA', 'Cette page est introuvable.',
  "L'adresse demandée n'existe pas ou a été déplacée.", ["Retour à l'accueil", '/']));

await writeFile(p('site', 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /administration\nDisallow: /api/\nDisallow: /__forms.html\n\nSitemap: ${base}/sitemap.xml\n`);
await writeFile(p('site', 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${esc(base)}/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>\n</urlset>\n`);

console.log(`Génération terminée — version des ressources ${assetVersion}`);
