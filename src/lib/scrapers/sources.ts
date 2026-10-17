import type { JobSourceId, JobSourceInfo } from '../types.ts';

export const JOB_SOURCES: Record<JobSourceId, JobSourceInfo> = {
  france_travail: {
    id: 'france_travail',
    name: 'France Travail',
    baseUrl: 'https://candidat.francetravail.fr',
    color: '#002B7F',
    description: 'Premier opérateur public de l\'emploi en France (ex-Pôle Emploi)',
  },
  indeed: {
    id: 'indeed',
    name: 'Indeed France',
    baseUrl: 'https://fr.indeed.com',
    color: '#2164f3',
    description: 'Agrégateur mondial leader d\'offres d\'emploi',
  },
  hugodecrypte: {
    id: 'hugodecrypte',
    name: 'HugoDécrypte Jobs',
    baseUrl: 'https://jobs.hugodecrypte.com',
    color: '#E63946',
    description: 'Portail de recrutement pour les jeunes actifs et nouveaux diplômés',
  },
  hellowork: {
    id: 'hellowork',
    name: 'HelloWork',
    baseUrl: 'https://www.hellowork.com',
    color: '#FF6B00',
    description: 'Plateforme majeure d\'emploi en France (RégionsJob, ParisJob)',
  },
  manpower: {
    id: 'manpower',
    name: 'Manpower',
    baseUrl: 'https://www.manpower.fr',
    color: '#008752',
    description: 'Spécialiste du recrutement CDI, CDD et travail temporaire',
  },
  tertio_rh: {
    id: 'tertio_rh',
    name: 'Tertio RH',
    baseUrl: 'https://www.tertio-rh.com',
    color: '#4B3F72',
    description: 'Cabinet de recrutement spécialisé dans les métiers tertiaires & cadres',
  },
  goodjob: {
    id: 'goodjob',
    name: 'GoodJob',
    baseUrl: 'https://www.goodjob.com',
    color: '#118AB2',
    description: 'Agence d\'emploi et d\'intérim digitalisée',
  },
  lejobadequat: {
    id: 'lejobadequat',
    name: 'Le Job Adéquat',
    baseUrl: 'https://www.lejobadequat.com',
    color: '#06D6A0',
    description: 'Groupe Adéquat : Intérim, CDD et CDI partout en France',
  },
  emploi_territorial: {
    id: 'emploi_territorial',
    name: 'Emploi Territorial',
    baseUrl: 'https://www.emploi-territorial.fr',
    color: '#004E89',
    description: 'Portail officiel des concours et recrutements de la Fonction Publique Territoriale',
  },
};
