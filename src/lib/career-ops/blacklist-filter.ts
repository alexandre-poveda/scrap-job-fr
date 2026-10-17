/**
 * blacklist-filter.ts — Filtrage strict des mots interdits
 * Garantit qu'aucun terme indésirable (ex: "alternance", "stage", etc.) ne passe le filtre.
 */

import { hasTerm } from './keyword-match.ts';

export const DEFAULT_BLACKLISTED_KEYWORDS = [
  'alternance',
  'alternant',
  'alternante',
  'apprentissage',
  'apprenti',
  'apprentie',
  'contrat de professionnalisation',
  'contrat pro',
  'stage',
  'stagiaire',
  'convention de stage',
  'conventionne',
  'tutrice',
  'tuteur',
  'tutorat',
  'gratification',
  'etudiant',
  'etudiante',
  'formation en alternance',
  'rythme d alternance',
  'rythme alternance',
  'master en alternance',
  'bachelor en alternance',
  'bts en alternance',
  'benevolat',
  'benevole',
];

export interface BlacklistCheckResult {
  isExcluded: boolean;
  forbiddenMatches: string[];
  reason?: string;
}

/**
 * Vérifie si une offre d'emploi contient un mot interdit dans son titre, sa description ou son type de contrat.
 */
export function checkBlacklist(
  title: string,
  description: string,
  userBlacklist: string[] = [],
  contractType?: string
): BlacklistCheckResult {
  const allBlacklist = Array.from(
    new Set([...DEFAULT_BLACKLISTED_KEYWORDS, ...userBlacklist.map(k => k.trim().toLowerCase())])
  ).filter(Boolean);

  const combinedText = `${title}\n${description}\n${contractType || ''}`;
  const matchedForbidden: string[] = [];

  for (const forbidden of allBlacklist) {
    if (hasTerm(forbidden, combinedText)) {
      matchedForbidden.push(forbidden);
    }
  }

  // Vérification explicite du type de contrat (ex: Stage ou Alternance)
  if (contractType) {
    const cNorm = contractType.toLowerCase();
    if (cNorm === 'stage' && allBlacklist.includes('stage') && !matchedForbidden.includes('stage')) {
      matchedForbidden.push('stage');
    }
    if ((cNorm === 'alternance' || cNorm === 'apprentissage') && allBlacklist.includes('alternance') && !matchedForbidden.includes('alternance')) {
      matchedForbidden.push('alternance');
    }
  }

  if (matchedForbidden.length > 0) {
    return {
      isExcluded: true,
      forbiddenMatches: matchedForbidden,
      reason: `Offre rejetée : contient le mot interdit "${matchedForbidden.join(', ')}"`,
    };
  }

  return {
    isExcluded: false,
    forbiddenMatches: [],
  };
}
