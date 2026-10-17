# 🇫🇷 CareerOps France — AI Job Search & Matching Web App

> Application web moderne sous **Astro** & **React** d'agrégation d'offres d'emploi en France, propulsée par les algorithmes open source de [Career-Ops](https://github.com/career-ops-hq/career-ops).

---

## 🎯 Fonctionnalités Clés

- **Agrégation simultanée sur les 9 plus grands sites d'emploi en France** :
  1. **France Travail** (`candidat.francetravail.fr`)
  2. **Indeed France** (`fr.indeed.com`)
  3. **HugoDécrypte Jobs** (`jobs.hugodecrypte.com`)
  4. **HelloWork** (`hellowork.com`)
  5. **Manpower** (`manpower.fr`)
  6. **Tertio RH** (`tertio-rh.com`)
  7. **GoodJob** (`goodjob.com`)
  8. **Le Job Adéquat** (`lejobadequat.com`)
  9. **Emploi Territorial** (`emploi-territorial.fr`)

- **Filtre strict de mots interdits (Blacklist)** :
  - Élimination automatique et impitoyable de toute offre contenant des termes indésirables (ex: `alternance`, `apprentissage`, `stage`, `contrat pro`, `bénévolat`, etc.).
  - Personnalisable en temps réel depuis le profil candidat.

- **Moteur d'évaluation & Scoring ATS Career-Ops (1 à 5 étoiles)** :
  - Analyse d'adéquation entre le CV / profil candidat et chaque annonce.
  - Calcul du taux de couverture des compétences techniques (hard skills) et transversales.
  - Identification des points forts et des lacunes de compétences (Skill Gap Analysis).
  - Justification détaillée de la note attribuée.
  - Filtrage par seuil de note (ex: 3.5/5 ou 4.0/5) pour **ne garder que les meilleures opportunités**.

- **Import et gestion de profil de compétences** :
  - Import direct de CV en PDF ou texte brut avec extraction automatique des compétences.
  - Compatibilité avec les exports LinkedIn et France Travail.
  - Gestionnaire dynamique de tags de compétences.

- **Interface épurée et ultra-rapide** :
  - Développée sous Astro v5 avec îles React interactives.
  - Design sombre minimaliste inspiré des standards Linear et Career-Ops.
  - Filtres par mots-clés, localisation géographique et types de contrat (CDI, CDD, Intérim, Fonction Publique).

---

## 🚀 Démarrage Rapide

### Prérequis
- [Node.js](https://nodejs.org) v20+ (recommandé v22 ou v24)
- npm

### Installation & Lancement

```bash
# 1. Cloner ou ouvrir le projet
cd focused-davinci

# 2. Installer les dépendances
npm install

# 3. Lancer le serveur de développement Astro
npm run dev

# 4. Ouvrir votre navigateur sur
http://localhost:4321
```

### Construction pour la production

```bash
npm run build
npm start
```

### Lancement des tests unitaires

```bash
npm test
```

---

## 📂 Architecture du Projet

```
├── src/
│   ├── components/
│   │   ├── ProfileModal.tsx        # Modale d'import CV, compétences et mots interdits
│   │   ├── ScoreDetailModal.tsx    # Détail d'évaluation Career-Ops et analyse des écarts
│   │   └── SearchDashboard.tsx     # Hub de recherche, filtres et cartes d'offres scorées
│   ├── layouts/
│   │   └── Layout.astro            # Structure HTML, header minimaliste et typographie
│   ├── lib/
│   │   ├── career-ops/
│   │   │   ├── blacklist-filter.ts # Filtre strict d'exclusion des mots interdits
│   │   │   ├── keyword-match.ts    # Matching sémantique avec frontières de mots
│   │   │   ├── scoring-engine.ts   # Moteur de calcul de note 1.0 à 5.0 et ranking
│   │   │   └── skill-extract.ts    # Vocabulaire étendu FR/EN et extraction de compétences
│   │   ├── profile/
│   │   │   └── profile-parser.ts   # Parser de CV PDF / texte / LinkedIn / France Travail
│   │   ├── scrapers/
│   │   │   ├── aggregator.ts       # Agrégateur multi-sources asynchrone
│   │   │   ├── base.ts             # Client HTTP et normalisation des offres
│   │   │   ├── emploi-territorial.ts
│   │   │   ├── france-travail.ts
│   │   │   ├── goodjob.ts
│   │   │   ├── hellowork.ts
│   │   │   ├── hugodecrypte.ts
│   │   │   ├── indeed.ts
│   │   │   ├── lejobadequat.ts
│   │   │   ├── manpower.ts
│   │   │   ├── sources.ts          # Métadonnées des 9 plateformes
│   │   │   └── tertio-rh.ts
│   │   └── types.ts                # Contrats d'interfaces TypeScript
│   ├── pages/
│   │   ├── api/
│   │   │   ├── parse-cv.ts         # Endpoint POST d'analyse de CV / profil
│   │   │   ├── search.ts           # Endpoint POST de scan, filtrage et ranking
│   │   │   └── sources.ts          # Endpoint GET des 9 sources d'emploi
│   │   └── index.astro             # Page d'accueil Astro
│   └── styles/
│       └── global.css              # Styles globaux et variables de thème
├── tests/
│   ├── career-ops.test.mjs         # Tests du moteur de matching, blacklist et scoring
│   └── scrapers.test.mjs           # Tests des scrapers et de l'agrégation
├── astro.config.mjs                # Configuration Astro (mode SSR Node.js)
├── SPEC-career-ops-fr.md           # Spécification technique et fonctionnelle
└── package.json
```

---

## 🛡️ Respect de la Vie Privée & Données

Fidèle aux principes de [Career-Ops](https://github.com/career-ops-hq/career-ops) :
- Vos données et votre CV restent **100% sur votre machine** (aucun envoi vers des serveurs tiers non contrôlés).
- Le scoring est calculé localement via l'algorithme d'adéquation pondéré de Career-Ops.
- Aucune candidature n'est soumise automatiquement à votre insu : vous inspectez, choisissez et postulez directement sur l'offre d'origine.
