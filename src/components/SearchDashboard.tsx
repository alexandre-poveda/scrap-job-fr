import React, { useState, useEffect, useRef } from 'react';
import type { JobOffer, JobSourceId, ContractType, UserProfile, JobApplication } from '../lib/types.ts';
import { DEFAULT_PROFILE, isValidPersonName, extractNameFromLinkedInUrl } from '../lib/profile/profile-parser.ts';
import { JOB_SOURCES } from '../lib/scrapers/sources.ts';
import { searchJobSuggestions } from '../lib/data/french-jobs.ts';
import { searchLocationSuggestions, POPULAR_FRENCH_LOCATIONS } from '../lib/data/french-locations.ts';
import { executeLocalSearch } from '../lib/scrapers/local-search.ts';
import { ProfileModal } from './ProfileModal';
import { ScoreDetailModal } from './ScoreDetailModal';
import { ApplicationModal } from './ApplicationModal';
import { ProfileTab } from './ProfileTab';
import { generateTailoredCoverLetter, generateRecruiterFormAnswers } from '../lib/career-ops/application-helper.ts';
import {
  Search,
  MapPin,
  Sparkles,
  ShieldAlert,
  SlidersHorizontal,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Building2,
  Layers,
  CheckCircle,
  User,
  Send,
  FileCheck,
  Copy,
  Check,
  Trash2,
  Calendar,
  Clock,
  Download,
  CheckSquare,
  XCircle,
} from 'lucide-react';

const CONTRACT_TYPES: { id: ContractType; label: string }[] = [
  { id: 'CDI', label: 'CDI' },
  { id: 'CDD', label: 'CDD' },
  { id: 'Interim', label: 'Intérim' },
  { id: 'FonctionPublique', label: 'Fonction Publique (Mairie, Collectivités)' },
];

