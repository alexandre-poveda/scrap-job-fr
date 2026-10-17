import type { APIRoute } from 'astro';
import { parsePdfBuffer, parseProfileFromText } from '@/lib/profile/profile-parser.ts';

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

      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const isPdf =
        file.name.toLowerCase().endsWith('.pdf') ||
        file.type === 'application/pdf' ||
        (uint8.length >= 4 && uint8[0] === 0x25 && uint8[1] === 0x50 && uint8[2] === 0x44 && uint8[3] === 0x46); // %PDF

      if (isPdf) {
        rawText = await parsePdfBuffer(uint8);
      } else {
        const decoder = new TextDecoder('utf-8');
        rawText = decoder.decode(uint8);
      }
    } else {
      const json = await request.json();
      rawText = json.text || '';
      sourceHint = json.type || 'cv';
    }

    if (!rawText.trim()) {
      return new Response(
        JSON.stringify({
          error: 'Le fichier ne contient pas de texte détectable. Si votre CV est une image scannée, exportez-le depuis Word ou Canva en PDF standard avec texte sélectionnable.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const parsedProfile = parseProfileFromText(rawText, sourceHint);

    return new Response(
      JSON.stringify({
        success: true,
        profile: parsedProfile,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Erreur API parse-cv:', err);
    return new Response(
      JSON.stringify({
        error: err.message || 'Erreur lors de la lecture du fichier PDF.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
