# Graph Report - focused-davinci  (2026-10-17)

## Corpus Check
- 40 files · ~26,590 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 1, .css 1, .toml 1)

## Summary
- 185 nodes · 500 edges · 9 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `37b7d8b6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- types.ts
- aggregator.ts
- package.json
- scoring-engine.ts
- dependencies
- 🇫🇷 CareerOps France — AI Job Search & Matching Web App
- Spécification Technique & Fonctionnelle : CareerOps France (Astro Web App)
- compilerOptions
- local-search.ts

## God Nodes (most connected - your core abstractions)
1. `createJobOffer()` - 27 edges
2. `generateDomainFallbackOffers()` - 23 edges
3. `JobOffer` - 21 edges
4. `fetchWithTimeout()` - 19 edges
5. `normalizeContractType()` - 19 edges
6. `evaluateJobOffer()` - 13 edges
7. `UserProfile` - 13 edges
8. `SearchFilterParams` - 13 edges
9. `cheerio` - 10 edges
10. `extractSkills()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `ScoreDetailModalProps` --references--> `JobOffer`  [EXTRACTED]
  src/components/ScoreDetailModal.tsx → src/lib/types.ts
- `ApplicationModalProps` --references--> `JobOffer`  [EXTRACTED]
  src/components/ApplicationModal.tsx → src/lib/types.ts
- `ProfileModalProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/ProfileModal.tsx → src/lib/types.ts
- `ProfileTabProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/ProfileTab.tsx → src/lib/types.ts
- `SearchDashboard()` --calls--> `executeLocalSearch()`  [EXTRACTED]
  src/components/SearchDashboard.tsx → src/lib/scrapers/local-search.ts

## Import Cycles
- None detected.

## Communities (9 total, 0 thin omitted)

### Community 0 - "types.ts"
Cohesion: 0.11
Nodes (30): lucide-react, react, ApplicationModal(), ApplicationModalProps, ProfileModal(), ProfileModalProps, ProfileTab(), ProfileTabProps (+22 more)

### Community 1 - "aggregator.ts"
Cohesion: 0.34
Nodes (19): cheerio, ScraperFunction, createJobOffer(), fetchWithTimeout(), generateDomainFallbackOffers(), isGenericPortalHomepage(), normalizeContractType(), USER_AGENT (+11 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (30): description, devDependencies, @types/node, @types/react, @types/react-dom, typescript, name, scripts (+22 more)

### Community 3 - "scoring-engine.ts"
Cohesion: 0.24
Nodes (16): BlacklistCheckResult, checkBlacklist(), DEFAULT_BLACKLISTED_KEYWORDS, computeKeywordCoverage(), hasTerm(), normalizeText(), computeLocationFit(), computeTitleFit() (+8 more)

### Community 4 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, astro, @astrojs/cloudflare, @astrojs/node, @astrojs/react, cheerio, clsx, lucide-react (+6 more)

### Community 5 - "🇫🇷 CareerOps France — AI Job Search & Matching Web App"
Cohesion: 0.20
Nodes (9): 📂 Architecture du Projet, 🇫🇷 CareerOps France — AI Job Search & Matching Web App, Construction pour la production, 🚀 Démarrage Rapide, 🎯 Fonctionnalités Clés, Installation & Lancement, Lancement des tests unitaires, Prérequis (+1 more)

### Community 6 - "Spécification Technique & Fonctionnelle : CareerOps France (Astro Web App)"
Cohesion: 0.22
Nodes (8): 1. Objectif & Vision, 2. Capability Map (Carte des capacités), 3. Architecture Technique, 4. Spécification des Commandes & Scripts, 5. Critères d'Acceptation & Validation, Problème résolu, Solution CareerOps France, Spécification Technique & Fonctionnelle : CareerOps France (Astro Web App)

### Community 7 - "compilerOptions"
Cohesion: 0.25
Nodes (7): astro/tsconfigs/strict, compilerOptions, baseUrl, jsx, jsxImportSource, paths, extends

### Community 8 - "local-search.ts"
Cohesion: 0.29
Nodes (8): SCRAPERS_MAP, buildJobPortalUrl(), formatPublicationDate(), executeLocalSearch(), resolveLocationDisplay(), JOB_SOURCES, JobSourceId, JobSourceInfo

## Knowledge Gaps
- **64 isolated node(s):** `name`, `type`, `version`, `description`, `dev` (+59 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 68 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **What connects `name`, `type`, `version` to the rest of the system?**
  _64 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11416490486257928 - nodes in this community are weakly interconnected._
- **Why does `cheerio` connect `aggregator.ts` to `package.json`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06417112299465241 - nodes in this community are weakly interconnected._
- **Why does `astro` connect `package.json` to `types.ts`, `scoring-engine.ts`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._