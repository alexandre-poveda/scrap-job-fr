export type ContractType =
  | 'CDI'
  | 'CDD'
  | 'Interim'
  | 'FonctionPublique'
  | 'Stage'
  | 'Alternance'
  | 'Autre';

export type JobSourceId =
  | 'france_travail'
  | 'indeed'
  | 'hugodecrypte'
  | 'manpower'
  | 'tertio_rh'
  | 'hellowork'
  | 'goodjob'
  | 'lejobadequat'
  | 'emploi_territorial';

export interface JobSourceInfo {
  id: JobSourceId;
  name: string;
  baseUrl: string;
  color: string;
  description: string;
}

export interface ScoreBreakdown {
  score: number; // 1.0 to 5.0
  matchedSkills: string[];
  missingSkills: string[];
  blacklistedFound: string[];
  isExcluded: boolean;
  exclusionReason?: string;
  reasons: string[];
  highlight: string;
}

export interface JobOffer {
  id: string;
  title: string;
  company: string;
  location: string;
  contractType: ContractType;
  source: JobSourceId;
  url: string;
  datePosted?: string;
  salary?: string;
  description: string;
  extractedSkills: string[];
  score?: number;
  scoreBreakdown?: ScoreBreakdown;
}

export interface CandidateFile {
  id: string;
  name: string;
  type: 'cv' | 'cover_letter' | 'portfolio' | 'diploma' | 'other';
  size: string;
  dateAdded: string;
  content?: string;
}

export interface RecruiterFormAnswer {
  questionKey: string;
  label: string;
  category: 'motivation' | 'education' | 'social_media' | 'portfolio' | 'availability' | 'organization';
  answer: string;
}

export interface UserProfile {
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  title: string;
  summary: string;
  skills: string[];
  experienceYears?: number;
  preferredLocations: string[];
  preferredContracts: ContractType[];
  blacklistedKeywords: string[];
  minimumScoreThreshold: number; // e.g. 3.0
  cvRawText?: string;
  cvFileName?: string;
  defaultCoverLetter?: string;
  defaultPitch?: string;
  customFiles?: CandidateFile[];
  
  // Champs pour formulaires et questionnaires recruteurs
  schoolName?: string;
  degreeTitle?: string;
  availability?: string;
  onSiteCompatibility?: string;
  alternanceRhythm?: string;
  hasSocialMediaExperience?: boolean;
  socialMediaDetails?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  githubOrProjectsUrl?: string;
  digitalCommMotivation?: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  jobLocation: string;
  jobUrl: string;
  contractType: ContractType;
  source: JobSourceId;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  coverLetter: string;
  pitch: string;
  attachedFiles: string[];
  formAnswers?: RecruiterFormAnswer[];
  status: 'draft' | 'ready' | 'submitted';
  dateCreated: string;
}

export interface SearchFilterParams {
  query: string;
  location?: string;
  contractTypes?: ContractType[];
  sources?: JobSourceId[];
  minScore?: number;
  blacklistedKeywords?: string[];
  page?: number;
  limit?: number;
}
