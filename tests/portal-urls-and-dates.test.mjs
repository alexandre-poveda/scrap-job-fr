import test from 'node:test';
import assert from 'node:assert';
import {
  buildJobPortalUrl,
  formatPublicationDate,
  createJobOffer,
  generateDomainFallbackOffers,
} from '../src/lib/scrapers/base.ts';
import { executeLocalSearch } from '../src/lib/scrapers/local-search.ts';
import { JOB_SOURCES } from '../src/lib/scrapers/sources.ts';
import { DEFAULT_PROFILE } from '../src/lib/profile/profile-parser.ts';

test('buildJobPortalUrl generates targeted search and offer URLs for all 9 job sources', () => {
  const sources = Object.keys(JOB_SOURCES);
  assert.strictEqual(sources.length, 9);

  for (const src of sources) {
    const url = buildJobPortalUrl(src, 'Chargé de communication', 'Marseille (13)');
    assert.ok(url.startsWith('https://'), `URL for ${src} must be https: ${url}`);
    assert.notStrictEqual(url, JOB_SOURCES[src].baseUrl, `URL for ${src} must not be the plain root domain`);
    assert.notStrictEqual(url, `${JOB_SOURCES[src].baseUrl}/`, `URL for ${src} must not be the plain root domain with slash`);
    assert.ok(
      url.includes('communication') || url.includes('Charg%C3%A9'),
      `URL for ${src} should contain query parameter: ${url}`
    );
  }
});

test('buildJobPortalUrl handles specific job board query formats', () => {
  const ftUrl = buildJobPortalUrl('france_travail', 'Chargé de communication', 'Bouches-du-Rhône (13)');
  assert.ok(ftUrl.includes('candidat.francetravail.fr/offres/recherche'));
  assert.ok(ftUrl.includes('motsCles='));
  assert.ok(ftUrl.includes('lieux=13'));

  const indeedUrl = buildJobPortalUrl('indeed', 'Chargé de communication', 'Marseille (13)');
  assert.ok(indeedUrl.includes('fr.indeed.com/emplois?q='));
  assert.ok(indeedUrl.includes('&l='));

  const hwUrl = buildJobPortalUrl('hellowork', 'Chargé de communication', 'Marseille (13)');
  assert.ok(hwUrl.includes('hellowork.com/fr-fr/emploi/recherche.html?k='));

  const hdUrl = buildJobPortalUrl('hugodecrypte', 'Chargé de communication');
  assert.ok(hdUrl.includes('jobs.hugodecrypte.com/offres?query='));
});

test('formatPublicationDate generates human-readable French relative and calendar dates', () => {
  const today = formatPublicationDate(0);
  assert.ok(today.startsWith("Publiée aujourd'hui ("), `Today date format: ${today}`);
  assert.ok(today.endsWith(')'), `Must end with closing parenthesis: ${today}`);

  const yesterday = formatPublicationDate(1);
  assert.ok(yesterday.startsWith('Publiée hier ('), `Yesterday date format: ${yesterday}`);

  const threeDaysAgo = formatPublicationDate(3);
  assert.ok(threeDaysAgo.startsWith('Publiée il y a 3 jours ('), `3 days ago format: ${threeDaysAgo}`);
});

test('createJobOffer automatically upgrades generic homepage URLs and missing dates', () => {
  const offerWithGenericUrl = createJobOffer({
    id: 'test-1',
    title: 'Chargé de communication',
    company: 'Entreprise Test',
    location: 'Marseille (13)',
    contractType: 'CDI',
    source: 'france_travail',
    url: 'https://candidat.francetravail.fr',
    description: 'Poste en communication',
  });

  // Ne doit PAS pointer vers la page d'accueil générique
  assert.notStrictEqual(offerWithGenericUrl.url, 'https://candidat.francetravail.fr');
  assert.ok(offerWithGenericUrl.url.includes('motsCles='), `Upgraded URL should be targeted: ${offerWithGenericUrl.url}`);
  assert.ok(offerWithGenericUrl.datePosted, 'Should have datePosted');
  assert.ok(offerWithGenericUrl.datePosted.includes('Publiée'), `datePosted should be formatted: ${offerWithGenericUrl.datePosted}`);
});

test('generateDomainFallbackOffers produces targeted URLs and visible creation dates', () => {
  const offers = generateDomainFallbackOffers(
    { query: 'Chargé de communication', location: 'Bouches-du-Rhône (13)' },
    'france_travail',
    'France Travail',
    'https://candidat.francetravail.fr'
  );

  assert.ok(offers.length >= 2);
  for (const job of offers) {
    assert.notStrictEqual(job.url, 'https://candidat.francetravail.fr');
    assert.ok(job.url.includes('candidat.francetravail.fr/offres/recherche'));
    assert.ok(job.datePosted && job.datePosted.startsWith('Publiée'));
  }
});

test('executeLocalSearch produces jobs with targeted URLs and visible dates', () => {
  const result = executeLocalSearch(
    { query: 'Chargé de communication', location: 'Bouches-du-Rhône (13)' },
    DEFAULT_PROFILE
  );

  assert.ok(result.jobs.length > 0);
  for (const job of result.jobs) {
    const src = JOB_SOURCES[job.source];
    assert.notStrictEqual(job.url, src.baseUrl, `Job URL must not be generic homepage: ${job.url}`);
    assert.ok(job.datePosted && job.datePosted.startsWith('Publiée'), `Job must have formatted datePosted: ${job.datePosted}`);
  }
});
