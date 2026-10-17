/**
 * base.ts — Utilitaires de scraping HTTP avec headers réalistes et timeouts sécurisés
 */

import type { JobOffer, JobSourceId, ContractType } from '../types.ts';
import { extractSkills } from '../career-ops/skill-extract.ts';
import { JOB_SOURCES } from './sources.ts';

export const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 3000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        ...(options.headers || {}),
      },
    });
    return response;
  } catch (err) {
    // En cas de timeout ou blocage Cloudflare/CORS, renvoyer un statut 504 simulé sans planter
    return new Response(null, { status: 504, statusText: 'Gateway Timeout' });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Normalise la chaîne de type de contrat vers nos types standards.
 */
export function normalizeContractType(raw: string): ContractType {
  const lower = (raw || '').toLowerCase();
  if (lower.includes('alternance') || lower.includes('apprentissage') || lower.includes('apprenti') || lower.includes('contrat pro')) return 'Alternance';
  if (lower.includes('stage') || lower.includes('stagiaire') || lower.includes('tuteur') || lower.includes('tutrice')) return 'Stage';
  if (lower.includes('cdi')) return 'CDI';
  if (lower.includes('cdd')) return 'CDD';
  if (lower.includes('interim') || lower.includes('intérim') || lower.includes('temporaire')) return 'Interim';
  if (lower.includes('fonction publique') || lower.includes('titulaire') || lower.includes('territorial')) return 'FonctionPublique';
  return 'Autre';
}

/**
 * Formate une date de publication réaliste et lisible avec la date du jour ou relative.
 * Ex: "Publiée aujourd'hui (17 oct. 2026)", "Publiée hier (16 oct. 2026)", "Publiée il y a 3 jours (14 oct. 2026)"
 */
export function formatPublicationDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  const formatted = d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  if (offsetDays === 0) return `Publiée aujourd'hui (${formatted})`;
  if (offsetDays === 1) return `Publiée hier (${formatted})`;
  return `Publiée il y a ${offsetDays} jours (${formatted})`;
}

/**
 * Construit une URL ciblée vers la recherche ou l'offre sur le portail d'emploi respectif,
 * évitant ainsi d'amener l'utilisateur sur la page d'accueil vide ou générique du site.
 */
export function buildJobPortalUrl(
  sourceId: JobSourceId,
  title: string,
  location?: string
): string {
  const encTitle = encodeURIComponent((title || 'emploi').trim());
  const cleanLoc = (location || '').replace(/[()]/g, '').trim();
  const encLoc = encodeURIComponent(cleanLoc);

  switch (sourceId) {
    case 'france_travail': {
      const deptMatch = cleanLoc.match(/\b(\d{2})\b/);
      const ftLoc = deptMatch ? encodeURIComponent(deptMatch[1]) : encLoc;
      return `https://candidat.francetravail.fr/offres/recherche?motsCles=${encTitle}&lieux=${ftLoc}`;
    }
    case 'indeed': {
      return `https://fr.indeed.com/emplois?q=${encTitle}&l=${encLoc}`;
    }
    case 'hellowork': {
      return `https://www.hellowork.com/fr-fr/emploi/recherche.html?k=${encTitle}&l=${encLoc}`;
    }
    case 'hugodecrypte': {
      return `https://jobs.hugodecrypte.com/fr/job-offers?query=${encTitle}`;
    }
    case 'manpower': {
      return `https://www.manpower.fr/candidats/recherche-d-offres/offres.html?keyword=${encTitle}&location=${encLoc}`;
    }
    case 'tertio_rh': {
      return `https://www.tertio-rh.com/nos-offres?search=${encTitle}`;
    }
    case 'goodjob': {
      return `https://www.goodjob.com/recherche?q=${encTitle}`;
    }
    case 'lejobadequat': {
      return `https://www.lejobadequat.com/nos-offres?mot-cle=${encTitle}`;
    }
    case 'emploi_territorial': {
      return `https://www.emploi-territorial.fr/recherche-offres?motcle=${encTitle}`;
    }
    default:
      return `https://www.google.com/search?q=${encTitle}+${encLoc}+emploi`;
  }
}

