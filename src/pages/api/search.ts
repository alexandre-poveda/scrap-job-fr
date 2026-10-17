import type { APIRoute } from 'astro';
import { aggregateJobs } from '@/lib/scrapers/aggregator';
import { evaluateJobOffer, rankAndFilterJobOffers } from '@/lib/career-ops/scoring-engine';
import { DEFAULT_PROFILE } from '@/lib/profile/profile-parser';
import type { JobOffer, SearchFilterParams, UserProfile } from '@/lib/types';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const searchParams: SearchFilterParams = {
      query: body.query || 'Développeur',
      location: body.location || '',
      contractTypes: body.contractTypes || [],
      sources: body.sources || [],
      minScore: body.minScore !== undefined ? body.minScore : 3.0,
      blacklistedKeywords: body.blacklistedKeywords || [],
    };

    const userProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      ...(body.profile || {}),
      preferredLocations: body.location
        ? Array.from(new Set([body.location, ...(body.profile?.preferredLocations || DEFAULT_PROFILE.preferredLocations)]))
        : (body.profile?.preferredLocations || DEFAULT_PROFILE.preferredLocations),
      preferredContracts: (body.contractTypes && body.contractTypes.length > 0)
        ? body.contractTypes
        : (body.profile?.preferredContracts || DEFAULT_PROFILE.preferredContracts),
      blacklistedKeywords: [
        ...(body.profile?.blacklistedKeywords || DEFAULT_PROFILE.blacklistedKeywords),
        ...(body.blacklistedKeywords || []),
      ],
      minimumScoreThreshold: searchParams.minScore || 3.0,
    };

    // 1. Agréger les offres depuis les portails sélectionnés
    const rawJobs = await aggregateJobs(searchParams);

    // 2. Évaluation détaillée de chaque offre
    let blacklistedCount = 0;
    let belowThresholdCount = 0;

    const evaluatedAll = rawJobs.map((job) => {
      const breakdown = evaluateJobOffer(job, userProfile);
      if (breakdown.blacklistedFound.length > 0 || (breakdown.isExcluded && breakdown.score === 1.0)) {
        blacklistedCount++;
      } else if (breakdown.score < userProfile.minimumScoreThreshold) {
        belowThresholdCount++;
      }
      return {
        ...job,
        score: breakdown.score,
        scoreBreakdown: breakdown,
      };
    });

    // 3. Ne garder que les meilleures offres (non exclues et >= seuil)
    const validJobs = evaluatedAll
      .filter((j) => !j.scoreBreakdown?.isExcluded)
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    return new Response(
      JSON.stringify({
        success: true,
        jobs: validJobs,
        stats: {
          totalScanned: rawJobs.length,
          retained: validJobs.length,
          blacklistedExcluded: blacklistedCount,
          belowThresholdExcluded: belowThresholdCount,
          sourcesQueried: searchParams.sources?.length || 9,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Erreur API search:', err);
    return new Response(JSON.stringify({ error: err.message || 'Erreur lors de la recherche et du scoring' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
