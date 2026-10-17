/**
 * scoring-engine.ts — Moteur de scoring et ranking 1 à 5 étoiles façon Career-Ops
 * Calcule l'adéquation exacte entre un profil candidat et une offre d'emploi.
 */

import type { JobOffer, ScoreBreakdown, UserProfile } from '../types.ts';
import { checkBlacklist } from './blacklist-filter.ts';
import { hasTerm, normalizeText } from './keyword-match.ts';
import { extractSkills, foldFrenchAccents } from './skill-extract.ts';

/**
 * Calcule l'adéquation géographique entre l'offre et les préférences du candidat.
 */
export function computeLocationFit(jobLocation: string, preferredLocations: string[] = []): number {
  if (!jobLocation) return 0.5;
  const jNorm = normalizeText(jobLocation).toLowerCase();

  // Si télétravail ou remote
  if (jNorm.includes('teletravail') || jNorm.includes('remote')) return 1.0;

  if (!preferredLocations || preferredLocations.length === 0) return 0.8;

  // Extraire les numéros de département souhaités (ex: 13, 69, 75, etc.)
  const prefDeptMatches: string[] = [];
  for (const p of preferredLocations) {
    const dept = p.match(/\b(\d{2})\b/);
    if (dept) prefDeptMatches.push(dept[1]);
  }

  // Vérifier si le département de l'offre correspond
  const jobDeptMatch = jNorm.match(/\b(\d{2})\b/);
  if (jobDeptMatch && prefDeptMatches.includes(jobDeptMatch[1])) {
    return 1.0;
  }

  // Correspondance textuelle ville / département
  for (const pref of preferredLocations) {
    const pNorm = normalizeText(pref).toLowerCase();
    const pClean = pNorm.replace(/\(\d+\)/g, '').trim();
    if (pClean.length > 2 && (jNorm.includes(pClean) || pNorm.includes(jNorm))) {
      return 1.0;
    }
  }

  // Même région (ex: Bouches-du-Rhône et PACA)
  const isPacaPref = preferredLocations.some(p => p.toLowerCase().includes('13') || p.toLowerCase().includes('paca') || p.toLowerCase().includes('provence'));
  const isPacaJob = jNorm.includes('13') || jNorm.includes('paca') || jNorm.includes('provence') || jNorm.includes('marseille') || jNorm.includes('aix');
  if (isPacaPref && isPacaJob) {
    return 0.9;
  }

  // France entière générique
  if (jNorm === 'france' || jNorm === 'france / teletravail') return 0.7;

  // Autre département éloigné
  return 0.25;
}

/**
 * Calcule l'adéquation de l'intitulé de poste.
 */
export function computeTitleFit(jobTitle: string, candidateTitle?: string): number {
  if (!candidateTitle) return 0.7;
  const cNorm = normalizeText(candidateTitle).toLowerCase();
  const jNorm = normalizeText(jobTitle).toLowerCase();

  if (jNorm.includes(cNorm)) return 1.0;

  const stopWords = ['les', 'des', 'une', 'pour', 'dans', 'avec', 'sur', 'par', 'aux'];
  const cWords = cNorm.split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w));
  if (cWords.length === 0) return 0.7;

  let matchedWords = 0;
  for (const word of cWords) {
    if (jNorm.includes(word)) matchedWords++;
  }

  const ratio = matchedWords / cWords.length;
  if (ratio >= 1.0) return 0.95;
  if (ratio >= 0.66) return 0.85;
  if (ratio >= 0.33) return 0.65;
  return 0.30;
}

/**
 * Évalue une offre d'emploi par rapport au profil utilisateur.
 */
