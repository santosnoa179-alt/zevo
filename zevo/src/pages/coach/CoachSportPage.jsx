import { useState } from 'react'
import { Trophy, Dumbbell, Plus, Layers } from 'lucide-react'

export default function CoachSportPage() {
  return (
    <div className="p-4 md:p-8 lg:p-10 w-full max-w-5xl mx-auto space-y-10">

      {/* Header */}
      <div>
        <h1 className="text-[#F5F5F3] text-3xl md:text-4xl font-bold tracking-tight">Sport</h1>
        <p className="text-white/25 text-base mt-2">Gérez vos programmes sportifs et modèles de séances.</p>
      </div>

      {/* Cards placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Modèles de séances */}
        <div className="bg-[#1E1E1E] border border-white/[0.06] rounded-3xl p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FF6B2B]/10 flex items-center justify-center mb-5">
            <Dumbbell size={28} className="text-[#FF6B2B]" />
          </div>
          <h2 className="text-[#F5F5F3] text-xl font-bold mb-2">Modèles de séances</h2>
          <p className="text-white/25 text-sm mb-6 max-w-xs">
            Créez des séances types réutilisables avec vos exercices favoris.
          </p>
          <button className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#FF6B2B]/90 transition-all shadow-xl shadow-[#FF6B2B]/25">
            <Plus size={16} /> Nouveau modèle
          </button>
        </div>

        {/* Bibliothèque d'exercices */}
        <div className="bg-[#1E1E1E] border border-white/[0.06] rounded-3xl p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-5">
            <Layers size={28} className="text-blue-400" />
          </div>
          <h2 className="text-[#F5F5F3] text-xl font-bold mb-2">Bibliothèque d'exercices</h2>
          <p className="text-white/25 text-sm mb-6 max-w-xs">
            Parcourez et gérez vos exercices. Ajoutez-en de nouveaux avec images.
          </p>
          <button className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#1E1E1E] border border-white/[0.06] text-white/50 text-sm font-bold hover:bg-[#2A2A2A] hover:text-white transition-all">
            <Dumbbell size={16} /> Voir la bibliothèque
          </button>
        </div>
      </div>
    </div>
  )
}
