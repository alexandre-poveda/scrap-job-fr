import React, { useState, useEffect } from 'react';
import type { UserProfile, ContractType } from '../lib/types.ts';
import { DEFAULT_PROFILE, parseProfileFromText } from '../lib/profile/profile-parser.ts';
import { Upload, X, ShieldAlert, Sparkles, Check, FileText, User, ChevronDown, ChevronUp, FileCode } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
}) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [newSkill, setNewSkill] = useState('');
  const [newBlacklist, setNewBlacklist] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadMessage('Lecture et analyse du document...');

    try {
      // Si fichier texte brut ou markdown
      if (file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.json')) {
        const text = await file.text();
        const parsed = parseProfileFromText(text);
        setFormData((prev) => ({
          ...prev,
          name: parsed.name || prev.name,
          title: parsed.title || prev.title,
          skills: Array.from(new Set([...prev.skills, ...(parsed.skills || [])])),
          experienceYears: parsed.experienceYears || prev.experienceYears,
          cvRawText: text,
        }));
        setUploadMessage(`✅ Fichier texte analysé ! ${parsed.skills?.length || 0} compétences extraites.`);
        setIsUploading(false);
        return;
      }

      // Si PDF ou autre format
      const data = new FormData();
      data.append('file', file);
      data.append('type', 'cv');

      const res = await fetch('/api/parse-cv', {
        method: 'POST',
        body: data,
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const json = await res.json();
        if (json.success && json.profile) {
          const parsed = json.profile;
          setFormData((prev) => ({
            ...prev,
            name: parsed.name || prev.name,
            title: parsed.title || prev.title,
            skills: Array.from(new Set([...prev.skills, ...(parsed.skills || [])])),
            experienceYears: parsed.experienceYears || prev.experienceYears,
            cvRawText: parsed.cvRawText || prev.cvRawText,
          }));
          setUploadMessage(`✅ CV analysé avec succès ! ${parsed.skills?.length || 0} compétences extraites.`);
          return;
        }
      }

      let errorMsg = '⚠️ Le document n\'a pas pu être lu automatiquement.';
      try {
        const errJson = await res.json();
        if (errJson.error) errorMsg = `⚠️ ${errJson.error}`;
      } catch {}

      setUploadMessage(
        `${errorMsg} Vous pouvez aussi copier-coller le texte de votre CV directement ci-dessous.`
      );
      setIsPasteOpen(true);
    } catch (err: any) {
      setUploadMessage(`❌ Erreur réseau : ${err.message}. Vous pouvez coller le texte de votre profil ci-dessous.`);
      setIsPasteOpen(true);
    } finally {
      setIsUploading(false);
    }
  };

  const handleExtractFromPasted = () => {
    if (!pastedText.trim()) return;
    setIsUploading(true);
    try {
      const parsed = parseProfileFromText(pastedText);
      setFormData((prev) => ({
        ...prev,
        name: parsed.name || prev.name,
        title: parsed.title || prev.title,
        skills: Array.from(new Set([...prev.skills, ...(parsed.skills || [])])),
        experienceYears: parsed.experienceYears || prev.experienceYears,
        cvRawText: pastedText,
      }));
      setUploadMessage(`✅ Texte analysé ! ${parsed.skills?.length || 0} compétences extraites.`);
      setPastedText('');
      setIsPasteOpen(false);
    } catch (err: any) {
      setUploadMessage(`❌ Erreur d'analyse : ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData((prev) => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  const addBlacklist = () => {
    if (newBlacklist.trim() && !formData.blacklistedKeywords.includes(newBlacklist.trim().toLowerCase())) {
      setFormData((prev) => ({
        ...prev,
        blacklistedKeywords: [...prev.blacklistedKeywords, newBlacklist.trim().toLowerCase()],
      }));
      setNewBlacklist('');
    }
  };

  const removeBlacklist = (keyword: string) => {
    setFormData((prev) => ({
      ...prev,
      blacklistedKeywords: prev.blacklistedKeywords.filter((k) => k !== keyword),
    }));
  };

  const toggleContract = (c: ContractType) => {
    setFormData((prev) => {
      const exists = prev.preferredContracts.includes(c);
      return {
        ...prev,
        preferredContracts: exists
          ? prev.preferredContracts.filter((x) => x !== c)
          : [...prev.preferredContracts, c],
      };
    });
  };

  const handleSave = () => {
    onSaveProfile(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#12161f] border border-[#242c3d] rounded-2xl shadow-2xl p-6 sm:p-8 text-[#f0f4fc]">
        <div className="flex items-center justify-between pb-4 border-b border-[#242c3d]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Profil de compétences & Critères</h2>
              <p className="text-xs text-slate-400">Personnalisez votre CV, vos compétences et vos mots interdits</p>
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
          {/* Section Upload CV */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-dashed border-blue-500/30">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold">Importer votre CV ou export de profil</h4>
                  <p className="text-xs text-slate-400">Supporte PDF, Word ou export LinkedIn / France Travail</p>
                </div>
              </div>
              <label className="relative cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span>{isUploading ? 'Analyse...' : 'Parcourir un fichier'}</span>
                <input
                  type="file"
                  accept=".pdf,.txt,.md,.json"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>
            </div>
            {uploadMessage && (
              <p className="mt-3 text-xs font-medium text-slate-300 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                {uploadMessage}
              </p>
            )}

            {/* Toggle Saisie Manuelle / Copier-Coller */}
            <div className="mt-3 pt-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setIsPasteOpen(!isPasteOpen)}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1.5 transition"
              >
                {isPasteOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{isPasteOpen ? 'Masquer la saisie directe' : 'Ou copier-coller directement le texte de votre CV / profil'}</span>
              </button>

              {isPasteOpen && (
                <div className="mt-3 p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                  <p className="text-[11px] text-slate-400">
                    Collez le texte de votre CV, profil LinkedIn ou compétences ci-dessous. Le moteur Career-Ops va en extraire automatiquement les compétences, le poste et l'expérience :
                  </p>
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Collez ici le texte de votre CV (ex: Vos expériences, vos outils, compétences clés...)"
                    rows={4}
                    className="w-full p-2.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleExtractFromPasted}
                      disabled={!pastedText.trim() || isUploading}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isUploading ? 'Extraction...' : 'Extraire les compétences'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Informations Candidat */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Nom ou Identifiant</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Intitulé du poste recherché</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="Ex: Développeur Full-Stack, Comptable..."
              />
            </div>
          </div>

          {/* Types de contrat acceptés */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Types de contrat recherchés</label>
            <div className="flex flex-wrap gap-2">
              {(['CDI', 'CDD', 'Interim', 'FonctionPublique'] as ContractType[]).map((c) => {
                const isSelected = formData.preferredContracts.includes(c);
                const labels: Record<string, string> = {
                  CDI: 'CDI',
                  CDD: 'CDD',
                  Interim: 'Intérim',
                  FonctionPublique: 'Fonction Publique',
                };
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleContract(c)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                      isSelected
                        ? 'bg-blue-600/20 text-blue-400 border-blue-500'
                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {labels[c] || c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Compétences (Skills) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-300">
                Compétences maîtrisées ({formData.skills.length})
              </label>
              <span className="text-[11px] text-slate-500">Utilisées pour le scoring Career-Ops</span>
            </div>
            <div className="flex flex-wrap gap-1.5 p-3 min-h-[90px] max-h-[160px] overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl">
              {formData.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="hover:text-red-400 text-slate-400"
                  >
                    ×
                  </button>
                </span>
              ))}
              {formData.skills.length === 0 && (
                <span className="text-xs text-slate-500 italic">Aucune compétence enregistrée. Importez votre CV ou ajoutez-en manuellement.</span>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                placeholder="Ajouter une compétence (ex: React, SQL, Management...)"
                className="flex-1 px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={addSkill}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium rounded-lg text-slate-200 transition"
              >
                Ajouter
              </button>
            </div>
          </div>

          {/* Mots Interdits (Strict Exclusion) */}
          <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/20">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <label className="text-xs font-semibold text-red-300">
                Mots interdits (Exclusion stricte)
              </label>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Toute offre contenant l'un de ces mots sera automatiquement rejetée et masquée (ex: alternance, stage, bénévole).
            </p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {formData.blacklistedKeywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-red-500/10 text-red-300 border border-red-500/20"
                >
                  🚫 {kw}
                  <button
                    type="button"
                    onClick={() => removeBlacklist(kw)}
                    className="hover:text-red-200 text-red-400 ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newBlacklist}
                onChange={(e) => setNewBlacklist(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBlacklist())}
                placeholder="Ajouter un mot interdit (ex: alternance, freelance...)"
                className="flex-1 px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-red-500"
              />
              <button
                type="button"
                onClick={addBlacklist}
                className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/60 border border-red-700/50 text-xs font-medium rounded-lg text-red-200 transition"
              >
                Interdire
              </button>
            </div>
          </div>

          {/* Seuil minimum de note */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-slate-300">
                Seuil de note minimal pour retenir l'offre : <span className="font-bold text-blue-400">{formData.minimumScoreThreshold}/5</span>
              </label>
              <span className="text-[11px] text-slate-500">Ne conserve que les offres les plus pertinentes</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="4.5"
              step="0.5"
              value={formData.minimumScoreThreshold}
              onChange={(e) => setFormData({ ...formData, minimumScoreThreshold: parseFloat(e.target.value) })}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>1.0 (Tout voir)</span>
              <span>2.5 (Large)</span>
              <span>3.5 (Recommandé)</span>
              <span>4.5 (Top Match uniquement)</span>
            </div>
          </div>
        </div>

        {/* Pied de modal */}
        <div className="mt-8 pt-4 border-t border-[#242c3d] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-500/20 transition flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Enregistrer le profil
          </button>
        </div>
      </div>
    </div>
  );
};
