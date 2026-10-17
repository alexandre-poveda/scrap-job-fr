/**
 * keyword-match.ts — Vérification de correspondance de mots-clés ATS
 * Basé sur l'algorithmique de Career-Ops pour l'adéquation CV/Offre.
 */

import { foldFrenchAccents } from './skill-extract.ts';

export function normalizeText(s: string): string {
  return foldFrenchAccents(String(s || ''))
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Vérifie si un mot ou une expression est présente dans un texte avec respect des limites de mots.
 */
export function hasTerm(term: string, text: string): boolean {
  const normTerm = normalizeText(term);
  if (!normTerm) return false;
  const normText = normalizeText(text);

  const escaped = normTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(?:^|[^a-z0-9_])${escaped}(?=[^a-z0-9_]|$)`, 'i');
  return regex.test(normText);
}

/**
 * Calcule le taux de couverture des mots-clés d'une offre dans le profil/CV.
 */
export function computeKeywordCoverage(
  requiredKeywords: string[],
  cvText: string
): { matched: string[]; missing: string[]; coverageRatio: number } {
  const matched: string[] = [];
  const missing: string[] = [];

  for (const kw of requiredKeywords) {
    if (hasTerm(kw, cvText)) {
      matched.push(kw);
    } else {
      missing.push(kw);
    }
  }

  const total = requiredKeywords.length;
  const coverageRatio = total > 0 ? matched.length / total : 1.0;

  return { matched, missing, coverageRatio };
}
