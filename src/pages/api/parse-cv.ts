import type { APIRoute } from 'astro';
import { parsePdfBuffer, parseProfileFromText } from '@/lib/profile/profile-parser';

export const POST: APIRoute = async ({ request }) => {
  try {
    const contentType = request.headers.get('content-type') || '';

    let rawText = '';
    let sourceHint: 'cv' | 'linkedin' | 'france_travail' = 'cv';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const typeField = (formData.get('type') as string) || 'cv';
      sourceHint = typeField as any;

      if (!file) {
        return new Response(JSON.stringify({ error: 'Aucun fichier transmis' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        rawText = await parsePdfBuffer(buffer);
      } else {
        // Fichier texte brut / markdown / export
        rawText = buffer.toString('utf-8');
      }
    } else {
      const json = await request.json();
      rawText = json.text || '';
      sourceHint = json.type || 'cv';
    }

    if (!rawText.trim()) {
      return new Response(JSON.stringify({ error: 'Le contenu du CV ou profil est vide ou illisible' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const parsedProfile = parseProfileFromText(rawText, sourceHint);

    return new Response(JSON.stringify({ success: true, profile: parsedProfile }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Erreur API parse-cv:', err);
    return new Response(JSON.stringify({ error: err.message || 'Erreur interne lors de l\'analyse du CV' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
