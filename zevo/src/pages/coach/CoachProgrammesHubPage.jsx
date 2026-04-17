import { useState } from 'react'
import { Dumbbell, Apple, ChevronLeft } from 'lucide-react'
import CoachProgrammesPage from './CoachProgrammesPage'
import CoachNutritionPage from './CoachNutritionPage'

// ═══════════════════════════════════════════════════════════════
// PROGRAMMES HUB — Choix Sport / Nutrition
// ═══════════════════════════════════════════════════════════════

export default function CoachProgrammesHubPage() {
  const [section, setSection] = useState(null) // null | 'sport' | 'nutrition'

  // Si une section est choisie, afficher la page correspondante avec un bouton retour
  if (section === 'sport') {
    return (
      <div className="min-h-screen">
        <div className="md:hidden px-4 pt-3 pb-2">
          <button
            onClick={() => setSection(null)}
            className="flex items-center gap-1.5 text-[var(--text-secondary)] text-sm font-medium hover:text-[var(--text-primary)] transition-colors active:scale-95"
          >
            <ChevronLeft size={18} />
            Programmes
          </button>
        </div>
        <CoachProgrammesPage />
      </div>
    )
  }

  if (section === 'nutrition') {
    return (
      <div className="min-h-screen">
        <div className="md:hidden px-4 pt-3 pb-2">
          <button
            onClick={() => setSection(null)}
            className="flex items-center gap-1.5 text-[var(--text-secondary)] text-sm font-medium hover:text-[var(--text-primary)] transition-colors active:scale-95"
          >
            <ChevronLeft size={18} />
            Programmes
          </button>
        </div>
        <CoachNutritionPage />
      </div>
    )
  }

  // ── Hub — Choix de la section ──
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-page-enter">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[var(--text-primary)] text-xl font-bold tracking-tight">Programmes</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">Gerez vos programmes sport et nutrition</p>
      </div>

      {/* Cards de choix */}
      <div className="grid grid-cols-1 gap-4">

        {/* Sport */}
        <button
          onClick={() => setSection('sport')}
          className="group relative overflow-hidden rounded-2xl border border-[var(--border-base)] bg-[var(--bg-card)] p-6 text-left transition-all hover:border-[#FF6B2B]/20 active:scale-[0.98]"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FF6B2B] via-[#FF8F5E] to-transparent" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF6B2B]/[0.03] rounded-full -translate-y-1/2 translate-x-1/2" />

          <div className="relative flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(255,107,43,0.12), rgba(255,143,94,0.06))',
              }}
            >
              <Dumbbell size={26} className="text-[#FF6B2B]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[var(--text-primary)] text-lg font-bold">Programmes Sport</h2>
              <p className="text-[var(--text-muted)] text-sm mt-0.5">
                Creez et assignez des programmes d'entrainement multi-semaines
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center shrink-0 group-hover:bg-[#FF6B2B]/10 transition-colors">
              <ChevronLeft size={18} className="text-[var(--text-muted)] rotate-180 group-hover:text-[#FF6B2B] transition-colors" />
            </div>
          </div>
        </button>

        {/* Nutrition */}
        <button
          onClick={() => setSection('nutrition')}
          className="group relative overflow-hidden rounded-2xl border border-[var(--border-base)] bg-[var(--bg-card)] p-6 text-left transition-all hover:border-[#FF6B2B]/20 active:scale-[0.98]"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FF6B2B] via-[#FF9A6C] to-transparent" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF6B2B]/[0.03] rounded-full -translate-y-1/2 translate-x-1/2" />

          <div className="relative flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(255,107,43,0.12), rgba(255,154,108,0.06))',
              }}
            >
              <Apple size={26} className="text-[#FF6B2B]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[var(--text-primary)] text-lg font-bold">Plans Nutrition</h2>
              <p className="text-[var(--text-muted)] text-sm mt-0.5">
                Creez et assignez des plans nutritionnels personnalises
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center shrink-0 group-hover:bg-[#FF6B2B]/10 transition-colors">
              <ChevronLeft size={18} className="text-[var(--text-muted)] rotate-180 group-hover:text-[#FF6B2B] transition-colors" />
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
