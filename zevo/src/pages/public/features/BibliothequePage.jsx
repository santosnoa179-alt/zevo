import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, BookOpen, FolderOpen, Search, Upload,
  Video, FileText, Image, Film, Link, Tag,
  Star, Shield, Zap, Users, Lock, Share2,
  ChevronRight, Sparkles, Filter, Grid3X3, Download
} from 'lucide-react'
import { ZevoLogo } from '../../../components/ui/ZevoLogo'

const FEATURES_DETAIL = [
  {
    icon: FolderOpen,
    title: 'Organisation par dossiers',
    desc: 'Cree des dossiers et sous-dossiers pour organiser tes ressources : exercices, guides, videos, documents PDF.',
  },
  {
    icon: Video,
    title: 'Videos d\'exercices',
    desc: 'Uploade tes propres videos de demonstrations ou utilise la bibliotheque integree. Associe-les a tes exercices.',
  },
  {
    icon: FileText,
    title: 'Documents & PDF',
    desc: 'Guides nutritionnels, plans d\'entrainement PDF, fiches techniques. Tout est stocke et accessible en un clic.',
  },
  {
    icon: Search,
    title: 'Recherche intelligente',
    desc: 'Retrouve n\'importe quel fichier en tapant un mot-cle. Recherche par nom, tag ou type de fichier.',
  },
  {
    icon: Share2,
    title: 'Partage client',
    desc: 'Partage des ressources specifiques avec des clients ou groupes de clients. Controle total sur qui voit quoi.',
  },
  {
    icon: Tag,
    title: 'Tags & categories',
    desc: 'Tagge tes ressources pour les retrouver instantanement. Par muscle, type d\'exercice, niveau ou objectif.',
  },
]

const STATS = [
  { value: 'Illimite', label: 'stockage fichiers' },
  { value: '10+', label: 'types de fichiers' },
  { value: '1 clic', label: 'pour partager' },
]

const FILE_PREVIEW = [
  { name: 'Squat - forme correcte.mp4', type: 'video', size: '24 MB', tag: 'Jambes', color: '#FF6B2B' },
  { name: 'Guide nutrition debutant.pdf', type: 'pdf', size: '2.1 MB', tag: 'Nutrition', color: '#3B82F6' },
  { name: 'Programme PPL 8 semaines.pdf', type: 'pdf', size: '1.4 MB', tag: 'Programmes', color: '#10B981' },
  { name: 'Deadlift - tutorial complet.mp4', type: 'video', size: '45 MB', tag: 'Dos', color: '#FF6B2B' },
  { name: 'Fiche bilan initial.docx', type: 'doc', size: '340 KB', tag: 'Formulaires', color: '#8B5CF6' },
  { name: 'Recettes healthy - semaine type.pdf', type: 'pdf', size: '3.8 MB', tag: 'Nutrition', color: '#3B82F6' },
  { name: 'Bench press - variantes.mp4', type: 'video', size: '31 MB', tag: 'Pecs', color: '#FF6B2B' },
  { name: 'Planning seances type.xlsx', type: 'doc', size: '120 KB', tag: 'Planning', color: '#F59E0B' },
]

const TYPE_ICONS = {
  video: Film,
  pdf: FileText,
  doc: FileText,
  image: Image,
}

