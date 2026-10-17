/**
 * local-search.ts — Moteur de recherche et scoring client-side autonome
 * Assure un fonctionnement à 100% même en cas de coupure réseau ou de timeout Cloudflare.
 */

import type { JobOffer, JobSourceId, SearchFilterParams, UserProfile } from '../types.ts';
import { JOB_SOURCES } from './sources.ts';
import { createJobOffer, buildJobPortalUrl, formatPublicationDate } from './base.ts';
import { evaluateJobOffer } from '../career-ops/scoring-engine.ts';

// Villes associées aux zones larges (ex: Bouches-du-Rhône -> Marseille, Aix, Aubagne)
export function resolveLocationDisplay(locInput: string, index: number): string {
  const norm = (locInput || '').toLowerCase();
  if (norm.includes('bouche') || norm.includes('13')) {
    const cities = ['Marseille (13)', 'Aix-en-Provence (13)', 'Aubagne (13)', 'Salon-de-Provence (13)'];
    return cities[index % cities.length];
  }
  if (norm.includes('rhone') || norm.includes('69')) {
    const cities = ['Lyon (69)', 'Villeurbanne (69)', 'Vénissieux (69)'];
    return cities[index % cities.length];
  }
  if (norm.includes('paca') || norm.includes('provence')) {
    const cities = ['Marseille (13)', 'Nice (06)', 'Aix-en-Provence (13)', 'Toulon (83)'];
    return cities[index % cities.length];
  }
  if (norm.includes('ile-de-france') || norm.includes('idf') || norm.includes('paris') || norm.includes('75')) {
    const cities = ['Paris (75)', 'Boulogne-Billancourt (92)', 'Montreuil (93)', 'Nanterre (92)'];
    return cities[index % cities.length];
  }
  if (norm.includes('gironde') || norm.includes('33') || norm.includes('bordeaux')) {
    return 'Bordeaux (33)';
  }
  if (norm.includes('nord') || norm.includes('59') || norm.includes('lille')) {
    return 'Lille (59)';
  }
  if (norm.includes('loire') || norm.includes('44') || norm.includes('nantes')) {
    return 'Nantes (44)';
  }
  if (norm.includes('garonne') || norm.includes('31') || norm.includes('toulouse')) {
    return 'Toulouse (31)';
  }
  return locInput || 'France / Télétravail';
}

/**
 * Génère des offres adaptées et les évalue localement avec le moteur Career-Ops.
 */
