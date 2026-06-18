import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import { usePageTransition } from '../../hooks/useAnimations'
import AnimatedNumber from '../../components/ui/AnimatedNumber'
import {
  Target, Calendar, Scale, TrendingDown,
  TrendingUp, Loader2, X, Ruler,
  Check, Plus, ChevronDown, ChevronUp, Flame, Zap, Activity
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// ── Constants ──
const COLORS = { poids: 'var(--color-primary)', tour_bras: 'var(--color-primary-light)', tour_poitrine: '#FFB894', tour_taille: '#E85A1F', tour_hanches: '#C94A15', tour_cuisses: '#7A7A78' }
const LABELS = { poids: 'Poids', tour_bras: 'Bras', tour_poitrine: 'Poitrine', tour_taille: 'Taille', tour_hanches: 'Hanches', tour_cuisses: 'Cuisses' }
const UNITS = { poids: 'kg', tour_bras: 'cm', tour_poitrine: 'cm', tour_taille: 'cm', tour_hanches: 'cm', tour_cuisses: 'cm' }

function getFieldsForObjectif(t) {
  const s = (t || '').toLowerCase()
  if (s.includes('masse') || s.includes('muscle') || s.includes('prise')) return ['poids', 'tour_bras', 'tour_poitrine', 'tour_cuisses']
  if (s.includes('perte') || s.includes('seche') || s.includes('maigrir')) return ['poids', 'tour_taille', 'tour_hanches']
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
  return ['x', 'fois', 'seances', 'sessions'].includes(u)
    || ['entrainer', 'seance', 'session', 'fois'].some(k => t.includes(k))
}

// ── SVG Hero Ring ──
function HeroRing({ pct, size = 120, stroke = 8, color = 'var(--color-primary)', children }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ
  const uid = 'hero-ring-glow'
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Ambient glow */}
      {pct > 0 && (
        <div className="absolute inset-0 rounded-full animate-breathe"
          style={{ background: `radial-gradient(circle, ${color}15 0%, transparent 70%)` }} />
      )}
      <svg width={size} height={size} className="-rotate-90 relative z-10">
        <defs>
          <filter id={uid}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="hero-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="var(--color-primary-light)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-base)" strokeWidth={stroke} />
        {pct > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#hero-ring-grad)" strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            filter={`url(#${uid})`}
            className="transition-all duration-1000 ease-out" />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        {children}
      </div>
    </div>
  )
}

// ── Mini Ring (objectif cards) ──
function MiniRing({ pct, size = 44, stroke = 3.5 }) {
  const color = pct >= 100 ? 'var(--color-primary)' : pct >= 50 ? 'var(--color-primary)' : pct >= 25 ? 'var(--color-primary-light)' : '#ef4444'
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ
  const uid = `ring-${Math.random().toString(36).slice(2, 6)}`
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <filter id={uid}>
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-base)" strokeWidth={stroke} />
        {pct > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            filter={`url(#${uid})`}
            className="transition-all duration-700" />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {pct >= 100
          ? <Check size={14} className="text-primary" strokeWidth={3} />
          : <span className="text-[10px] font-bold text-[var(--text-primary)]">{pct}%</span>
        }
      </div>
    </div>
  )
}

// ── Chart Tooltip ──
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl px-3 py-2 text-xs shadow-xl backdrop-blur-lg">
      <p className="text-[var(--text-muted)] text-[9px] mb-0.5">{d.label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-bold" style={{ color: p.stroke }}>
          {p.value} <span className="text-[var(--text-muted)] font-normal">{UNITS[p.dataKey]}</span>
        </p>
      ))}
    </div>
  )
}

