import test from 'node:test';
import assert from 'node:assert';
import { extractSkills, foldFrenchAccents } from '../src/lib/career-ops/skill-extract.ts';
import { checkBlacklist } from '../src/lib/career-ops/blacklist-filter.ts';
import { evaluateJobOffer, rankAndFilterJobOffers } from '../src/lib/career-ops/scoring-engine.ts';

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