export default function BibliothequePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5F3]">

      {/* ── Navbar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0D0D0D]/70 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-3.5 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 text-[#F5F5F3]/50 hover:text-[#F5F5F3] transition-colors">
            <ArrowLeft size={16} />
            <ZevoLogo size="sm" />
          </button>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/demo')} className="hidden md:flex px-4 py-2 rounded-lg text-xs font-medium text-[#F5F5F3]/40 hover:text-[#F5F5F3] transition-colors items-center gap-2">
              <Video size={13} className="text-[#FF6B2B]" /> Demo
            </button>
            <button onClick={() => navigate('/register')} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white text-xs font-semibold hover:shadow-lg hover:shadow-[#FF6B2B]/25 transition-all">
              Essai gratuit
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#FF6B2B]/[0.04] rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-5 md:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FF6B2B]/10 border border-[#FF6B2B]/20 mb-6">
            <BookOpen size={14} className="text-[#FF6B2B]" />
            <span className="text-xs font-semibold text-[#FF6B2B]">Bibliotheque & Ressources</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            Toutes tes ressources,{' '}
            <span className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] bg-clip-text text-transparent">
              un seul endroit
            </span>
          </h1>
          <p className="text-lg md:text-xl text-[#F5F5F3]/35 max-w-2xl mx-auto leading-relaxed mb-10">
            Videos, documents, guides, fiches — centralise tout dans ta bibliotheque. Organise, recherche et partage en un clic avec tes clients.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 md:gap-14 mb-14">
            {STATS.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] bg-clip-text text-transparent">{s.value}</p>
                <p className="text-xs text-[#F5F5F3]/25 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Library mockup */}
          <div className="max-w-3xl mx-auto rounded-2xl border border-white/[0.06] bg-[#141414] overflow-hidden shadow-2xl shadow-black/40">
            <div className="h-1 bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E]" />
            <div className="p-4 border-b border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center">
                  <BookOpen size={16} className="text-[#FF6B2B]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Ma Bibliotheque</p>
                  <p className="text-[10px] text-[#F5F5F3]/25">24 fichiers · 3 dossiers</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  <Search size={11} className="text-[#F5F5F3]/20" />
                  <span className="text-[10px] text-[#F5F5F3]/15">Rechercher...</span>
                </div>
                <button className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
                  <Filter size={12} className="text-[#F5F5F3]/20" />
                </button>
                <button className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
                  <Grid3X3 size={12} className="text-[#F5F5F3]/20" />
                </button>
              </div>
            </div>
            {/* Folders */}
            <div className="px-4 pt-4 pb-2">
              <div className="flex gap-2 mb-3">
                {['Videos exercices', 'Guides nutrition', 'Templates'].map((folder, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors cursor-pointer">
                    <FolderOpen size={12} className="text-[#FF6B2B]" />
                    <span className="text-[10px] text-[#F5F5F3]/30 font-medium">{folder}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* File list */}
            <div className="px-4 pb-4 space-y-1.5">
              {FILE_PREVIEW.map((file, i) => {
                const TypeIcon = TYPE_ICONS[file.type] || FileText
                return (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.015] border border-white/[0.04] hover:border-white/[0.08] transition-all cursor-pointer group">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: file.color + '10' }}>
                      <TypeIcon size={14} style={{ color: file.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-[#F5F5F3]/50 truncate group-hover:text-[#F5F5F3]/70 transition-colors">{file.name}</p>
                      <p className="text-[9px] text-[#F5F5F3]/15">{file.size}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[8px] font-medium flex-shrink-0" style={{ backgroundColor: file.color + '10', color: file.color }}>
                      {file.tag}
                    </span>
                  </div>
                )
              })}
            </div>
            {/* Upload zone */}
            <div className="px-4 pb-4">
              <div className="rounded-xl border border-dashed border-white/[0.06] p-4 text-center hover:border-[#FF6B2B]/20 transition-all cursor-pointer">
                <Upload size={16} className="mx-auto text-[#F5F5F3]/15 mb-1" />
                <p className="text-[10px] text-[#F5F5F3]/15">Glisse tes fichiers ici ou clique pour uploader</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="py-20 relative">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">Tout organise, tout accessible</h2>
            <p className="text-[#F5F5F3]/30 max-w-xl mx-auto">Fini les fichiers eparpilles sur Google Drive, Dropbox et WhatsApp. Tout est centralise dans Zevo.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES_DETAIL.map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i} className="group rounded-2xl border border-white/[0.06] bg-[#141414] p-6 hover:border-[#FF6B2B]/20 transition-all duration-500 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B2B]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative z-10">
                    <div className="w-11 h-11 rounded-xl bg-[#FF6B2B]/10 border border-[#FF6B2B]/10 flex items-center justify-center mb-4">
                      <Icon size={20} className="text-[#FF6B2B]" />
                    </div>
                    <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                    <p className="text-sm text-[#F5F5F3]/30 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── File types ── */}
      <section className="py-20 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-14">Compatible avec tous tes fichiers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Film, label: 'Videos', formats: 'MP4, MOV, AVI', color: '#FF6B2B' },
              { icon: FileText, label: 'Documents', formats: 'PDF, DOCX, XLSX', color: '#3B82F6' },
              { icon: Image, label: 'Images', formats: 'JPG, PNG, WEBP', color: '#10B981' },
              { icon: Link, label: 'Liens', formats: 'YouTube, Vimeo, URL', color: '#F59E0B' },
            ].map((t, i) => {
              const Icon = t.icon
              return (
                <div key={i} className="rounded-2xl border border-white/[0.06] bg-[#141414] p-6 text-center">
                  <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: t.color + '10' }}>
                    <Icon size={22} style={{ color: t.color }} />
                  </div>
                  <p className="text-sm font-semibold mb-1">{t.label}</p>
                  <p className="text-[10px] text-[#F5F5F3]/20">{t.formats}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 border-t border-white/[0.04]">
        <div className="max-w-2xl mx-auto px-5 md:px-8 text-center">
          <h2 className="text-2xl md:text-4xl font-bold mb-4">
            Pret a centraliser tes{' '}
            <span className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] bg-clip-text text-transparent">ressources</span> ?
          </h2>
          <p className="text-[#F5F5F3]/30 mb-8 max-w-md mx-auto">14 jours gratuits. Toutes les fonctionnalites. Sans carte bancaire.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/register')} className="group px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#FF6B2B] to-[#FF8F5E] text-white font-semibold hover:shadow-lg hover:shadow-[#FF6B2B]/25 transition-all inline-flex items-center gap-2">
              Commencer gratuitement <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button onClick={() => navigate('/demo')} className="px-6 py-3.5 rounded-xl border border-white/[0.07] text-[#F5F5F3]/40 font-medium hover:bg-white/[0.03] hover:text-[#F5F5F3] transition-all flex items-center gap-2">
              <Video size={14} className="text-[#FF6B2B]" /> Voir une demo
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer mini ── */}
      <footer className="border-t border-white/[0.04] py-8">
        <div className="max-w-5xl mx-auto px-5 md:px-8 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-[#F5F5F3]/20 hover:text-[#F5F5F3]/40 transition-colors">
            <ZevoLogo size="sm" />
          </button>
          <p className="text-[10px] text-[#F5F5F3]/10">&copy; {new Date().getFullYear()} Zevo</p>
        </div>
      </footer>
    </div>
  )
}