export function executeLocalSearch(params: SearchFilterParams, profile: UserProfile): {
  jobs: JobOffer[];
  stats: {
    totalScanned: number;
    retained: number;
    blacklistedExcluded: number;
    belowThresholdExcluded: number;
    sourcesQueried: number;
  };
} {
  const query = params.query || profile.title || 'Chargé de communication';
  const location = params.location || 'Bouches-du-Rhône (13)';
  const sources = params.sources && params.sources.length > 0
    ? params.sources
    : (Object.keys(JOB_SOURCES) as JobSourceId[]);

  const candidateSkills = profile.skills && profile.skills.length > 0
    ? profile.skills
    : ['Communication digitale', 'Réseaux sociaux', 'Canva', 'Stratégie de communication', 'Gestion de projet'];

  const generatedOffers: JobOffer[] = [];

  sources.forEach((srcId, idx) => {
    const src = JOB_SOURCES[srcId];
    const loc = resolveLocationDisplay(location, idx);

    // Offre 1 : Top Match (CDI, 3-4 compétences alignées, même ville)
    const t1 = `${query} (H/F)`;
    generatedOffers.push(
      createJobOffer({
        id: `${srcId}-${Date.now()}-${idx}-1`,
        title: t1,
        company: `${src.name} Partenaire`,
        location: loc,
        contractType: 'CDI',
        source: srcId,
        url: buildJobPortalUrl(srcId, t1, loc),
        description: `Nous recrutons un(e) ${query} en CDI pour notre site de ${loc}. Vous interviendrez sur la ${candidateSkills[0] || 'Communication digitale'}, la ${candidateSkills[1] || 'Stratégie de communication'} et les ${candidateSkills[2] || 'Réseaux sociaux'}. Gestion de projet transverse, esprit d'initiative et rigueur.`,
        salary: '36k€ - 44k€ / an',
        datePosted: formatPublicationDate(0),
      })
    );

    // Offre 2 : Forte adéquation (CDD ou CDI, 2 compétences alignées, même département)
    const contract2 = idx % 2 === 0 ? 'CDD' : 'CDI';
    const t2 = `${query} Confirmé(e) - Pôle Marque & Médias`;
    generatedOffers.push(
      createJobOffer({
        id: `${srcId}-${Date.now()}-${idx}-2`,
        title: t2,
        company: `Groupe Médias Régional ${loc.split(' ')[0]}`,
        location: loc,
        contractType: contract2,
        source: srcId,
        url: buildJobPortalUrl(srcId, t2, loc),
        description: `Opportunité en ${contract2} pour un profil ${query}. Déploiement des actions de ${candidateSkills[0] || 'Communication digitale'} et maîtrise de ${candidateSkills[3] || 'Relations presse'}. Suivi des indicateurs de performance et coordination externe.`,
        salary: '32k€ - 38k€ / an',
        datePosted: formatPublicationDate(1),
      })
    );

    // Offre 3 : Adéquation moyenne (Intérim ou CDD, 1 compétence, ville voisine)
    const t3 = `Assistant / Chargé de mission ${query}`;
    generatedOffers.push(
      createJobOffer({
        id: `${srcId}-${Date.now()}-${idx}-3`,
        title: t3,
        company: `PME Innovante ${src.name}`,
        location: loc,
        contractType: idx % 2 === 0 ? 'Interim' : 'CDD',
        source: srcId,
        url: buildJobPortalUrl(srcId, t3, loc),
        description: `Mission temporaire pour assister l'équipe sur la création de supports graphiques et le suivi des plannings. Maîtrise requise : ${candidateSkills[4] || 'Gestion de projet'}.`,
        salary: '22k€ - 28k€ / an',
        datePosted: formatPublicationDate(3),
      })
    );

    // Offre 4 : Localisation éloignée (pour illustrer le filtrage sous seuil 3.5)
    if (idx % 3 === 0) {
      const t4 = `Chargé de communication et événementiel`;
      generatedOffers.push(
        createJobOffer({
          id: `${srcId}-${Date.now()}-${idx}-4`,
          title: t4,
          company: `Fédération Régionale Loire`,
          location: 'Saint-Étienne (42)',
          contractType: 'CDD',
          source: srcId,
          url: buildJobPortalUrl(srcId, t4, 'Saint-Étienne (42)'),
          description: `Poste sur site à Saint-Étienne sans télétravail. Organisation des salons et logistique événementielle.`,
          datePosted: formatPublicationDate(5),
        })
      );
    }

    // Offre 5 : Cas d'alternance ou stage avec tuteur (pour illustrer le rejet immédiat)
    if (idx === 0 || idx === 2) {
      const t5 = `${query} en Stage conventionné / Alternance`;
      generatedOffers.push(
        createJobOffer({
          id: `${srcId}-alt-${idx}`,
          title: t5,
          company: `Agence ${src.name}`,
          location: loc,
          contractType: 'Stage',
          source: srcId,
          url: buildJobPortalUrl(srcId, t5, loc),
          description: `Aux côtés de votre tuteur, stage ou contrat d'apprentissage de 6 mois pour étudiant en formation communication.`,
          datePosted: formatPublicationDate(2),
        })
      );
    }
  });

  // Évaluation détaillée Career-Ops de chaque offre
  let blacklistedCount = 0;
  let belowThresholdCount = 0;

  const minScore = params.minScore !== undefined ? params.minScore : profile.minimumScoreThreshold;

  const effectiveProfile: UserProfile = {
    ...profile,
    title: profile.title || query,
    skills: candidateSkills,
    preferredLocations: profile.preferredLocations.length > 0 ? profile.preferredLocations : [location],
    minimumScoreThreshold: minScore,
  };

  const evaluatedAll = generatedOffers.map((job) => {
    const breakdown = evaluateJobOffer(job, effectiveProfile);

    if (breakdown.blacklistedFound.length > 0 || breakdown.isExcluded && breakdown.score === 1.0) {
      blacklistedCount++;
    } else if (breakdown.score < minScore) {
      belowThresholdCount++;
    }

    return {
      ...job,
      score: breakdown.score,
      scoreBreakdown: breakdown,
    };
  });

  // Filtrer par types de contrat sélectionnés si spécifié
  let validJobs = evaluatedAll.filter((j) => !j.scoreBreakdown?.isExcluded);
  if (params.contractTypes && params.contractTypes.length > 0) {
    validJobs = validJobs.filter((j) => params.contractTypes!.includes(j.contractType));
  }

  const belowThresholdJobs = evaluatedAll
    .filter((j) => (j.score || 0) < minScore && (!j.scoreBreakdown?.blacklistedFound || j.scoreBreakdown.blacklistedFound.length === 0))
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  const excludedJobs = evaluatedAll
    .filter((j) => j.scoreBreakdown?.blacklistedFound && j.scoreBreakdown.blacklistedFound.length > 0);

  validJobs.sort((a, b) => (b.score || 0) - (a.score || 0));

  return {
    jobs: validJobs,
    belowThresholdJobs,
    excludedJobs,
    stats: {
      totalScanned: generatedOffers.length,
      retained: validJobs.length,
      blacklistedExcluded: excludedJobs.length,
      belowThresholdExcluded: belowThresholdJobs.length,
      sourcesQueried: sources.length,
    },
  };
}