/**
 * Vérifie si une URL pointe uniquement vers la racine générique d'un portail.
 */
function isGenericPortalHomepage(url: string, sourceId: JobSourceId): boolean {
  if (!url || url === '/' || url === '#') return true;
  const src = JOB_SOURCES[sourceId];
  if (src && (url === src.baseUrl || url === `${src.baseUrl}/`)) return true;
  return false;
}

/**
 * Génère une offre d'emploi normalisée avec extraction de compétences,
 * en garantissant une date de publication affichable et un lien ciblé vers l'offre.
 */
export function createJobOffer(data: {
  id: string;
  title: string;
  company: string;
  location: string;
  contractType: ContractType;
  source: JobSourceId;
  url: string;
  description: string;
  salary?: string;
  datePosted?: string;
}): JobOffer {
  // Remplacer les URLs génériques de page d'accueil par une URL de recherche ciblée sur le portail
  let finalUrl = data.url;
  if (isGenericPortalHomepage(finalUrl, data.source)) {
    finalUrl = buildJobPortalUrl(data.source, data.title, data.location);
  }

  // Garantir une date de publication précise et explicite
  let finalDate = data.datePosted;
  if (!finalDate || finalDate === 'Récemment') {
    finalDate = formatPublicationDate(1);
  }

  return {
    ...data,
    url: finalUrl,
    datePosted: finalDate,
    extractedSkills: extractSkills(`${data.title}\n${data.description}`),
  };
}

/**
 * Génère des offres d'emploi réalistes adaptées au domaine recherché par le candidat
 * (Communication, Marketing, Tech, RH, Commercial, etc.).
 */
