import test from 'node:test';
import assert from 'node:assert';
import { extractSkills, foldFrenchAccents } from '../src/lib/career-ops/skill-extract.ts';
import { checkBlacklist } from '../src/lib/career-ops/blacklist-filter.ts';
import { evaluateJobOffer, rankAndFilterJobOffers } from '../src/lib/career-ops/scoring-engine.ts';
import { parseProfileFromText, isValidPersonName, extractNameFromLinkedInUrl } from '../src/lib/profile/profile-parser.ts';

test('foldFrenchAccents normalizes accents correctly', () => {
  assert.strictEqual(foldFrenchAccents('Développeur Agilité Spécialisé'), 'developpeur agilite specialise');
});

test('extractSkills extracts canonical skills from French text', () => {
  const text = "Nous cherchons un Développeur Full-Stack maîtrisant React, TypeScript, Node.js et PostgreSQL dans une équipe Agile.";
  const skills = extractSkills(text);
  assert.ok(skills.includes('TypeScript'));
  assert.ok(skills.includes('React'));
  assert.ok(skills.includes('Node.js'));
  assert.ok(skills.includes('PostgreSQL'));
  assert.ok(skills.includes('Méthode Agile'));
});

test('checkBlacklist rejects forbidden words like alternance and stage', () => {
  const job1 = checkBlacklist('Développeur Web en Alternance H/F', 'Mission en contrat de professionnalisation');
  assert.strictEqual(job1.isExcluded, true);
  assert.ok(job1.forbiddenMatches.includes('alternance'));

  const job2 = checkBlacklist('Ingénieur Logiciel CDI', 'Poste en CDI à pourvoir immédiatement.');
  assert.strictEqual(job2.isExcluded, false);
  assert.strictEqual(job2.forbiddenMatches.length, 0);

  const job3 = checkBlacklist('Stage Développeur Python', 'Stage de 6 mois de fin détudes');
  assert.strictEqual(job3.isExcluded, true);
  assert.ok(job3.forbiddenMatches.includes('stage'));
});

test('evaluateJobOffer scores high for matching skills and excludes blacklisted', () => {
  const profile = {
    name: 'Test Candidate',
    title: 'Développeur Full-Stack',
    summary: '',
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
    preferredLocations: ['Paris'],
    preferredContracts: ['CDI'],
    blacklistedKeywords: ['alternance', 'stage'],
    minimumScoreThreshold: 3.5,
  };

  const goodJob = {
    id: '1',
    title: 'Développeur Full-Stack TypeScript / React',
    company: 'Cool Company',
    location: 'Paris',
    contractType: 'CDI',
    source: 'france_travail',
    url: 'https://example.com/1',
    description: 'Poste en CDI. Stack : TypeScript, React, Node.js, PostgreSQL.',
    extractedSkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
  };

  const evaluation = evaluateJobOffer(goodJob, profile);
  assert.ok(evaluation.score >= 4.0, `Expected score >= 4.0, got ${evaluation.score}`);
  assert.strictEqual(evaluation.isExcluded, false);
  assert.strictEqual(evaluation.matchedSkills.length, 4);

  const alternanceJob = {
    id: '2',
    title: 'Développeur en Alternance',
    company: 'Other Company',
    location: 'Paris',
    contractType: 'Alternance',
    source: 'indeed',
    url: 'https://example.com/2',
    description: 'Contrat dapprentissage.',
    extractedSkills: ['TypeScript'],
  };

  const alternanceEval = evaluateJobOffer(alternanceJob, profile);
  assert.strictEqual(alternanceEval.isExcluded, true);
  assert.ok(alternanceEval.blacklistedFound.length > 0);
});

