import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { CheckCircle2, Circle, Plus, Flame, Trash2, TrendingUp, Lock } from 'lucide-react'
import { BarChart, Bar, Tooltip, ResponsiveContainer } from 'recharts'

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

const COULEURS = ['#FF6B2B', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ec4899', '#14b8a6']

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

  if (loading) {
    return (
      <div className="p-4 space-y-3 max-w-2xl animate-pulse">
        <div className="pt-4 flex justify-between items-center">
          <div className="space-y-1"><div className="h-7 w-36 bg-[#2A2A2A] rounded" /><div className="h-4 w-44 bg-[#2A2A2A] rounded" /></div>
          <div className="h-9 w-24 bg-[#2A2A2A] rounded-lg" />
        </div>
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-[#2A2A2A] rounded-xl" />)}
      </div>
    )
  }

  const cocheesCeJour = habitudes.filter(h => logAujourdhui.includes(h.id)).length

  return (
    <div className="p-4 space-y-4 max-w-2xl">

      {/* ── En-tête ── */}
      <div className="pt-4 flex items-center justify-between">
        <div>
          <h1 className="text-[#F5F5F3] text-xl font-bold">Habitudes</h1>
          <p className="text-white/40 text-sm mt-0.5">
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
            <p className="text-white/40 text-sm">Aucune habitude pour l'instant.</p>
            <button onClick={() => setModalOuvert(true)} className="mt-3 text-[#FF6B2B] text-sm font-medium hover:underline">
              + Créer ma première habitude
            </button>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {habitudes.map((h) => {
            const logsDates = logs.filter(l => l.habitude_id === h.id).map(l => l.date)
            const streak = calculerStreak(logsDates)
            const fait = logAujourdhui.includes(h.id)
            const pct = Math.round((logsDates.length / 30) * 100)
            const estDetail = detail === h.id

            return (
              <Card key={h.id} className={estDetail ? 'ring-1 ring-[#FF6B2B]/25' : ''}>
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
                        : <Circle size={22} className="text-white/20 hover:text-white/50 transition-colors" />
                      }
                    </button>

                    {/* Nom + progression */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${fait ? 'line-through text-white/35' : 'text-[#F5F5F3]'}`}>
                        {h.nom}
                      </p>
                      <p className="text-white/25 text-xs mt-0.5">{pct}% ce mois</p>
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
                      ? <Lock size={13} className="text-white/15 flex-shrink-0" title="Assignée par votre coach" />
                      : (
                        <button
                          onClick={() => supprimerHabitude(h.id)}
                          disabled={suppression === h.id}
                          className="text-white/15 hover:text-red-400 transition-colors p-1 disabled:opacity-40 flex-shrink-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      )
                    }

                    <button
                      onClick={() => setDetail(estDetail ? null : h.id)}
                      className={`p-1 transition-colors flex-shrink-0 ${estDetail ? 'text-[#FF6B2B]' : 'text-white/20 hover:text-[#FF6B2B]'}`}
                    >
                      <TrendingUp size={14} />
                    </button>
                  </div>

                  {/* Barre de progression */}
                  <div className="mt-3 h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: h.couleur ?? '#FF6B2B' }}
                    />
                  </div>

                  {/* ── Graphique développé ── */}
                  {estDetail && (
                    <div className="mt-4 pt-4 border-t border-white/[0.06]">
                      <p className="text-white/40 text-[11px] uppercase tracking-wider mb-3">
                        30 derniers jours · {logsDates.length} fois cochée
                      </p>
                      <ResponsiveContainer width="100%" height={56}>
                        <BarChart data={genererMensuel(logsDates)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap={2}>
                          <Tooltip
                            content={({ active, payload }) =>
                              active && payload?.length
                                ? <div className="bg-[#2A2A2A] border border-white/[0.08] rounded px-2 py-1 text-xs text-[#F5F5F3]">{payload[0].payload.date}</div>
                                : null
                            }
                          />
                          <Bar dataKey="fait" fill={h.couleur ?? '#FF6B2B'} radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                      {streak > 0 && (
                        <p className="text-center text-xs mt-2 font-medium" style={{ color: h.couleur ?? '#FF6B2B' }}>
                          🔥 {streak} jour{streak > 1 ? 's' : ''} d'affilée !
                        </p>
                      )}
                    </div>
                  )}
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
            <p className="text-sm text-white/60 font-medium mb-2">Couleur</p>
            <div className="flex gap-2 flex-wrap">
              {COULEURS.map((c) => (
                <button key={c} type="button" onClick={() => setCouleur(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${couleur === c ? 'ring-2 ring-offset-2 ring-offset-[#1E1E1E] ring-white/60 scale-110' : 'hover:scale-105'}`}
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
