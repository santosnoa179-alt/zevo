import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { usePageTransition, useStagger } from '../../hooks/useAnimations'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { CheckCircle2, Circle, Plus, Flame, Trash2, TrendingUp, Lock } from 'lucide-react'
import { BarChart, Bar, Cell, Tooltip, ResponsiveContainer } from 'recharts'

// Calcule le streak consécutif d'une habitude depuis ses logs
function calculerStreak(logsDates) {
  if (!logsDates.length) return 0
  const sorted = [...logsDates].sort((a, b) => b.localeCompare(a))
  let streak = 0
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  for (let i = 0; ; i++) {
    const d = new Date(base)
    d.setDate(d.getDate() - i)
    const ds = d.toISOString().split('T')[0]
    if (sorted.includes(ds)) { streak++ }
    else if (i === 0) { continue }
    else { break }
  }
  return streak
}

// Génère les 30 derniers jours (pour le micro-graphique)
function genererMensuel(logsDates) {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    const ds = d.toISOString().split('T')[0]
    return { jour: d.getDate(), fait: logsDates.includes(ds) ? 1 : 0, date: ds }
  })
}

const COULEURS = ['#FF6B2B', '#FF9A6C', '#FFB894', '#E85A1F', '#C94A15', '#7A7A78', '#F5F5F3']