test('offers with 100% skill coverage rank higher than offers with critical missing skills', () => {
  const commProfile = {
    name: 'Candidat Com',
    title: 'Chargé de communication',
    summary: '',
    skills: ['Communication digitale', 'Marketing digital', 'Réseaux sociaux'],
    preferredLocations: ['Marseille (13)'],
    preferredContracts: ['CDI'],
    blacklistedKeywords: ['alternance', 'stage'],
    minimumScoreThreshold: 3.0,
  };

  // Offre A : 2 compétences requises, 2 validées (0 manquante) -> 100% de match
  const jobFullMatch = {
    id: 'a',
    title: 'Chargé de communication et marketing',
    company: 'Entreprise A',
    location: 'Marseille (13)',
    contractType: 'CDI',
    source: 'france_travail',
    url: 'https://example.com/a',
    description: 'Poste en communication digitale et marketing digital.',
    extractedSkills: ['Communication digitale', 'Marketing digital'],
  };

  // Offre B : 3 compétences alignées mais 3 compétences techniques manquantes (TypeScript, PostgreSQL, etc.)
  const jobMissingTechSkills = {
    id: 'b',
    title: 'Chargé de communication et systèmes informatiques',
    company: 'Entreprise B',
    location: 'Marseille (13)',
    contractType: 'CDI',
    source: 'indeed',
    url: 'https://example.com/b',
    description: 'Poste communication et SI.',
    extractedSkills: ['Communication digitale', 'Marketing digital', 'Réseaux sociaux', 'TypeScript', 'PostgreSQL', 'Docker'],
  };

  const evalA = evaluateJobOffer(jobFullMatch, commProfile);
  const evalB = evaluateJobOffer(jobMissingTechSkills, commProfile);

  assert.ok(
    evalA.score > evalB.score,
    `Expected Job A (0 missing, score ${evalA.score}) to be higher than Job B (3 missing, score ${evalB.score})`
  );
  assert.strictEqual(evalA.missingSkills.length, 0);
  assert.strictEqual(evalB.missingSkills.length, 3);
});

test('parseProfileFromText extracts school, degree, LinkedIn URL and skills from LinkedIn profile export', () => {
  const sampleLinkedInText = `
Alexandre Poveda
Chargé de communication digitale & Marketing
Marseille, Provence-Alpes-Côte d'Azur, France
Contact : alexandre.poveda@email.fr | 06 12 34 56 78
linkedin.com/in/alexandre-poveda

Infos
Passionné par la communication digitale, la création de contenus et les réseaux sociaux.

Expérience
Chargé de communication chez Entreprise Digitale
2022 - Présent

Formation
Université d'Aix-Marseille
Master Information et Communication Digitale
2020 - 2022

Compétences principales
Communication digitale • Réseaux sociaux • Canva • Suite Adobe Creative • Gestion de projet
`;

  const parsed = parseProfileFromText(sampleLinkedInText, 'linkedin');

  assert.strictEqual(parsed.name, 'Alexandre Poveda');
  assert.strictEqual(parsed.title, 'Chargé de communication digitale & Marketing');
  assert.strictEqual(parsed.schoolName, "Université d'Aix-Marseille");
  assert.strictEqual(parsed.degreeTitle, 'Master Information et Communication Digitale');
  assert.strictEqual(parsed.linkedinUrl, 'https://linkedin.com/in/alexandre-poveda');
  assert.ok(parsed.skills?.includes('Communication digitale'));
  assert.ok(parsed.skills?.includes('Réseaux sociaux / Community Management'));
  assert.ok(parsed.skills?.includes('Canva'));
});

test('isValidPersonName properly validates person names and rejects section keywords', () => {
  assert.strictEqual(isValidPersonName('Formation'), false);
  assert.strictEqual(isValidPersonName('Expérience'), false);
  assert.strictEqual(isValidPersonName('Compétences'), false);
  assert.strictEqual(isValidPersonName('https://linkedin.com'), false);
  assert.strictEqual(isValidPersonName('alexandre@email.com'), false);
  assert.strictEqual(isValidPersonName('Alexandre Poveda'), true);
  assert.strictEqual(isValidPersonName('Jean-Paul Sartre'), true);
});

test('extractNameFromLinkedInUrl extracts readable name from profile url slug', () => {
  assert.strictEqual(
    extractNameFromLinkedInUrl('https://www.linkedin.com/in/alexandre-poveda-905308264'),
    'Alexandre Poveda'
  );
  assert.strictEqual(
    extractNameFromLinkedInUrl('www.linkedin.com/in/marie-curie'),
    'Marie Curie'
  );
  assert.strictEqual(extractNameFromLinkedInUrl('invalid-url'), null);
});

test('parseProfileFromText does NOT set candidate name to Formation when text starts with Formation', () => {
  const textStartingWithFormation = `
Formation
Université d'Aix-Marseille
Master Communication
2020 - 2022

Contact
alexandre@email.com
linkedin.com/in/alexandre-poveda-905308264
`;

  const parsed = parseProfileFromText(textStartingWithFormation, 'linkedin');

  assert.notStrictEqual(parsed.name, 'Formation');
  assert.strictEqual(parsed.name, 'Alexandre Poveda');
  assert.strictEqual(parsed.schoolName, "Université d'Aix-Marseille");
  assert.strictEqual(parsed.degreeTitle, 'Master Communication');
});

