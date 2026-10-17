import React from 'react';
import type { JobOffer } from '../lib/types.ts';
import { X, ExternalLink, CheckCircle2, AlertCircle, Award, MapPin, Building2 } from 'lucide-react';
import { JOB_SOURCES } from '../lib/scrapers/sources.ts';

interface ScoreDetailModalProps {
  job: JobOffer | null;
  onClose: () => void;
}

export const ScoreDetailModal: React.FC<ScoreDetailModalProps> = ({ job, onClose }) => {
  if (!job) return null;

  const breakdown = job.scoreBreakdown;
  const score = breakdown?.score || job.score || 3.0;
  const sourceInfo = JOB_SOURCES[job.source];

  // Couleur du score
  let scoreColor = 'text-blue-400 bg-blue-500/10 border-blue-500/30';
  if (score >= 4.5) scoreColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  else if (score >= 3.5) scoreColor = 'text-blue-400 bg-blue-500/10 border-blue-500/30';
  else if (score >= 2.5) scoreColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  else scoreColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#12161f] border border-[#242c3d] rounded-2xl shadow-2xl p-6 sm:p-8 text-[#f0f4fc]">
        <div className="flex items-start justify-between pb-4 border-b border-[#242c3d]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="px-2 py-0.5 text-[11px] font-semibold rounded"
                style={{ backgroundColor: `${sourceInfo?.color}25`, color: sourceInfo?.color || '#3b82f6' }}
              >
                {sourceInfo?.name || job.source}
              </span>
              <span className="text-xs text-slate-400 font-medium">Contrat {job.contractType}</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">{job.title}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
              <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {job.company}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>
              {job.salary && <span className="font-semibold text-emerald-400">{job.salary}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Score Career-Ops */}
        <div className="mt-6 p-4 rounded-xl bg-slate-900/80 border border-[#242c3d]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Évaluation Career-Ops</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-white">{score.toFixed(1)}</span>
                <span className="text-sm font-semibold text-slate-400">/ 5.0</span>
              </div>
            </div>
            <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${scoreColor}`}>
              {breakdown?.highlight || 'Score calculé'}
            </div>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(score / 5.0) * 100}%` }}
            />
          </div>
        </div>

        {/* Analyse des compétences */}
        <div className="mt-6 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Compétences alignées avec votre CV ({breakdown?.matchedSkills.length || 0})
              </h4>
            </div>
            <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
              {breakdown?.matchedSkills && breakdown.matchedSkills.length > 0 ? (
                breakdown.matchedSkills.map((s) => (
                  <span
                    key={s}
                    className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                  >
                    ✓ {s}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">Aucune correspondance directe trouvée</span>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Compétences manquantes ou non mentionnées ({breakdown?.missingSkills.length || 0})
              </h4>
            </div>
            <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-amber-950/20 border border-amber-500/20">
              {breakdown?.missingSkills && breakdown.missingSkills.length > 0 ? (
                breakdown.missingSkills.map((s) => (
                  <span
                    key={s}
                    className="px-2.5 py-1 text-xs font-medium rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30"
                  >
                    ⚠ {s}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">Aucun manque identifié par rapport à l'offre</span>
              )}
            </div>
          </div>

          {/* Justification & Recommandations */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-blue-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                Synthèse & Justification
              </h4>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              {breakdown?.reasons && breakdown.reasons.length > 0 ? (
                breakdown.reasons.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="text-blue-400 font-bold">•</span>
                    <span>{r}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">Évaluation standard basée sur l'intitulé et les compétences communes.</p>
              )}
            </div>
          </div>

          {/* Extrait de la description */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Extrait de l'annonce
            </h4>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-line">
              {job.description}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 pt-4 border-t border-[#242c3d] flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Source : {sourceInfo?.name}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              Fermer
            </button>
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-500/20 transition flex items-center gap-2"
            >
              <span>Postuler sur {sourceInfo?.name || 'le site'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
