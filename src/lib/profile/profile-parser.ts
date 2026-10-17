/**
 * profile-parser.ts — Ingestion et analyse de CV / Profils (LinkedIn, France Travail, PDF, Texte)
 */

import { extractSkills } from '../career-ops/skill-extract';
import type { UserProfile } from '../types';

export const DEFAULT_PROFILE: UserProfile = {
  name: 'Alexandre Dupont',
  title: 'Développeur Full-Stack & Solutions',
  summary: 'Développeur passionné par TypeScript, React, Astro et les architectures cloud modernes. Recherche activement un CDI ou CDD dans un environnement stimulant.',
  skills: [
    'TypeScript',
    'JavaScript',
    'React',
    'Node.js',
    'Tailwind CSS',
    'PostgreSQL',
    'Docker',
    'Git',
    'Méthode Agile',
    'API REST',
  ],
  experienceYears: 4,
  preferredLocations: ['Paris', 'Île-de-France', 'Télétravail', 'Lyon', 'Nantes'],
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
    for (let i = 1; i < Math.min(lines.length, 5); i++) {
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
 * Parse un buffer PDF pour en extraire le texte brut.
 */
export async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  try {
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = pdfParseModule.default || pdfParseModule;
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (err) {
    console.error('Erreur lors du parsing PDF:', err);
    throw new Error('Impossible de lire le fichier PDF. Assurez-vous qu\'il contient du texte sélectionnable.');
  }
}
