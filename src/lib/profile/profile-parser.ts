/**
 * profile-parser.ts — Ingestion et analyse de CV / Profils (LinkedIn, France Travail, PDF, Texte)
 * Utilise unpdf pour un support 100% universel (Node, Cloudflare Workers, Edge) sans dépendance Node fs.
 */

import { extractSkills } from '../career-ops/skill-extract.ts';
import type { UserProfile } from '../types.ts';
import { extractText } from 'unpdf';

export const DEFAULT_PROFILE: UserProfile = {
  name: 'Alexandre Dupont',
  email: 'alexandre.dupont@email.fr',
  phone: '06 12 34 56 78',
  city: 'Marseille (13)',
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
  blacklistedKeywords: [
    'alternance',
    'alternant',
    'alternante',
    'apprentissage',
    'apprenti',
    'apprentie',
    'contrat pro',
    'stage',
    'stagiaire',
    'tutrice',
    'tuteur',
    'benevolat',
  ],
  minimumScoreThreshold: 3.5,
  cvFileName: 'CV_Alexandre_Dupont_Communication.pdf',
  defaultCoverLetter: `Madame, Monsieur,\n\nVivement intéressé(e) par votre opportunité de {poste} au sein de {entreprise}, je vous adresse ma candidature avec un réel enthousiasme.\n\nFort(e) de mes compétences en {competences_cles}, j'ai développé une solide expertise dans le déploiement de stratégies de communication percutantes et la valorisation de marque. La vision et les ambitions de {entreprise} à {ville} correspondent parfaitement à mon projet professionnel.\n\nRigoureux(se), autonome et force de proposition, je serais ravi(e) de vous exposer mes motivations lors d'un prochain échange.\n\nJe vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.\n\n{nom}`,
  defaultPitch: `Bonjour, je vous soumets ma candidature pour le poste de {poste} chez {entreprise}. Maîtrisant {competences_cles}, je suis disponible pour échanger sur vos objectifs et vous apporter mon savoir-faire à {ville}. Au plaisir d'un échange ! {nom} • {telephone}`,
  
  // Champs questionnaires formulaires recruteurs
  schoolName: 'Université d\'Aix-Marseille',
  degreeTitle: 'Master Information, Communication & Médias Numériques',
  availability: 'Disponible immédiatement',
  onSiteCompatibility: 'Oui, mes conditions personnelles sont 100% compatibles avec une présence sur site.',
  alternanceRhythm: '0 (Non concerné) — Candidature pour un contrat à temps plein classique, sans alternance.',
  hasSocialMediaExperience: true,
  socialMediaDetails: 'Oui. Création régulière de contenus éditoriaux, visuels et vidéos (Reels, TikTok, LinkedIn, Instagram, Facebook). Conception sur Canva / Photoshop / Illustrator et montage Premiere Pro / CapCut.',
  portfolioUrl: 'https://mon-portfolio-communication.fr',
  linkedinUrl: 'https://www.linkedin.com/in/alexandre-dupont',
  githubOrProjectsUrl: 'https://drive.google.com/drive/folders/mes-realisations-com',
  digitalCommMotivation: 'Ce qui me donne envie de participer à la communication digitale de {entreprise}, c\'est l\'opportunité de valoriser vos projets, vos expertises et vos engagements grâce à des formats de contenus dynamiques, créatifs et engageants pour vos communautés.',
  
  customFiles: [
    {
      id: 'file-cv-1',
      name: 'CV_Alexandre_Dupont_Communication.pdf',
      type: 'cv',
      size: '142 Ko',
      dateAdded: '17 Octobre 2026',
    },
    {
      id: 'file-lettre-1',
      name: 'Lettre_Motivation_Type_2026.pdf',
      type: 'cover_letter',
      size: '98 Ko',
      dateAdded: '17 Octobre 2026',
    },
  ],
};

/**
 * Extrait les informations d'un profil LinkedIn (depuis export PDF ou copier-coller texte).
 */
