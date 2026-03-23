import { useState } from 'react'
import { Apple, UtensilsCrossed, Plus, BookOpen } from 'lucide-react'

export default function CoachNutritionPage() {
  return (
    <div className="p-4 md:p-8 lg:p-10 w-full max-w-5xl mx-auto space-y-10">

      {/* Header */}
      <div>
        <h1 className="text-[#F5F5F3] text-3xl md:text-4xl font-bold tracking-tight">Nutrition</h1>
        <p className="text-white/25 text-base mt-2">Gérez vos plans nutritionnels et votre bibliothèque d'aliments.</p>
      </div>

      {/* Cards placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Plans nutritionnels */}
        <div className="bg-[#1E1E1E] border border-white/[0.06] rounded-3xl p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FF6B2B]/10 flex items-center justify-center mb-5">
            <UtensilsCrossed size={28} className="text-[#FF6B2B]" />
          </div>
          <h2 className="text-[#F5F5F3] text-xl font-bold mb-2">Plans nutritionnels</h2>
          <p className="text-white/25 text-sm mb-6 max-w-xs">
            Créez des plans alimentaires personnalisés pour vos clients.
          </p>
          <button className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#FF6B2B]/90 transition-all shadow-xl shadow-[#FF6B2B]/25">
            <Plus size={16} /> Nouveau plan
          </button>
        </div>

        {/* Bibliothèque d'aliments */}
        <div className="bg-[#1E1E1E] border border-white/[0.06] rounded-3xl p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mb-5">
            <Apple size={28} className="text-green-400" />
          </div>
          <h2 className="text-[#F5F5F3] text-xl font-bold mb-2">Bibliothèque d'aliments</h2>
          <p className="text-white/25 text-sm mb-6 max-w-xs">
            Parcourez les aliments disponibles et ajoutez les vôtres.
          </p>
          <button className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#1E1E1E] border border-white/[0.06] text-white/50 text-sm font-bold hover:bg-[#2A2A2A] hover:text-white transition-all">
            <BookOpen size={16} /> Voir la bibliothèque
          </button>
        </div>
      </div>
    </div>
  )
}