// ── Section Label ──
function SectionLabel({ children, icon: Icon, iconColor = 'text-primary', right }) {
  return (
    <div className="flex items-center justify-between px-0.5">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={15} className={iconColor} />}
        <span className="text-[var(--text-primary)] text-sm font-bold">{children}</span>
      </div>
      {right}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

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
    toast.success('Mensurations enregistrees !')
    setShowSaisie(false); setShowAllFields(false); setNewValues({}); setSavingMens(false)
    if (coachId) {
      const detail = newValues.poids ? ` (${newValues.poids} kg)` : ''
      supabase.from('notifications').insert({ coach_id: coachId, client_id: user.id, titre: 'Nouvelle pesee', message: `Ton client a mis a jour ses mensurations${detail}.`, type: 'mensuration', destinataire: 'coach' })
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
      toast.success(isAtteint ? 'Objectif atteint !' : 'Valeur mise a jour !')
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
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <div className="skel-block h-8 w-40" />
      <div className="skel-block h-52 w-full rounded-2xl" />
      <div className="skel-block h-16 w-full rounded-2xl" />
      <div className="skel-block h-16 w-full rounded-2xl" />
      <div className="skel-block h-16 w-full rounded-2xl" />
    </div>
  )

  const hasMens = mensData.length > 0
  const hasChartData = chartData.length >= 2

  return (
    <div className={`p-4 pb-28 md:pb-8 space-y-5 max-w-4xl mx-auto ${pageTransition.className}`}>

      {/* ═══════════════ HEADER ═══════════════ */}
      <div className="pt-2">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-[#FF8F5E] flex items-center justify-center shadow-lg shadow-primary/20">
            <Target size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-[var(--text-primary)] text-xl font-bold leading-tight">Objectifs</h1>
            <p className="text-[var(--text-muted)] text-[11px]">Suis ta progression et tes mensurations</p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          HERO — Weight Ring / Empty State
          ═══════════════════════════════════════════ */}
      <div className="glass-card overflow-hidden">
        {/* Top accent */}
        <div className="h-1 bg-gradient-to-r from-primary to-primary-light" />

        {/* Ambient background */}
        <div className="relative">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary/[0.03] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/[0.02] rounded-full blur-2xl pointer-events-none" />

          <div className="relative px-5 pt-5 pb-5">
            {hasMens && dernierPoids != null ? (
              /* ── WITH DATA: Ring + Stats ── */
              <>
                <div className="flex items-center gap-5">
                  <HeroRing pct={poidsProgress} size={110} stroke={7}>
                    <span className="text-[var(--text-primary)] text-2xl font-extrabold leading-none tabular-nums">
                      <AnimatedNumber value={dernierPoids} decimals={1} />
                    </span>
                    <span className="text-[var(--text-muted)] text-[10px] font-medium mt-0.5">kg</span>
                  </HeroRing>

                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-[var(--text-muted)] text-[9px] uppercase tracking-widest font-medium">Objectif poids</p>
                      <p className="text-[var(--text-primary)] text-lg font-bold">
                        {poidsCible ? `${poidsCible} kg` : <span className="text-[var(--text-muted)] text-sm">Non defini</span>}
                      </p>
                    </div>
                    {delta !== null && (
                      <div className="flex items-center gap-1.5">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
                          delta < 0 ? 'bg-primary/15' : delta > 0 ? 'bg-red-500/15' : 'bg-[var(--bg-surface)]'
                        }`}>
                          {delta < 0 ? <TrendingDown size={11} className="text-primary" />
                            : delta > 0 ? <TrendingUp size={11} className="text-red-400" />
                            : null}
                        </div>
                        <span className={`text-sm font-bold tabular-nums ${delta < 0 ? 'text-primary' : delta > 0 ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>
                          {delta > 0 ? '+' : ''}{delta} kg
                        </span>
                      </div>
                    )}
                    {poidsCible && dernierPoids && (
                      <p className="text-[var(--text-muted)] text-[10px]">
                        Reste <span className="text-primary font-semibold">{Math.abs(+(dernierPoids - poidsCible).toFixed(1))} kg</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Measurement CTA */}
                <button
                  onClick={() => { setNewValues({}); setShowAllFields(false); setShowSaisie(true) }}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--bg-surface)]/80 border border-[var(--border-base)] text-[var(--text-secondary)] text-xs font-semibold hover:border-primary/20 active:scale-[0.98] transition-all"
                >
                  <Scale size={13} />
                  Enregistrer une pesee
                </button>
              </>
            ) : (
              /* ── EMPTY STATE ── */
              <div className="text-center py-4">
                <div className="relative inline-flex items-center justify-center mb-5">
                  <div className="absolute w-20 h-20 rounded-full bg-primary/5 animate-breathe" />
                  <div className="relative w-16 h-16 rounded-2xl bg-primary/10 border border-primary/10 flex items-center justify-center">
                    <Scale size={28} className="text-primary" />
                  </div>
                </div>
                <h3 className="text-[var(--text-primary)] text-base font-bold mb-1">Commence ton suivi</h3>
                <p className="text-[var(--text-muted)] text-xs leading-relaxed max-w-[240px] mx-auto mb-5">
                  Enregistre ta premiere pesee pour suivre ta progression.
                </p>
                <button
                  onClick={() => { setNewValues({}); setShowAllFields(false); setShowSaisie(true) }}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold active:scale-[0.97] transition-all"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-primary) 0%, #FF8F5E 100%)',
                    boxShadow: '0 4px 20px rgba(var(--color-primary-rgb),0.3)',
                  }}
                >
                  <Scale size={15} />
                  Ma premiere pesee
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          EVOLUTION CHARTS (collapsible)
          ═══════════════════════════════════════════ */}
      {hasMens && hasChartData && (
        <div className="glass-card overflow-hidden">
          <button
            onClick={() => setShowCharts(!showCharts)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--bg-surface)]/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity size={14} className="text-primary" />
              </div>
              <span className="text-[var(--text-primary)] text-sm font-semibold">Courbes d'evolution</span>
            </div>
            <div className={`transition-transform duration-200 ${showCharts ? 'rotate-180' : ''}`}>
              <ChevronDown size={16} className="text-[var(--text-muted)]" />
            </div>
          </button>

          {showCharts && (
            <div className="px-4 pb-5 space-y-4 border-t border-[var(--border-subtle)]">
              {fields.map(field => {
                const fieldData = chartData.filter(d => d[field] != null)
                if (fieldData.length < 2) return null
                const color = COLORS[field]
                return (
                  <div key={field} className="pt-3">
                    <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-semibold mb-2.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      {LABELS[field]} ({UNITS[field]})
                    </p>
                    <div className="h-36 bg-[var(--bg-base)]/50 rounded-xl p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={fieldData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                          <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
                          <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<ChartTooltip />} cursor={false} />
                          <Line type="monotone" dataKey={field} stroke={color} strokeWidth={2.5}
                            dot={{ fill: color, r: 3, strokeWidth: 0 }}
                            activeDot={{ fill: color, r: 5, stroke: color, strokeWidth: 2, strokeOpacity: 0.3 }} />
                          {field === 'poids' && poidsCible && (
                            <Line type="monotone" dataKey={() => poidsCible} stroke="var(--border-base)" strokeWidth={1} strokeDasharray="6 4" dot={false} activeDot={false} />
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

      {/* Hint for single measurement */}
      {hasMens && !hasChartData && (
        <div className="glass-card px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Activity size={14} className="text-primary" />
          </div>
          <p className="text-[var(--text-muted)] text-[11px] leading-relaxed">Encore 1 pesee pour debloquer tes courbes d'evolution</p>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          OBJECTIFS LIST
          ═══════════════════════════════════════════ */}
      {objectifs.length > 0 && (
        <div className="space-y-3">
          <SectionLabel
            icon={Target}
            right={
              totalObjProgress > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <Zap size={10} className="text-primary" />
                  <span className="text-[var(--text-muted)] text-[10px] font-semibold tabular-nums">
                    <AnimatedNumber value={totalObjProgress} />% global
                  </span>
                </div>
              )
            }
          >
            Objectifs
          </SectionLabel>

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
              <div key={o.id}
                className={`glass-card overflow-hidden transition-all ${
                  done ? '!border-primary/20' : ''
                }`}
                style={done ? { boxShadow: '0 0 20px rgba(var(--color-primary-rgb),0.06)' } : undefined}
              >
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Mini ring */}
                    <MiniRing pct={pct} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-semibold truncate ${done ? 'text-primary' : 'text-[var(--text-primary)]'}`}>{o.titre}</p>
                        {o.date_cible && (
                          <span className="text-[var(--text-muted)] text-[9px] flex items-center gap-0.5 flex-shrink-0 bg-[var(--bg-surface)] px-1.5 py-0.5 rounded-md">
                            <Calendar size={8} />
                            {new Date(o.date_cible).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>

                      {/* Values row */}
                      <div className="flex items-center gap-2 mt-1.5">
                        {actuel != null && o.valeur_cible != null ? (
                          <span className="text-[11px]">
                            <span className="text-[var(--text-primary)] font-bold tabular-nums">{actuel}</span>
                            <span className="text-[var(--text-muted)] mx-1">/</span>
                            <span className="text-primary font-bold tabular-nums">{o.valeur_cible}</span>
                            {unite && <span className="text-[var(--text-muted)] ml-0.5">{unite}</span>}
                          </span>
                        ) : actuel != null ? (
                          <span className="text-[11px]">
                            <span className="text-[var(--text-primary)] font-bold tabular-nums">{actuel}</span>
                            {unite && <span className="text-[var(--text-muted)] ml-0.5">{unite}</span>}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)] text-[10px] italic">Aucune donnee</span>
                        )}

                        {done && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            <Check size={9} strokeWidth={3} /> Atteint
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action button */}
                    {!done && !isPoids && !isEditing && (
                      isCounter ? (
                        <button
                          onClick={() => incrementerObjectif(o)}
                          disabled={savingInline}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary/20 active:scale-90 transition-all disabled:opacity-40 flex-shrink-0"
                        >
                          {savingInline && inlineEditing === o.id ? <Loader2 size={14} className="animate-spin" /> : <Plus size={16} strokeWidth={3} />}
                        </button>
                      ) : (
                        <button
                          onClick={() => { setInlineEditing(o.id); setInlineValue(actuel != null ? String(actuel) : '') }}
                          className="px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)] text-[10px] font-semibold hover:border-primary/20 hover:text-primary transition-all flex-shrink-0"
                        >
                          Modifier
                        </button>
                      )
                    )}
                    {isPoids && !done && (
                      <span className="text-[var(--text-muted)] text-[9px] italic bg-[var(--bg-surface)] px-2 py-1 rounded-lg flex-shrink-0">Auto</span>
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
                          className="w-full bg-[var(--bg-base)] text-[var(--text-primary)] text-sm font-semibold rounded-xl px-3 py-2 pr-10 placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-primary/30 border border-[var(--border-base)] transition-all" />
                        {unite && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-[10px]">{unite}</span>}
                      </div>
                      <button type="submit" disabled={savingInline || !inlineValue}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-white active:scale-90 transition-all disabled:opacity-30 flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, var(--color-primary), #FF8F5E)' }}>
                        {savingInline ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} strokeWidth={3} />}
                      </button>
                      <button type="button" onClick={() => { setInlineEditing(null); setInlineValue('') }}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-all flex-shrink-0">
                        <X size={13} />
                      </button>
                    </form>
                  )}
                </div>

                {/* Progress bar at bottom of card */}
                {!done && pct > 0 && (
                  <div className="h-0.5 bg-[var(--border-subtle)]">
                    <div className="h-full rounded-full transition-all duration-700" style={{
                      width: `${pct}%`,
                      background: pct >= 50 ? 'linear-gradient(90deg, var(--color-primary), var(--color-primary-light))' : pct >= 25 ? 'var(--color-primary-light)' : '#ef4444',
                    }} />
                  </div>
                )}
                {done && <div className="h-0.5 bg-gradient-to-r from-primary to-primary-light" />}
              </div>
            )
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          MODAL PESEE
          ═══════════════════════════════════════════ */}
      {showSaisie && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowSaisie(false); setShowAllFields(false) }} />
          <div className="relative z-[101] bg-[var(--bg-base)] border border-[var(--border-base)] w-full sm:w-[400px] sm:rounded-2xl rounded-t-2xl overflow-hidden">

            {/* Accent bar */}
            <div className="h-1 bg-gradient-to-r from-primary to-primary-light" />

            {/* Handle bar (mobile) */}
            <div className="flex justify-center pt-3 pb-0 sm:hidden">
              <div className="w-8 h-1 rounded-full bg-[var(--border-strong)]" />
            </div>

            {/* Header */}
            <div className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Scale size={16} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-[var(--text-primary)] font-bold text-[15px]">Nouvelle mesure</h3>
                  <p className="text-[var(--text-muted)] text-[10px]">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
              </div>
              <button onClick={() => { setShowSaisie(false); setShowAllFields(false) }}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-surface)] transition-colors">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={enregistrerMensurations} className="px-5 pb-5 space-y-4">
              {/* Weight input — hero style */}
              {fields.includes('poids') && (
                <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-6 text-center">
                  <p className="text-[var(--text-muted)] text-[9px] uppercase tracking-widest font-medium mb-3 flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Poids du jour
                  </p>
                  <div className="flex items-end justify-center gap-1.5">
                    <input type="number" step="0.1" min="20" max="300" value={newValues.poids || ''}
                      onChange={(e) => setNewValues(prev => ({ ...prev, poids: e.target.value }))}
                      placeholder={lastEntry?.poids ? String(lastEntry.poids) : '--'} autoFocus
                      className="w-24 bg-transparent text-center text-[var(--text-primary)] text-4xl font-extrabold placeholder:text-[var(--text-muted)] focus:outline-none border-b-2 border-primary/20 focus:border-primary transition-colors pb-0.5 tabular-nums" />
                    <span className="text-[var(--text-muted)] text-base font-semibold pb-1.5">kg</span>
                  </div>
                  {newValues.poids && lastEntry?.poids && (() => {
                    const diff = +(parseFloat(newValues.poids) - lastEntry.poids).toFixed(1)
                    if (isNaN(diff) || diff === 0) return null
                    return (
                      <span className={`inline-block mt-3 text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                        diff < 0 ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-400'
                      }`}>{diff > 0 ? '+' : ''}{diff} kg vs derniere pesee</span>
                    )
                  })()}
                </div>
              )}

              {/* Expand mensurations */}
              {fields.filter(f => f !== 'poids').length > 0 && !showAllFields && (
                <button type="button" onClick={() => setShowAllFields(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-[var(--border-base)] text-[var(--text-muted)] text-[11px] font-medium hover:border-[var(--border-strong)] hover:text-[var(--text-secondary)] transition-all">
                  <Ruler size={11} /> Ajouter des mensurations <ChevronDown size={11} />
                </button>
              )}

              {showAllFields && fields.filter(f => f !== 'poids').map(field => {
                const color = COLORS[field]; const lastVal = lastEntry?.[field]
                const currentVal = newValues[field]
                const diff = currentVal && lastVal ? +(parseFloat(currentVal) - lastVal).toFixed(1) : null
                return (
                  <div key={field} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-[var(--text-secondary)] text-[11px] font-semibold">{LABELS[field]}</span>
                      </div>
                      {diff !== null && !isNaN(diff) && diff !== 0 && (
                        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${diff < 0 ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-400'}`}>
                          {diff > 0 ? '+' : ''}{diff} {UNITS[field]}
                        </span>
                      )}
                    </div>
                    <div className="flex items-end gap-1.5">
                      <input type="number" step="0.1" min="0" max="200" value={newValues[field] || ''}
                        onChange={(e) => setNewValues(prev => ({ ...prev, [field]: e.target.value }))}
                        placeholder={lastVal ? String(lastVal) : '--'}
                        className="flex-1 bg-transparent text-[var(--text-primary)] text-lg font-bold placeholder:text-[var(--text-muted)] focus:outline-none border-b border-[var(--border-subtle)] focus:border-[var(--border-strong)] transition-colors pb-0.5 tabular-nums" />
                      <span className="text-[var(--text-muted)] text-xs font-medium pb-1">{UNITS[field]}</span>
                    </div>
                  </div>
                )
              })}

              <button type="submit" disabled={savingMens || !fields.some(f => newValues[f])}
                className="w-full py-3.5 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary) 0%, #FF8F5E 100%)',
                  boxShadow: '0 4px 20px rgba(var(--color-primary-rgb),0.25)',
                }}
              >
                {savingMens ? <><Loader2 size={14} className="animate-spin" /> Enregistrement...</> : <><Check size={14} strokeWidth={3} /> Enregistrer</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
