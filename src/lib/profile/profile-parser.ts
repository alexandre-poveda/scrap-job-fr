/**
 * profile-parser.ts — Ingestion et analyse de CV / Profils (LinkedIn, France Travail, PDF, Texte)
 * Utilise unpdf pour un support 100% universel (Node, Cloudflare Workers, Edge) sans dépendance Node fs.
 */

import { extractSkills } from '../career-ops/skill-extract.ts';
import type { UserProfile } from '../types.ts';
import { extractText } from 'unpdf';

export const DEFAULT_PROFILE: UserProfile = {
  name: '',
  email: '',
  phone: '',
  city: '',
  title: '',
  summary: '',
  skills: [],
  experienceYears: 0,
  preferredLocations: [],
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
  cvFileName: undefined,
  defaultCoverLetter: `Madame, Monsieur,\n\nVivement intéressé(e) par votre opportunité de {poste} au sein de {entreprise}, je vous adresse ma candidature avec un réel enthousiasme.\n\nFort(e) de mes compétences en {competences_cles}, j'ai développé une solide expertise dans le déploiement de stratégies de communication percutantes et la valorisation de marque. La vision et les ambitions de {entreprise} à {ville} correspondent parfaitement à mon projet professionnel.\n\nRigoureux(se), autonome et force de proposition, je serais ravi(e) de vous exposer mes motivations lors d'un prochain échange.\n\nJe vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.\n\n{nom}`,
  defaultPitch: `Bonjour, je vous soumets ma candidature pour le poste de {poste} chez {entreprise}. Maîtrisant {competences_cles}, je suis disponible pour échanger sur vos objectifs et vous apporter mon savoir-faire à {ville}. Au plaisir d'un échange ! {nom} • {telephone}`,
  
  // Champs questionnaires formulaires recruteurs
  schoolName: '',
  degreeTitle: '',
  availability: 'Disponible immédiatement',
  onSiteCompatibility: 'Oui, mes conditions personnelles sont 100% compatibles avec une présence sur site.',
  alternanceRhythm: '0 (Non concerné) — Candidature pour un contrat à temps plein classique, sans alternance.',
  hasSocialMediaExperience: true,
  socialMediaDetails: '',
  portfolioUrl: '',
  linkedinUrl: '',
  githubOrProjectsUrl: '',
  digitalCommMotivation: 'Ce qui me donne envie de participer à la communication digitale de {entreprise}, c\'est l\'opportunité de valoriser vos projets, vos expertises et vos engagements grâce à des formats de contenus dynamiques, créatifs et engageants pour vos communautés.',
  customFiles: [],
};

// Termes qui ne doivent JAMAIS être considérés comme un nom de candidat
export const FORBIDDEN_NAME_WORDS = [
  'formation', 'formations', 'education', 'éducation', 'etudes', 'études',
  'experience', 'expérience', 'experiences', 'expériences',
  'competence', 'competences', 'compétence', 'compétences', 'skills',
  'profil', 'profile', 'resume', 'résumé', 'cv', 'curriculum', 'vitae',
  'contact', 'coordonnees', 'coordonnées', 'informations', 'infos',
  'langue', 'langues', 'certification', 'certifications', 'projets', 'projet',
  'centre', 'centres', 'interet', 'intérêt', 'interets', 'intérêts',
  'benevolat', 'bénévolat', 'recommandation', 'recommandations',
  'universite', 'université', 'ecole', 'école', 'school', 'diplome', 'diplôme',
  'licence', 'master', 'bachelor', 'doctorat', 'bts', 'dut',
  'linkedin', 'http', 'https', 'www', 'page', 'email', 'tel', 'telephone',
];

/**
 * Valide si une chaîne peut être un nom de personne plausible (et non un en-tête de section comme "Formation").
 */
export function isValidPersonName(candidate?: string): boolean {
  if (!candidate) return false;
  const trimmed = candidate.trim();
  if (trimmed.length < 2 || trimmed.length > 50) return false;
  
  const lower = trimmed.toLowerCase();
  if (FORBIDDEN_NAME_WORDS.some((w) => lower === w || lower.startsWith(`${w} `) || lower.endsWith(` ${w}`))) {
    return false;
  }
  // Ne doit pas contenir de chiffres, emails ou URL
  if (/\d/.test(trimmed) || trimmed.includes('@') || trimmed.includes('/') || trimmed.includes('.com') || trimmed.includes('www.')) {
    return false;
  }
  // Ne doit pas ressembler à une phrase ou une description
  if (trimmed.includes(':') || trimmed.includes(';') || trimmed.split(/\s+/).length > 5) {
    return false;
  }
  // Doit contenir des lettres
  return /[a-zA-ZÀ-ÿ]/.test(trimmed);
}

/**
 * Déduit le prénom et nom depuis le slug d'une URL LinkedIn
 * Ex: "https://www.linkedin.com/in/alexandre-poveda-905308264" -> "Alexandre Poveda"
 */
export function extractNameFromLinkedInUrl(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/linkedin\.com\/in\/([a-zA-Z0-9_\-\%]+)/i);
  if (!match || !match[1]) return null;
  
  let slug = decodeURIComponent(match[1]);
  // Nettoyer les hash / identifiants numériques de fin (ex: -905308264 ou -a1b2c3d4)
  slug = slug.replace(/[-_]\d{4,}[a-z0-9]*$/i, '');
  slug = slug.replace(/[-_][0-9a-f]{6,}$/i, '');
  
  const parts = slug.split(/[-_]+/).filter(Boolean);
  if (parts.length >= 2 && parts.every((p) => !FORBIDDEN_NAME_WORDS.includes(p.toLowerCase()))) {
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
  }
  return null;
}

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

  // 4. Détection du Nom (évite impérativement "Formation", "Expérience", etc.)
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const candidate = lines[i];
    if (isValidPersonName(candidate)) {
      result.name = candidate;
      break;
    }
  }

  // Si aucun nom valide trouvé dans les premières lignes, déduire depuis l'URL LinkedIn
  if (!result.name && result.linkedinUrl) {
    const nameFromSlug = extractNameFromLinkedInUrl(result.linkedinUrl);
    if (nameFromSlug) {
      result.name = nameFromSlug;
    }
  }

  // Détection du Titre de poste
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    if (
      line !== result.name &&
      line.length > 3 &&
      line.length < 80 &&
      !line.includes('@') &&
      !line.includes('http') &&
      !FORBIDDEN_NAME_WORDS.includes(lower)
    ) {
      result.title = line;
      break;
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

  if (!inferredName) {
    for (let i = 0; i < Math.min(lines.length, 6); i++) {
      if (isValidPersonName(lines[i])) {
        inferredName = lines[i];
        break;
      }
    }
  }

  if (!inferredName && linkedInData.linkedinUrl) {
    inferredName = extractNameFromLinkedInUrl(linkedInData.linkedinUrl) || '';
  }

  if (!inferredTitle) {
    for (let i = 0; i < Math.min(lines.length, 6); i++) {
      const line = lines[i];
      const lower = line.toLowerCase();
      if (line !== inferredName && line.length < 60 && !line.includes('@') && !line.includes('http') && !FORBIDDEN_NAME_WORDS.includes(lower)) {
        inferredTitle = line;
        break;
      }
    }
  }

  // Détection des années d'expérience (ex: "5 ans d'expérience", "3 ans d'exp")
  let experienceYears = 0;
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
