/**
 * base.ts — Utilitaires de scraping HTTP avec headers réalistes
 */

import type { JobOffer, JobSourceId, ContractType } from '../types.ts';
import { extractSkills } from '../career-ops/skill-extract.ts';

export const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 7000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        ...(options.headers || {}),
      },
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Normalise la chaîne de type de contrat vers nos types standards.
 */
export function normalizeContractType(raw: string): ContractType {
  const lower = (raw || '').toLowerCase();
  if (lower.includes('alternance') || lower.includes('apprentissage')) return 'Alternance';
  if (lower.includes('stage')) return 'Stage';
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
