/**
 * aggregator.ts — Agrégateur multi-portails pour les 9 plateformes françaises
 */

import type { JobOffer, JobSourceId, SearchFilterParams } from '../types.ts';
import { scrapeFranceTravail } from './france-travail.ts';
import { scrapeIndeed } from './indeed.ts';
import { scrapeHugoDecrypte } from './hugodecrypte.ts';
import { scrapeHelloWork } from './hellowork.ts';
import { scrapeManpower } from './manpower.ts';
import { scrapeTertioRH } from './tertio-rh.ts';
import { scrapeGoodJob } from './goodjob.ts';
import { scrapeLeJobAdequat } from './lejobadequat.ts';
import { scrapeEmploiTerritorial } from './emploi-territorial.ts';

export type ScraperFunction = (params: SearchFilterParams) => Promise<JobOffer[]>;

export const SCRAPERS_MAP: Record<JobSourceId, ScraperFunction> = {
  france_travail: scrapeFranceTravail,
  indeed: scrapeIndeed,
  hugodecrypte: scrapeHugoDecrypte,
  hellowork: scrapeHelloWork,
  manpower: scrapeManpower,
  tertio_rh: scrapeTertioRH,
  goodjob: scrapeGoodJob,
  lejobadequat: scrapeLeJobAdequat,
  emploi_territorial: scrapeEmploiTerritorial,
};

/**
 * Agrège les offres de toutes les sources spécifiées (ou l'ensemble des 9 par défaut).
 */
export async function aggregateJobs(params: SearchFilterParams): Promise<JobOffer[]> {
  const selectedSources = (params.sources && params.sources.length > 0)
    ? params.sources
    : (Object.keys(SCRAPERS_MAP) as JobSourceId[]);

  const promises = selectedSources.map(async (sourceId) => {
    const scraper = SCRAPERS_MAP[sourceId];
    if (!scraper) return [];
    try {
      return await scraper(params);
    } catch (err) {
      console.error(`Erreur scraper [${sourceId}]:`, err);
      return [];
    }
  });

  const results = await Promise.allSettled(promises);
  const allJobs: JobOffer[] = [];
  const seenUrls = new Set<string>();

  for (const res of results) {
    if (res.status === 'fulfilled') {
      for (const job of res.value) {
        // Déduplication élémentaire par URL ou id
        const key = job.url || `${job.company}-${job.title}`.toLowerCase();
        if (!seenUrls.has(key)) {
          seenUrls.add(key);
          allJobs.push(job);
        }
      }
    }
  }

  // Filtrage par type de contrat si spécifié
  let filtered = allJobs;
  if (params.contractTypes && params.contractTypes.length > 0) {
    filtered = filtered.filter(j => params.contractTypes!.includes(j.contractType));
  }

  return filtered;
}
