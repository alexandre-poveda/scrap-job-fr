/**
 * application-helper.ts — Assistant de pré-remplissage et génération sur-mesure de candidatures
 */

import type { JobOffer, UserProfile, RecruiterFormAnswer } from '../types.ts';
import { DEFAULT_PROFILE } from '../profile/profile-parser.ts';

export function generateTailoredCoverLetter(
  profile: UserProfile,
  job: JobOffer
): { letter: string; pitch: string } {
  const template = profile.defaultCoverLetter || DEFAULT_PROFILE.defaultCoverLetter || '';
  const pitchTemplate = profile.defaultPitch || DEFAULT_PROFILE.defaultPitch || '';

  const matched = job.scoreBreakdown?.matchedSkills && job.scoreBreakdown.matchedSkills.length > 0
    ? job.scoreBreakdown.matchedSkills
    : (job.extractedSkills && job.extractedSkills.length > 0 ? job.extractedSkills : profile.skills);

  const topSkills = matched.slice(0, 3).join(', ') || profile.skills.slice(0, 3).join(', ');
  const companyClean = job.company
    .replace(/\bPartenaire\b/gi, '')
    .replace(/\bEntreprise\b/gi, '')
    .trim() || job.company;

  const replacements: Record<string, string> = {
    '{poste}': job.title,
    '{entreprise}': companyClean,
    '{ville}': job.location,
    '{competences_cles}': topSkills,
    '{nom}': profile.name,
    '{email}': profile.email || '',
    '{telephone}': profile.phone || '',
  };

  let letter = template;
  let pitch = pitchTemplate;

  for (const [key, val] of Object.entries(replacements)) {
    letter = letter.split(key).join(val);
    pitch = pitch.split(key).join(val);
  }

  return { letter, pitch };
}

export function generateRecruiterFormAnswers(
  profile: UserProfile,
  job: JobOffer
): RecruiterFormAnswer[] {
  const companyClean = job.company
    .replace(/\bPartenaire\b/gi, '')
    .replace(/\bEntreprise\b/gi, '')
    .trim() || job.company;

  const motivationTemplate = profile.digitalCommMotivation || DEFAULT_PROFILE.digitalCommMotivation || '';
  const motivationAnswer = motivationTemplate
    .split('{entreprise}').join(companyClean)
    .split('{poste}').join(job.title)
    .split('{ville}').join(job.location);

  const school = profile.schoolName || DEFAULT_PROFILE.schoolName || 'Université / Grande École';
  const degree = profile.degreeTitle || DEFAULT_PROFILE.degreeTitle || 'Formation Supérieure en Communication';

  const answers: RecruiterFormAnswer[] = [
    {
      questionKey: 'digital_comm_motivation',
      label: `Qu'est-ce qui vous donne envie de participer à la communication digitale de ${companyClean} ?`,
      category: 'motivation',
      answer: motivationAnswer,
    },
    {
      questionKey: 'school_and_degree',
      label: "Nom de votre école et intitulé exact de votre formation",
      category: 'education',
      answer: `${school} — ${degree}`,
    },
    {
      questionKey: 'alternance_rhythm',
      label: "Votre rythme d'alternance",
      category: 'organization',
      answer: profile.alternanceRhythm || "0 (Non concerné(e)) — Candidature pour un contrat à temps plein classique sans alternance.",
    },
    {
      questionKey: 'onsite_compatibility',
      label: `Vos conditions d'organisation sont-elles compatibles avec le poste en présentiel à ${job.location} ?`,
      category: 'organization',
      answer: profile.onSiteCompatibility || `Oui, mes conditions personnelles et d'organisation sont parfaitement compatibles avec une présence sur site à ${job.location}.`,
    },
    {
      questionKey: 'social_media_experience',
      label: "Avez-vous créé des contenus destinés aux réseaux sociaux ?",
      category: 'social_media',
      answer: profile.socialMediaDetails || "Oui. Création régulière de contenus visuels et vidéos (Reels, TikTok, LinkedIn, Instagram, Facebook). Conception sur Canva / Adobe et montage vidéo.",
    },
    {
      questionKey: 'portfolio_links',
      label: "Liens vers vos réalisations (portfolio, publications, vidéos, projets étudiants...)",
      category: 'portfolio',
      answer: [
        profile.portfolioUrl ? `Portfolio : ${profile.portfolioUrl}` : 'Portfolio : https://mon-portfolio.fr',
        profile.linkedinUrl ? `LinkedIn : ${profile.linkedinUrl}` : null,
        profile.githubOrProjectsUrl ? `Projets / Fichiers : ${profile.githubOrProjectsUrl}` : null,
      ].filter(Boolean).join('\n'),
    },
    {
      questionKey: 'availability',
      label: "Vos disponibilités (démarrage, préavis)",
      category: 'availability',
      answer: profile.availability || "Disponible immédiatement",
    },
  ];

  return answers;
}

