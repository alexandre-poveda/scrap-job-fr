import React, { useState } from 'react';
import type { UserProfile, ContractType, CandidateFile } from '../lib/types.ts';
import { parseProfileFromText } from '../lib/profile/profile-parser.ts';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Upload,
  FileText,
  ShieldAlert,
  Sparkles,
  Check,
  Trash2,
  Plus,
  RotateCcw,
  FileCheck,
  FilePlus,
  HelpCircle,
  GraduationCap,
  Globe,
  Share2,
  Link2,
  Calendar,
  CheckSquare,
  MessageSquare,
  Linkedin,
  ExternalLink,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

const SUGGESTED_SKILLS = [
  'Communication digitale',
  'Réseaux sociaux',
  'Création de contenu',
  'Canva',
  'Stratégie de communication',
  'Relations presse',
  'WordPress',
  'SEO',
  'Suite Adobe',
  'Événementiel',
  'Rédaction web',
  'Gestion de projet',
];

interface ProfileTabProps {
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ profile, onSaveProfile }) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [newSkill, setNewSkill] = useState('');
  const [newBlacklist, setNewBlacklist] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');

  // États pour la modal de connexion / synchronisation LinkedIn
  const [isLinkedInModalOpen, setIsLinkedInModalOpen] = useState(false);
  const [linkedInTab, setLinkedInTab] = useState<'pdf' | 'text'>('pdf');
  const [linkedInUrlInput, setLinkedInUrlInput] = useState(profile.linkedinUrl || '');
  const [linkedInSchoolInput, setLinkedInSchoolInput] = useState(profile.schoolName || '');
  const [linkedInDegreeInput, setLinkedInDegreeInput] = useState(profile.degreeTitle || '');
  const [linkedInTextInput, setLinkedInTextInput] = useState('');
  const [isAnalyzingLinkedIn, setIsAnalyzingLinkedIn] = useState(false);
  const [linkedInPreview, setLinkedInPreview] = useState<Partial<UserProfile> | null>(null);
  const [linkedInFeedback, setLinkedInFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const insertTagInLetter = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      defaultCoverLetter: (prev.defaultCoverLetter || '') + tag + ' ',
    }));
  };

  const insertTagInMotivation = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      digitalCommMotivation: (prev.digitalCommMotivation || '') + tag + ' ',
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadMessage('Lecture et analyse du document...');

    const fileMeta: CandidateFile = {
      id: `file-${Date.now()}`,
      name: file.name,
      type: file.name.toLowerCase().includes('lettre') ? 'cover_letter' : 'cv',
      size: `${Math.round(file.size / 1024)} Ko`,
      dateAdded: new Date().toLocaleDateString('fr-FR'),
    };

    try {
      // Si fichier texte brut / markdown / json
      if (file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.json')) {
        const text = await file.text();
        const parsed = parseProfileFromText(text);
        setFormData((prev) => ({
          ...prev,
          name: parsed.name || prev.name,
          title: parsed.title || prev.title,
          schoolName: parsed.schoolName || prev.schoolName,
          degreeTitle: parsed.degreeTitle || prev.degreeTitle,
          email: parsed.email || prev.email,
          phone: parsed.phone || prev.phone,
          city: parsed.city || prev.city,
          linkedinUrl: parsed.linkedinUrl || prev.linkedinUrl,
          skills: Array.from(new Set([...prev.skills, ...(parsed.skills || [])])),
          experienceYears: parsed.experienceYears || prev.experienceYears,
          cvRawText: text,
          cvFileName: file.name,
          customFiles: [fileMeta, ...(prev.customFiles?.filter((f) => f.name !== file.name) || [])],
        }));
        setUploadMessage(`✅ Fichier ${file.name} analysé ! ${parsed.skills?.length || 0} compétences détectées.`);
        setIsUploading(false);
        return;
      }

      // Si PDF ou autre
      const data = new FormData();
      data.append('file', file);
      data.append('type', 'cv');

      const res = await fetch('/api/parse-cv', {
        method: 'POST',
        body: data,
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.profile) {
          const parsed = json.profile;
          setFormData((prev) => ({
            ...prev,
            name: parsed.name || prev.name,
            title: parsed.title || prev.title,
            schoolName: parsed.schoolName || prev.schoolName,
            degreeTitle: parsed.degreeTitle || prev.degreeTitle,
            email: parsed.email || prev.email,
            phone: parsed.phone || prev.phone,
            city: parsed.city || prev.city,
            linkedinUrl: parsed.linkedinUrl || prev.linkedinUrl,
            skills: Array.from(new Set([...prev.skills, ...(parsed.skills || [])])),
            experienceYears: parsed.experienceYears || prev.experienceYears,
            cvRawText: parsed.cvRawText || prev.cvRawText,
            cvFileName: file.name,
            customFiles: [fileMeta, ...(prev.customFiles?.filter((f) => f.name !== file.name) || [])],
          }));
          setUploadMessage(`✅ CV "${file.name}" importé et analysé ! ${parsed.skills?.length || 0} compétences extraites.`);
          return;
        }
      }

      // Ajout du fichier même si le parsing est partiel
      setFormData((prev) => ({
        ...prev,
        cvFileName: file.name,
        customFiles: [fileMeta, ...(prev.customFiles?.filter((f) => f.name !== file.name) || [])],
      }));
      setUploadMessage(`✅ Fichier ${file.name} enregistré pour vos candidatures.`);
    } catch (err: any) {
      setUploadMessage(`⚠️ Fichier ajouté : ${err.message}`);
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
        schoolName: parsed.schoolName || prev.schoolName,
        degreeTitle: parsed.degreeTitle || prev.degreeTitle,
        email: parsed.email || prev.email,
        phone: parsed.phone || prev.phone,
        city: parsed.city || prev.city,
        linkedinUrl: parsed.linkedinUrl || prev.linkedinUrl,
        skills: Array.from(new Set([...prev.skills, ...(parsed.skills || [])])),
        experienceYears: parsed.experienceYears || prev.experienceYears,
        cvRawText: pastedText,
      }));
      setUploadMessage(`✅ Texte analysé ! ${parsed.skills?.length || 0} compétences extraites avec succès.`);
      setPastedText('');
      setIsPasteOpen(false);
    } catch (err: any) {
      setUploadMessage(`❌ Erreur: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Traitement de l'import PDF officiel LinkedIn
  const handleLinkedInPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingLinkedIn(true);
    setLinkedInFeedback(null);
    setLinkedInPreview(null);

    try {
      const data = new FormData();
      data.append('file', file);
      data.append('type', 'linkedin');

      const res = await fetch('/api/parse-cv', {
        method: 'POST',
        body: data,
      });

      const json = await res.json();
      if (res.ok && json.success && json.profile) {
        setLinkedInPreview(json.profile);
        setLinkedInFeedback({
          type: 'success',
          message: 'Profil officiel LinkedIn analysé avec succès ! Vérifiez les informations ci-dessous puis validez la synchronisation.',
        });
      } else {
        setLinkedInFeedback({
          type: 'error',
          message: json.error || 'Impossible de lire le document. Assurez-vous d\'exporter le PDF officiel depuis votre profil LinkedIn.',
        });
      }
    } catch (err: any) {
      setLinkedInFeedback({
        type: 'error',
        message: `Erreur de communication : ${err.message}`,
      });
    } finally {
      setIsAnalyzingLinkedIn(false);
    }
  };

  // Traitement de la synchronisation LinkedIn par texte ou URL
  const handleLinkedInTextAnalyze = () => {
    if (!linkedInTextInput.trim() && !linkedInUrlInput.trim() && !linkedInSchoolInput.trim()) return;

    setIsAnalyzingLinkedIn(true);
    setLinkedInFeedback(null);
    setLinkedInPreview(null);

    const cleanUrl = linkedInUrlInput.trim()
      ? linkedInUrlInput.trim().startsWith('http')
        ? linkedInUrlInput.trim()
        : `https://${linkedInUrlInput.trim()}`
      : '';

    // Si l'utilisateur a saisi l'URL et/ou son école et diplôme directement
    if (!linkedInTextInput.trim()) {
      setLinkedInPreview({
        linkedinUrl: cleanUrl || undefined,
        name: formData.name,
        title: formData.title,
        schoolName: linkedInSchoolInput.trim() || formData.schoolName,
        degreeTitle: linkedInDegreeInput.trim() || formData.degreeTitle,
      });
      setLinkedInFeedback({
        type: 'success',
        message: 'Lien LinkedIn et informations prises en compte ! Vérifiez ci-dessous puis validez l\'enregistrement sur votre profil.',
      });
      setIsAnalyzingLinkedIn(false);
      return;
    }

    try {
      const combinedText = `${cleanUrl}\n${linkedInTextInput}`;
      const parsed = parseProfileFromText(combinedText, 'linkedin');
      if (cleanUrl) parsed.linkedinUrl = cleanUrl;
      if (!parsed.schoolName && linkedInSchoolInput.trim()) parsed.schoolName = linkedInSchoolInput.trim();
      if (!parsed.degreeTitle && linkedInDegreeInput.trim()) parsed.degreeTitle = linkedInDegreeInput.trim();

      setLinkedInPreview(parsed);
      setLinkedInFeedback({
        type: 'success',
        message: 'Informations de profil détectées ! Vérifiez les données ci-dessous puis confirmez.',
      });
    } catch (err: any) {
      setLinkedInFeedback({
        type: 'error',
        message: `Erreur d'analyse : ${err.message}`,
      });
    } finally {
      setIsAnalyzingLinkedIn(false);
    }
  };

  // Confirmation et application des données LinkedIn au profil
  const handleApplyLinkedInData = () => {
    if (!linkedInPreview) return;

    setFormData((prev) => {
      const updatedSkills = Array.from(new Set([...prev.skills, ...(linkedInPreview.skills || [])]));
      const newFiles = prev.customFiles ? [...prev.customFiles] : [];
      if (linkedInTab === 'pdf') {
        newFiles.unshift({
          id: `file-linkedin-${Date.now()}`,
          name: `Export_LinkedIn_${(linkedInPreview.name || 'Profil').replace(/\s+/g, '_')}.pdf`,
          type: 'cv',
          size: 'Profil LinkedIn',
          dateAdded: new Date().toLocaleDateString('fr-FR'),
        });
      }

      return {
        ...prev,
        name: linkedInPreview.name || prev.name,
        title: linkedInPreview.title || prev.title,
        schoolName: linkedInPreview.schoolName || linkedInSchoolInput.trim() || prev.schoolName,
        degreeTitle: linkedInPreview.degreeTitle || linkedInDegreeInput.trim() || prev.degreeTitle,
        linkedinUrl: linkedInPreview.linkedinUrl || prev.linkedinUrl || linkedInUrlInput,
        email: linkedInPreview.email || prev.email,
        phone: linkedInPreview.phone || prev.phone,
        city: linkedInPreview.city || prev.city,
        summary: linkedInPreview.summary || prev.summary,
        skills: updatedSkills,
        customFiles: newFiles,
      };
    });

    setIsLinkedInModalOpen(false);
    setUploadMessage(
      `🎉 Profil LinkedIn synchronisé avec succès ! École : "${linkedInPreview.schoolName || linkedInSchoolInput.trim() || 'Enregistrée'}", Diplôme : "${linkedInPreview.degreeTitle || linkedInDegreeInput.trim() || 'Enregistré'}", Lien : "${linkedInPreview.linkedinUrl || linkedInUrlInput}".`
    );
    setLinkedInPreview(null);
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData((prev) => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
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

  const removeBlacklist = (kw: string) => {
    setFormData((prev) => ({
      ...prev,
      blacklistedKeywords: prev.blacklistedKeywords.filter((k) => k !== kw),
    }));
  };

  const removeFile = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      customFiles: prev.customFiles?.filter((f) => f.id !== id),
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
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Bannière Header */}
      <div className="p-6 rounded-2xl bg-[#12161f] border border-[#242c3d] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-blue-500/20">
            {formData.name ? formData.name.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {formData.name || 'Mon Profil Candidat'}
              </h2>
              {formData.linkedinUrl && (
                <span className="px-2 py-0.5 text-[10px] bg-[#0A66C2]/20 text-sky-300 border border-[#0A66C2]/40 rounded-full font-semibold flex items-center gap-1">
                  <Linkedin className="w-2.5 h-2.5 fill-current" /> LinkedIn
                </span>
              )}
            </div>
            <p className="text-xs text-blue-400 font-medium">{formData.title || 'Définissez votre poste cible'}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {formData.schoolName ? (
                <span>🎓 <strong className="text-slate-300">{formData.schoolName}</strong> {formData.degreeTitle ? `(${formData.degreeTitle})` : ''} • </span>
              ) : null}
              {formData.skills.length} compétences • {formData.customFiles?.length || 0} fichier(s)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setIsLinkedInModalOpen(true);
              setLinkedInPreview(null);
              setLinkedInFeedback(null);
            }}
            className="px-4 py-2.5 bg-[#0A66C2] hover:bg-[#004182] text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer"
          >
            <Linkedin className="w-4 h-4 fill-current" />
            <span>{formData.linkedinUrl ? 'LinkedIn Connecté' : 'Connecter LinkedIn'}</span>
          </button>

          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer"
          >
            {saveSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Sparkles className="w-4 h-4" />}
            <span>{saveSuccess ? 'Enregistré avec succès !' : 'Enregistrer mon profil'}</span>
          </button>
        </div>
      </div>

      {/* Carte Dédiée : Accélérateur de Profil & Synchronisation LinkedIn */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#004182]/30 via-[#0A66C2]/15 to-slate-900 border border-[#0A66C2]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#0A66C2] flex items-center justify-center text-white shrink-0 shadow-lg shadow-[#0A66C2]/30">
            <Linkedin className="w-6 h-6 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Connexion & Synchronisation LinkedIn</h3>
              {formData.linkedinUrl ? (
                <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Connecté
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full font-semibold">
                  Accélérateur de profil
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {formData.schoolName ? (
                <span>
                  🎓 École : <strong className="text-white">{formData.schoolName}</strong>
                  {formData.degreeTitle && <> • Diplôme : <strong className="text-white">{formData.degreeTitle}</strong></>}
                  {formData.linkedinUrl && (
                    <a
                      href={formData.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 hover:underline font-medium"
                    >
                      Voir profil <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </span>
              ) : (
                'Récupérez automatiquement votre école, intitulé exact de formation, compétences et coordonnées depuis LinkedIn pour accélérer et pré-remplir vos candidatures.'
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsLinkedInModalOpen(true);
            setLinkedInPreview(null);
            setLinkedInFeedback(null);
          }}
          className="px-4 py-2.5 bg-[#0A66C2] hover:bg-[#004182] text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Linkedin className="w-4 h-4 fill-current" />
          <span>{formData.linkedinUrl ? 'Re-synchroniser LinkedIn' : 'Connecter mon LinkedIn'}</span>
        </button>
      </div>

      {/* Grille Principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne 1 & 2 : Informations & Fichiers */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bloc 1 : Coordonnées & Recherche */}
          <div className="p-6 rounded-2xl bg-[#12161f] border border-[#242c3d] shadow-lg space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#242c3d]">
              <User className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Coordonnées & Poste Cible</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nom complet</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Alexandre Poveda"
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Poste recherché</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Chargé de communication"
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Email de contact</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Ex: alexandre@exemple.fr"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Numéro de téléphone</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Ex: 06 12 34 56 78"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Ville / Zone de résidence</label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Ex: Marseille (13), Bouches-du-Rhône"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Années d'expérience</label>
                <div className="relative">
                  <Briefcase className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="number"
                    min={0}
                    max={40}
                    value={formData.experienceYears || 0}
                    onChange={(e) => setFormData({ ...formData, experienceYears: parseInt(e.target.value, 10) || 0 })}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bloc 2 : Gestion des Fichiers & Pièces Jointes */}
          <div className="p-6 rounded-2xl bg-[#12161f] border border-[#242c3d] shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#242c3d]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Gestion des Fichiers & CV</h3>
              </div>
              <span className="text-[11px] text-slate-400">
                {formData.customFiles?.length || 0} document(s) enregistré(s)
              </span>
            </div>

            {/* Zone d'importation */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-dashed border-blue-500/30">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FilePlus className="w-8 h-8 text-blue-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-semibold text-white">Ajouter un CV ou document</h4>
                    <p className="text-[11px] text-slate-400">Formats supportés : PDF, Word, TXT, JSON, MD</p>
                  </div>
                </div>
                <label className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-2">
                  <Upload className="w-3.5 h-3.5" />
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

              {/* Option Copier-coller */}
              <div className="mt-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPasteOpen(!isPasteOpen)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1.5 transition"
                >
                  <span>{isPasteOpen ? '▼ Masquer la saisie directe' : '▶ Ou copier-coller le texte de votre CV / profil'}</span>
                </button>

                {isPasteOpen && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      rows={3}
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder="Collez ici le texte brut de votre CV pour en extraire les compétences..."
                      className="w-full p-2.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleExtractFromPasted}
                        disabled={!pastedText.trim()}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Extraire les compétences</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Liste des fichiers importés */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Vos pièces jointes enregistrées</label>
              <div className="space-y-1.5">
                {(formData.customFiles || []).map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-white">{file.name}</span>
                          {file.name === formData.cvFileName && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded">
                              CV Principal
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500">{file.size} • Ajouté le {file.dateAdded}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bloc 3 : Modèle de Lettre de Motivation & Pitch Pré-rempli */}
          <div className="p-6 rounded-2xl bg-[#12161f] border border-[#242c3d] shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#242c3d]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Modèle de Lettre de Motivation & Pitch</h3>
              </div>
              <span className="text-[11px] text-slate-400">Ce que vous écrivez d'habitude</span>
            </div>

            <div className="p-3 bg-blue-950/20 border border-blue-500/20 rounded-xl text-xs text-blue-300 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Insérer une variable dynamique dans votre texte :</span>
                </span>
                <span className="text-[10px] text-slate-400">Remplacées automatiquement à chaque offre</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => insertTagInLetter('{entreprise}')}
                  className="px-2 py-1 text-[11px] font-mono bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-md transition cursor-pointer"
                  title="Insère le nom de l'entreprise ciblée"
                >
                  + {'{entreprise}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertTagInLetter('{poste}')}
                  className="px-2 py-1 text-[11px] font-mono bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-md transition cursor-pointer"
                  title="Insère l'intitulé exact du poste"
                >
                  + {'{poste}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertTagInLetter('{ville}')}
                  className="px-2 py-1 text-[11px] font-mono bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-md transition cursor-pointer"
                  title="Insère la localisation de l'offre"
                >
                  + {'{ville}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertTagInLetter('{competences_cles}')}
                  className="px-2 py-1 text-[11px] font-mono bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-md transition cursor-pointer"
                  title="Insère vos compétences correspondantes à l'offre"
                >
                  + {'{competences_cles}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertTagInLetter('{nom}')}
                  className="px-2 py-1 text-[11px] font-mono bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-md transition cursor-pointer"
                  title="Insère votre nom complet"
                >
                  + {'{nom}'}
                </button>
              </div>
            </div>

            {/* Lettre type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">
                Votre modèle habituel de lettre de motivation
              </label>
              <textarea
                rows={8}
                value={formData.defaultCoverLetter || ''}
                onChange={(e) => setFormData({ ...formData, defaultCoverLetter: e.target.value })}
                placeholder="Madame, Monsieur, Vivement intéressé(e) par le poste de {poste} au sein de {entreprise}..."
                className="w-full p-3.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 font-sans leading-relaxed shadow-inner"
              />
            </div>

            {/* Pitch court */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">
                Pitch d'accroche court (message direct RH / champ court)
              </label>
              <textarea
                rows={3}
                value={formData.defaultPitch || ''}
                onChange={(e) => setFormData({ ...formData, defaultPitch: e.target.value })}
                className="w-full p-3 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 font-sans leading-relaxed shadow-inner"
              />
            </div>
          </div>

          {/* Bloc 4 : Questionnaire & Réponses types pour les formulaires recruteurs */}
          <div className="p-6 rounded-2xl bg-[#12161f] border border-[#242c3d] shadow-lg space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#242c3d]">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Réponses types aux questions des formulaires</h3>
              </div>
              <span className="text-[11px] text-emerald-400 font-medium">Pré-remplissage en 1 clic</span>
            </div>

            <p className="text-xs text-slate-400">
              Ces informations alimentent l'assistant de candidature pour répondre automatiquement aux questions récurrentes des sites d'emploi (écoles, alternance, réseaux sociaux, portfolio, disponibilités).
            </p>

            <div className="space-y-4">
              {/* Question 1 : Motivation Communication Digitale */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                    <span>Qu'est-ce qui vous donne envie de participer à la communication digitale ?</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => insertTagInMotivation('{entreprise}')}
                    className="px-2 py-0.5 text-[10px] font-mono bg-blue-500/20 text-blue-300 rounded border border-blue-500/30 hover:bg-blue-500/30 transition cursor-pointer"
                  >
                    + {'{entreprise}'}
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={formData.digitalCommMotivation || ''}
                  onChange={(e) => setFormData({ ...formData, digitalCommMotivation: e.target.value })}
                  placeholder="Ce qui me donne envie de participer à la communication digitale de {entreprise}..."
                  className="w-full p-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Question 2 : Formation & École */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
                  <span>École / Université & Intitulé exact de votre formation</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[11px] text-slate-400 mb-1">Nom de l'école / université</span>
                    <input
                      type="text"
                      value={formData.schoolName || ''}
                      onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                      placeholder="Ex: Université d'Aix-Marseille, EFAP..."
                      className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 mb-1">Intitulé exact du diplôme / formation</span>
                    <input
                      type="text"
                      value={formData.degreeTitle || ''}
                      onChange={(e) => setFormData({ ...formData, degreeTitle: e.target.value })}
                      placeholder="Ex: Master Information & Communication Digitale"
                      className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Question 3 & 4 : Rythme d'alternance & Présentiel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200">
                    Rythme d'alternance (si demandé par le formulaire)
                  </label>
                  <input
                    type="text"
                    value={formData.alternanceRhythm || ''}
                    onChange={(e) => setFormData({ ...formData, alternanceRhythm: e.target.value })}
                    placeholder="Ex: 0 (Non concerné - Candidature temps plein)"
                    className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-500">Par défaut : 0 car vous postulez en contrat classique.</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200">
                    Compatibilité présence sur site / organisation
                  </label>
                  <input
                    type="text"
                    value={formData.onSiteCompatibility || ''}
                    onChange={(e) => setFormData({ ...formData, onSiteCompatibility: e.target.value })}
                    placeholder="Ex: Oui, mes conditions sont 100% compatibles."
                    className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-500">Réponse pour confirmer la compatibilité présentiel.</span>
                </div>
              </div>

              {/* Question 5 : Création de contenus réseaux sociaux */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Avez-vous créé des contenus destinés aux réseaux sociaux ?</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.socialMediaDetails || ''}
                  onChange={(e) => setFormData({ ...formData, socialMediaDetails: e.target.value })}
                  placeholder="Oui, création régulière de contenus visuels et vidéos (Reels, TikTok, LinkedIn, Instagram). Conception sur Canva / Adobe..."
                  className="w-full p-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Question 6 : Portfolio & Liens de réalisations */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Liens vers vos réalisations (Portfolio, LinkedIn, Projets)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <span className="block text-[11px] text-slate-400 mb-1">Portfolio / Site web</span>
                    <input
                      type="url"
                      value={formData.portfolioUrl || ''}
                      onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                      placeholder="https://mon-portfolio.fr"
                      className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 mb-1">Profil LinkedIn</span>
                    <input
                      type="url"
                      value={formData.linkedinUrl || ''}
                      onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                      placeholder="https://linkedin.com/in/profil"
                      className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 mb-1">Lien Projets / Vidéos / Drive</span>
                    <input
                      type="url"
                      value={formData.githubOrProjectsUrl || ''}
                      onChange={(e) => setFormData({ ...formData, githubOrProjectsUrl: e.target.value })}
                      placeholder="https://drive.google.com/..."
                      className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Question 7 : Disponibilités */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span>Vos disponibilités</span>
                </label>
                <input
                  type="text"
                  value={formData.availability || ''}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                  placeholder="Ex: Disponible immédiatement / Préavis de 1 mois"
                  className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Colonne 3 : Compétences & Filtres Stricts */}
        <div className="space-y-6">
          {/* Bloc Compétences */}
          <div className="p-6 rounded-2xl bg-[#12161f] border border-[#242c3d] shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#242c3d]">
              <h3 className="text-sm font-bold text-white">
                Compétences ({formData.skills.length})
              </h3>
              <span className="text-[10px] text-slate-500">Scoring Career-Ops</span>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto p-2 bg-slate-900 border border-slate-800 rounded-xl">
              {formData.skills.length === 0 ? (
                <div className="w-full py-4 text-center text-xs text-slate-500 italic">
                  Aucune compétence enregistrée. Importez votre CV ou cliquez sur les suggestions ci-dessous.
                </div>
              ) : (
                formData.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="hover:text-red-400 text-slate-400 ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                placeholder="Ajouter une compétence..."
                className="flex-1 px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={addSkill}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg border border-slate-700 transition"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Suggestions rapides de compétences */}
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-400 font-medium block mb-1.5">
                💡 Suggestions rapides (cliquez pour ajouter) :
              </span>
              <div className="flex flex-wrap gap-1">
                {SUGGESTED_SKILLS.filter((s) => !formData.skills.includes(s))
                  .slice(0, 8)
                  .map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          skills: [...prev.skills, s],
                        }))
                      }
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-800/90 hover:bg-blue-600/30 text-slate-300 hover:text-blue-300 border border-slate-700/60 transition cursor-pointer"
                    >
                      + {s}
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Bloc Mots Interdits */}
          <div className="p-6 rounded-2xl bg-red-950/20 border border-red-500/20 shadow-lg space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-red-500/20">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-bold text-red-300">Filtres Stricts d'Exclusion</h3>
            </div>
            <p className="text-[11px] text-slate-400">
              Toute offre contenant l'un de ces mots sera rejetée automatiquement.
            </p>

            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 bg-slate-900/80 border border-red-500/20 rounded-xl">
              {formData.blacklistedKeywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded bg-red-500/10 text-red-300 border border-red-500/20"
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
                placeholder="Exclure un mot..."
                className="flex-1 px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-red-500"
              />
              <button
                type="button"
                onClick={addBlacklist}
                className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/60 text-xs font-medium text-red-200 rounded-lg border border-red-700/50 transition"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bloc Contrats */}
          <div className="p-6 rounded-2xl bg-[#12161f] border border-[#242c3d] shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-white pb-3 border-b border-[#242c3d]">
              Contrats souhaités
            </h3>

            <div>
              <p className="text-[11px] text-slate-400 mb-2.5">
                Sélectionnez les types de contrats qui vous intéressent pour le filtrage et la personnalisation de vos candidatures :
              </p>
              <div className="flex flex-wrap gap-2">
                {(['CDI', 'CDD', 'Interim', 'FonctionPublique'] as ContractType[]).map((c) => {
                  const isSel = formData.preferredContracts.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleContract(c)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition cursor-pointer ${
                        isSel
                          ? 'bg-blue-600/20 text-blue-400 border-blue-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {c === 'Interim'
                        ? 'Intérim'
                        : c === 'FonctionPublique'
                        ? 'Fonction Publique (Mairie, Collectivités)'
                        : c}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                🏛️ <em>Fonction Publique (Mairie, Collectivités)</em> regroupe la Fonction Publique Territoriale (Mairies, Métropoles, Départements) issue notamment d'Emploi Territorial.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Connexion / Synchronisation LinkedIn */}
      {isLinkedInModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#0e131d] border border-[#242c3d] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="p-5 border-b border-[#242c3d] bg-[#121723] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0A66C2] flex items-center justify-center text-white shadow-md shadow-[#0A66C2]/30">
                  <Linkedin className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Connecter & Synchroniser LinkedIn</h3>
                  <p className="text-[11px] text-slate-400">
                    Importez votre école, diplôme, compétences et infos de contact en quelques secondes
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsLinkedInModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Onglets Méthode */}
            <div className="flex border-b border-[#242c3d] bg-slate-900/60 p-1.5 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setLinkedInTab('pdf');
                  setLinkedInFeedback(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-2 ${
                  linkedInTab === 'pdf'
                    ? 'bg-[#0A66C2] text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Export PDF Officiel LinkedIn (Recommandé)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLinkedInTab('text');
                  setLinkedInFeedback(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-2 ${
                  linkedInTab === 'text'
                    ? 'bg-[#0A66C2] text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>URL & Copier-Coller Direct</span>
              </button>
            </div>

            {/* Corps Modal */}
            <div className="p-6 overflow-y-auto space-y-5">
              {linkedInTab === 'pdf' ? (
                <div className="space-y-4">
                  {/* Guide étape par étape */}
                  <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/20 space-y-2.5">
                    <h4 className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      <span>Comment obtenir votre export PDF officiel en 2 clics sur LinkedIn :</span>
                    </h4>
                    <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside pl-1">
                      <li>
                        Rendez-vous sur votre profil LinkedIn :{' '}
                        <a
                          href="https://www.linkedin.com/in/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-400 hover:underline inline-flex items-center gap-1"
                        >
                          linkedin.com <ExternalLink className="w-3 h-3 inline" />
                        </a>
                      </li>
                      <li>
                        Cliquez sur le bouton <strong className="text-white">"Plus"</strong> (ou les trois points <code className="text-sky-300">...</code> sous votre photo de profil)
                      </li>
                      <li>
                        Sélectionnez <strong className="text-white">"Enregistrer au format PDF"</strong>
                      </li>
                      <li>
                        Déposez le fichier PDF téléchargé ci-dessous :
                      </li>
                    </ol>
                  </div>

                  {/* Dropzone d'importation PDF */}
                  <div className="p-6 rounded-2xl border-2 border-dashed border-[#0A66C2]/50 hover:border-[#0A66C2] bg-slate-950/60 text-center transition flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#0A66C2]/20 flex items-center justify-center text-blue-400">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">
                        Glissez-déposez votre export PDF LinkedIn ici
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Fichier PDF officiel généré par LinkedIn (avec votre parcours, formation et compétences)
                      </p>
                    </div>

                    <label className="cursor-pointer px-4 py-2 bg-[#0A66C2] hover:bg-[#004182] text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-2">
                      <FilePlus className="w-4 h-4" />
                      <span>{isAnalyzingLinkedIn ? 'Analyse du profil en cours...' : 'Sélectionner le fichier PDF'}</span>
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={handleLinkedInPdfUpload}
                        disabled={isAnalyzingLinkedIn}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Note explicative sur l'accès direct LinkedIn */}
                  <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Pourquoi l'URL seule ne peut pas être lue à distance sans connexion ?</span>
                      <span className="text-[11px] text-slate-300 mt-0.5 block leading-relaxed">
                        LinkedIn protège ses profils contre le scraping externe et bloque l'accès public (sécurité anti-robot code 999).
                        Pour renseigner votre formation en quelques secondes, vous pouvez soit confirmer votre école et diplôme ci-dessous, soit glisser votre export officiel (onglet 1 : Profil &gt; Plus &gt; Enregistrer au format PDF).
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>Lien de votre profil LinkedIn</span>
                    </label>
                    <input
                      type="text"
                      value={linkedInUrlInput}
                      onChange={(e) => setLinkedInUrlInput(e.target.value)}
                      placeholder="Ex: www.linkedin.com/in/alexandre-poveda-905308264"
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  {/* Saisie directe et rapide de l'école et diplôme */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
                        <span>École / Université</span>
                      </label>
                      <input
                        type="text"
                        value={linkedInSchoolInput}
                        onChange={(e) => setLinkedInSchoolInput(e.target.value)}
                        placeholder="Ex: Université d'Aix-Marseille, EFAP..."
                        className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-sky-400" />
                        <span>Intitulé exact du diplôme</span>
                      </label>
                      <input
                        type="text"
                        value={linkedInDegreeInput}
                        onChange={(e) => setLinkedInDegreeInput(e.target.value)}
                        placeholder="Ex: Master Information & Communication"
                        className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                      <FilePlus className="w-3.5 h-3.5 text-blue-400" />
                      <span>Ou coller du texte de votre profil LinkedIn (optionnel)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={linkedInTextInput}
                      onChange={(e) => setLinkedInTextInput(e.target.value)}
                      placeholder="Copiez et collez ici le texte de vos sections LinkedIn (formation, compétences, résumé) pour extraction automatique..."
                      className="w-full p-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 font-sans"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleLinkedInTextAnalyze}
                      disabled={isAnalyzingLinkedIn || (!linkedInTextInput.trim() && !linkedInUrlInput.trim() && !linkedInSchoolInput.trim())}
                      className="px-4 py-2 bg-[#0A66C2] hover:bg-[#004182] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isAnalyzingLinkedIn ? 'Analyse en cours...' : '⚡ Synchroniser mon profil LinkedIn'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Message de feedback */}
              {linkedInFeedback && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                    linkedInFeedback.type === 'success'
                      ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                      : 'bg-red-950/40 border border-red-500/40 text-red-300'
                  }`}
                >
                  {linkedInFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <span>{linkedInFeedback.message}</span>
                </div>
              )}

              {/* Aperçu des données détectées */}
              {linkedInPreview && (
                <div className="p-4 rounded-xl bg-slate-900 border border-blue-500/30 space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Informations LinkedIn détectées avec succès :</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">École / Université</span>
                      <span className="font-semibold text-white">
                        {linkedInPreview.schoolName || <span className="text-amber-400 font-normal">Non détectée</span>}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Intitulé du diplôme</span>
                      <span className="font-semibold text-white">
                        {linkedInPreview.degreeTitle || <span className="text-amber-400 font-normal">Non détecté</span>}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Candidat & Titre</span>
                      <span className="font-semibold text-white">
                        {linkedInPreview.name || formData.name} • {linkedInPreview.title || formData.title}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Profil LinkedIn</span>
                      <span className="font-semibold text-sky-400 truncate block">
                        {linkedInPreview.linkedinUrl || linkedInUrlInput || '—'}
                      </span>
                    </div>
                  </div>

                  {linkedInPreview.skills && linkedInPreview.skills.length > 0 && (
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">
                        {linkedInPreview.skills.length} Compétence(s) extraite(s) :
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 bg-slate-950/50 rounded-lg border border-slate-800">
                        {linkedInPreview.skills.map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 text-[10px] bg-blue-500/20 text-blue-300 rounded border border-blue-500/30"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setLinkedInPreview(null)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition"
                    >
                      Réinitialiser
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyLinkedInData}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-600/20 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Valider et enregistrer sur mon profil</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-[#242c3d] bg-[#121723] flex items-center justify-between text-xs text-slate-400">
              <span>Astuce : Vous pouvez également modifier manuellement chaque champ dans le formulaire ci-dessous.</span>
              <button
                type="button"
                onClick={() => setIsLinkedInModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
