import type { APIRoute } from 'astro';
import { JOB_SOURCES } from '@/lib/scrapers/sources';

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify(Object.values(JOB_SOURCES)), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
