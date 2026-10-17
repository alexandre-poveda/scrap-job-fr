# Spécification Technique & Fonctionnelle : CareerOps France (Astro Web App)

## 1. Objectif & Vision

Créer une application web moderne, rapide et minimaliste sous **Astro** permettant aux chercheurs d'emploi en France d'agréger, filtrer et noter automatiquement les offres d'emploi selon leur profil de compétences et leur CV, en s'appuyant sur les principes et l'algorithmique open source de **Career-Ops**.

### Problème résolu
- Les plateformes de recherche d'emploi françaises sont dispersées (France Travail, HelloWork, Indeed, Manpower, HugoDécrypte, Emploi Territorial, etc.).
- Beaucoup d'offres polluent les recherches (ex: alternance ou stages quand on cherche un CDI, compétences incompatibles, "ghost jobs").
- Le candidat passe des heures à trier des centaines d'annonces non pertinentes.

### Solution CareerOps France
1. **Agrégation multi-portails** : Scan simultané des 9 plateformes ciblées.
2. **Profil de compétences & CV** : Importation de CV (PDF/Word/Texte) ou exports LinkedIn / France Travail, avec extraction automatique du graphe de compétences.
3. **Mots interdits (Blacklist)** : Exclusion stricte et immédiate des offres contenant des termes indésirables (ex: "alternance", "stage", etc.).
4. **Scoring & Ranking (1 à 5 étoiles)** : Évaluation hybride de la pertinence de chaque offre par rapport aux compétences requises vs maîtrisées, avec justification des écarts (skill gap analysis) façon Career-Ops.
5. **Interface épurée & minimaliste** : Recherche par tags, localisation géographique, type de contrat (CDI, CDD, Intérim), et conservation ciblée des meilleures offres uniquement.

---

## 2. Capability Map (Carte des capacités)

| Module ID | Responsabilité | Dépendances |
|---|---|---|
| `profile-engine` | Parsing de CV (PDF/Texte), import LinkedIn/France Travail, extraction de compétences (vocabulaire FR/EN élargi) | — |
| `scrapers-hub` | Moteur d'agrégation et scrapers pour les 9 plateformes (France Travail, Indeed, HugoDécrypte, Manpower, Tertio RH, HelloWork, GoodJob, Le Job Adéquat, Emploi Territorial) | — |
| `matching-ranking` | Filtrage des mots interdits, matching de compétences, scoring 1-5, gap analysis, et enrichissement IA optionnel | `profile-engine` |
| `storage-pipeline` | Persistance locale (IndexedDB / SQLite / LocalStorage) du profil, des offres sauvegardées, historique de candidatures | `profile-engine`, `matching-ranking` |
| `astro-ui` | Application web Astro (SSR/Islands), recherche en direct, gestionnaire de tags, sélecteur géographique et filtres contrats, fiches de scoring détaillées | Tous les modules |

**Ordre de construction** : `profile-engine` & `matching-ranking` → `scrapers-hub` → `storage-pipeline` → `astro-ui`.

---

## 3. Architecture Technique

- **Framework Web** : Astro v5 (avec Node.js adapter en mode standalone/server pour les API routes de scraping et scoring).
- **Frontend** : Composants interactifs Astro + React / Tailwind CSS (typographie soignée Space Grotesk & Geist, support automatique mode clair/sombre, animations fluides).
- **Moteur d'extraction & de scoring** :
  - Portage et adaptation TypeScript/ESM des modules de `career-ops` : `skill-extract`, `keyword-match`, `title-keywords`, `rank-pipeline`.
  - Vocabulaire de compétences enrichi pour le marché francophone (Tech, Tertiaire, Ingénierie, Management, Logistique, Santé, Fonction Publique).
  - Normalisation syntaxique et détection de frontières de mots (accent-folding français, alias de technologies).
- **Connecteurs Scrapers (9 sources)** :
  1. `france-travail` : Connecteur API Offres d'emploi v2 / Scraper de secours.
  2. `indeed-fr` : Scraper d'annonces Indeed France avec extraction du titre, entreprise, salaire, type de contrat et ville.
  3. `hugodecrypte` : Connecteur jobs.hugodecrypte.com (flux API JobTeaser / JSON).
  4. `hellowork` : Scraper HelloWork.com (agrégateur national).
  5. `manpower` : Scraper Manpower.fr (CDI, CDD, Intérim).
  6. `tertio-rh` : Scraper tertio-rh.com (spécialiste tertiaire / cadres).
  7. `lejobadequat` : Scraper lejobadequat.com (Groupe Adéquat).
  8. `goodjob` : Scraper GoodJob intérim & emploi.
  9. `emploi-territorial` : Scraper emploi-territorial.fr (collectivités, fonction publique territoriale).
- **Filtrage & Ranking** :
  - Filtre d'exclusion dur : Si un mot interdit apparaît dans le titre ou la description brute -> rejet immédiat avec motif.
  - Calcul de score pondéré (1.0 à 5.0) :
    - Adéquation des compétences clés (Must-have vs Nice-to-have) : 50%
    - Adéquation du titre de poste et niveau d'expérience : 30%
    - Localisation géographique et type de contrat : 20%
  - Explication des écarts (Forces du CV, Manques identifiés, Recommandation).

---

## 4. Spécification des Commandes & Scripts

```bash
# Installation des dépendances
npm install

# Lancement du serveur de développement Astro
npm run dev

# Construction pour la production
npm run build

# Lancement du serveur de production
npm run preview / npm start

# Tests unitaires du moteur de matching et des scrapers
npm run test
```

---

## 5. Critères d'Acceptation & Validation

1. **Import CV & Profil** : L'utilisateur peut uploader son CV (PDF/TXT/MD) ou importer son profil ; le système en extrait une liste claire de compétences éditables.
2. **Mots interdits fonctionnels** : Configurer "alternance" élimine 100% des offres d'alternance des résultats.
3. **Scoring transparent** : Chaque offre affichée possède une note sur 5 avec badge de couleur, résumé des compétences trouvées vs manquantes, et motif de la note.
4. **Filtres de recherche** : Filtrage par mots-clés, types de contrat (CDI, CDD, Intérim), et zone géographique (ville/département/rayon).
5. **Agrégation multi-sources** : Possibilité de scanner et afficher les offres provenant des 9 plateformes avec lien direct vers l'annonce originale.
6. **UI Minimaliste** : Interface rapide, ergonomique, sans surcharge visuelle, accessible sur desktop et mobile.
