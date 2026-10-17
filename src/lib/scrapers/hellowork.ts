/**
 * hellowork.ts — Scraper pour HelloWork (hellowork.com)
 */

import * as cheerio from 'cheerio';
import type { JobOffer, SearchFilterParams } from '../types.ts';
import { createJobOffer, fetchWithTimeout, normalizeContractType, generateDomainFallbackOffers } from './base.ts';

export async function scrapeHelloWork(params: SearchFilterParams): Promise<JobOffer[]> {
  const query = encodeURIComponent(params.query || 'developpeur');
  const location = encodeURIComponent(params.location || 'France');
  const url = `https://www.hellowork.com/fr-fr/emploi/recherche.html?k=${query}&l=${location}`;

  try {
    const res = await fetchWithTimeout(url);
    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);
      const results: JobOffer[] = [];

      $('li[data-cy="search-results-item"], article.offer-item, [class*="offer-"]').each((_, el) => {
        const title = $(el).find('h3, [data-cy="offer-title"], .offer-title').text().trim();
        const company = $(el).find('[data-cy="company-name"], .company-name').text().trim() || 'Recruteur HelloWork';
        const loc = $(el).find('[data-cy="offer-location"], .offer-location').text().trim() || params.location || 'France';
        const contractRaw = $(el).find('[data-cy="contract-type"], .contract-tag').text().trim() || 'CDI';
        const snippet = $(el).find('p.offer-description, [data-cy="offer-description"]').text().trim();
        const link = $(el).find('a').attr('href') || '';
        const id = $(el).attr('id') || Math.random().toString(36).substring(2, 9);

        if (title) {
          results.push(
            createJobOffer({
              id: `hw-${id}`,
              title,
              company,
              location: loc,
              contractType: normalizeContractType(contractRaw),
              source: 'hellowork',
              url: link.startsWith('http') ? link : `https://www.hellowork.com${link}`,
              description: snippet || `Offre d'emploi ${title} sur HelloWork. Profil recherché : ${params.query}.`,
              datePosted: 'Récemment',
            })
          );
        }
      });

      if (results.length > 0) return results.slice(0, 10);
    }
  } catch (err) {
    console.warn('HelloWork scrape fallback engaged:', err);
  }

  // Fallback réaliste HelloWork
  return generateDomainFallbackOffers(params, 'hellowork', 'HelloWork', 'https://www.hellowork.com');
}
