# GAPAWA SMART ENGINEERING SARL — site institutionnel et administration

Site vitrine de GAPAWA SMART ENGINEERING SARL (Figuil, Mayo-Louti, Région du Nord, Cameroun)
et son tableau de bord d'administration, prêts à déployer sur Netlify.

- Site public : `https://gapawa.com/`
- Administration : `https://gapawa.com/administration` (aucun lien public n'y mène)

---

## 1. Contenu du projet

```
content/content.json            Contenu initial du site (repris de la version précédente, migré)
netlify.toml                    Configuration Netlify : build, fonctions, en-têtes de sécurité
netlify/functions/              API serveur (authentification, publication, images, historique)
  _lib/auth.mjs                 Authentification : empreintes PBKDF2, session signée, anti-force brute
netlify/edge-functions/home.mjs Rendu serveur de la page d'accueil à partir du contenu publié
scripts/build.mjs               Génération des pages statiques (npm run build)
scripts/hash-password.mjs       Génération de l'empreinte du mot de passe (npm run hash-password)
site/                           Dossier publié
  index.html                    Page d'accueil statique (secours + détection du formulaire)
  administration/index.html     Interface d'administration
  assets/js/render.mjs          Moteur de rendu unique (build, serveur, aperçu)
  assets/js/site.js             Interactions du site public
  assets/js/admin.js            Tableau de bord
  assets/css/, assets/fonts/, assets/img/
  _redirects                    Routage de /administration
  __forms.html, merci/, 404.html, robots.txt, sitemap.xml
```

## 2. Déployer

> **Important — n'utilisez pas le glisser-déposer.** Ce mode publie les pages mais pas les fonctions
> serveur. Le site s'afficherait, mais l'administration indiquerait « Serveur d'administration
> introuvable » et resterait inutilisable.

**Méthode recommandée : dépôt Git relié à Netlify**

1. Créez un dépôt (GitHub, GitLab ou Bitbucket) et poussez-y le contenu de ce dossier.
2. Dans Netlify : *Add new project → Import an existing project*, choisissez le dépôt.
3. Netlify lit `netlify.toml` : commande `npm run build`, dossier publié `site`. Ne modifiez rien.
4. Lancez le déploiement.

**Alternative : Netlify CLI**

```bash
npm install
npx netlify-cli login
npx netlify-cli init            # relie le dossier à un projet Netlify
npx netlify-cli deploy --build --prod
```

## 3. Activer l'administration (obligatoire)

L'administration reste verrouillée tant que ces trois variables ne sont pas définies.

1. Générez l'empreinte du mot de passe (12 caractères minimum ; le mot de passe n'est enregistré nulle part) :
   ```bash
   npm install
   npm run hash-password
   ```
2. Générez une clé de session aléatoire :
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```
3. Dans Netlify : *Project configuration → Environment variables → Add a variable*, créez :

   | Variable | Valeur | Remarque |
   |---|---|---|
   | `ADMIN_USER` | votre identifiant, ex. `nass` | lettres, chiffres, `. _ @ -` |
   | `ADMIN_PASSWORD_HASH` | la ligne `pbkdf2_sha256$…` produite à l'étape 1 | jamais le mot de passe lui-même |
   | `SESSION_SECRET` | la clé produite à l'étape 2 | 32 caractères minimum |

   Pour chaque variable, choisissez une valeur propre au contexte **Production** uniquement
   (*Different value for each deploy context*) : les déploiements de prévisualisation partagent le même
   stockage que la production, ils ne doivent pas pouvoir publier. Si votre offre Netlify propose
   l'option **Contains secret values**, cochez-la.
4. Redéployez (*Deploys → Trigger deploy*), puis ouvrez `https://gapawa.com/administration`.

**Plusieurs administrateurs** : remplacez `ADMIN_USER`/`ADMIN_PASSWORD_HASH` par une seule variable
`ADMIN_ACCOUNTS` au format `identifiant1:empreinte1;identifiant2:empreinte2`.

**Changer un mot de passe** : générez une nouvelle empreinte, remplacez la variable, redéployez.
Les sessions ouvertes avec l'ancien mot de passe sont aussitôt invalidées.
**Déconnecter tout le monde** : changez `SESSION_SECRET` et redéployez.

## 4. Formulaire de contact

Chaque message envoyé depuis « Nous contacter » est traité de deux façons :

- **Enregistré côté serveur** (fonction `/api/requests`, magasin Netlify Blobs `gapawa-requests`) et
  consultable dans l'administration, rubrique **Clients → Demandes reçues** : liste, recherche, filtres
  par statut (Nouvelle, En cours, Traitée, Archivée), note interne, réponse par e-mail / appel /
  WhatsApp, export CSV pour Excel, suppression. La liste n'est lisible qu'avec une session
  administrateur ; le dépôt public est validé, limité à 5 messages par heure et par connexion, et
  l'adresse IP n'est pas conservée.
- **Copié dans Netlify Forms**, ce qui permet de recevoir chaque demande par e-mail.