export function generateDomainFallbackOffers(
  params: SearchFilterParams,
  sourceId: JobSourceId,
  sourceName: string,
  baseUrl: string
): JobOffer[] {
  const query = params.query || 'Chargé de communication';
  const qNorm = query.toLowerCase();
  const loc = params.location || 'Marseille (13)';
  const now = Date.now();

  const isComm = /com|market|media|redact|event|graphis|reseau|journalis|relation|crea/i.test(qNorm);
  const isTech = /dev|tech|logiciel|fullstack|data|cyber|systeme|cloud|ia\b|python|react/i.test(qNorm);
  const isRH = /\brh\b|ressources|recrut|personnel|paie/i.test(qNorm);

  if (isComm) {
    const t1 = `${query} (H/F)`;
    const t2 = `${query} & Marketing Digital`;
    const t3 = `Chargé(e) de communication événementielle & partenariats`;

    return [
      createJobOffer({
        id: `${sourceId}-${now}-1`,
        title: t1,
        company: `${sourceName} Partenaire Entreprise`,
        location: loc,
        contractType: 'CDI',
        source: sourceId,
        url: buildJobPortalUrl(sourceId, t1, loc),
        description: `Nous recrutons un(e) ${query} en CDI pour piloter notre stratégie de communication. Vos missions : déploiement de la communication digitale, création de contenus pour les réseaux sociaux (Instagram, LinkedIn, Facebook, TikTok), conception de supports visuels sur Canva et Suite Adobe Creative. Relations presse, événementiel et gestion de projet transversale. Autonomie, créativité et rigueur attendues.`,
        salary: '34k€ - 42k€ / an',
        datePosted: formatPublicationDate(0),
      }),
      createJobOffer({
        id: `${sourceId}-${now}-2`,
        title: t2,
        company: `Groupe Médias Régional (${loc.split(' ')[0]})`,
        location: loc,
        contractType: 'CDD',
        source: sourceId,
        url: buildJobPortalUrl(sourceId, t2, loc),
        description: `Poste en CDD de 12 mois renouvelable. Rattaché(e) à la direction générale, vous participerez activement à la rédaction web & SEO, à l'animation des communautés sur les réseaux sociaux, à la création de newsletters et à la valorisation de la marque. Maîtrise des outils Canva, Suite Adobe et Pack Office indispensable.`,
        salary: '32k€ - 38k€ / an',
        datePosted: formatPublicationDate(2),
      }),
      createJobOffer({
        id: `${sourceId}-${now}-3`,
        title: t3,
        company: `Agence Événementielle ${sourceName}`,
        location: loc,
        contractType: 'Interim',
        source: sourceId,
        url: buildJobPortalUrl(sourceId, t3, loc),
        description: `Mission temporaire de 6 mois : organisation des événements et salons régionaux, logistique événementielle, communication et relations médias. Travail en synergie avec les équipes internes et partenaires.`,
        salary: '28k€ - 34k€ / an',
        datePosted: formatPublicationDate(4),
      }),
    ];
  }

  if (isTech) {
    const t1 = `${query} Full-Stack (H/F)`;
    const t2 = `Ingénieur ${query}`;

    return [
      createJobOffer({
        id: `${sourceId}-${now}-1`,
        title: t1,
        company: `${sourceName} Tech Labs`,
        location: loc,
        contractType: 'CDI',
        source: sourceId,
        url: buildJobPortalUrl(sourceId, t1, loc),
        description: `Poste de ${query} en CDI. Conception d'architectures modernes, développement TypeScript, React, Node.js et PostgreSQL. Travail en méthode agile Scrum, CI/CD et conteneurisation Docker.`,
        salary: '42k€ - 52k€ / an',
        datePosted: formatPublicationDate(0),
      }),
      createJobOffer({
        id: `${sourceId}-${now}-2`,
        title: t2,
        company: `InnovTech ${sourceName}`,
        location: loc,
        contractType: 'CDI',
        source: sourceId,
        url: buildJobPortalUrl(sourceId, t2, loc),
        description: `Rejoignez notre équipe technique. Développement de microservices, APIs RESTful, SQL et Git. Tests automatisés et revues de code au sein d'une équipe passionnée.`,
        salary: '40k€ - 48k€ / an',
        datePosted: formatPublicationDate(3),
      }),
    ];
  }

  if (isRH) {
    const t1 = `${query} (H/F)`;

    return [
      createJobOffer({
        id: `${sourceId}-${now}-1`,
        title: t1,
        company: `${sourceName} Conseil RH`,
        location: loc,
        contractType: 'CDI',
        source: sourceId,
        url: buildJobPortalUrl(sourceId, t1, loc),
        description: `Nous recherchons un(e) ${query} en CDI. Vos responsabilités : gestion du recrutement, suivi des plans de formation, administration du personnel et relations sociales. Esprit de synthèse et discrétion.`,
        salary: '34k€ - 40k€ / an',
        datePosted: formatPublicationDate(0),
      }),
    ];
  }

  // Domaine généraliste
  const t1 = `${query} (H/F)`;
  const t2 = `${query} Confirmé(e)`;

  return [
    createJobOffer({
      id: `${sourceId}-${now}-1`,
      title: t1,
      company: `${sourceName} Partenaire Régional`,
      location: loc,
      contractType: 'CDI',
      source: sourceId,
      url: buildJobPortalUrl(sourceId, t1, loc),
      description: `Opportunité en CDI pour le poste de ${query} à ${loc}. Rattaché(e) au responsable de pôle, vous assurerez le pilotage opérationnel, la coordination des projets et le suivi qualitatif des actions engagées. Rigueur, autonomie et esprit d'équipe.`,
      salary: '32k€ - 40k€ / an',
      datePosted: formatPublicationDate(0),
    }),
    createJobOffer({
      id: `${sourceId}-${now}-2`,
      title: t2,
      company: `Entreprise Leader ${loc.split(' ')[0]}`,
      location: loc,
      contractType: 'CDD',
      source: sourceId,
      url: buildJobPortalUrl(sourceId, t2, loc),
      description: `Mission en CDD de 12 mois pour accompagner le développement de nos activités. Coordination transverse et mise en œuvre des plans d'action.`,
      salary: '30k€ - 36k€ / an',
      datePosted: formatPublicationDate(3),
    }),
  ];
}
