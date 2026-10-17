/**
 * scoring-engine.ts — Moteur de scoring et ranking 1 à 5 étoiles façon Career-Ops
 * Calcule l'adéquation exacte entre un profil candidat et une offre d'emploi.
 */

import type { JobOffer, ScoreBreakdown, UserProfile } from '../types.ts';
import { checkBlacklist } from './blacklist-filter.ts';
import { hasTerm, normalizeText } from './keyword-match.ts';
import { extractSkills, foldFrenchAccents } from './skill-extract.ts';

/**
 * Évalue une offre d'emploi par rapport au profil utilisateur.
 */
export function evaluateJobOffer(job: JobOffer, profile: UserProfile): ScoreBreakdown {
  // 1. Filtrage négatif (Mots interdits)
  const blacklistResult = checkBlacklist(job.title, job.description, profile.blacklistedKeywords);
  if (blacklistResult.isExcluded) {
    return {
      score: 1.0,
      matchedSkills: [],
      missingSkills: [],
      blacklistedFound: blacklistResult.forbiddenMatches,
      isExcluded: true,
      exclusionReason: blacklistResult.reason,
      reasons: [blacklistResult.reason || 'Offre éliminée par filtre de mots interdits.'],
      highlight: '⚠️ Rejetée par filtre négatif',
    };
  }

  // 2. Extraction des compétences requises par l'offre
  const jobSkills = job.extractedSkills && job.extractedSkills.length > 0
    ? job.extractedSkills
    : extractSkills(`${job.title}\n${job.description}`);

  // Normalisation des compétences du profil
  const userSkillsSet = new Set(profile.skills.map(s => foldFrenchAccents(s)));
  const cvTextFolded = foldFrenchAccents(profile.cvRawText || '');

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const skill of jobSkills) {
    const sFolded = foldFrenchAccents(skill);
    // Vérifier si la compétence est dans la liste du profil ou textuellement dans le CV
    if (userSkillsSet.has(sFolded) || (cvTextFolded && hasTerm(skill, cvTextFolded))) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }

  // 3. Calcul du score de compétences (base 1.0 à 5.0)
  let skillsScore = 3.0; // score par défaut si l'offre ne liste aucune compétence spécifique
  if (jobSkills.length > 0) {
    const matchRatio = matchedSkills.length / jobSkills.length;
    // Ratio 100% -> 5.0, 50% -> 3.0, 0% -> 1.5
    skillsScore = 1.5 + (matchRatio * 3.5);
  }

  // 4. Alignement du titre du poste (bonus / malus)
  let titleBonus = 0;
  if (profile.title) {
    const pTitleWords = normalizeText(profile.title).split(' ').filter(w => w.length > 3);
    const jTitleNorm = normalizeText(job.title);
    const titleMatches = pTitleWords.filter(w => jTitleNorm.includes(w));
    if (titleMatches.length > 0) {
      titleBonus += 0.4;
    }
  }

  // 5. Alignement du type de contrat
  let contractBonus = 0;
  if (profile.preferredContracts && profile.preferredContracts.length > 0) {
    if (profile.preferredContracts.includes(job.contractType)) {
      contractBonus += 0.3;
    } else if (job.contractType !== 'Autre') {
      contractBonus -= 0.3;
    }
  }

  // 6. Score final borné entre 1.0 et 5.0, arrondi au dixième
  let finalScore = skillsScore + titleBonus + contractBonus;
  finalScore = Math.max(1.0, Math.min(5.0, Math.round(finalScore * 10) / 10));

  // 7. Génération des motifs et points saillants (Career-Ops style)
  const reasons: string[] = [];

  if (matchedSkills.length > 0) {
    reasons.push(`${matchedSkills.length} compétence(s) alignée(s) : ${matchedSkills.slice(0, 4).join(', ')}${matchedSkills.length > 4 ? '...' : ''}`);
  }
  if (missingSkills.length > 0) {
    reasons.push(`Lacunes détectées : ${missingSkills.slice(0, 3).join(', ')}${missingSkills.length > 3 ? '...' : ''}`);
  }
  if (job.contractType && profile.preferredContracts?.includes(job.contractType)) {
    reasons.push(`Contrat ${job.contractType} conforme aux préférences`);
  }

  let highlight = 'Bonne opportunité';
  if (finalScore >= 4.5) {
    highlight = '🎯 Correspondance exceptionnelle';
  } else if (finalScore >= 4.0) {
    highlight = '⭐ Très forte adéquation';
  } else if (finalScore >= 3.5) {
    highlight = '👍 Profil compatible';
  } else if (finalScore >= 2.5) {
    highlight = '⚠️ Adéquation partielle';
  } else {
    highlight = '❌ Faible adéquation';
  }

  return {
    score: finalScore,
    matchedSkills,
    missingSkills,
    blacklistedFound: [],
    isExcluded: finalScore < profile.minimumScoreThreshold,
    exclusionReason: finalScore < profile.minimumScoreThreshold ? `Note ${finalScore}/5 inférieure au seuil de ${profile.minimumScoreThreshold}/5` : undefined,
    reasons,
    highlight,
  };
}

/**
 * Évalue et classe (ranking) une liste d'offres en éliminant les offres exclues ou sous le seuil.
 */
export function rankAndFilterJobOffers(jobs: JobOffer[], profile: UserProfile): JobOffer[] {
  const evaluatedJobs = jobs.map(job => {
    const breakdown = evaluateJobOffer(job, profile);
    return {
      ...job,
      score: breakdown.score,
      scoreBreakdown: breakdown,
    };
  });

  // Ne garder que les offres non exclues
  const validJobs = evaluatedJobs.filter(j => !j.scoreBreakdown?.isExcluded);

  // Trier par note décroissante (meilleures offres en premier)
  return validJobs.sort((a, b) => (b.score || 0) - (a.score || 0));
}
