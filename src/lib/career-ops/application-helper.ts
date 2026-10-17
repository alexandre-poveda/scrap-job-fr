/**
 * application-helper.ts — Assistant de pré-remplissage et génération sur-mesure de candidatures
 */

import type { JobOffer, UserProfile } from '../types.ts';
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
