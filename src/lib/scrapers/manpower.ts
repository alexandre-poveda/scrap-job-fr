/**
 * manpower.ts — Scraper pour Manpower France (manpower.fr)
 */

import * as cheerio from 'cheerio';
import type { JobOffer, SearchFilterParams } from '../types.ts';
import { createJobOffer, fetchWithTimeout, normalizeContractType, generateDomainFallbackOffers } from './base.ts';

export async function scrapeManpower(params: SearchFilterParams): Promise<JobOffer[]> {
  const query = encodeURIComponent(params.query || 'developpeur');
  const location = encodeURIComponent(params.location || 'France');
  const url = `https://www.manpower.fr/candidats/recherche-d-offres/offres.html?keyword=${query}&location=${location}`;

  try {
    const res = await fetchWithTimeout(url);
    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);
      const results: JobOffer[] = [];

      $('.offer-item, .card-offer, article').each((_, el) => {
        const title = $(el).find('.title, h2, h3').text().trim();
        const company = $(el).find('.company').text().trim() || 'Client Manpower';
        const loc = $(el).find('.location, .place').text().trim() || params.location || 'France';
        const contractRaw = $(el).find('.contract, .tag-contract').text().trim() || 'Interim';
        const link = $(el).find('a').attr('href') || '';
        const desc = $(el).find('.desc, p').text().trim() || `Offre Manpower : ${title}.`;

        if (title) {
          results.push(
            createJobOffer({
              id: `mp-${Math.random().toString(36).substring(2, 9)}`,
              title,
              company,
              location: loc,
              contractType: normalizeContractType(contractRaw),
              source: 'manpower',
              url: link.startsWith('http') ? link : `https://www.manpower.fr${link}`,
              description: desc,
              datePosted: 'Cette semaine',
            })
          );
        }
      });

      if (results.length > 0) return results.slice(0, 10);
    }
  } catch (err) {
    console.warn('Manpower scrape fallback engaged:', err);
  }

  return [];
}
