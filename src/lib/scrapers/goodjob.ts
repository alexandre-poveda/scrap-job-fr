/**
 * goodjob.ts — Scraper pour GoodJob (goodjob.com)
 */

import * as cheerio from 'cheerio';
import type { JobOffer, SearchFilterParams } from '../types.ts';
import { createJobOffer, fetchWithTimeout, normalizeContractType, generateDomainFallbackOffers } from './base.ts';

export async function scrapeGoodJob(params: SearchFilterParams): Promise<JobOffer[]> {
  const url = 'https://goodjob-interim.fr/offres-emploi/';

  try {
    const res = await fetchWithTimeout(url);
    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);
      const results: JobOffer[] = [];
      const seenUrls = new Set<string>();

      $('a[href*="goodjob-interim.fr/offres-emploi/"]').each((_, a) => {
        const href = $(a).attr('href');
        if (!href || href === 'https://goodjob-interim.fr/offres-emploi/' || href.endsWith('/offres-emploi/')) return;
        if (seenUrls.has(href)) return;
        seenUrls.add(href);

        const slug = href.replace('https://goodjob-interim.fr/offres-emploi/', '').replace(/\/$/, '');
        const cleanTitle = slug
          .replace(/-/g, ' ')
          .replace(/\bh f\b/gi, '(H/F)')
          .replace(/\bf h\b/gi, '(F/H)')
          .replace(/\b(cdi|cdd|interim)\b/gi, (m) => m.toUpperCase())
          .replace(/^\w/, (c) => c.toUpperCase());

        const isCDI = /cdi/i.test(slug);
        const isCDD = /cdd/i.test(slug);
        const contract = isCDI ? 'CDI' : isCDD ? 'CDD' : 'Interim';

        results.push(
          createJobOffer({
            id: `gj-${slug}`,
            title: cleanTitle,
            company: 'GoodJob Intérim',
            location: params.location || 'Auvergne-Rhône-Alpes / France',
            contractType: contract,
            source: 'goodjob',
            url: href,
            description: `Offre GoodJob Intérim : ${cleanTitle}. Missions disponibles avec contact direct agence.`,
            datePosted: 'Publiée récemment',
          })
        );
      });

      if (results.length > 0) return results.slice(0, 15);
    }
  } catch (err) {
    console.warn('GoodJob scrape error:', err);
  }

  return [];
}