export default function HabitudesPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [habitudes, setHabitudes] = useState([])
  const [logs, setLogs] = useState([])
  const [logAujourdhui, setLogAujourdhui] = useState([])
  const [detail, setDetail] = useState(null) // id de l'habitude développée
  const [toggling, setToggling] = useState(null)
  const [suppression, setSuppression] = useState(null)
  const [modalOuvert, setModalOuvert] = useState(false)
  const [nom, setNom] = useState('')
  const [couleur, setCouleur] = useState(COULEURS[0])
  const [sauvegarde, setSauvegarde] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const chargerDonnees = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const il30j = new Date()
    il30j.setDate(il30j.getDate() - 29)
    const dateMin = il30j.toISOString().split('T')[0]

    const [habsRes, logsRes] = await Promise.all([
      supabase.from('habitudes').select('*').eq('client_id', user.id).eq('actif', true).order('created_at'),
      supabase.from('habitudes_log').select('habitude_id, date').eq('client_id', user.id).gte('date', dateMin),
    ])

    const allLogs = logsRes.data ?? []
    setHabitudes(habsRes.data ?? [])
    setLogs(allLogs)
    setLogAujourdhui(allLogs.filter(l => l.date === today).map(l => l.habitude_id))
    setLoading(false)
  }, [user, today])

  useEffect(() => { chargerDonnees() }, [chargerDonnees])

  const toggleHabitude = async (habitudeId) => {
    setToggling(habitudeId)
    const dejaFait = logAujourdhui.includes(habitudeId)
    if (dejaFait) {
      await supabase.from('habitudes_log').delete()
        .eq('habitude_id', habitudeId).eq('client_id', user.id).eq('date', today)
      setLogAujourdhui(prev => prev.filter(id => id !== habitudeId))
      setLogs(prev => prev.filter(l => !(l.habitude_id === habitudeId && l.date === today)))
    } else {
      await supabase.from('habitudes_log').insert({ habitude_id: habitudeId, client_id: user.id, date: today })
      setLogAujourdhui(prev => [...prev, habitudeId])
      setLogs(prev => [...prev, { habitude_id: habitudeId, date: today }])
    }
    setToggling(null)
  }

  const ajouterHabitude = async (e) => {
    e.preventDefault()
    if (!nom.trim()) return
    setSauvegarde(true)
    const { data, error } = await supabase.from('habitudes')
      .insert({ client_id: user.id, nom: nom.trim(), couleur }).select().single()
    if (!error && data) {
      setHabitudes(prev => [...prev, data])
      setNom(''); setCouleur(COULEURS[0]); setModalOuvert(false)
    }
    setSauvegarde(false)
  }

  const supprimerHabitude = async (id) => {
    setSuppression(id)
    await supabase.from('habitudes').update({ actif: false }).eq('id', id)
    setHabitudes(prev => prev.filter(h => h.id !== id))
    if (detail === id) setDetail(null)
    setSuppression(null)
  }

  const pageTransition = usePageTransition()
  const stagger = useStagger(habitudes.length + 1) // +1 for header

  if (loading) {
    return (
      <div className="p-4 space-y-3 max-w-4xl mx-auto animate-pulse">
        <div className="pt-4 flex justify-between items-center">
          <div className="space-y-1"><div className="h-7 w-36 bg-[var(--bg-surface)] rounded" /><div className="h-4 w-44 bg-[var(--bg-surface)] rounded" /></div>
          <div className="h-9 w-24 bg-[var(--bg-surface)] rounded-lg" />
        </div>
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-[var(--bg-surface)] rounded-xl" />)}
      </div>
    )
  }

  const cocheesCeJour = habitudes.filter(h => logAujourdhui.includes(h.id)).length

  return (
    <div className={`p-4 space-y-4 max-w-4xl mx-auto ${pageTransition.className}`}>

      {/* ── En-tête ── */}
      <div className={`pt-4 flex items-center justify-between ${stagger[0].className}`} style={stagger[0].style}>
        <div>
          <h1 className="text-[var(--text-primary)] text-xl font-bold">Habitudes</h1>
          <p className="text-[var(--text-muted)] text-sm mt-0.5">
            {cocheesCeJour}/{habitudes.length} cochées aujourd'hui
          </p>
        </div>
        <Button onClick={() => setModalOuvert(true)} size="sm">
          <Plus size={15} /> Ajouter
        </Button>
      </div>

      {/* ── Liste ── */}
      {habitudes.length === 0 ? (
        <Card>
          <CardBody className="text-center py-10">
            <p className="text-4xl mb-3">🎯</p>
            <p className="text-[var(--text-muted)] text-sm">Aucune habitude pour l'instant.</p>
            <button onClick={() => setModalOuvert(true)} className="mt-3 text-[#FF6B2B] text-sm font-medium hover:underline">
              + Créer ma première habitude
            </button>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {habitudes.map((h, i) => {
            const logsDates = logs.filter(l => l.habitude_id === h.id).map(l => l.date)
            const streak = calculerStreak(logsDates)
            const fait = logAujourdhui.includes(h.id)
            const pct = Math.round((logsDates.length / 30) * 100)
            const estDetail = detail === h.id
            const si = stagger[i + 1] || {}

            return (
              <Card key={h.id} className={`${estDetail ? 'ring-1 ring-[#FF6B2B]/25' : ''} ${si.className || ''}`} style={si.style}>
                <CardBody>
                  {/* ── Ligne principale ── */}
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleHabitude(h.id)}
                      disabled={toggling === h.id}
                      className="flex-shrink-0 transition-transform active:scale-90 disabled:opacity-50"
                    >
                      {fait
                        ? <CheckCircle2 size={22} style={{ color: h.couleur ?? '#FF6B2B' }} />
                        : <Circle size={22} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors" />
                      }
                    </button>

                    {/* Nom + progression */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${fait ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                        {h.nom}
                      </p>
                      <p className="text-[var(--text-muted)] text-xs mt-0.5">{pct}% ce mois</p>
                    </div>

                    {/* Streak */}
                    {streak > 0 && (
                      <div className="flex items-center gap-1 text-[#FF6B2B]">
                        <Flame size={12} />
                        <span className="text-xs font-semibold">{streak}j</span>
                      </div>
                    )}

                    {/* Actions */}
                    {h.assigned_by
                      ? <Lock size={13} className="text-[var(--text-muted)] flex-shrink-0" title="Assignée par votre coach" />
                      : (
                        <button
                          onClick={() => supprimerHabitude(h.id)}
                          disabled={suppression === h.id}
                          className="text-[var(--text-muted)] hover:text-red-400 transition-colors p-1 disabled:opacity-40 flex-shrink-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      )
                    }

                    <button
                      onClick={() => setDetail(estDetail ? null : h.id)}
                      className={`p-1 transition-colors flex-shrink-0 ${estDetail ? 'text-[#FF6B2B]' : 'text-[var(--text-muted)] hover:text-[#FF6B2B]'}`}
                    >
                      <TrendingUp size={14} />
                    </button>
                  </div>

                  {/* Barre de progression */}
                  <div className="mt-3 h-1 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: h.couleur ?? '#FF6B2B' }}
                    />
                  </div>

                  {/* ── Graphique développé ── */}
                  {estDetail && (() => {
                    const mensuel = genererMensuel(logsDates)
                    const chartData = mensuel.map(d => ({ ...d, val: 1 }))
                    return (
                    <div className="mt-4 pt-4 border-t border-[var(--border-base)]">
                      <p className="text-[var(--text-muted)] text-[11px] uppercase tracking-wider mb-3">
                        30 derniers jours · {logsDates.length} fois cochée
                      </p>
                      <ResponsiveContainer width="100%" height={56}>
                        <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap={2}>
                          <Tooltip
                            content={({ active, payload }) =>
                              active && payload?.length
                                ? <div className="bg-[var(--bg-surface)] border border-[var(--border-base)] rounded px-2 py-1 text-xs text-[var(--text-primary)]">{payload[0].payload.date}{payload[0].payload.fait ? ' ✓' : ''}</div>
                                : null
                            }
                          />
                          <Bar dataKey="val" radius={[2, 2, 0, 0]}>
                            {mensuel.map((d, idx) => (
                              <Cell key={idx} fill={d.fait ? (h.couleur ?? '#FF6B2B') : 'var(--bg-surface)'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      {streak > 0 && (
                        <p className="text-center text-xs mt-2 font-medium" style={{ color: h.couleur ?? '#FF6B2B' }}>
                          🔥 {streak} jour{streak > 1 ? 's' : ''} d'affilée !
                        </p>
                      )}
                    </div>
                    )
                  })()}
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Modal ajout ── */}
      <Modal isOpen={modalOuvert} onClose={() => setModalOuvert(false)} title="Nouvelle habitude">
        <form onSubmit={ajouterHabitude} className="space-y-4">
          <Input
            label="Nom de l'habitude"
            placeholder="Ex : Méditer 10 minutes"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
            autoFocus
          />
          <div>
            <p className="text-sm text-[var(--text-secondary)] font-medium mb-2">Couleur</p>
            <div className="flex gap-2 flex-wrap">
              {COULEURS.map((c) => (
                <button key={c} type="button" onClick={() => setCouleur(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${couleur === c ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-card)] ring-[var(--text-muted)] scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOuvert(false)}>Annuler</Button>
            <Button type="submit" loading={sauvegarde} className="flex-1">Créer</Button>
          </div>
        </form>
      </Modal>

    </div>
  )
}
