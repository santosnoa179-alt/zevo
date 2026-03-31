import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import { usePageTransition } from '../../hooks/useAnimations'
import AnimatedNumber from '../../components/ui/AnimatedNumber'
import {
  Target, Calendar, Scale, TrendingDown,
  TrendingUp, Loader2, X, Ruler,
  Check, Plus, ChevronDown, ChevronUp, Flame, Zap
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// ── Constants ──
const COLORS = { poids: '#FF6B2B', tour_bras: '#3b82f6', tour_poitrine: '#8b5cf6', tour_taille: '#f59e0b', tour_hanches: '#ec4899', tour_cuisses: '#22c55e' }
const LABELS = { poids: 'Poids', tour_bras: 'Bras', tour_poitrine: 'Poitrine', tour_taille: 'Taille', tour_hanches: 'Hanches', tour_cuisses: 'Cuisses' }
const UNITS = { poids: 'kg', tour_bras: 'cm', tour_poitrine: 'cm', tour_taille: 'cm', tour_hanches: 'cm', tour_cuisses: 'cm' }

function getFieldsForObjectif(t) {
  const s = (t || '').toLowerCase()
  if (s.includes('masse') || s.includes('muscle') || s.includes('prise')) return ['poids', 'tour_bras', 'tour_poitrine', 'tour_cuisses']
  if (s.includes('perte') || s.includes('sèche') || s.includes('seche') || s.includes('maigrir')) return ['poids', 'tour_taille', 'tour_hanches']
  return ['poids', 'tour_taille', 'tour_poitrine']
}

function calcProgress(depart, actuelle, cible) {
  if (depart == null || cible == null) return 0
  const current = actuelle ?? depart
  const totalDelta = cible - depart
  if (totalDelta === 0) return current === cible ? 100 : 0
  return Math.max(0, Math.min(100, Math.round(((current - depart) / totalDelta) * 100)))
}

function isPoidsObjectif(obj) {
  const t = (obj.titre || '').toLowerCase(), u = (obj.unite || '').toLowerCase()
  return u === 'kg' || t.includes('poids') || t.includes('perte') || t.includes('maigrir') || t.includes('masse')
}

function isCounterObjectif(obj) {
  const u = (obj.unite || '').toLowerCase(), t = (obj.titre || '').toLowerCase()
  return ['x', 'fois', 'séances', 'seances', 'sessions'].includes(u)
    || ['entraîner', 'entrainer', 'séance', 'seance', 'session', 'fois'].some(k => t.includes(k))
}

// ── SVG Circular Progress Ring ──
function ProgressRing({ pct, size = 120, stroke = 8, color = '#FF6B2B', children }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <filter id="hero-ring-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Track */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        {/* Progress with glow */}
        {pct > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            filter="url(#hero-ring-glow)"
            className="transition-all duration-1000 ease-out" />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  )
}

// ── Mini Progress Ring (objectif cards) ──
function MiniRing({ pct, size = 44, stroke = 4 }) {
  const color = pct >= 100 ? '#22c55e' : pct >= 50 ? '#FF6B2B' : pct >= 25 ? '#f59e0b' : '#ef4444'
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ
  const uid = `ring-glow-${Math.random().toString(36).slice(2, 6)}`
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <filter id={uid}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Track */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        {/* Progress arc with glow */}
        {pct > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            filter={`url(#${uid})`}
            className="transition-all duration-700" />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-[10px] font-bold ${pct >= 100 ? 'text-emerald-400' : 'text-[#F5F5F3]'}`}>{pct}%</span>
      </div>
    </div>
  )
}

// ── Chart Tooltip ──
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-white/30 text-[9px] mb-0.5">{d.label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-bold" style={{ color: p.stroke }}>
          {p.value} <span className="text-white/25 font-normal">{UNITS[p.dataKey]}</span>
        </p>
      ))}
    </div>
  )
}

export default function ObjectifsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [objectifs, setObjectifs] = useState([])
  const [inlineEditing, setInlineEditing] = useState(null)
  const [inlineValue, setInlineValue] = useState('')
  const [savingInline, setSavingInline] = useState(false)
  const [mensData, setMensData] = useState([])
  const [poidsActuel, setPoidsActuel] = useState(null)
  const [poidsCible, setPoidsCible] = useState(null)
  const [objectifType, setObjectifType] = useState('')
  const [showSaisie, setShowSaisie] = useState(false)
  const [showAllFields, setShowAllFields] = useState(false)
  const [showCharts, setShowCharts] = useState(false)
  const [savingMens, setSavingMens] = useState(false)
  const [coachId, setCoachId] = useState(null)
  const [newValues, setNewValues] = useState({})

  const fields = useMemo(() => getFieldsForObjectif(objectifType), [objectifType])

  // ── Load data ──
  const chargerDonnees = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [objRes, mensRes, clientRes] = await Promise.all([
      supabase.from('objectifs').select('*').eq('client_id', user.id).eq('archive', false).order('created_at', { ascending: false }),
      supabase.from('suivi_mensurations').select('*').eq('client_id', user.id).order('created_at', { ascending: true }),
      supabase.from('clients').select('coach_id, poids, objectif_type').eq('id', user.id).maybeSingle(),
    ])
    const objs = objRes.data ?? []
    setObjectifs(objs)
    setMensData(mensRes.data ?? [])
    setPoidsActuel(clientRes.data?.poids ?? null)
    const poidsObj = objs.find(o => isPoidsObjectif(o) && o.valeur_cible != null)
    setPoidsCible(poidsObj?.valeur_cible ?? null)
    setObjectifType(clientRes.data?.objectif_type ?? '')
    if (clientRes.data?.coach_id) setCoachId(clientRes.data.coach_id)
    setLoading(false)
  }, [user])

  useEffect(() => { chargerDonnees() }, [chargerDonnees])

  const chartData = useMemo(() => mensData.map(m => ({
    ...m, label: new Date(m.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
  })), [mensData])

  const dernierPoids = mensData.length > 0 ? mensData[mensData.length - 1].poids : poidsActuel
  const premierPoids = mensData.length > 0 ? mensData[0].poids : null
  const delta = dernierPoids && premierPoids ? +(dernierPoids - premierPoids).toFixed(1) : null
  const poidsProgress = (dernierPoids != null && poidsCible != null && premierPoids != null)
    ? calcProgress(premierPoids, dernierPoids, poidsCible) : 0
  const lastEntry = mensData.length > 0 ? mensData[mensData.length - 1] : null
  const totalObjProgress = objectifs.length > 0
    ? Math.round(objectifs.reduce((s, o) => s + calcProgress(o.valeur_depart, o.valeur_actuelle, o.valeur_cible), 0) / objectifs.length) : 0

  // ── Synchro poids ──
  const syncPoidsObjectifs = async (np) => {
    for (const obj of objectifs.filter(isPoidsObjectif)) {
      const { error } = await supabase.from('objectifs').update({ valeur_actuelle: np }).eq('id', obj.id)
      if (!error) setObjectifs(prev => prev.map(o => o.id === obj.id ? { ...o, valeur_actuelle: np } : o))
    }
  }

  // ── Save mensuration ──
  const enregistrerMensurations = async (e) => {
    e.preventDefault()
    if (!fields.some(f => newValues[f])) { toast.error('Remplis au moins un champ.'); return }
    if (newValues.poids) { const p = parseFloat(newValues.poids); if (p < 20 || p > 300) { toast.error('Poids invalide.'); return } }
    setSavingMens(true)
    const row = { client_id: user.id }
    fields.forEach(f => { if (newValues[f]) row[f] = parseFloat(newValues[f]) })
    const { error } = await supabase.from('suivi_mensurations').insert(row)
    if (error) { toast.error(error.message || 'Erreur'); setSavingMens(false); return }
    if (newValues.poids) {
      const p = parseFloat(newValues.poids)
      await supabase.from('clients').update({ poids: p }).eq('id', user.id)
      setPoidsActuel(p); await syncPoidsObjectifs(p)
    }
    toast.success('Mensurations enregistrées !')
    setShowSaisie(false); setShowAllFields(false); setNewValues({}); setSavingMens(false)
    if (coachId) {
      const detail = newValues.poids ? ` (${newValues.poids} kg)` : ''
      supabase.from('notifications').insert({ coach_id: coachId, client_id: user.id, titre: 'Nouvelle pesée ⚖️', message: `Ton client a mis à jour ses mensurations${detail}.`, type: 'mensuration', destinataire: 'coach' })
    }
    const { data: fresh } = await supabase.from('suivi_mensurations').select('*').eq('client_id', user.id).order('created_at', { ascending: true })
    setMensData(fresh ?? [])
  }

  // ── Save objectif inline ──
  const sauvegarderInline = async (obj, newVal) => {
    if (newVal == null || isNaN(newVal)) return
    setSavingInline(true)
    const isAtteint = obj.valeur_cible > obj.valeur_depart ? newVal >= obj.valeur_cible : newVal <= obj.valeur_cible
    const { error } = await supabase.from('objectifs').update({ valeur_actuelle: newVal, statut: isAtteint ? 'atteint' : 'en_cours' }).eq('id', obj.id)
    if (error) { toast.error(error.message) } else {
      setObjectifs(prev => prev.map(o => o.id === obj.id ? { ...o, valeur_actuelle: newVal, statut: isAtteint ? 'atteint' : o.statut } : o))
      toast.success(isAtteint ? '🎉 Objectif atteint !' : 'Valeur mise à jour !')
    }
    setSavingInline(false); setInlineEditing(null); setInlineValue('')
  }

  const incrementerObjectif = async (obj) => {
    const newVal = (obj.valeur_actuelle ?? obj.valeur_depart ?? 0) + 1
    await sauvegarderInline(obj, newVal)
  }

  const pageTransition = usePageTransition()

  // ── Loading skeleton ──
  if (loading) return (
    <div className="p-4 space-y-4 max-w-2xl animate-pulse">
      <div className="h-52 bg-[#1E1E1E] rounded-2xl" />
      <div className="h-20 bg-[#1E1E1E] rounded-2xl" />
      <div className="h-20 bg-[#1E1E1E] rounded-2xl" />
    </div>
  )

  const hasMens = mensData.length > 0
  const hasChartData = chartData.length >= 2

  return (
    <div className={`p-4 pb-28 space-y-4 max-w-2xl ${pageTransition.className}`}>

      {/* ═══════════════════════════════════════════
          HERO — Weight Ring / Empty State
          ═══════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B2B]/8 via-[#1E1E1E] to-[#141414]" />
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#FF6B2B]/[0.04] rounded-full blur-3xl" />

        <div className="relative px-5 pt-5 pb-5">

          {hasMens && dernierPoids != null ? (
            /* ── AVEC DONNÉES : Ring + Stats ── */
            <>
              <div className="flex items-center gap-5">
                {/* Ring de progression poids */}
                <ProgressRing pct={poidsProgress} size={110} stroke={7}>
                  <span className="text-[#F5F5F3] text-2xl font-extrabold leading-none">{dernierPoids}</span>
                  <span className="text-white/30 text-[10px] font-medium mt-0.5">kg</span>
                </ProgressRing>

                {/* Stats à droite */}
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-white/30 text-[9px] uppercase tracking-wider font-semibold">Objectif</p>
                    <p className="text-[#F5F5F3] text-lg font-bold">
                      {poidsCible ? `${poidsCible} kg` : <span className="text-white/20">Non défini</span>}
                    </p>
                  </div>
                  {delta !== null && (
                    <div className="flex items-center gap-1.5">
                      {delta < 0 ? <TrendingDown size={13} className="text-emerald-400" />
                        : delta > 0 ? <TrendingUp size={13} className="text-red-400" />
                        : null}
                      <span className={`text-sm font-bold ${delta < 0 ? 'text-emerald-400' : delta > 0 ? 'text-red-400' : 'text-white/40'}`}>
                        {delta > 0 ? '+' : ''}{delta} kg
                      </span>
                      <span className="text-white/20 text-[10px]">depuis le début</span>
                    </div>
                  )}
                  {poidsCible && dernierPoids && (
                    <p className="text-white/25 text-[10px]">
                      Il te reste <span className="text-[#FF6B2B] font-semibold">{Math.abs(+(dernierPoids - poidsCible).toFixed(1))} kg</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Bouton pesée */}
              <button
                onClick={() => { setNewValues({}); setShowAllFields(false); setShowSaisie(true) }}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.06] text-white/60 text-xs font-semibold hover:bg-white/[0.08] hover:text-white/80 active:scale-[0.98] transition-all"
              >
                <Scale size={13} />
                Enregistrer une pesée
              </button>
            </>
          ) : (
            /* ── ÉTAT VIDE ── */
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF6B2B]/20 to-[#FF6B2B]/5 border border-[#FF6B2B]/10 flex items-center justify-center mx-auto mb-4">
                <Scale size={28} className="text-[#FF6B2B]" />
              </div>
              <h3 className="text-[#F5F5F3] text-base font-bold mb-1">Commence ton suivi</h3>
              <p className="text-white/30 text-xs leading-relaxed max-w-[240px] mx-auto mb-4">
                Enregistre ta première pesée pour suivre ta progression.
              </p>
              <button
                onClick={() => { setNewValues({}); setShowAllFields(false); setShowSaisie(true) }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#e55a1b] active:scale-[0.97] transition-all shadow-lg shadow-[#FF6B2B]/25"
              >
                <Scale size={15} />
                Ma première pesée
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          COURBES (dépliable)
          ═══════════════════════════════════════════ */}
      {hasMens && hasChartData && (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-[#1E1E1E]/60">
          <button
            onClick={() => setShowCharts(!showCharts)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Flame size={14} className="text-[#FF6B2B]" />
              <span className="text-white/50 text-xs font-semibold">Courbes d'évolution</span>
            </div>
            {showCharts ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
          </button>

          {showCharts && (
            <div className="px-4 pb-4 space-y-4 border-t border-white/[0.04]">
              {fields.map(field => {
                const fieldData = chartData.filter(d => d[field] != null)
                if (fieldData.length < 2) return null
                const color = COLORS[field]
                return (
                  <div key={field} className="pt-3">
                    <p className="text-white/35 text-[10px] uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                      {LABELS[field]} ({UNITS[field]})
                    </p>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={fieldData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                          <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} />
                          <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fill: 'rgba(255,255,255,0.15)', fontSize: 9 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<ChartTooltip />} cursor={false} />
                          <Line type="monotone" dataKey={field} stroke={color} strokeWidth={2}
                            dot={{ fill: color, r: 3, strokeWidth: 0 }}
                            activeDot={{ fill: color, r: 5, stroke: color, strokeWidth: 2, strokeOpacity: 0.3 }} />
                          {field === 'poids' && poidsCible && (
                            <Line type="monotone" dataKey={() => poidsCible} stroke="rgba(255,255,255,0.08)" strokeWidth={1} strokeDasharray="6 4" dot={false} activeDot={false} />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Message si 1 seule mesure */}
      {hasMens && !hasChartData && (
        <div className="text-center py-2">
          <p className="text-white/20 text-[11px]">Encore 1 pesée pour débloquer tes courbes d'évolution</p>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          OBJECTIFS
          ═══════════════════════════════════════════ */}
      {objectifs.length > 0 && (
        <div className="space-y-2.5">
          {/* Section header */}
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <Target size={15} className="text-[#FF6B2B]" />
              <span className="text-[#F5F5F3] text-sm font-bold">Objectifs</span>
              <span className="text-white/20 text-xs">{objectifs.length}</span>
            </div>
            {totalObjProgress > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.04]">
                <Zap size={10} className="text-[#FF6B2B]" />
                <span className="text-white/40 text-[10px] font-medium"><AnimatedNumber value={totalObjProgress} />% global</span>
              </div>
            )}
          </div>

          {/* Objectif cards */}
          {objectifs.map((o) => {
            const pct = calcProgress(o.valeur_depart, o.valeur_actuelle, o.valeur_cible)
            const actuel = o.valeur_actuelle ?? o.valeur_depart
            const unite = o.unite || ''
            const isPoids = isPoidsObjectif(o)
            const isCounter = isCounterObjectif(o)
            const isEditing = inlineEditing === o.id
            const done = pct >= 100

            return (
              <div key={o.id} className={`rounded-xl border bg-[#1E1E1E]/60 overflow-hidden transition-all ${done ? 'border-emerald-500/20' : 'border-white/[0.06]'}`}>
                <div className="p-3.5">
                  <div className="flex items-center gap-3">
                    {/* Mini ring */}
                    <MiniRing pct={pct} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-semibold truncate ${done ? 'text-emerald-400' : 'text-[#F5F5F3]'}`}>{o.titre}</p>
                        {o.date_cible && (
                          <span className="text-white/20 text-[9px] flex items-center gap-0.5 flex-shrink-0">
                            <Calendar size={8} />
                            {new Date(o.date_cible).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>

                      {/* Values row */}
                      <div className="flex items-center gap-2 mt-1">
                        {actuel != null && o.valeur_cible != null ? (
                          <span className="text-white/35 text-[11px]">
                            <span className="text-[#F5F5F3] font-semibold">{actuel}</span>
                            <span className="text-white/15 mx-1">/</span>
                            <span className="text-[#FF6B2B] font-semibold">{o.valeur_cible}</span>
                            {unite && <span className="text-white/20 ml-0.5">{unite}</span>}
                          </span>
                        ) : actuel != null ? (
                          <span className="text-white/35 text-[11px]">
                            <span className="text-[#F5F5F3] font-semibold">{actuel}</span>
                            {unite && <span className="text-white/20 ml-0.5">{unite}</span>}
                          </span>
                        ) : (
                          <span className="text-white/15 text-[10px] italic">Aucune donnée</span>
                        )}

                        {done && (
                          <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-0.5">
                            <Check size={10} strokeWidth={3} /> Atteint
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action button (right side) */}
                    {!done && !isPoids && !isEditing && (
                      isCounter ? (
                        <button
                          onClick={() => incrementerObjectif(o)}
                          disabled={savingInline}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#FF6B2B]/10 text-[#FF6B2B] hover:bg-[#FF6B2B]/20 active:scale-90 transition-all disabled:opacity-40 flex-shrink-0"
                        >
                          {savingInline && inlineEditing === o.id ? <Loader2 size={14} className="animate-spin" /> : <Plus size={16} strokeWidth={3} />}
                        </button>
                      ) : (
                        <button
                          onClick={() => { setInlineEditing(o.id); setInlineValue(actuel != null ? String(actuel) : '') }}
                          className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/35 text-[10px] font-medium hover:border-[#FF6B2B]/20 hover:text-[#FF6B2B] transition-all flex-shrink-0"
                        >
                          Modifier
                        </button>
                      )
                    )}
                    {isPoids && !done && (
                      <span className="text-white/15 text-[9px] italic flex-shrink-0">Auto</span>
                    )}
                  </div>

                  {/* Inline editing */}
                  {isEditing && !done && (
                    <form
                      onSubmit={(e) => { e.preventDefault(); const v = parseFloat(inlineValue); if (!isNaN(v)) sauvegarderInline(o, v) }}
                      className="mt-3 flex items-center gap-2 pl-[52px]"
                    >
                      <div className="flex-1 relative">
                        <input type="number" step="0.1" value={inlineValue} onChange={(e) => setInlineValue(e.target.value)}
                          placeholder={actuel != null ? String(actuel) : '0'} autoFocus
                          className="w-full bg-[#0D0D0D] text-[#F5F5F3] text-sm font-semibold rounded-lg px-3 py-2 pr-10 placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-[#FF6B2B]/30 transition-all" />
                        {unite && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-[10px]">{unite}</span>}
                      </div>
                      <button type="submit" disabled={savingInline || !inlineValue}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#FF6B2B] text-white hover:bg-[#e55a1b] active:scale-90 transition-all disabled:opacity-30 flex-shrink-0">
                        {savingInline ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={3} />}
                      </button>
                      <button type="button" onClick={() => { setInlineEditing(null); setInlineValue('') }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] text-white/30 hover:text-white/60 transition-all flex-shrink-0">
                        <X size={12} />
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          MODALE PESÉE
          ═══════════════════════════════════════════ */}
      {showSaisie && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowSaisie(false); setShowAllFields(false) }} />
          <div className="relative z-[101] bg-[#18181b] border border-[#27272a] w-full sm:w-[380px] sm:rounded-2xl rounded-t-2xl overflow-hidden">

            <div className="px-4 py-3 border-b border-[#27272a] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#FF6B2B]/15 flex items-center justify-center">
                  <Scale size={13} className="text-[#FF6B2B]" />
                </div>
                <div>
                  <h3 className="text-[#F5F5F3] font-semibold text-sm">Nouvelle mesure</h3>
                  <p className="text-white/25 text-[10px]">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
              </div>
              <button onClick={() => { setShowSaisie(false); setShowAllFields(false) }} className="p-1.5 rounded-lg text-white/25 hover:text-white hover:bg-[#27272a] transition-colors">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={enregistrerMensurations} className="p-4 space-y-4">
              {/* Weight input */}
              {fields.includes('poids') && (
                <div className="bg-[#0D0D0D] rounded-xl p-5 text-center">
                  <p className="text-white/30 text-[9px] uppercase tracking-wider font-semibold mb-3 flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B2B]" /> Poids du jour
                  </p>
                  <div className="flex items-end justify-center gap-1.5">
                    <input type="number" step="0.1" min="20" max="300" value={newValues.poids || ''}
                      onChange={(e) => setNewValues(prev => ({ ...prev, poids: e.target.value }))}
                      placeholder={lastEntry?.poids ? String(lastEntry.poids) : '—'} autoFocus
                      className="w-24 bg-transparent text-center text-[#F5F5F3] text-4xl font-extrabold placeholder:text-white/10 focus:outline-none border-b-2 border-[#FF6B2B]/20 focus:border-[#FF6B2B] transition-colors pb-0.5" />
                    <span className="text-white/20 text-base font-semibold pb-1.5">kg</span>
                  </div>
                  {newValues.poids && lastEntry?.poids && (() => {
                    const diff = +(parseFloat(newValues.poids) - lastEntry.poids).toFixed(1)
                    if (isNaN(diff) || diff === 0) return null
                    return (
                      <span className={`inline-block mt-2.5 text-[10px] font-medium px-2.5 py-0.5 rounded-full ${
                        diff < 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>{diff > 0 ? '+' : ''}{diff} kg vs dernière pesée</span>
                    )
                  })()}
                </div>
              )}

              {/* Expand mensurations */}
              {fields.filter(f => f !== 'poids').length > 0 && !showAllFields && (
                <button type="button" onClick={() => setShowAllFields(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-white/[0.06] text-white/25 text-[11px] font-medium hover:border-white/10 hover:text-white/40 transition-all">
                  <Ruler size={11} /> Ajouter des mensurations <ChevronDown size={11} />
                </button>
              )}

              {showAllFields && fields.filter(f => f !== 'poids').map(field => {
                const color = COLORS[field]; const lastVal = lastEntry?.[field]
                const currentVal = newValues[field]
                const diff = currentVal && lastVal ? +(parseFloat(currentVal) - lastVal).toFixed(1) : null
                return (
                  <div key={field} className="bg-[#0D0D0D] rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-white/40 text-[11px] font-medium">{LABELS[field]}</span>
                      </div>
                      {diff !== null && !isNaN(diff) && diff !== 0 && (
                        <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${diff < 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {diff > 0 ? '+' : ''}{diff} {UNITS[field]}
                        </span>
                      )}
                    </div>
                    <div className="flex items-end gap-1.5">
                      <input type="number" step="0.1" min="0" max="200" value={newValues[field] || ''}
                        onChange={(e) => setNewValues(prev => ({ ...prev, [field]: e.target.value }))}
                        placeholder={lastVal ? String(lastVal) : '—'}
                        className="flex-1 bg-transparent text-[#F5F5F3] text-lg font-bold placeholder:text-white/10 focus:outline-none border-b border-white/[0.04] focus:border-white/15 transition-colors pb-0.5" />
                      <span className="text-white/20 text-xs font-medium pb-1">{UNITS[field]}</span>
                    </div>
                  </div>
                )
              })}

              <button type="submit" disabled={savingMens || !fields.some(f => newValues[f])}
                className="w-full py-3 rounded-xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#e55a1b] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B2B]/20">
                {savingMens ? <><Loader2 size={14} className="animate-spin" /> Enregistrement...</> : <><Check size={14} strokeWidth={3} /> Enregistrer</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
