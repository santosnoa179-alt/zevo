import FeaturePageLayout from '../../../components/FeaturePageLayout'
import {
  BookOpen, FolderOpen, Video, FileText, Search, Share2, Tag,
  Upload, Play, Image, Link, Filter, Eye, Download
} from 'lucide-react'

/* ── Mockup: File browser with folders, file list, search, upload ── */
function LibraryMockup() {
  const folders = [
    { name: 'Exercices Upper Body', count: 24, color: '#FF6B2B' },
    { name: 'Nutrition Plans', count: 12, color: '#FF8F5E' },
    { name: 'Mobilite & Stretching', count: 18, color: '#FFB088' },
    { name: 'Onboarding Clients', count: 8, color: '#FF6B2B' },
  ]

  const files = [
    { name: 'Squat Technique Parfaite.mp4', type: 'video', size: '124 Mo', tag: 'Jambes', date: '2 jan', icon: Play },
    { name: 'Plan Alimentaire Seche.pdf', type: 'pdf', size: '2.4 Mo', tag: 'Nutrition', date: '28 dec', icon: FileText },
    { name: 'Programme PPL 12 Semaines.pdf', type: 'pdf', size: '1.8 Mo', tag: 'Programme', date: '25 dec', icon: FileText },
    { name: 'Deadlift Roumain Demo.mp4', type: 'video', size: '89 Mo', tag: 'Dos', date: '22 dec', icon: Play },
    { name: 'Guide Macro Debutant.pdf', type: 'doc', size: '3.1 Mo', tag: 'Nutrition', date: '20 dec', icon: FileText },
  ]

  const tagColors = {
    Jambes: '#FF6B2B',
    Nutrition: '#FF8F5E',
    Programme: '#FFB088',
    Dos: '#FF6B2B',
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="rounded-2xl border border-white/[0.06] bg-[#141414] overflow-hidden shadow-2xl shadow-black/40">

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-[#111111]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B2B]/20 to-[#FF8F5E]/10 border border-[#FF6B2B]/15 flex items-center justify-center">
              <BookOpen size={14} className="text-[#FF6B2B]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#F5F5F3]/80">Ma Bibliotheque</p>
              <p className="text-[10px] text-[#F5F5F3]/25">62 fichiers  -  4 dossiers</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] w-48">
              <Search size={12} className="text-[#F5F5F3]/20" />
              <span className="text-[10px] text-[#F5F5F3]/20">Rechercher...</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <Search size={11} className="text-[#F5F5F3]/25 sm:hidden" />
              <Filter size={11} className="text-[#F5F5F3]/25" />
              <span className="text-[10px] text-[#F5F5F3]/25 hidden sm:inline">Filtres</span>
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Sidebar - Folders */}
          <div className="w-56 border-r border-white/[0.04] p-3.5 hidden md:block bg-[#0F0F0F]/50">
            <p className="text-[9px] font-semibold text-[#F5F5F3]/20 uppercase tracking-wider mb-3 px-2">Dossiers</p>
            <div className="space-y-1">
              {folders.map((folder, i) => (
                <div key={i} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg ${i === 0 ? 'bg-[#FF6B2B]/[0.08] border border-[#FF6B2B]/10' : 'hover:bg-white/[0.02]'} transition-all cursor-pointer`}>
                  <FolderOpen size={14} style={{ color: folder.color }} className="opacity-70" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-medium truncate ${i === 0 ? 'text-[#F5F5F3]/80' : 'text-[#F5F5F3]/40'}`}>{folder.name}</p>
                  </div>
                  <span className="text-[9px] text-[#F5F5F3]/15 font-medium">{folder.count}</span>
                </div>
              ))}
            </div>

            {/* Upload zone */}
            <div className="mt-5 p-3 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.015] text-center">
              <Upload size={16} className="text-[#FF6B2B]/40 mx-auto mb-1.5" />
              <p className="text-[9px] text-[#F5F5F3]/20 font-medium">Glisser vos fichiers</p>
              <p className="text-[8px] text-[#F5F5F3]/10 mt-0.5">ou cliquer pour upload</p>
            </div>
          </div>

          {/* File list */}
          <div className="flex-1 p-3.5">
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-[10px] text-[#F5F5F3]/25 font-medium truncate">Exercices Upper Body</p>
              <div className="flex items-center gap-3 shrink-0 ml-2">
                <span className="text-[9px] text-[#F5F5F3]/15">24 fichiers</span>
              </div>
            </div>

            <div className="space-y-1">
              {files.map((file, i) => {
                const FileIcon = file.icon
                return (
                  <div key={i} className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl ${i === 0 ? 'bg-[#FF6B2B]/[0.04] border border-[#FF6B2B]/[0.08]' : 'border border-transparent hover:bg-white/[0.02] hover:border-white/[0.04]'} transition-all`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${file.type === 'video' ? 'bg-[#FF6B2B]/10' : 'bg-white/[0.04]'}`}>
                      <FileIcon size={13} className={file.type === 'video' ? 'text-[#FF6B2B]' : 'text-[#F5F5F3]/30'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-[#F5F5F3]/70 truncate">{file.name}</p>
                      <p className="text-[9px] text-[#F5F5F3]/15">{file.size}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[8px] font-semibold border" style={{ color: tagColors[file.tag] || '#FF8F5E', borderColor: `${tagColors[file.tag] || '#FF8F5E'}20`, backgroundColor: `${tagColors[file.tag] || '#FF8F5E'}08` }}>
                      {file.tag}
                    </span>
                    <span className="text-[9px] text-[#F5F5F3]/15 hidden sm:block w-12 text-right">{file.date}</span>
                    <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye size={11} className="text-[#F5F5F3]/20 hover:text-[#FF6B2B] cursor-pointer transition-colors" />
                      <Share2 size={11} className="text-[#F5F5F3]/20 hover:text-[#FF6B2B] cursor-pointer transition-colors" />
                      <Download size={11} className="text-[#F5F5F3]/20 hover:text-[#FF6B2B] cursor-pointer transition-colors" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Extra: File type cards ── */
function FileTypesSection() {
  const types = [
    { icon: Video, label: 'Videos', formats: 'MP4, MOV, AVI, WebM', count: '28', gradient: 'from-[#FF6B2B]/15 to-[#FF6B2B]/5' },
    { icon: FileText, label: 'Documents', formats: 'PDF, Word, Excel, PPT', count: '19', gradient: 'from-[#FF8F5E]/15 to-[#FF8F5E]/5' },
    { icon: Image, label: 'Images', formats: 'JPG, PNG, WebP, SVG', count: '11', gradient: 'from-[#FFB088]/15 to-[#FFB088]/5' },
    { icon: Link, label: 'Liens', formats: 'YouTube, Vimeo, Drive, URL', count: '4', gradient: 'from-[#FF6B2B]/15 to-[#FF6B2B]/5' },
  ]

  return (
    <section className="py-20 md:py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0E0E0E] to-transparent pointer-events-none" />
      <div className="max-w-5xl mx-auto px-5 md:px-8 relative z-10">
        <div className="text-center mb-14">
          <p className="text-[11px] font-semibold text-[#FF6B2B] uppercase tracking-widest mb-3">Formats supportes</p>
          <h2 className="text-2xl md:text-4xl font-bold">Tous tes fichiers, <span className="bg-gradient-to-r from-[#FF6B2B] via-[#FF8F5E] to-[#FFB088] bg-clip-text text-transparent">un seul hub</span></h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {types.map((t, i) => {
            const Icon = t.icon
            return (
              <div key={i} className="group rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#151515] to-[#111111] p-6 hover:border-[#FF6B2B]/15 transition-all duration-500 relative overflow-hidden text-center">
                <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-[#FF6B2B]/[0.03] blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${t.gradient} border border-[#FF6B2B]/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform duration-300`}>
                    <Icon size={22} className="text-[#FF6B2B]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#F5F5F3]/80 mb-1">{t.label}</h3>
                  <p className="text-[10px] text-[#F5F5F3]/25 mb-3">{t.formats}</p>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FF6B2B]/[0.06] border border-[#FF6B2B]/[0.08]">
                    <span className="text-[10px] font-semibold text-[#FF6B2B]">{t.count} fichiers</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default function BibliothequePage() {
  return (
    <FeaturePageLayout
      badge="Bibliotheque & Ressources"
      badgeIcon={BookOpen}
      title="Toutes tes ressources,"
      titleAccent="un seul endroit"
      subtitle="Centralise videos, PDF, programmes et documents. Organise, tague et partage avec tes clients en quelques clics."
      stats={[
        { value: '500+', label: 'FICHIERS SUPPORTES' },
        { value: '4', label: 'TYPES DE MEDIAS' },
        { value: '< 2s', label: 'RECHERCHE INSTANTANEE' },
      ]}
      mockup={<LibraryMockup />}
      features={[
        { icon: FolderOpen, title: 'Dossiers organises', desc: 'Cree une arborescence logique pour retrouver chaque fichier en un instant.' },
        { icon: Video, title: 'Videos d\'exercices', desc: 'Uploade tes demos, tutos et replays. Lecture directe dans l\'app.' },
        { icon: FileText, title: 'Documents PDF', desc: 'Plans alimentaires, programmes, fiches techniques. Tout au meme endroit.' },
        { icon: Search, title: 'Recherche intelligente', desc: 'Trouve n\'importe quel fichier par nom, tag ou type en temps reel.' },
        { icon: Share2, title: 'Partage client', desc: 'Envoie les bons fichiers aux bons clients en un clic depuis la fiche.' },
        { icon: Tag, title: 'Tags & categories', desc: 'Classe tes ressources par theme, niveau ou objectif pour un acces rapide.' },
      ]}
      stepsTitle="Centralise en 3 etapes"
      steps={[
        { title: 'Uploade tes fichiers', desc: 'Glisse tes videos, PDF, images ou liens directement dans ta bibliotheque. Tous les formats courants sont acceptes.' },
        { title: 'Organise avec des tags', desc: 'Ajoute des tags, cree des dossiers et structure ta bibliotheque pour retrouver chaque ressource instantanement.' },
        { title: 'Partage a tes clients', desc: 'Associe les bonnes ressources aux bons clients. Ils y accedent directement depuis leur espace personnel.' },
      ]}
      extraSection={<FileTypesSection />}
      ctaTitle="Pret a centraliser"
      ctaAccent="tes ressources"
    />
  )
}