export const SearchDashboard: React.FC = () => {
  // Onglet actif : recherche, profil complet, ou historique candidatures
  const [activeTab, setActiveTab] = useState<'search' | 'profile' | 'applications'>('search');

  // Profil utilisateur (persisté en localStorage)
  const [profile, setProfile] = useState<UserProfile>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('career_ops_profile');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed) {
            // Auto-heal si l'utilisateur avait enregistré "Formation" ou un en-tête comme nom
            if (!isValidPersonName(parsed.name) || parsed.name.toLowerCase() === 'formation') {
              const nameFromSlug = extractNameFromLinkedInUrl(parsed.linkedinUrl);
              parsed.name = nameFromSlug || '';
            }
          }
          return { ...DEFAULT_PROFILE, ...parsed };
        } catch {
          // ignore
        }
      }
    }
    return DEFAULT_PROFILE;
  });

  // Historique des candidatures générées (persisté en localStorage)
  const [savedApplications, setSavedApplications] = useState<JobApplication[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('career_ops_applications');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return [];
  });

  // Formulaire de recherche
  const [query, setQuery] = useState('Chargé de communication');
  const [location, setLocation] = useState('Bouches-du-Rhône (13)');
  const [selectedContracts, setSelectedContracts] = useState<ContractType[]>(['CDI', 'CDD']);
  const [selectedSources, setSelectedSources] = useState<JobSourceId[]>(
    Object.keys(JOB_SOURCES) as JobSourceId[]
  );
  const [minScore, setMinScore] = useState<number>(3.5);

  // Autocomplétion intelligente
  const [querySuggestions, setQuerySuggestions] = useState<string[]>([]);
  const [isQueryFocused, setIsQueryFocused] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [isLocationFocused, setIsLocationFocused] = useState(false);

  // Modales
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<JobOffer | null>(null);
  const [applicationJob, setApplicationJob] = useState<JobOffer | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownload = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // État de dépliage des cartes dans l'onglet Candidatures
  const [expandedAppIds, setExpandedAppIds] = useState<Record<string, boolean>>({});

  const toggleAppExpand = (appId: string) => {
    setExpandedAppIds((prev) => ({
      ...prev,
      [appId]: !prev[appId],
    }));
  };

  const expandAllApps = () => {
    const allExpanded: Record<string, boolean> = {};
    savedApplications.forEach((a) => {
      allExpanded[a.id] = true;
    });
    setExpandedAppIds(allExpanded);
  };

  const collapseAllApps = () => {
    setExpandedAppIds({});
  };

  // Helper pour savoir si une offre a déjà été postulée
  const getAppliedApplication = (job: JobOffer) => {
    return savedApplications.find(
      (app) =>
        app.jobId === job.id ||
        (app.jobTitle.trim().toLowerCase() === job.title.trim().toLowerCase() &&
          app.company.trim().toLowerCase() === job.company.trim().toLowerCase() &&
          app.source === job.source)
    );
  };

  const handleSaveApplication = (newApp: JobApplication) => {
    setSavedApplications((prev) => {
      const existing = prev.filter(
        (a) =>
          a.id !== newApp.id &&
          a.jobId !== newApp.jobId &&
          !(
            a.jobTitle.trim().toLowerCase() === newApp.jobTitle.trim().toLowerCase() &&
            a.company.trim().toLowerCase() === newApp.company.trim().toLowerCase() &&
            a.source === newApp.source
          )
      );
      const updated = [newApp, ...existing];
      if (typeof window !== 'undefined') {
        localStorage.setItem('career_ops_applications', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleUnapplyJob = (job: JobOffer) => {
    setSavedApplications((prev) => {
      const updated = prev.filter(
        (a) =>
          a.jobId !== job.id &&
          !(
            a.jobTitle.trim().toLowerCase() === job.title.trim().toLowerCase() &&
            a.company.trim().toLowerCase() === job.company.trim().toLowerCase() &&
            a.source === job.source
          )
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem('career_ops_applications', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleQuickApply = (job: JobOffer) => {
    const generated = generateTailoredCoverLetter(profile, job);
    const newApp: JobApplication = {
      id: `app-${Date.now()}`,
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      jobLocation: job.location,
      jobUrl: job.url,
      contractType: job.contractType,
      source: job.source,
      candidateName: profile.name || 'Candidat',
      candidateEmail: profile.email || '',
      candidatePhone: profile.phone || '',
      coverLetter: generated.letter,
      pitch: generated.pitch,
      attachedFiles: profile.cvFileName ? [profile.cvFileName] : [],
      formAnswers: generateRecruiterFormAnswers(profile, job),
      status: 'submitted',
      dateCreated: new Date().toLocaleDateString('fr-FR'),
    };
    handleSaveApplication(newApp);
  };

  const handleDeleteApplication = (id: string) => {
    setSavedApplications((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('career_ops_applications', JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Résultats & États
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [belowThresholdJobs, setBelowThresholdJobs] = useState<JobOffer[]>([]);
  const [showBelowThreshold, setShowBelowThreshold] = useState<boolean>(false);
  const [stats, setStats] = useState<{
    totalScanned: number;
    retained: number;
    blacklistedExcluded: number;
    belowThresholdExcluded: number;
    sourcesQueried: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sauvegarder le profil dans localStorage quand il change
  const handleSaveProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    if (typeof window !== 'undefined') {
      localStorage.setItem('career_ops_profile', JSON.stringify(newProfile));
    }
    triggerSearch(newProfile);
  };

  const triggerSearch = async (
    currentProfile = profile,
    currentMinScore = minScore,
    currentContracts = selectedContracts
  ) => {
    setIsLoading(true);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          location,
          contractTypes: currentContracts,
          sources: selectedSources,
          minScore: currentMinScore,
          profile: currentProfile,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const json = await res.json();
        if (json.success && Array.isArray(json.jobs)) {
          setJobs(json.jobs);
          setBelowThresholdJobs(json.belowThresholdJobs || []);
          setStats(json.stats || null);
          return;
        }
      }

      // Si l'API renvoie du HTML (timeout Cloudflare / erreur worker), bascule sans plantage sur le moteur local
      const localResult = executeLocalSearch(
        {
          query,
          location,
          contractTypes: currentContracts,
          sources: selectedSources,
          minScore: currentMinScore,
        },
        currentProfile
      );
      setJobs(localResult.jobs);
      setBelowThresholdJobs(localResult.belowThresholdJobs || []);
      setStats(localResult.stats);
    } catch {
      // En cas de panne réseau ou erreur de parsing, secours local instantané
      const localResult = executeLocalSearch(
        {
          query,
          location,
          contractTypes: currentContracts,
          sources: selectedSources,
          minScore: currentMinScore,
        },
        currentProfile
      );
      setJobs(localResult.jobs);
      setBelowThresholdJobs(localResult.belowThresholdJobs || []);
      setStats(localResult.stats);
    } finally {
      setIsLoading(false);
    }
  };

  // Première recherche au chargement + écoute des clics d'onglets depuis le header
  useEffect(() => {
    triggerSearch();

    const handleSwitchTab = (e: Event) => {
      const customEvent = e as CustomEvent<'search' | 'profile' | 'applications'>;
      if (customEvent.detail && ['search', 'profile', 'applications'].includes(customEvent.detail)) {
        setActiveTab(customEvent.detail);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    window.addEventListener('switch-tab', handleSwitchTab);
    return () => window.removeEventListener('switch-tab', handleSwitchTab);
  }, []);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setQuerySuggestions(searchJobSuggestions(val));
  };

  const handleLocationChange = (val: string) => {
    setLocation(val);
    setLocationSuggestions(searchLocationSuggestions(val));
  };

  const toggleContract = (c: ContractType) => {
    const updated = selectedContracts.includes(c)
      ? selectedContracts.filter((x) => x !== c)
      : [...selectedContracts, c];
    setSelectedContracts(updated);
    triggerSearch(profile, minScore, updated);
  };

  const toggleSource = (s: JobSourceId) => {
    setSelectedSources((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const selectAllSources = () => {
    setSelectedSources(Object.keys(JOB_SOURCES) as JobSourceId[]);
  };

  const deselectAllSources = () => {
    setSelectedSources([]);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Barre d'onglets principale */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#242c3d]">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'search'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'bg-[#12161f] text-slate-300 hover:text-white border border-[#242c3d] hover:border-slate-700'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Recherche d'offres</span>
            {jobs.length > 0 && (
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                activeTab === 'search' ? 'bg-blue-800 text-blue-100' : 'bg-slate-800 text-slate-300'
              }`}>
                {jobs.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'bg-[#12161f] text-slate-300 hover:text-white border border-[#242c3d] hover:border-slate-700'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Mon Profil & Documents</span>
            <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
              activeTab === 'profile' ? 'bg-blue-800 text-blue-100' : 'bg-slate-800 text-slate-300'
            }`}>
              {profile.skills.length} comp.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('applications')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'applications'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'bg-[#12161f] text-slate-300 hover:text-white border border-[#242c3d] hover:border-slate-700'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Mes Candidatures</span>
            {savedApplications.length > 0 && (
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                activeTab === 'applications' ? 'bg-blue-800 text-blue-100' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {savedApplications.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium text-slate-300 max-w-[180px] truncate">
              {profile.cvFileName || 'CV standard configuré'}
            </span>
          </div>
        </div>
      </div>

      {activeTab === 'search' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Barre supérieure : Profil & Mots interdits */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#12161f] border border-[#242c3d]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                {profile.name ? profile.name.charAt(0).toUpperCase() : <User className="w-5 h-5 text-blue-400" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">
                    {profile.name || 'Mon Profil Candidat'}
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    {profile.skills.length} compétences actives
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {profile.title || 'Profil candidat'} {profile.city ? `• ${profile.city}` : ''}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/30 border border-red-500/20 text-red-300 text-xs">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                <span>Filtre strict : {profile.blacklistedKeywords.length} mots interdits</span>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl border border-slate-700 transition flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                <span>Gérer mon CV & Compétences</span>
              </button>
            </div>
          </div>

      {/* Boîte de recherche principale avec autocomplétion intelligente */}
      <div className="p-6 rounded-2xl bg-[#12161f] border border-[#242c3d] shadow-xl space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Mots-clés avec Autocomplétion */}
          <div className="md:col-span-6 relative">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => {
                setIsQueryFocused(true);
                if (query) setQuerySuggestions(searchJobSuggestions(query));
              }}
              onBlur={() => setTimeout(() => setIsQueryFocused(false), 200)}
              onKeyDown={(e) => e.key === 'Enter' && (setIsQueryFocused(false), triggerSearch())}
              placeholder="Ex: Chargé de communication, Développeur..."
              className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />

            {/* Menu d'autocomplétion Métiers */}
            {isQueryFocused && querySuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-[#161b26] border border-[#242c3d] rounded-xl shadow-2xl overflow-hidden py-1 animate-in fade-in duration-150">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-[#242c3d]">
                  Métiers suggérés
                </div>
                {querySuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setQuery(suggestion);
                      setIsQueryFocused(false);
                      triggerSearch({ ...profile, title: suggestion });
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-200 hover:text-white hover:bg-blue-600/20 transition flex items-center justify-between"
                  >
                    <span>{suggestion}</span>
                    <span className="text-[10px] text-blue-400">Choisir</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Localisation & Zones Larges (ex: Bouches-du-Rhône) avec Autocomplétion */}
          <div className="md:col-span-4 relative">
            <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={location}
              onChange={(e) => handleLocationChange(e.target.value)}
              onFocus={() => {
                setIsLocationFocused(true);
                setLocationSuggestions(searchLocationSuggestions(location));
              }}
              onBlur={() => setTimeout(() => setIsLocationFocused(false), 200)}
              onKeyDown={(e) => e.key === 'Enter' && (setIsLocationFocused(false), triggerSearch())}
              placeholder="Ex: Bouches-du-Rhône (13), PACA, Lyon..."
              className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />

            {/* Menu d'autocomplétion Zones & Départements */}
            {isLocationFocused && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-[#161b26] border border-[#242c3d] rounded-xl shadow-2xl overflow-hidden py-1 max-h-64 overflow-y-auto animate-in fade-in duration-150">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-[#242c3d]">
                  Zones & départements recommandés
                </div>
                {(locationSuggestions.length > 0 ? locationSuggestions : POPULAR_FRENCH_LOCATIONS.slice(0, 10)).map(
                  (loc) => (
                    <button
                      key={loc}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setLocation(loc);
                        setIsLocationFocused(false);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-200 hover:text-white hover:bg-blue-600/20 transition flex items-center justify-between"
                    >
                      <span>{loc}</span>
                      <span className="text-[10px] text-blue-400">Sélectionner</span>
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Bouton de recherche */}
          <div className="md:col-span-2">
            <button
              onClick={() => triggerSearch()}
              disabled={isLoading}
              className="w-full h-full min-h-[46px] px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Scan en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Scanner & Noter</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filtres de contrats & seuil de note */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#242c3d]">
          {/* Contrats */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-medium mr-1">Contrats :</span>
            {CONTRACT_TYPES.map((c) => {
              const active = selectedContracts.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleContract(c.id)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg border transition ${
                    active
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Seuil de note */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Note min :</span>
            {[3.0, 3.5, 4.0, 4.5].map((score) => (
              <button
                key={score}
                onClick={() => {
                  setMinScore(score);
                  triggerSearch({ ...profile, minimumScoreThreshold: score }, score);
                }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${
                  minScore === score
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                ★ {score.toFixed(1)}+
              </button>
            ))}
          </div>
        </div>

        {/* Sélection des 9 plateformes */}
        <div className="space-y-2 pt-3 border-t border-[#242c3d]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-semibold text-slate-300">
                Sources scannées ({selectedSources.length}/{Object.keys(JOB_SOURCES).length}) :
              </span>
            </div>
            <div className="flex gap-3 text-[11px]">
              <button
                onClick={selectAllSources}
                className="text-blue-400 hover:underline"
              >
                Tout sélectionner
              </button>
              <span className="text-slate-600">•</span>
              <button
                onClick={deselectAllSources}
                className="text-slate-400 hover:underline"
              >
                Tout désélectionner
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(JOB_SOURCES) as JobSourceId[]).map((srcId) => {
              const src = JOB_SOURCES[srcId];
              const active = selectedSources.includes(srcId);
              return (
                <button
                  key={srcId}
                  onClick={() => toggleSource(srcId)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition flex items-center gap-1.5 ${
                    active
                      ? 'bg-slate-800 text-white border-slate-600'
                      : 'bg-slate-900/60 text-slate-500 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: active ? src.color : '#475569' }}
                  />
                  <span>{src.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Métriques d'évaluation Career-Ops */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-[#12161f] border border-[#242c3d]">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Offres scannées</span>
            <div className="text-2xl font-bold text-white mt-1">{stats.totalScanned}</div>
            <span className="text-[11px] text-slate-500">Sur {stats.sourcesQueried} plateformes FR</span>
          </div>

          <div className="p-4 rounded-xl bg-[#12161f] border border-red-500/20 bg-red-950/10">
            <span className="text-[11px] font-medium text-red-400 uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> Rejetées mots interdits
            </span>
            <div className="text-2xl font-bold text-red-400 mt-1">{stats.blacklistedExcluded}</div>
            <span className="text-[11px] text-slate-400">Alternances/stages éliminés</span>
          </div>

          <div className="p-4 rounded-xl bg-[#12161f] border border-[#242c3d]">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Sous le seuil ({minScore}/5)</span>
            <div className="text-2xl font-bold text-slate-300 mt-1">{stats.belowThresholdExcluded}</div>
            <span className="text-[11px] text-slate-500">Filtrées pour éviter le bruit</span>
          </div>

          <div className="p-4 rounded-xl bg-[#12161f] border border-emerald-500/20 bg-emerald-950/10">
            <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Retenues pour vous
            </span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.retained}</div>
            <span className="text-[11px] text-emerald-500/80">Meilleure adéquation profil</span>
          </div>
        </div>
      )}

      {/* Liste des Offres Scannées & Notées */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <span>Sélection des meilleures offres</span>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {jobs.length}
            </span>
          </h2>
          <span className="text-xs text-slate-400">Classées par score d'adéquation décroissant</span>
        </div>

        {jobs.length === 0 && !isLoading && (
          <div className="p-12 text-center rounded-2xl bg-[#12161f] border border-[#242c3d] space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Aucune offre ne correspond à ce seuil</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Toutes les offres trouvées ont été soit éliminées par vos mots interdits (ex: alternance), soit ont obtenu une note inférieure à {minScore}/5.
            </p>
            <button
              onClick={() => {
                setMinScore(2.5);
                triggerSearch({ ...profile, minimumScoreThreshold: 2.5 });
              }}
              className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition"
            >
              Abaisser le seuil à 2.5/5
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => {
            const score = job.score || 3.0;
            const sourceInfo = JOB_SOURCES[job.source];
            const appliedApp = getAppliedApplication(job);
            const isApplied = Boolean(appliedApp);

            let scoreBadgeColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            if (score >= 4.5) scoreBadgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
            else if (score >= 3.5) scoreBadgeColor = 'text-blue-400 bg-blue-500/10 border-blue-500/30';
            else if (score >= 2.5) scoreBadgeColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';

            return (
              <div
                key={job.id}
                className={`group p-5 rounded-2xl transition-all duration-200 flex flex-col justify-between shadow-lg ${
                  isApplied
                    ? 'bg-[#0a2318] border-2 border-emerald-500/80 hover:border-emerald-400 shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                    : 'bg-[#12161f] border border-[#242c3d] hover:border-blue-500/40'
                }`}
              >
                <div>
                  {/* Bannière Déjà Postulé */}
                  {isApplied && (
                    <div className="mb-3 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex flex-wrap items-center justify-between gap-2 text-xs font-bold shadow-sm">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>✓ Vous avez déjà postulé à cette offre</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-emerald-400/90 bg-emerald-950/70 px-2 py-0.5 rounded-md border border-emerald-500/30">
                          {appliedApp?.dateCreated ? `Postulé le ${appliedApp.dateCreated}` : 'Candidature envoyée'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnapplyJob(job);
                          }}
                          className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition cursor-pointer flex items-center gap-1"
                          title="Décocher cette offre de vos candidatures si vous n'avez pas postulé"
                        >
                          <XCircle className="w-3 h-3 text-red-400" />
                          <span>Décocher</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Entête Carte */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="px-2.5 py-0.5 text-[11px] font-semibold rounded-md"
                        style={{ backgroundColor: `${sourceInfo?.color}25`, color: sourceInfo?.color || '#3b82f6' }}
                      >
                        {sourceInfo?.name || job.source}
                      </span>
                      <span className="px-2 py-0.5 text-[11px] font-medium bg-slate-800 text-slate-300 rounded-md border border-slate-700">
                        {job.contractType}
                      </span>
                      <span className="px-2 py-0.5 text-[11px] font-medium bg-slate-800/80 text-slate-300 rounded-md border border-slate-700 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-400" />
                        <span>{job.datePosted || 'Publiée récemment'}</span>
                      </span>
                    </div>

                    <div className={`px-2.5 py-1 rounded-lg border text-xs font-extrabold flex items-center gap-1 ${scoreBadgeColor}`}>
                      <span>★</span>
                      <span>{score.toFixed(1)}</span>
                      <span className="text-[10px] font-normal opacity-80">/5</span>
                    </div>
                  </div>

                  {/* Titre & Entreprise */}
                  <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                    {job.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1 font-medium text-slate-300">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      {job.company}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {job.location}
                    </span>
                    {job.salary && (
                      <span className="text-emerald-400 font-semibold">{job.salary}</span>
                    )}
                    <span className="flex items-center gap-1 text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{job.datePosted || 'Date récente'}</span>
                    </span>
                  </div>

                  {/* Résumé évaluation */}
                  {job.scoreBreakdown?.highlight && (
                    <p className="mt-2 text-xs font-medium text-slate-300">
                      {job.scoreBreakdown.highlight}
                    </p>
                  )}

                  {/* Compétences trouvées */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {job.scoreBreakdown?.matchedSkills.slice(0, 5).map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 text-[11px] font-medium rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                      >
                        ✓ {s}
                      </span>
                    ))}
                    {job.scoreBreakdown?.missingSkills.slice(0, 2).map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 text-[11px] font-medium rounded bg-slate-800 text-slate-400 border border-slate-700"
                      >
                        ? {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions en bas de carte */}
                <div className="mt-5 pt-3.5 border-t border-[#242c3d] flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedJobForDetail(job)}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1 transition cursor-pointer"
                  >
                    <span>Analyse Career-Ops</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-2">
                    {isApplied ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setApplicationJob(job)}
                          className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm hover:shadow-md shadow-emerald-600/30 transition flex items-center gap-1.5 cursor-pointer"
                          title="Revoir ou modifier votre candidature enregistrée"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-100" />
                          <span>✓ Postulé (Revoir)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUnapplyJob(job)}
                          className="px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-300 rounded-lg border border-slate-700 hover:border-red-500/30 transition flex items-center gap-1 cursor-pointer"
                          title="Décocher cette offre de vos candidatures"
                        >
                          <XCircle className="w-3.5 h-3.5 text-red-400" />
                          <span>Décocher</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setApplicationJob(job)}
                          className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm hover:shadow-md shadow-blue-600/25 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                          <span>⚡ Pré-remplir</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickApply(job)}
                          className="px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-300 rounded-lg border border-slate-700 hover:border-emerald-500/30 transition flex items-center gap-1 cursor-pointer"
                          title="Marquer directement comme postulé"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Postulé ?</span>
                        </button>
                      </>
                    )}

                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 transition flex items-center gap-1.5"
                      title={`Ouvrir directement cette offre sur ${sourceInfo?.name || job.source}`}
                    >
                      <span>Voir l'offre</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Section explicative & visibilité des offres sous le seuil */}
        {belowThresholdJobs.length > 0 && (
          <div className="mt-8 pt-6 border-t border-[#242c3d] space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-[#242c3d] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
              <div>
                <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <span>{belowThresholdJobs.length} autre(s) offre(s) notée(s) sous votre seuil de {minScore}/5</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ces offres ont obtenu une note inférieure à votre critère minimal (manque de compétences demandées ou contrat différent).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowBelowThreshold(!showBelowThreshold)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                >
                  {showBelowThreshold ? 'Masquer ces offres' : `Afficher les ${belowThresholdJobs.length} offres sous le seuil`}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const newMin = Math.max(1.0, minScore - 0.5);
                    setMinScore(newMin);
                    triggerSearch(profile, newMin);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-950/60 text-blue-300 border border-blue-500/30 hover:bg-blue-900/60 transition cursor-pointer"
                  title="Abaisser le seuil minimal pour inclure ces offres"
                >
                  Abaisser seuil à {(minScore - 0.5).toFixed(1)}★
                </button>
              </div>
            </div>

            {showBelowThreshold && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
                {belowThresholdJobs.map((job) => {
                  const score = job.score || 2.5;
                  const sourceInfo = JOB_SOURCES[job.source];
                  const appliedApp = getAppliedApplication(job);
                  const isApplied = Boolean(appliedApp);

                  return (
                    <div
                      key={job.id}
                      className={`p-5 rounded-2xl transition-all flex flex-col justify-between shadow ${
                        isApplied
                          ? 'bg-[#0a2318] border-2 border-emerald-500/70 shadow-emerald-950/40 ring-1 ring-emerald-500/20'
                          : 'bg-[#12161f]/70 border border-slate-800 hover:border-amber-500/40'
                      }`}
                    >
                      <div>
                        {/* Bannière Déjà Postulé */}
                        {isApplied && (
                          <div className="mb-2.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-between text-xs font-bold shadow-sm">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                              <span>✓ Déjà postulé à cette offre</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-emerald-400/90">{appliedApp?.dateCreated}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnapplyJob(job);
                                }}
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition cursor-pointer flex items-center gap-1"
                                title="Décocher cette offre de vos candidatures"
                              >
                                <XCircle className="w-3 h-3 text-red-400" />
                                <span>Décocher</span>
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="px-2 py-0.5 text-[10px] font-semibold rounded"
                              style={{ backgroundColor: `${sourceInfo?.color}20`, color: sourceInfo?.color || '#94a3b8' }}
                            >
                              {sourceInfo?.name || job.source}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-400 rounded">
                              {job.contractType}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] bg-slate-800/80 text-slate-300 rounded border border-slate-700/60 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-blue-400" />
                              <span>{job.datePosted || 'Publiée récemment'}</span>
                            </span>
                            <span className="px-2 py-0.5 text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded font-medium">
                              Note sous le seuil ({score.toFixed(1)}/5)
                            </span>
                          </div>

                          <div className="px-2 py-0.5 rounded border border-amber-500/30 text-xs font-bold text-amber-400 bg-amber-500/10">
                            ★ {score.toFixed(1)}
                          </div>
                        </div>

                        <h4 className="text-sm font-bold text-slate-200 line-clamp-2">{job.title}</h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            {job.company}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>{job.datePosted || 'Date récente'}</span>
                          </span>
                        </div>

                        {job.scoreBreakdown?.reasons && job.scoreBreakdown.reasons.length > 0 && (
                          <div className="mt-2.5 p-2 bg-slate-950/60 rounded-lg border border-slate-800/80 text-[11px] text-slate-300 space-y-1">
                            {job.scoreBreakdown.reasons.slice(0, 2).map((r, i) => (
                              <p key={i} className="flex items-start gap-1.5">
                                <span className="text-amber-400">›</span>
                                <span>{r}</span>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setSelectedJobForDetail(job)}
                          className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition cursor-pointer flex items-center gap-1"
                        >
                          <span>Détails du score</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>

                        <div className="flex items-center gap-2">
                          {isApplied ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setApplicationJob(job)}
                                className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition cursor-pointer flex items-center gap-1"
                              >
                                <CheckCircle className="w-3 h-3 text-emerald-100" />
                                <span>Postulé (Revoir)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUnapplyJob(job)}
                                className="px-2 py-1.5 text-xs font-medium bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-300 rounded-lg border border-slate-700 hover:border-red-500/30 transition flex items-center gap-1 cursor-pointer"
                                title="Décocher cette offre de vos candidatures"
                              >
                                <XCircle className="w-3 h-3 text-red-400" />
                                <span>Décocher</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setApplicationJob(job)}
                                className="px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition cursor-pointer"
                              >
                                Pré-remplir quand même
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickApply(job)}
                                className="px-2 py-1.5 text-xs font-medium bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-300 rounded-lg border border-slate-700 transition flex items-center gap-1 cursor-pointer"
                                title="Marquer comme postulé"
                              >
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Postulé ?</span>
                              </button>
                            </>
                          )}
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition flex items-center gap-1"
                            title={`Ouvrir directement cette offre sur ${sourceInfo?.name || job.source}`}
                          >
                            <span>Voir l'offre</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    )}

      {/* Onglet Profil & Documents */}
      {activeTab === 'profile' && (
        <ProfileTab profile={profile} onSaveProfile={handleSaveProfile} />
      )}

      {/* Onglet Mes Candidatures */}
      {activeTab === 'applications' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#242c3d]/60">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-400" />
                <span>Mes Candidatures</span>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {savedApplications.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Cliquez sur une candidature pour la déplier et consulter votre lettre personnalisée, votre pitch et vos pièces jointes.
              </p>
            </div>

            {savedApplications.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={expandAllApps}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition cursor-pointer"
                >
                  Tout déplier
                </button>
                <button
                  type="button"
                  onClick={collapseAllApps}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition cursor-pointer"
                >
                  Tout replier
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('search')}
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Rechercher d'autres offres</span>
                </button>
              </div>
            )}
          </div>

          {savedApplications.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#12161f] border border-[#242c3d] space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Send className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white">Aucune candidature enregistrée pour le moment</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Trouvez des offres dans l'onglet <strong>Recherche d'offres</strong>, puis cliquez sur <strong>⚡ Pré-remplir</strong> pour générer instantanément votre lettre adaptée, votre pitch et vos pièces jointes.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('search')}
                className="px-5 py-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20 transition inline-flex items-center gap-2 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>Lancer une recherche d'offres</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {savedApplications.map((app) => {
                const isSubmitted = app.status === 'submitted';
                const sourceInfo = JOB_SOURCES[app.source];
                const isExpanded = Boolean(expandedAppIds[app.id]);

                return (
                  <div
                    key={app.id}
                    className={`rounded-2xl border transition-all duration-200 shadow-lg overflow-hidden ${
                      isSubmitted
                        ? 'bg-[#0c2419] border-emerald-500/50 hover:border-emerald-400'
                        : 'bg-[#12161f] border-[#242c3d] hover:border-slate-700'
                    }`}
                  >
                    {/* En-tête concise (toujours visible, cliquable pour déplier/replier) */}
                    <div
                      onClick={() => toggleAppExpand(app.id)}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.03] transition"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="px-2.5 py-0.5 text-[11px] font-semibold rounded-md"
                            style={{
                              backgroundColor: `${sourceInfo?.color || '#3b82f6'}25`,
                              color: sourceInfo?.color || '#3b82f6',
                            }}
                          >
                            {sourceInfo?.name || app.source}
                          </span>
                          <span className="px-2 py-0.5 text-[11px] font-medium bg-slate-800 text-slate-300 rounded-md border border-slate-700">
                            {app.contractType}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-md border flex items-center gap-1 ${
                              isSubmitted
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            <span>{isSubmitted ? 'Candidature envoyée' : 'Brouillon prêt'}</span>
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{app.dateCreated}</span>
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-white tracking-tight truncate">
                          {app.jobTitle}
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                          <span className="flex items-center gap-1 font-medium text-slate-300">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            {app.company}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            {app.jobLocation}
                          </span>
                          <span className="text-blue-400 flex items-center gap-1">
                            <FileCheck className="w-3.5 h-3.5" />
                            {app.attachedFiles?.[0] || 'CV.pdf'}
                          </span>
                        </div>
                      </div>

                      {/* Boutons d'action rapides et bouton Déplier / Replier */}
                      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                        <a
                          href={app.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 transition flex items-center gap-1.5"
                          title={`Ouvrir cette offre sur ${sourceInfo?.name || app.source}`}
                        >
                          <span>Voir l'offre</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteApplication(app.id);
                          }}
                          className="px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-red-300 bg-slate-800 hover:bg-red-500/20 rounded-lg border border-slate-700 hover:border-red-500/30 transition cursor-pointer flex items-center gap-1.5"
                          title="Décocher / Supprimer cette candidature"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          <span>Décocher</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAppExpand(app.id);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                            isExpanded
                              ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <span>{isExpanded ? 'Replier' : 'Déplier les détails'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Contenu détaillé visible uniquement quand la carte est dépliée */}
                    {isExpanded && (
                      <div className="p-6 pt-0 border-t border-[#242c3d]/80 space-y-5 animate-in fade-in duration-200">
                        {/* Données Candidat & Fichiers */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 mt-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                          <div>
                            <span className="text-slate-500 block text-[11px]">Candidat :</span>
                            <span className="font-semibold text-slate-200">{app.candidateName}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[11px]">Contact :</span>
                            <span className="text-slate-300">
                              {app.candidateEmail || 'Non spécifié'} {app.candidatePhone ? `• ${app.candidatePhone}` : ''}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[11px]">Pièce jointe :</span>
                            <span className="text-blue-400 font-medium flex items-center gap-1">
                              <FileCheck className="w-3.5 h-3.5" />
                              {app.attachedFiles?.[0] || 'CV.pdf'}
                            </span>
                          </div>
                        </div>

                        {/* Lettre de motivation personnalisée */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-300">
                              Lettre de motivation personnalisée pour ce poste
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleDownload(
                                    app.coverLetter,
                                    `Lettre_${app.company.replace(/\s+/g, '_')}_${app.jobTitle.replace(/\s+/g, '_')}.txt`
                                  )
                                }
                                className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <Download className="w-3 h-3" />
                                <span>Télécharger</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopy(app.coverLetter, `letter-${app.id}`)}
                                className="px-2.5 py-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-md transition flex items-center gap-1.5 cursor-pointer"
                              >
                                {copiedField === `letter-${app.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                <span>{copiedField === `letter-${app.id}` ? 'Copié !' : 'Copier lettre'}</span>
                              </button>
                            </div>
                          </div>
                          <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl text-xs text-slate-300 whitespace-pre-line max-h-56 overflow-y-auto font-sans leading-relaxed">
                            {app.coverLetter}
                          </div>
                        </div>

                        {/* Pitch d'accroche court */}
                        {app.pitch && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-400">
                                Pitch d'accroche court
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(app.pitch, `pitch-${app.id}`)}
                                className="px-2 py-0.5 text-xs text-blue-400 hover:text-blue-300 transition flex items-center gap-1 cursor-pointer"
                              >
                                {copiedField === `pitch-${app.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                <span>{copiedField === `pitch-${app.id}` ? 'Copié !' : 'Copier'}</span>
                              </button>
                            </div>
                            <div className="p-3 bg-slate-950/70 border border-slate-800/70 rounded-lg text-xs text-slate-300 italic">
                              "{app.pitch}"
                            </div>
                          </div>
                        )}

                        {/* Bouton direct d'accès à l'offre */}
                        <div className="pt-3 border-t border-[#242c3d] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <p className="text-[11px] text-slate-400">
                            Prêt(e) à postuler ? Ouvrez le portail recruteur officiel pour déposer votre candidature :
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              handleSaveApplication({ ...app, status: 'submitted' });
                              window.open(app.jobUrl, '_blank', 'noopener,noreferrer');
                            }}
                            className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-md shadow-emerald-600/25 transition flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Accéder à l'offre sur {sourceInfo?.name || 'le site'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modale d'Assistant Candidature Pré-remplie */}
      <ApplicationModal
        isOpen={Boolean(applicationJob)}
        onClose={() => setApplicationJob(null)}
        job={applicationJob}
        profile={profile}
        onSaveApplication={handleSaveApplication}
      />

      {/* Modale de Gestion Rapide du Profil */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile}
        onSaveProfile={handleSaveProfile}
      />

      {/* Modale de Détail du Score Career-Ops */}
      <ScoreDetailModal
        job={selectedJobForDetail}
        onClose={() => setSelectedJobForDetail(null)}
      />
    </div>
  );
};
