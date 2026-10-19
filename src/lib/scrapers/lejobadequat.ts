/**
 * lejobadequat.ts — Scraper pour Le Job Adéquat (lejobadequat.com)
 */

import * as cheerio from 'cheerio';
import type { JobOffer, SearchFilterParams } from '../types.ts';
import { createJobOffer, fetchWithTimeout, normalizeContractType, generateDomainFallbackOffers } from './base.ts';

export async function scrapeLeJobAdequat(params: SearchFilterParams): Promise<JobOffer[]> {
  const query = encodeURIComponent(params.query || 'communication');
  const url = `https://www.lejobadequat.com/emplois?keyword=${query}`;

  try {
    const res = await fetchWithTimeout(url);
    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);
      const results: JobOffer[] = [];
      const seenUrls = new Set<string>();

      $('a[href*="/emplois/"]').each((_, a) => {
        const href = $(a).attr('href');
        if (!href || !/\/emplois\/\d+/.test(href)) return;

        const fullUrl = href.startsWith('http') ? href : `https://www.lejobadequat.com${href}`;
        if (seenUrls.has(fullUrl)) return;
        seenUrls.add(fullUrl);

        const text = $(a).text().replace(/\s+/g, ' ').trim();
        const idMatch = href.match(/\/emplois\/(\d+)/);
        const offerId = idMatch ? idMatch[1] : Math.random().toString(36).slice(2, 9);

        // Analyse du texte type "Secteur Réf : Z99-339249 Intitulé H/F CDI Ville"
        const refMatch = text.match(/Réf\s*:\s*[^\s]+\s+(.+?)\s+(CDI|CDD|Interim|Intérim|Stage|Alternance)\s+(.+)$/i);
        let title = '';
        let contractRaw = 'Interim';
        let loc = params.location || 'France';

        if (refMatch) {
          title = refMatch[1].trim();
          contractRaw = refMatch[2].trim();
          loc = refMatch[3].trim();
        } else {
          const hTitle = $(a).find('h2, h3, .title').text().trim();
          title = hTitle || text.split('Réf')[0].trim() || `${params.query || 'Poste'} (H/F)`;
        }

        const isArticle = /actualite|blog|minute|fournisseur officiel|gagner des places|arena/i.test(title);
        if (title && !isArticle) {
          results.push(
            createJobOffer({
              id: `adequat-${offerId}`,
              title,
              company: 'Groupe Adéquat',
              location: loc,
              contractType: normalizeContractType(`${contractRaw} ${title}`),
              source: 'lejobadequat',
              url: fullUrl,
              description: text || `Offre Le Job Adéquat pour ${title} à ${loc}.`,
              datePosted: 'Publiée récemment',
            })
          );
        }
      });

      if (results.length > 0) return results.slice(0, 15);
    }
  } catch (err) {
    console.warn('Le Job Adequat scrape error:', err);
  }

  return [];
}
