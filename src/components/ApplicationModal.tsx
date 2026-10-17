import React, { useState, useEffect } from 'react';
import type { JobOffer, UserProfile, JobApplication } from '../lib/types.ts';
import { generateTailoredCoverLetter } from '../lib/career-ops/application-helper.ts';
import {
  X,
  Sparkles,
  Copy,
  Check,
  Download,
  ExternalLink,
  FileText,
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Send,
  Save,
} from 'lucide-react';

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobOffer | null;
  profile: UserProfile;
  onSaveApplication: (app: JobApplication) => void;
}

export const ApplicationModal: React.FC<ApplicationModalProps> = ({
  isOpen,
  onClose,
  job,
  profile,
  onSaveApplication,
}) => {
  if (!isOpen || !job) return null;

  const [candidateName, setCandidateName] = useState(profile.name);
  const [candidateEmail, setCandidateEmail] = useState(profile.email || '');
  const [candidatePhone, setCandidatePhone] = useState(profile.phone || '');
  const [coverLetter, setCoverLetter] = useState('');
  const [pitch, setPitch] = useState('');
  const [selectedFile, setSelectedFile] = useState(
    profile.cvFileName || profile.customFiles?.[0]?.name || 'Mon_CV.pdf'
  );

  const [copiedLetter, setCopiedLetter] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (job) {
      const generated = generateTailoredCoverLetter(profile, job);
      setCoverLetter(generated.letter);
      setPitch(generated.pitch);
      setCandidateName(profile.name);
      setCandidateEmail(profile.email || '');
      setCandidatePhone(profile.phone || '');
      setSelectedFile(profile.cvFileName || profile.customFiles?.[0]?.name || 'Mon_CV.pdf');
      setIsSaved(false);
    }
  }, [job, profile]);

  const handleCopyLetter = () => {
    navigator.clipboard.writeText(coverLetter);
    setCopiedLetter(true);
    setTimeout(() => setCopiedLetter(false), 2000);
  };

  const handleCopyPitch = () => {
    navigator.clipboard.writeText(pitch);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  const handleDownloadLetter = () => {
    const blob = new Blob([coverLetter], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Lettre_Motivation_${job.company.replace(/\s+/g, '_')}_${job.title.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveDraft = () => {
    const newApp: JobApplication = {
      id: `app-${Date.now()}`,
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      jobLocation: job.location,
      jobUrl: job.url,
      contractType: job.contractType,
      source: job.source,
      candidateName,
      candidateEmail,
      candidatePhone,
      coverLetter,
      pitch,
      attachedFiles: [selectedFile],
      status: 'draft',
      dateCreated: new Date().toLocaleDateString('fr-FR'),
    };
    onSaveApplication(newApp);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handlePublishApplication = () => {
    const newApp: JobApplication = {
      id: `app-${Date.now()}`,
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      jobLocation: job.location,
      jobUrl: job.url,
      contractType: job.contractType,
      source: job.source,
      candidateName,
      candidateEmail,
      candidatePhone,
      coverLetter,
      pitch,
      attachedFiles: [selectedFile],
      status: 'submitted',
      dateCreated: new Date().toLocaleDateString('fr-FR'),
    };
    onSaveApplication(newApp);
    // Ouvrir l'offre officielle sur le site
    window.open(job.url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[#12161f] border border-[#242c3d] rounded-2xl shadow-2xl p-6 sm:p-8 text-[#f0f4fc]">
        {/* Entête Modal */}
        <div className="flex items-start justify-between pb-4 border-b border-[#242c3d]">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Assistant Candidature Automatique</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">{job.title}</h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1 text-slate-300 font-medium">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                {job.company}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                {job.location}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {job.contractType}
              </span>
              {job.score && (
                <span className="font-bold text-emerald-400">
                  ★ {job.score.toFixed(1)}/5 Match
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {/* Bloc Coordonnées Candidat */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" />
              <span>Vos coordonnées pour cette candidature</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Nom complet</label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Email</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    type="email"
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Téléphone</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    type="tel"
                    value={candidatePhone}
                    onChange={(e) => setCandidatePhone(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Fichier CV Sélectionné */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Document CV joint</h4>
                <p className="text-[11px] text-slate-400">{selectedFile}</p>
              </div>
            </div>
            {profile.customFiles && profile.customFiles.length > 1 && (
              <select
                value={selectedFile}
                onChange={(e) => setSelectedFile(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none"
              >
                {profile.customFiles.map((f) => (
                  <option key={f.id} value={f.name}>
                    {f.name} ({f.size})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Lettre de motivation sur-mesure */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <span>Lettre de motivation générée sur-mesure</span>
                <span className="text-[11px] font-normal text-emerald-400">
                  (Entreprise et compétences adaptées automatiquement)
                </span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadLetter}
                  className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyLetter}
                  className="px-2.5 py-1 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-md transition flex items-center gap-1.5"
                >
                  {copiedLetter ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLetter ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>
            </div>
            <textarea
              rows={9}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              className="w-full p-3.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed font-sans shadow-inner"
            />
          </div>

          {/* Pitch Court d'accompagnement */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <span>Pitch d'accroche court</span>
                <span className="text-[11px] font-normal text-slate-400">
                  (Idéal pour champ message recruteur ou message LinkedIn)
                </span>
              </label>
              <button
                type="button"
                onClick={handleCopyPitch}
                className="px-2.5 py-1 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-md transition flex items-center gap-1.5"
              >
                {copiedPitch ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPitch ? 'Copié !' : 'Copier le pitch'}</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              className="w-full p-3 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed font-sans shadow-inner"
            />
          </div>
        </div>

        {/* Pied de modal avec validation finale par l'utilisateur */}
        <div className="mt-8 pt-4 border-t border-[#242c3d] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-slate-400">
            ℹ️ Vous vérifiez et validez tout. Rien n'est envoyé sans votre accord.
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaved ? 'Enregistré !' : 'Enregistrer brouillon'}</span>
            </button>

            <button
              type="button"
              onClick={handlePublishApplication}
              className="px-5 py-2.5 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-blue-500/25 transition flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Ouvrir l'offre & Publier ma candidature</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
