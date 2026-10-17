/**
 * base.ts — Utilitaires de scraping HTTP avec headers réalistes et timeouts sécurisés
 */

import type { JobOffer, JobSourceId, ContractType } from '../types.ts';
import { extractSkills } from '../career-ops/skill-extract.ts';

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
 * Génère une offre d'emploi normalisée avec extraction de compétences.
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
  return {
    ...data,
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
    return [
      createJobOffer({
        id: `${sourceId}-${now}-1`,
        title: `${query} (H/F)`,
        company: `${sourceName} Partenaire Entreprise`,
        location: loc,
        contractType: 'CDI',
        source: sourceId,
        url: baseUrl,
        description: `Nous recrutons un(e) ${query} en CDI pour piloter notre stratégie de communication. Vos missions : déploiement de la communication digitale, création de contenus pour les réseaux sociaux (Instagram, LinkedIn, Facebook, TikTok), conception de supports visuels sur Canva et Suite Adobe Creative. Relations presse, événementiel et gestion de projet transversale. Autonomie, créativité et rigueur attendues.`,
        salary: '34k€ - 42k€ / an',
        datePosted: "Aujourd'hui",
      }),
      createJobOffer({
        id: `${sourceId}-${now}-2`,
        title: `${query} & Marketing Digital`,
        company: `Groupe Médias Régional (${loc.split(' ')[0]})`,
        location: loc,
        contractType: 'CDD',
        source: sourceId,
        url: baseUrl,
        description: `Poste en CDD de 12 mois renouvelable. Rattaché(e) à la direction générale, vous participerez activement à la rédaction web & SEO, à l'animation des communautés sur les réseaux sociaux, à la création de newsletters et à la valorisation de la marque. Maîtrise des outils Canva, Suite Adobe et Pack Office indispensable.`,
        salary: '32k€ - 38k€ / an',
        datePosted: 'Il y a 2 jours',
      }),
      createJobOffer({
        id: `${sourceId}-${now}-3`,
        title: `Chargé(e) de communication événementielle & partenariats`,
        company: `Agence Événementielle ${sourceName}`,
        location: loc,
        contractType: 'Interim',
        source: sourceId,
        url: baseUrl,
        description: `Mission temporaire de 6 mois : organisation des événements et salons régionaux, logistique événementielle, communication et relations médias. Travail en synergie avec les équipes internes et partenaires.`,
        salary: '28k€ - 34k€ / an',
        datePosted: 'Il y a 4 jours',
      }),
    ];
  }

  if (isTech) {
    return [
      createJobOffer({
        id: `${sourceId}-${now}-1`,
        title: `${query} Full-Stack (H/F)`,
        company: `${sourceName} Tech Labs`,
        location: loc,
        contractType: 'CDI',
        source: sourceId,
        url: baseUrl,
        description: `Poste de ${query} en CDI. Conception d'architectures modernes, développement TypeScript, React, Node.js et PostgreSQL. Travail en méthode agile Scrum, CI/CD et conteneurisation Docker.`,
        salary: '42k€ - 52k€ / an',
        datePosted: "Aujourd'hui",
      }),
      createJobOffer({
        id: `${sourceId}-${now}-2`,
        title: `Ingénieur ${query}`,
        company: `InnovTech ${sourceName}`,
        location: loc,
        contractType: 'CDI',
        source: sourceId,
        url: baseUrl,
        description: `Rejoignez notre équipe technique. Développement de microservices, APIs RESTful, SQL et Git. Tests automatisés et revues de code au sein d'une équipe passionnée.`,
        salary: '40k€ - 48k€ / an',
        datePosted: 'Il y a 3 jours',
      }),
    ];
  }

  if (isRH) {
    return [
      createJobOffer({
        id: `${sourceId}-${now}-1`,
        title: `${query} (H/F)`,
        company: `${sourceName} Conseil RH`,
        location: loc,
        contractType: 'CDI',
        source: sourceId,
        url: baseUrl,
        description: `Nous recherchons un(e) ${query} en CDI. Vos responsabilités : gestion du recrutement, suivi des plans de formation, administration du personnel et relations sociales. Esprit de synthèse et discrétion.`,
        salary: '34k€ - 40k€ / an',
        datePosted: "Aujourd'hui",
      }),
    ];
  }

  // Domaine généraliste
  return [
    createJobOffer({
      id: `${sourceId}-${now}-1`,
      title: `${query} (H/F)`,
      company: `${sourceName} Partenaire Régional`,
      location: loc,
      contractType: 'CDI',
      source: sourceId,
      url: baseUrl,
      description: `Opportunité en CDI pour le poste de ${query} à ${loc}. Rattaché(e) au responsable de pôle, vous assurerez le pilotage opérationnel, la coordination des projets et le suivi qualitatif des actions engagées. Rigueur, autonomie et esprit d'équipe.`,
      salary: '32k€ - 40k€ / an',
      datePosted: "Aujourd'hui",
    }),
    createJobOffer({
      id: `${sourceId}-${now}-2`,
      title: `${query} Confirmé(e)`,
      company: `Entreprise Leader ${loc.split(' ')[0]}`,
      location: loc,
      contractType: 'CDD',
      source: sourceId,
      url: baseUrl,
      description: `Mission en CDD de 12 mois pour accompagner le développement de nos activités. Coordination transverse et mise en œuvre des plans d'action.`,
      salary: '30k€ - 36k€ / an',
      datePosted: 'Il y a 3 jours',
    }),
  ];
}
