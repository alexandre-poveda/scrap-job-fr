/**
 * profile-parser.ts — Ingestion et analyse de CV / Profils (LinkedIn, France Travail, PDF, Texte)
 * Utilise unpdf pour un support 100% universel (Node, Cloudflare Workers, Edge) sans dépendance Node fs.
 */

import { extractSkills } from '../career-ops/skill-extract.ts';
import type { UserProfile } from '../types.ts';
import { extractText } from 'unpdf';

export const DEFAULT_PROFILE: UserProfile = {
  name: 'Alexandre Dupont',
  title: 'Chargé de communication',
  summary: 'Professionnel de la communication et du marketing digital. Recherche activement un CDI, CDD ou mission dans un environnement stimulant.',
  skills: [
    'Communication digitale',
    'Stratégie de communication',
    'Réseaux sociaux / Community Management',
    'Relations presse & médias',
    'Événementiel & Organisation',
    'Canva',
    'Suite Adobe Creative',
    'Pack Office',
    'Rédaction web & SEO',
    'Gestion de projet',
  ],
  experienceYears: 3,
  preferredLocations: ['Bouches-du-Rhône (13)', 'PACA', 'Marseille (13)', 'Télétravail'],
  preferredContracts: ['CDI', 'CDD'],
  blacklistedKeywords: ['alternance', 'stage', 'benevolat', 'commercial porte a porte'],
  minimumScoreThreshold: 3.5,
};

/**
 * Extrait un profil utilisateur à partir d'un texte brut de CV ou d'export.
 */
export function parseProfileFromText(rawText: string, sourceHint: 'cv' | 'linkedin' | 'france_travail' = 'cv'): Partial<UserProfile> {
  const extractedSkills = extractSkills(rawText);

  // Détection basique du titre si présent en première ligne ou entête
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  let inferredTitle = '';
  let inferredName = '';

  if (lines.length > 0) {
    // Si la 1ère ligne est courte, souvent le nom
    if (lines[0].length < 40 && !lines[0].toLowerCase().includes('cv') && !lines[0].toLowerCase().includes('curriculum')) {
      inferredName = lines[0];
    }
    // La 2ème ou 3ème ligne est souvent le titre du poste
    for (let i = 1; i < Math.min(lines.length, 6); i++) {
      if (lines[i].length < 60 && !lines[i].includes('@') && !lines[i].includes('http')) {
        inferredTitle = lines[i];
        break;
      }
    }
  }

  // Détection des années d'expérience (ex: "5 ans d'expérience", "3 ans d'exp")
  let experienceYears = 3;
  const expMatch = rawText.match(/(\d+)\s*(?:ans|années)\s*(?:d'expérience|d'exp)/i);
  if (expMatch && expMatch[1]) {
    experienceYears = parseInt(expMatch[1], 10);
  }

  return {
    name: inferredName || undefined,
    title: inferredTitle || undefined,
    skills: extractedSkills,
    experienceYears,
    cvRawText: rawText,
  };
}

/**
 * Parse un buffer PDF pour en extraire le texte brut via unpdf (Cloudflare & Edge compatible).
 */
export async function parsePdfBuffer(buffer: Uint8Array | ArrayBuffer): Promise<string> {
  try {
    const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const result = await extractText(data, { mergePages: true });
    const text = result?.text;
    if (typeof text === 'string') {
      return text;
    }
    if (Array.isArray(text)) {
      return text.join('\n');
    }
    return String(text || '');
  } catch (err: any) {
    console.error('Erreur lors du parsing PDF unpdf:', err);
    throw new Error('Impossible de lire le fichier PDF. Assurez-vous qu\'il contient du texte sélectionnable.');
  }
}