export function extractLinkedInData(text: string): Partial<UserProfile> {
  const result: Partial<UserProfile> = {};

  // 1. Détection de l'URL LinkedIn
  const linkedinMatch =
    text.match(/https?:\/\/(?:[a-zA-Z0-9-]+\.)?linkedin\.com\/in\/[a-zA-Z0-9_\-\%]+/i) ||
    text.match(/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_\-\%]+/i);
  if (linkedinMatch) {
    const rawUrl = linkedinMatch[0];
    result.linkedinUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
  }

  // 2. Détection email & téléphone
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) result.email = emailMatch[0];

  const phoneMatch = text.match(/(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/);
  if (phoneMatch) result.phone = phoneMatch[0].replace(/\s+/g, ' ');

  // 3. Détection de la Formation (École & Intitulé de diplôme)
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const cleanLine = (str: string) => str.replace(/\s*·?\s*\(?\d{4}.*$/, '').trim();

  const degreeKeywords = [
    'master', 'licence', 'bachelor', 'doctorat', 'bts', 'dut', 'mba', 'ingénieur', 'ingenieur',
    'magistère', 'titre certifié', 'titre professionnel', 'rncp', 'bac \+\d', 'deug', 'diplôme', 'diplome',
    "master's", "bachelor's", 'degree', 'phd', 'graduate'
  ];

  const schoolKeywords = [
    'université', 'universite', 'university', 'école', 'ecole', 'school', 'institut', 'institute',
    'lycée', 'lycee', 'business school', 'sciences po', 'polytechnique', 'iut', 'iae', 'efap', 'iscom',
    'kedge', 'audencia', 'neoma', 'skema', 'epitech', 'supinfo', 'campus', 'faculté', 'faculte',
    'essec', 'hec', 'edhec', 'college'
  ];

  const formationIdx = lines.findIndex((l) =>
    /^(?:formation|formations|éducation|education|études|etudes)\b/i.test(l)
  );

  if (formationIdx !== -1) {
    const end = Math.min(lines.length, formationIdx + 12);
    for (let i = formationIdx + 1; i < end; i++) {
      const line = lines[i];
      const lower = line.toLowerCase();

      if (/^(?:expérience|experience|compétences|competences|langues|certifications|projets)\b/i.test(line)) {
        break;
      }
      if (/^\d{4}\s*[-–—]/i.test(line) || /^\d{4}$/.test(line)) continue;

      if (!result.schoolName && schoolKeywords.some((k) => lower.includes(k))) {
        result.schoolName = cleanLine(line);
      } else if (!result.degreeTitle && degreeKeywords.some((k) => lower.includes(k))) {
        result.degreeTitle = cleanLine(line);
      } else if (!result.schoolName && line.length > 3 && line.length < 80) {
        result.schoolName = cleanLine(line);
      } else if (result.schoolName && !result.degreeTitle && line.length > 3 && line.length < 100) {
        result.degreeTitle = cleanLine(line);
      }
    }
  }

  // Si non trouvé dans la section formation, scanner tout le texte
  if (!result.schoolName || !result.degreeTitle) {
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (!result.schoolName && schoolKeywords.some((k) => lower.includes(k)) && line.length < 80) {
        result.schoolName = cleanLine(line);
      }
      if (!result.degreeTitle && degreeKeywords.some((k) => lower.includes(k)) && line.length < 100) {
        result.degreeTitle = cleanLine(line);
      }
    }
  }

  // 4. Détection du Titre et du Nom
  if (lines.length > 0) {
    if (lines[0].length < 40 && !lines[0].toLowerCase().includes('linkedin') && !lines[0].toLowerCase().includes('contact')) {
      result.name = lines[0];
    }
    for (let i = 1; i < Math.min(lines.length, 6); i++) {
      if (lines[i].length < 80 && !lines[i].includes('@') && !lines[i].includes('linkedin') && !lines[i].includes('http')) {
        result.title = lines[i];
        break;
      }
    }
  }

  // 5. Détection de la ville / zone
  for (const line of lines.slice(0, 15)) {
    if (/marseille|paris|lyon|bordeaux|toulouse|nantes|nice|strasbourg|lille|montpellier|rennes|aix|paca|bouches-du-rhône/i.test(line)) {
      result.city = line;
      break;
    }
  }

  // 6. Section "Infos" ou "Résumé"
  const summaryIdx = lines.findIndex((l) => /^(?:infos|résumé|resume|summary|à propos|a propos)\b/i.test(l));
  if (summaryIdx !== -1 && lines[summaryIdx + 1]) {
    const summaryLines: string[] = [];
    for (let i = summaryIdx + 1; i < Math.min(lines.length, summaryIdx + 6); i++) {
      if (/^(?:expérience|experience|formation|compétences|activités)\b/i.test(lines[i])) break;
      summaryLines.push(lines[i]);
    }
    if (summaryLines.length > 0) {
      result.summary = summaryLines.join(' ');
    }
  }

  // 7. Compétences
  result.skills = extractSkills(text);

  return result;
}

/**
 * Extrait un profil utilisateur à partir d'un texte brut de CV ou d'export.
 */
export function parseProfileFromText(rawText: string, sourceHint: 'cv' | 'linkedin' | 'france_travail' = 'cv'): Partial<UserProfile> {
  const extractedSkills = extractSkills(rawText);

  // Si c'est un profil LinkedIn ou que le texte contient du LinkedIn
  if (sourceHint === 'linkedin' || rawText.includes('linkedin.com')) {
    const linkedInData = extractLinkedInData(rawText);
    return {
      ...linkedInData,
      cvRawText: rawText,
    };
  }

  // Extraction standard pour CV et autres formats
  const linkedInData = extractLinkedInData(rawText);
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

  let inferredTitle = linkedInData.title || '';
  let inferredName = linkedInData.name || '';

  if (lines.length > 0 && !inferredName) {
    if (lines[0].length < 40 && !lines[0].toLowerCase().includes('cv') && !lines[0].toLowerCase().includes('curriculum')) {
      inferredName = lines[0];
    }
  }

  if (!inferredTitle) {
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
    email: linkedInData.email,
    phone: linkedInData.phone,
    city: linkedInData.city,
    schoolName: linkedInData.schoolName,
    degreeTitle: linkedInData.degreeTitle,
    linkedinUrl: linkedInData.linkedinUrl,
    summary: linkedInData.summary,
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
