import test from 'node:test';
import assert from 'node:assert';
import { aggregateJobs, SCRAPERS_MAP } from '../src/lib/scrapers/aggregator.ts';
import { JOB_SOURCES } from '../src/lib/scrapers/sources.ts';

test('all 9 job sources are defined with complete metadata', () => {
  const sourceKeys = Object.keys(JOB_SOURCES);
  assert.strictEqual(sourceKeys.length, 9);

  const requiredSources = [
    'france_travail',
    'indeed',
    'hugodecrypte',
    'manpower',
    'tertio_rh',
    'hellowork',
    'goodjob',
    'lejobadequat',
    'emploi_territorial',
  ];

  for (const src of requiredSources) {
    assert.ok(JOB_SOURCES[src], `Source ${src} should be defined`);
    assert.ok(SCRAPERS_MAP[src], `Scraper for ${src} should exist`);
    assert.ok(JOB_SOURCES[src].name, `Source ${src} should have a name`);
    assert.ok(JOB_SOURCES[src].baseUrl, `Source ${src} should have a baseUrl`);
  }
});

test('aggregateJobs collects and normalizes job offers across selected sources', async () => {
  const results = await aggregateJobs({
    query: 'TypeScript',
    location: 'Paris',
    sources: ['france_travail', 'indeed', 'hugodecrypte'],
  });

  assert.ok(Array.isArray(results));
  assert.ok(results.length > 0);

  for (const job of results) {
    assert.ok(job.id, 'Job should have an ID');
    assert.ok(job.title, 'Job should have a title');
    assert.ok(job.company, 'Job should have a company');
    assert.ok(job.source, 'Job should have a source');
    assert.ok(job.url, 'Job should have a URL');
    assert.ok(job.extractedSkills, 'Job should have extracted skills array');
  }
});
