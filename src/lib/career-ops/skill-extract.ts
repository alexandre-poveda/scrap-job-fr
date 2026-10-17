/**
 * skill-extract.ts — Vocabulaire de compétences & extraction canonique
 * Inspiré et étendu à partir de Career-Ops pour le marché francophone.
 */

// Normalisation des accents pour la recherche robuste
export function foldFrenchAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export const CANONICAL_SKILLS: Record<string, string> = {
  // Langages & Web
  'javascript': 'JavaScript',
  'js': 'JavaScript',
  'typescript': 'TypeScript',
  'ts': 'TypeScript',
  'python': 'Python',
  'py': 'Python',
  'php': 'PHP',
  'java': 'Java',
  'c++': 'C++',
  'cpp': 'C++',
  'c#': 'C#',
  'csharp': 'C#',
  '.net': '.NET',
  'dotnet': '.NET',
  'golang': 'Go',
  'go': 'Go',
  'rust': 'Rust',
  'ruby': 'Ruby',
  'sql': 'SQL',
  'html': 'HTML/CSS',
  'html5': 'HTML/CSS',
  'css': 'HTML/CSS',
  'css3': 'HTML/CSS',
  'sass': 'Sass',
  'tailwind': 'Tailwind CSS',
  'tailwindcss': 'Tailwind CSS',

  // Frameworks Frontend
  'react': 'React',
  'react.js': 'React',
  'reactjs': 'React',
  'react native': 'React Native',
  'vue': 'Vue.js',
  'vue.js': 'Vue.js',
  'vuejs': 'Vue.js',
  'angular': 'Angular',
  'angularjs': 'Angular',
  'svelte': 'Svelte',
  'next.js': 'Next.js',
  'nextjs': 'Next.js',
  'nuxt': 'Nuxt.js',
  'nuxt.js': 'Nuxt.js',
  'astro': 'Astro',

  // Backend & BDD
  'node': 'Node.js',
  'node.js': 'Node.js',
  'nodejs': 'Node.js',
  'express': 'Express',
  'express.js': 'Express',
  'nest': 'NestJS',
  'nestjs': 'NestJS',
  'fastapi': 'FastAPI',
  'django': 'Django',
  'flask': 'Flask',
  'symfony': 'Symfony',
  'laravel': 'Laravel',
  'spring': 'Spring Boot',
  'spring boot': 'Spring Boot',
  'postgresql': 'PostgreSQL',
  'postgres': 'PostgreSQL',
  'mysql': 'MySQL',
  'mariadb': 'MariaDB',
  'mongodb': 'MongoDB',
  'redis': 'Redis',
  'elasticsearch': 'Elasticsearch',

  // DevOps & Cloud
  'docker': 'Docker',
  'kubernetes': 'Kubernetes',
  'k8s': 'Kubernetes',
  'aws': 'AWS',
  'amazon web services': 'AWS',
  'azure': 'Azure',
  'gcp': 'Google Cloud (GCP)',
  'google cloud': 'Google Cloud (GCP)',
  'terraform': 'Terraform',
  'ansible': 'Ansible',
  'ci/cd': 'CI/CD',
  'cicd': 'CI/CD',
  'git': 'Git',
  'github actions': 'GitHub Actions',
  'gitlab ci': 'GitLab CI',
  'linux': 'Linux',

  // Data & IA
  'machine learning': 'Machine Learning',
  'deep learning': 'Deep Learning',
  'intelligence artificielle': 'Intelligence Artificielle',
  'ia': 'Intelligence Artificielle',
  'ai': 'Intelligence Artificielle',
  'llm': 'LLM / IA Générative',
  'rag': 'RAG',
  'langchain': 'LangChain',
  'nlp': 'NLP',
  'computer vision': 'Vision par ordinateur',
  'pandas': 'Pandas',
  'numpy': 'NumPy',
  'scikit-learn': 'Scikit-Learn',
  'pytorch': 'PyTorch',
  'tensorflow': 'TensorFlow',
  'power bi': 'Power BI',
  'powerbi': 'Power BI',
  'tableau': 'Tableau',
  'excel': 'Excel avancé',

  // Gestion, Produit & Agilité
  'agile': 'Méthode Agile',
  'scrum': 'Scrum',
  'kanban': 'Kanban',
  'jira': 'Jira',
  'gestion de projet': 'Gestion de projet',
  'product management': 'Product Management',
  'ux/ui': 'UX/UI Design',
  'figma': 'Figma',

  // Tertiaire / Administratif / Métiers FR
  'comptabilite': 'Comptabilité',
  'gestion financiere': 'Gestion financière',
  'paie': 'Gestion de la paie',
  'ressources humaines': 'Ressources Humaines (RH)',
  'recrutement': 'Recrutement',
  'droit du travail': 'Droit du travail',
  'relation client': 'Relation client / Support',
  'service client': 'Service client',
  'prospection': 'Prospection commerciale',
  'negociation': 'Négociation',
  'management': 'Management d\'équipe',
  'marches publics': 'Marchés publics',
  'administration publique': 'Administration publique',
  'collectivites territoriales': 'Collectivités territoriales',
};

/**
 * Extrait toutes les compétences reconnues dans un texte (CV ou offre d'emploi).
 */
export function extractSkills(text: string): string[] {
  if (!text) return [];

  const normalized = foldFrenchAccents(text);
  const matched = new Set<string>();

  // Trier les clés par longueur décroissante pour matcher les termes multi-mots d'abord
  const keys = Object.keys(CANONICAL_SKILLS).sort((a, b) => b.length - a.length);

  for (const key of keys) {
    const keyFolded = foldFrenchAccents(key);
    // Regex avec limites de mot ou caractères non-alphanumériques
    const escaped = keyFolded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[^a-z0-9_])${escaped}(?=[^a-z0-9_]|$)`, 'i');

    if (regex.test(normalized)) {
      matched.add(CANONICAL_SKILLS[key]);
    }
  }

  return Array.from(matched);
}
