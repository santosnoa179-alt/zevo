import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Card, CardBody } from '../../components/ui/Card'
import {
  Layers, ChevronRight, ChevronDown, Dumbbell, Apple,
  Loader2, CheckCircle2, Image as ImageIcon,
  BookOpen, FileText, Video, Link as LinkIcon, ExternalLink, Download
} from 'lucide-react'

const RESSOURCE_ICONS = {
  pdf: { icon: FileText, color: 'text-red-400', bg: 'bg-red-500/10', action: Download },
  video: { icon: Video, color: 'text-purple-400', bg: 'bg-purple-500/10', action: ExternalLink },
  lien: { icon: LinkIcon, color: 'text-blue-400', bg: 'bg-blue-500/10', action: ExternalLink },
  image: { icon: ImageIcon, color: 'text-green-400', bg: 'bg-green-500/10', action: Download },
  guide: { icon: BookOpen, color: 'text-yellow-400', bg: 'bg-yellow-500/10', action: ExternalLink },
}

export default function ProgrammePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [assignation, setAssignation] = useState(null)
  const [phases, setPhases] = useState([])
  const [expandedPhase, setExpandedPhase] = useState(null)

  useEffect(() => {
    if (!user) return
    loadProgramme()
  }, [user])

  const loadProgramme = async () => {
    setLoading(true)

    // Programme actif du client
    const { data: assign } = await supabase
      .from('programme_assignations')
      .select('*, programmes(titre, description, duree_semaines, categorie)')
      .eq('client_id', user.id)
      .eq('statut', 'en_cours')
      .limit(1)
      .maybeSingle()

    if (assign) {
      setAssignation(assign)

      const { data: phasesData } = await supabase
        .from('programme_phases')
        .select('*')
        .eq('programme_id', assign.programme_id)
        .order('ordre')

      setPhases(phasesData || [])
      // Expand current phase by default
      if (phasesData?.length && assign.phase_actuelle) {
        const currentPhase = phasesData.find(p => p.ordre === assign.phase_actuelle)
        if (currentPhase) setExpandedPhase(currentPhase.id)
      }
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#FF6B2B]" size={32} />
      </div>
    )
  }

  if (!assignation) {
    return (
      <div className="p-4 max-w-2xl">
        <div className="bg-[#1E1E1E] rounded-2xl border border-white/[0.06] p-12 text-center">
          <div className="w-14 h-14 bg-[#FF6B2B]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Layers size={24} className="text-[#FF6B2B]" />
          </div>
          <h2 className="text-[#F5F5F3] font-semibold text-lg mb-2">Aucun programme actif</h2>
          <p className="text-white/40 text-sm">Ton coach n'a pas encore assigné de programme.</p>
        </div>
      </div>
    )
  }

  const prog = assignation.programmes
  const progressPercent = phases.length > 0
    ? Math.round((assignation.phase_actuelle / phases.length) * 100)
    : 0

  return (
    <div className="p-4 max-w-2xl space-y-5">
      {/* Header */}
      <div className="pt-2">
        <p className="text-white/40 text-[11px] uppercase tracking-wider mb-1">Mon programme</p>
        <h1 className="text-[#F5F5F3] text-xl font-bold">{prog?.titre}</h1>
        {prog?.description && (
          <p className="text-white/40 text-sm mt-1">{prog.description}</p>
        )}
      </div>

      {/* Progress Card */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/40 text-[11px] uppercase tracking-wider">Progression</p>
            <span className="text-[#FF6B2B] text-sm font-bold">{progressPercent}%</span>
          </div>
          <div className="flex gap-1 mb-3">
            {phases.map((ph, i) => (
              <div key={ph.id}
                className="h-2.5 rounded-full flex-1 transition-all"
                style={{
                  backgroundColor: i < assignation.phase_actuelle ? '#FF6B2B' : 'rgba(255,255,255,0.06)',
                }} />
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-white/40">
            <span>Phase {assignation.phase_actuelle}/{phases.length}</span>
            {prog?.categorie && (
              <span className="px-2 py-0.5 rounded-md bg-[#FF6B2B]/10 text-[#FF6B2B] text-[10px]">
                {prog.categorie}
              </span>
            )}
            <span>{prog?.duree_semaines} semaines</span>
          </div>
        </CardBody>
      </Card>

      {/* Phases */}
      <div className="space-y-3">
        <h2 className="text-[#F5F5F3] font-semibold text-base">Phases du programme</h2>

        {phases.map((phase, index) => {
          const isCurrent = phase.ordre === assignation.phase_actuelle
          const isDone = phase.ordre < assignation.phase_actuelle
          const isExpanded = expandedPhase === phase.id

          return (
            <div key={phase.id}
              className={`bg-[#1E1E1E] rounded-2xl border overflow-hidden transition-all ${
                isCurrent ? 'border-[#FF6B2B]/30 shadow-lg shadow-[#FF6B2B]/10' : 'border-white/[0.06]'
              }`}>
              <button onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}
                className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-white/[0.02] transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isDone ? 'bg-green-500/20' : isCurrent ? 'bg-[#FF6B2B]/20' : 'bg-[#2A2A2A]'
                }`}>
                  {isDone ? (
                    <CheckCircle2 size={16} className="text-green-400" />
                  ) : (
                    <span className={`text-xs font-bold ${isCurrent ? 'text-[#FF6B2B]' : 'text-white/30'}`}>
                      {index + 1}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium truncate ${isCurrent ? 'text-[#F5F5F3]' : 'text-white/50'}`}>
                      {phase.titre}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] bg-[#FF6B2B] text-white px-2 py-0.5 rounded-full font-bold uppercase">
                        En cours
                      </span>
                    )}
                  </div>
                  <span className="text-white/25 text-xs">{phase.duree_semaines} semaine{phase.duree_semaines > 1 ? 's' : ''}</span>
                </div>
                {isExpanded ? <ChevronDown size={16} className="text-white/30" /> : <ChevronRight size={16} className="text-white/30" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-white/[0.04] pt-4">
                  {phase.description && (
                    <p className="text-white/40 text-sm">{phase.description}</p>
                  )}

                  {/* Exercices */}
                  {(phase.exercices?.length || 0) > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Dumbbell size={14} className="text-[#FF6B2B]" />
                        <p className="text-white/50 text-[11px] uppercase tracking-wider font-semibold">
                          Exercices ({phase.exercices.length})
                        </p>
                      </div>
                      <div className="space-y-2">
                        {phase.exercices.map((ex, ei) => (
                          <div key={ei} className="flex items-center gap-3 bg-[#0D0D0D] rounded-xl p-3">
                            {ex.image_url ? (
                              <img src={ex.image_url} alt={ex.name}
                                className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                                <ImageIcon size={18} className="text-white/20" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[#F5F5F3] text-sm font-medium">{ex.name}</p>
                              <p className="text-white/30 text-xs">{ex.muscle_group}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-[#FF6B2B] text-sm font-bold">{ex.sets}×{ex.reps}</p>
                              {ex.rest_seconds && (
                                <p className="text-white/25 text-[10px]">{ex.rest_seconds}s repos</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nutrition */}
                  {(phase.calories_objectif || phase.proteines_g || phase.consignes_nutrition) && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Apple size={14} className="text-green-400" />
                        <p className="text-white/50 text-[11px] uppercase tracking-wider font-semibold">Nutrition</p>
                      </div>

                      {(phase.calories_objectif || phase.proteines_g) && (
                        <div className="grid grid-cols-4 gap-2 mb-3">
                          {phase.calories_objectif && (
                            <div className="bg-[#0D0D0D] rounded-xl p-3 text-center">
                              <p className="text-[#F5F5F3] text-lg font-bold">{phase.calories_objectif}</p>
                              <p className="text-white/30 text-[10px] uppercase">kcal</p>
                            </div>
                          )}
                          {phase.proteines_g && (
                            <div className="bg-[#0D0D0D] rounded-xl p-3 text-center">
                              <p className="text-blue-400 text-lg font-bold">{phase.proteines_g}g</p>
                              <p className="text-white/30 text-[10px] uppercase">Protéines</p>
                            </div>
                          )}
                          {phase.glucides_g && (
                            <div className="bg-[#0D0D0D] rounded-xl p-3 text-center">
                              <p className="text-yellow-400 text-lg font-bold">{phase.glucides_g}g</p>
                              <p className="text-white/30 text-[10px] uppercase">Glucides</p>
                            </div>
                          )}
                          {phase.lipides_g && (
                            <div className="bg-[#0D0D0D] rounded-xl p-3 text-center">
                              <p className="text-purple-400 text-lg font-bold">{phase.lipides_g}g</p>
                              <p className="text-white/30 text-[10px] uppercase">Lipides</p>
                            </div>
                          )}
                        </div>
                      )}

                      {phase.consignes_nutrition && (
                        <div className="bg-[#0D0D0D] rounded-xl p-3">
                          <p className="text-white/50 text-xs whitespace-pre-wrap">{phase.consignes_nutrition}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Habitudes */}
                  {(phase.habitudes?.length || 0) > 0 && (
                    <div>
                      <p className="text-white/50 text-[11px] uppercase tracking-wider font-semibold mb-2">Habitudes</p>
                      <div className="flex flex-wrap gap-2">
                        {phase.habitudes.map((h, hi) => (
                          <span key={hi} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D0D0D] border border-white/[0.06] text-xs text-[#F5F5F3]">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: h.couleur || '#FF6B2B' }} />
                            {h.nom}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Objectifs */}
                  {(phase.objectifs?.length || 0) > 0 && (
                    <div>
                      <p className="text-white/50 text-[11px] uppercase tracking-wider font-semibold mb-2">Objectifs</p>
                      <div className="flex flex-wrap gap-2">
                        {phase.objectifs.map((o, oi) => (
                          <span key={oi} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D0D0D] border border-white/[0.06] text-xs text-[#F5F5F3]">
                            &#x1F3AF; {o.titre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ressources du Coach */}
                  {(phase.ressources_attachees?.length || 0) > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <BookOpen size={14} className="text-blue-400" />
                        <p className="text-white/50 text-[11px] uppercase tracking-wider font-semibold">
                          Ressources du coach ({phase.ressources_attachees.length})
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {phase.ressources_attachees.map((res, ri) => {
                          const typeInfo = RESSOURCE_ICONS[res.type] || RESSOURCE_ICONS.lien
                          const Icon = typeInfo.icon
                          const ActionIcon = typeInfo.action
                          return (
                            <a key={ri} href={res.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-3 bg-[#0D0D0D] rounded-xl p-3 border border-white/[0.04] hover:border-white/[0.12] transition-all group">
                              <div className={`w-10 h-10 rounded-lg ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}>
                                <Icon size={16} className={typeInfo.color} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[#F5F5F3] text-sm font-medium truncate group-hover:text-blue-400 transition-colors">
                                  {res.titre}
                                </p>
                                <p className="text-white/25 text-[10px] capitalize mt-0.5">
                                  {res.type}{res.categorie ? ` · ${res.categorie}` : ''}
                                </p>
                              </div>
                              <ActionIcon size={14} className="text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
