import React, { useState, useEffect } from 'react';
import type { JobOffer, JobSourceId, ContractType, UserProfile } from '../lib/types.ts';
import { DEFAULT_PROFILE } from '../lib/profile/profile-parser.ts';
import { JOB_SOURCES } from '../lib/scrapers/sources.ts';
import { ProfileModal } from './ProfileModal';
import { ScoreDetailModal } from './ScoreDetailModal';
import {
  Search,
  MapPin,
  Sparkles,
  ShieldAlert,
  SlidersHorizontal,
  ExternalLink,
  ChevronRight,
  Building2,
  Layers,
  CheckCircle,
} from 'lucide-react';

const CONTRACT_TYPES: { id: ContractType; label: string }[] = [
  { id: 'CDI', label: 'CDI' },
  { id: 'CDD', label: 'CDD' },
  { id: 'Interim', label: 'Intérim' },
  { id: 'FonctionPublique', label: 'Fonction Publique' },
];

export const SearchDashboard: React.FC = () => {
  // Profil utilisateur (persisté en localStorage)
  const [profile, setProfile] = useState<UserProfile>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('career_ops_profile');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return DEFAULT_PROFILE;
  });

  // États du formulaire de recherche
  const [query, setQuery] = useState('Développeur Full-Stack');
  const [location, setLocation] = useState('Paris');
  const [selectedContracts, setSelectedContracts] = useState<ContractType[]>(['CDI', 'CDD']);
  const [selectedSources, setSelectedSources] = useState<JobSourceId[]>(
    Object.keys(JOB_SOURCES) as JobSourceId[]
  );
  const [minScore, setMinScore] = useState<number>(3.5);

  // Modales
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<JobOffer | null>(null);

  // Résultats & États réseau
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [stats, setStats] = useState<{
    totalScanned: number;
    retained: number;
    blacklistedExcluded: number;
    belowThresholdExcluded: number;
    sourcesQueried: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sauvegarder le profil dans localStorage quand il change
  const handleSaveProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    if (typeof window !== 'undefined') {
      localStorage.setItem('career_ops_profile', JSON.stringify(newProfile));
    }
    // Re-scanner automatiquement avec le profil mis à jour
    triggerSearch(newProfile);
  };

  const triggerSearch = async (currentProfile = profile) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          location,
          contractTypes: selectedContracts,
          sources: selectedSources,
          minScore: minScore,
          profile: currentProfile,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setJobs(json.jobs || []);
        setStats(json.stats || null);
      } else {
        setError(json.error || 'Erreur lors de la récupération des offres');
      }
    } catch (err: any) {
      setError(`Erreur de connexion : ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Lancement de la première recherche au chargement
  useEffect(() => {
    triggerSearch();
  }, []);

  const toggleContract = (c: ContractType) => {
    setSelectedContracts((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
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
      {/* Barre de contrôle supérieure : Profil & Mots interdits */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#12161f] border border-[#242c3d]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
            {profile.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">{profile.name}</h3>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                {profile.skills.length} compétences actives
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {profile.title || 'Profil candidat'} • Seuil min : <span className="text-blue-400 font-semibold">{profile.minimumScoreThreshold}/5</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/30 border border-red-500/20 text-red-300 text-xs">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            <span>Filtre strict : {profile.blacklistedKeywords.length} mots interdits</span>
          </div>

          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl border border-slate-700 transition flex items-center gap-2 shadow-sm"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
            <span>Gérer mon CV & Compétences</span>
          </button>
        </div>
      </div>

      {/* Boîte de recherche principale */}
      <div className="p-6 rounded-2xl bg-[#12161f] border border-[#242c3d] shadow-xl space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Mots-clés */}
          <div className="md:col-span-6 relative">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && triggerSearch()}
              placeholder="Métier, compétences, mots-clés (ex: Développeur TypeScript, Comptable...)"
              className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>

          {/* Localisation */}
          <div className="md:col-span-4 relative">
            <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && triggerSearch()}
              placeholder="Ville, département ou Télétravail"
              className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
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
                  triggerSearch({ ...profile, minimumScoreThreshold: score });
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

      {/* Métriques & Statistiques d'évaluation Career-Ops */}
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

      {/* Erreur */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/30 text-red-300 text-sm">
          {error}
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

            let scoreBadgeColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            if (score >= 4.5) scoreBadgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
            else if (score >= 3.5) scoreBadgeColor = 'text-blue-400 bg-blue-500/10 border-blue-500/30';
            else if (score >= 2.5) scoreBadgeColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';

            return (
              <div
                key={job.id}
                className="group p-5 rounded-2xl bg-[#12161f] border border-[#242c3d] hover:border-blue-500/40 transition-all duration-200 flex flex-col justify-between shadow-lg"
              >
                <div>
                  {/* Entête Carte : Source + Contrat + Score */}
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
                <div className="mt-5 pt-3.5 border-t border-[#242c3d] flex items-center justify-between">
                  <button
                    onClick={() => setSelectedJobForDetail(job)}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <span>Analyse Career-Ops</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition flex items-center gap-1.5"
                  >
                    <span>Voir l'offre</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modale de Gestion du Profil */}
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
