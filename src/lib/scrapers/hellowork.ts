/**
 * hellowork.ts — Scraper pour HelloWork (hellowork.com)
 */

import * as cheerio from 'cheerio';
import type { JobOffer, SearchFilterParams } from '../types.ts';
import { createJobOffer, fetchWithTimeout, normalizeContractType, generateDomainFallbackOffers } from './base.ts';

export async function scrapeHelloWork(params: SearchFilterParams): Promise<JobOffer[]> {
  const query = encodeURIComponent(params.query || 'Chargé de communication');
  const location = encodeURIComponent(params.location?.replace(/[()]/g, '').trim() || 'Bouches-du-Rhone');
  const url = `https://www.hellowork.com/fr-fr/emploi/recherche.html?k=${query}&l=${location}`;

  try {
    const res = await fetchWithTimeout(url);
    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);
      const results: JobOffer[] = [];
      const seenUrls = new Set<string>();

      $('a[href*="/emplois/"]').each((_, a) => {
        const href = $(a).attr('href');
        if (!href || !/\/emplois\/\d+\.html/.test(href)) return;

        const fullUrl = href.startsWith('http') ? href : `https://www.hellowork.com${href}`;
        if (seenUrls.has(fullUrl)) return;
        seenUrls.add(fullUrl);

        const li = $(a).closest('li');

        // Titre propre (sans le nom d'entreprise inclus dans le sous-élément)
        const titleEl = $(a).find('p[class*="typo-l"], p[class*="typo-xl"], h3').first();
        let title = titleEl.text().trim();
        if (!title) {
          const rawLines = $(a).text().trim().split('\n').map((s) => s.trim()).filter(Boolean);
          title = rawLines[0] || params.query || 'Chargé de communication';
        }
        title = title.split('\n')[0].trim();

        // Entreprise
        const companyEl = $(a).find('p[class*="typo-s"], [data-cy="company-name"]').first();
        let company = companyEl.text().trim();
        if (!company) {
          const rawLines = $(a).text().trim().split('\n').map((s) => s.trim()).filter(Boolean);
          company = rawLines[1] || 'Recruteur HelloWork';
        }

        // Tags & Métadonnées
        const tags = li.find('[class*="tag-secondary"]').map((_, el) => $(el).text().trim()).get();
        const loc = tags.find((t) => /\d{2}|Marseille|Aix|Bouches|Paris|Lyon/i.test(t)) || params.location || 'Bouches-du-Rhône (13)';
        const rawContract = tags.find((t) => /CDI|CDD|Intérim|Alternance|Stage|Freelance/i.test(t)) || 'CDI';
        const salary = tags.find((t) => /€|k€/i.test(t)) || undefined;
        const dateText = li.find('[class*="text-grey-500"]').text().trim() || 'Publiée récemment';

        const offerId = href.match(/\/(\d+)\.html/)?.[1] || Math.random().toString(36).slice(2, 9);

        if (title) {
          results.push(
            createJobOffer({
              id: `hw-${offerId}`,
              title,
              company,
              location: loc,
              contractType: normalizeContractType(`${rawContract} ${title}`),
              source: 'hellowork',
              url: fullUrl,
              salary,
              description: `Offre HelloWork : ${title} chez ${company} (${loc}). Contrat : ${rawContract}. ${tags.join(' • ')}`,
              datePosted: dateText,
            })
          );
        }
      });

      if (results.length > 0) return results.slice(0, 15);
    }
  } catch (err) {
    console.warn('HelloWork scrape error:', err);
  }

  return [];
}
