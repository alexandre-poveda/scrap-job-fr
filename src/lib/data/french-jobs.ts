/**
 * french-jobs.ts — Référentiel des métiers & intitulés de postes courants en France
 * Permet l'autocomplétion intelligente dès la saisie de quelques lettres (ex: "charge" -> "Chargé de communication").
 */

export const POPULAR_FRENCH_JOBS: string[] = [
  // Communication, Marketing & Médias
  'Chargé de communication',
  'Chargé de communication digitale',
  'Chargé de marketing',
  'Chargé de projets événementiels',
  'Chargé de relations publiques',
  'Responsable communication',
  'Social Media Manager',
  'Community Manager',
  'Rédacteur web / Copywriter',
  'Graphiste / Designer graphique',
  'Directeur artistique',
  'Chef de projet marketing',

  // Ressources Humaines & Recrutement
  'Chargé de recrutement',
  'Chargé de mission RH',
  'Gestionnaire de paie',
  'Assistant ressources humaines (RH)',
  'Responsable ressources humaines (RRH)',
  'Talent Acquisition Specialist',
  'Consultant en recrutement',

  // Administratif, Gestion & Direction
  'Chargé de mission',
  'Chargé d\'affaires',
  'Chargé d\'études',
  'Assistant administratif',
  'Assistant de direction',
  'Office Manager',
  'Secrétaire médical(e)',
  'Gestionnaire administratif',

  // Tech, Web & Informatique
  'Développeur Full-Stack',
  'Développeur Front-End (React / Vue)',
  'Développeur Back-End (Node.js / Python / Java)',
  'Développeur Web & Mobile',
  'Développeur TypeScript',
  'Développeur Python',
  'Développeur PHP / Symfony / Laravel',
  'Développeur Java / Spring',
  'Ingénieur DevOps / Cloud (AWS / Azure)',
  'Administrateur systèmes et réseaux',
  'Technicien support informatique',
  'Chef de projet informatique (AMOA / MOE)',
  'Product Manager / Product Owner',
  'UX / UI Designer',
  'Data Analyst',
  'Data Scientist',
  'Ingénieur Machine Learning / IA',
  'Consultant Cybersécurité',

  // Commerce, Relation Client & Vente
  'Chargé de clientèle',
  'Conseiller relation client',
  'Commercial sédentaire',
  'Commercial terrain (B2B / B2C)',
  'Business Developer',
  'Account Manager',
  'Téléconseiller / Télévendeur',
  'Chef de rayon / Responsable de magasin',

  // Comptabilité, Finance & Juridique
  'Comptable général',
  'Comptable fournisseurs / clients',
  'Assistant comptable',
  'Contrôleur de gestion',
  'Auditeur financier',
  'Juriste d\'entreprise / Droit des affaires',

  // Logistique, Industrie & Transport
  'Responsable logistique',
  'Gestionnaire des stocks',
  'Agent logistique',
  'Conducteur de travaux',
  'Ingénieur méthodes / production',
  'Technicien de maintenance industrielle',

  // Fonction Publique & Collectivités
  'Rédacteur territorial',
  'Attaché territorial',
  'Ingénieur territorial',
  'Chef de projet transition écologique',
  'Agent d\'accueil et d\'état civil',
];

export function searchJobSuggestions(input: string, limit = 8): string[] {
  if (!input || input.trim().length < 2) return [];
  const query = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  return POPULAR_FRENCH_JOBS.filter((job) => {
    const jobNorm = job
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return jobNorm.includes(query);
  }).slice(0, limit);
}