export function evaluateJobOffer(job: JobOffer, profile: UserProfile): ScoreBreakdown {
  // 1. Filtrage négatif strict (Mots interdits & Types de contrat)
  const blacklistResult = checkBlacklist(job.title, job.description, profile.blacklistedKeywords, job.contractType);
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

  // 2. Compétences requises et alignement candidat
  const jobSkills = job.extractedSkills && job.extractedSkills.length > 0
    ? job.extractedSkills
    : extractSkills(`${job.title}\n${job.description}`);

  const userSkillsSet = new Set(profile.skills.map(s => foldFrenchAccents(s)));
  const cvTextFolded = foldFrenchAccents(profile.cvRawText || '');

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const skill of jobSkills) {
    const sFolded = foldFrenchAccents(skill);
    if (userSkillsSet.has(sFolded) || (cvTextFolded && hasTerm(skill, cvTextFolded))) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }

  // Détection des compétences additionnelles du profil présentes dans le texte de l'offre
  for (const userSkill of profile.skills) {
    if (!matchedSkills.includes(userSkill)) {
      if (hasTerm(userSkill, `${job.title}\n${job.description}`)) {
        matchedSkills.push(userSkill);
      }
    }
  }

  // 3. Calculs des ratios dimensionnels (0.0 à 1.0)
  // Dimension Compétences (40%)
  const totalRelevantSkills = matchedSkills.length + missingSkills.length;
  let skillFit = 0.50;

  if (totalRelevantSkills > 0) {
    // Ratio de couverture des compétences requises par l'offre (0.0 à 1.0)
    const matchRatio = matchedSkills.length / totalRelevantSkills;

    // Bonus de volume de compétences maîtrisées (+0.05 par compétence alignée, max +0.20)
    const volumeBonus = Math.min(0.20, matchedSkills.length * 0.05);

    // Pénalité par compétence manquante requise par l'offre (-0.08 par compétence manquante)
    const missingPenalty = Math.min(0.40, missingSkills.length * 0.08);

    // Score compétences : la couverture prédomine, bonifiée par le volume et pénalisée par les manques
    skillFit = (matchRatio * 0.85) + volumeBonus - missingPenalty;
    skillFit = Math.max(0.15, Math.min(1.0, skillFit));
  } else {
    // Offre sans compétences techniques formellement isolées
    skillFit = matchedSkills.length > 0 ? 0.75 : 0.55;
  }

  // Dimension Intitulé de poste (25%)
  const titleFit = computeTitleFit(job.title, profile.title);

  // Dimension Localisation géographique (20%)
  const locationFit = computeLocationFit(job.location, profile.preferredLocations);

  // Dimension Type de contrat (15%)
  let contractFit = 0.5;
  if (profile.preferredContracts && profile.preferredContracts.length > 0) {
    if (profile.preferredContracts.includes(job.contractType)) {
      contractFit = 1.0;
    } else if (job.contractType === 'Autre') {
      contractFit = 0.6;
    } else {
      contractFit = 0.25;
    }
  }

  // 4. Score pondéré composite (Échelle 1.0 à 5.0)
  const weightedScore = (skillFit * 0.40) + (titleFit * 0.25) + (locationFit * 0.20) + (contractFit * 0.15);
  let finalScore = 1.0 + (weightedScore * 4.0);
  finalScore = Math.max(1.0, Math.min(5.0, Math.round(finalScore * 10) / 10));

  // 5. Motifs détaillés (Career-Ops Fit Analysis)
  const reasons: string[] = [];

  if (titleFit >= 0.85) {
    reasons.push(`Poste "${job.title}" très aligné avec vos compétences cibles.`);
  }

  if (totalRelevantSkills > 0 && missingSkills.length === 0) {
    reasons.push(`🎯 100% des compétences demandées sont validées (${matchedSkills.length}/${totalRelevantSkills}, 0 manquante).`);
  } else if (matchedSkills.length > 0) {
    reasons.push(`${matchedSkills.length} compétence(s) alignée(s) : ${matchedSkills.slice(0, 3).join(', ')}${matchedSkills.length > 3 ? '...' : ''}`);
  }

  if (missingSkills.length > 0) {
    reasons.push(`⚠️ ${missingSkills.length} compétence(s) manquante(s) : ${missingSkills.slice(0, 3).join(', ')} (pénalité appliquée sur le score).`);
  }

  if (locationFit >= 0.85) {
    reasons.push(`Localisation idéale : ${job.location}`);
  } else if (locationFit <= 0.4) {
    reasons.push(`⚠️ Localisation éloignée de votre zone cible (${job.location})`);
  }

  if (contractFit >= 0.85) {
    reasons.push(`Contrat ${job.contractType} conforme à vos critères`);
  } else if (contractFit <= 0.3) {
    reasons.push(`⚠️ Contrat ${job.contractType} non prioritaire`);
  }

  // 6. Highlight synthétique
  let highlight = 'Bonne opportunité';
  if (finalScore >= 4.7) {
    highlight = '🎯 Top Match Exceptionnel';
  } else if (finalScore >= 4.2) {
    highlight = '⭐ Très forte adéquation';
  } else if (finalScore >= 3.7) {
    highlight = '👍 Opportunité compatible';
  } else if (finalScore >= 3.2) {
    highlight = '⚖️ Adéquation partielle';
  } else {
    highlight = '⚠️ Faible compatibilité';
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
