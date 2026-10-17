/**
 * blacklist-filter.ts — Filtrage strict des mots interdits
 * Garantit qu'aucun terme indésirable (ex: "alternance", "stage", etc.) ne passe le filtre.
 */

import { hasTerm } from './keyword-match.ts';

export const DEFAULT_BLACKLISTED_KEYWORDS = [
  'alternance',
  'apprentissage',
  'apprenti',
  'contrat de professionnalisation',
  'stage',
  'stagiaire',
  'benevolat',
  'benevole',
];

export interface BlacklistCheckResult {
  isExcluded: boolean;
  forbiddenMatches: string[];
  reason?: string;
}

/**
 * Vérifie si une offre d'emploi contient un mot interdit dans son titre ou sa description.
 */
export function checkBlacklist(
  title: string,
  description: string,
  userBlacklist: string[] = []
): BlacklistCheckResult {
  const allBlacklist = Array.from(
    new Set([...DEFAULT_BLACKLISTED_KEYWORDS, ...userBlacklist.map(k => k.trim().toLowerCase())])
  ).filter(Boolean);

  const combinedText = `${title}\n${description}`;
  const matchedForbidden: string[] = [];

  for (const forbidden of allBlacklist) {
    if (hasTerm(forbidden, combinedText)) {
      matchedForbidden.push(forbidden);
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