Configuration de Netlify Forms (aucun serveur de messagerie à configurer) :

1. *Forms → Enable form detection*, puis redéployez une fois.
2. Les messages apparaissent dans *Forms → contact*.
3. Pour les recevoir par e-mail : *Project configuration → Notifications → Emails and webhooks →
   Form submission notifications → Add notification → Email notification*, formulaire `contact`.

Un piège à robots est intégré. Netlify ajoute son propre filtrage anti-spam.

## 5. Nom de domaine

*Domain management → Add a domain* → `gapawa.com`, puis suivez les instructions DNS de Netlify.
Le certificat HTTPS est fourni automatiquement. Si le domaine final diffère, corrigez « Adresse du site »
dans *Administration → Logo et identité* (utilisée pour le référencement et le partage).

## 6. Utiliser l'administration

- Toutes les modifications sont conservées en brouillon sur votre poste jusqu'au clic sur **Publier les modifications**.
- **Aperçu** affiche le site avec vos modifications, en largeur ordinateur, tablette ou mobile.
- **Historique** liste les 20 dernières versions publiées ; « Charger » en remet une dans l'éditeur.
- Le **tableau de bord** liste les informations encore manquantes (logo, téléphone, photos…).
- Les images sont optimisées dans le navigateur avant envoi (2000 px maximum, 5 Mo maximum).

## 7. Sécurité — ce qui est réellement protégé

- **Aucun secret dans le code.** Les identifiants sont des variables d'environnement Netlify ; seule une
  empreinte PBKDF2-SHA256 salée (310 000 itérations) du mot de passe est stockée.
- **Contrôle côté serveur de chaque opération sensible** : publication, envoi d'image et lecture de
  l'historique vérifient la session à chaque requête. Masquer un bouton ne protège rien ; ici, sans session
  valide, le serveur répond 401 quel que soit le client utilisé.
- **Session** : cookie `__Host-` `HttpOnly`, `Secure`, `SameSite=Strict`, signé HMAC-SHA256, valable 8 heures.
- **CSRF** : en-tête personnalisé obligatoire et vérification de l'origine sur toutes les écritures.
- **Force brute** : 5 échecs par adresse IP en 15 minutes déclenchent un blocage de 15 minutes ;
  temps de réponse constant que l'identifiant existe ou non.
- **Contenu publié** : structure, taille et longueur des textes validées côté serveur ; tout le rendu est
  échappé (pas d'injection HTML possible depuis l'administration).
- **Images** : type vérifié sur le contenu réel du fichier (pas sur l'extension), SVG contenant du code
  refusés, images servies avec une politique de sécurité `sandbox`.
- **Conflits** : une publication fondée sur une version périmée est refusée (pas d'écrasement silencieux).
- **En-têtes** : CSP stricte (aucun script externe ni en ligne), HSTS, `nosniff`, anti-cadrage,
  `noindex` sur l'administration.

**Limites connues** : pas de réinitialisation du mot de passe par e-mail ni de double authentification.
Si ces fonctions deviennent nécessaires, Netlify Identity (de nouveau pris en charge par Netlify depuis
février 2026) ou Auth0 peuvent remplacer le module `netlify/functions/_lib/auth.mjs` : c'est le seul
fichier qui décide qui est authentifié.

## 8. Données et sauvegardes

Le contenu publié, les images et les demandes clients sont stockés dans Netlify Blobs (magasins
`gapawa-content`, `gapawa-media` et `gapawa-requests`), indépendants des déploiements : un redéploiement n'efface rien. Les 20 dernières
versions publiées sont conservées automatiquement. `content/content.json` reste le contenu de secours,
affiché tant que rien n'a été publié depuis l'administration.

## 9. Développement local

```bash
npm install
npx netlify-cli dev     # site, fonctions et fonctions edge en local, http://localhost:8888
```
Créez un fichier `.env` (non versionné) avec les trois variables de la section 3.
Après une modification de `content/content.json`, de `render.mjs`, de `site.css` ou de `site.js` :
`npm run build`.

## 10. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| « Serveur d'administration introuvable » | Site déployé par glisser-déposer | Déployer via Git ou CLI (section 2) |
| « Administration non configurée » | Variables absentes ou hors contexte Production | Section 3, puis redéployer |
| « Trop de tentatives » | 5 échecs de connexion | Attendre 15 minutes |
| Messages du formulaire non reçus | Détection des formulaires inactive | Section 4 |
| Modification publiée invisible | Cache du navigateur | Actualiser la page |
| « Build blocked: Unrecognized Git contributor » | Offre gratuite + dépôt privé : l'auteur du dernier commit n'est pas reconnu | Relier son compte GitHub dans Netlify (*Link Git account*) et signer les commits avec l'identité GitHub du propriétaire du dépôt ; à défaut, rendre le dépôt public (aucun secret dans le code) |
| « Default export … must be a function » en fonction edge | Un fichier non-fonction placé dans `netlify/edge-functions/` | Ne mettre dans ce dossier que des fonctions edge ; les modules partagés vont dans `netlify/shared/` |
