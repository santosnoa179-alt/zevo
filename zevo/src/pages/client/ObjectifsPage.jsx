import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import {
  Plus, Lock, Archive, Target, Calendar, Scale, TrendingDown,
  TrendingUp, Minus as MinusIcon, Loader2, X
} from 'lucide-react'
import { Confetti } from '../../components/ui/Confetti'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// ── Barre de progression colorée ──
function ProgressBar({ score }) {
  const couleur = score >= 75 ? '#22c55e' : score >= 50 ? '#FF6B2B' : score >= 25 ? '#f59e0b' : '#ef4444'
  return (
    <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden mt-3">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${score}%`, backgroundColor: couleur }}
      />
    </div>
  )
}

// ── Tooltip custom pour la courbe de poids ──
function WeightTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-[#1E1E1E] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm shadow-xl backdrop-blur-sm">
      <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">{d.label}</p>
      <p className="text-[#F5F5F3] font-bold text-base">{d.poids}<span className="text-white/30 text-xs font-normal"> kg</span></p>
    </div>
  )
}

export default function ObjectifsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)

  // ── Objectifs ──
  const [objectifs, setObjectifs] = useState([])
  const [modalOuvert, setModalOuvert] = useState(false)
  const [editScore, setEditScore] = useState({})
  const [saving, setSaving] = useState(null)
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [dateCible, setDateCible] = useState('')
  const [ajout, setAjout] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  // ── Suivi poids ──
  const [poidsData, setPoidsData] = useState([])
  const [poidsActuel, setPoidsActuel] = useState(null)
  const [poidsCible, setPoidsCible] = useState(null)
  const [coachId, setCoachId] = useState(null)
  const [showPesee, setShowPesee] = useState(false)
  const [newPoids, setNewPoids] = useState('')
  const [savingPoids, setSavingPoids] = useState(false)

  // ── Chargement initial ──
  const chargerDonnees = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const [objRes, poidsRes, clientRes] = await Promise.all([
      supabase
        .from('objectifs')
        .select('*')
        .eq('client_id', user.id)
        .eq('archive', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('suivi_poids')
        .select('poids, date_pesee')
        .eq('client_id', user.id)
        .order('date_pesee', { ascending: true }),
      supabase
        .from('clients')
        .select('coach_id, poids, poids_cible')
        .eq('id', user.id)
        .maybeSingle(),
    ])

    setObjectifs(objRes.data ?? [])
    setPoidsData(poidsRes.data ?? [])
    setCoachId(clientRes.data?.coach_id ?? null)
    setPoidsActuel(clientRes.data?.poids ?? null)
    setPoidsCible(clientRes.data?.poids_cible ?? null)
    setLoading(false)
  }, [user])

  useEffect(() => { chargerDonnees() }, [chargerDonnees])

  // ── Données pour le graphique ──
  const chartData = useMemo(() => {
    return poidsData.map(p => ({
      date: p.date_pesee,
      poids: p.poids,
      label: new Date(p.date_pesee).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    }))
  }, [poidsData])

  // Stats dérivées
  const dernierPoids = poidsData.length > 0 ? poidsData[poidsData.length - 1].poids : poidsActuel
  const premierPoids = poidsData.length > 0 ? poidsData[0].poids : null
  const delta = dernierPoids && premierPoids ? +(dernierPoids - premierPoids).toFixed(1) : null

  // ── Enregistrer une pesée ──
  const enregistrerPesee = async (e) => {
    e.preventDefault()
    const poids = parseFloat(newPoids)
    if (!poids || poids < 20 || poids > 300) {
      toast.error('Saisis un poids valide (entre 20 et 300 kg).')
      return
    }

    setSavingPoids(true)

    const today = new Date()
    const datePesee = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    // Upsert : si déjà une pesée aujourd'hui, on la met à jour
    const { error } = await supabase
      .from('suivi_poids')
      .upsert(
        {
          client_id: user.id,
          coach_id: coachId,
          date_pesee: datePesee,
          poids,
        },
        { onConflict: 'client_id,date_pesee' }
      )

    if (error) {
      console.error('[Objectifs] Erreur enregistrement pesée:', error)
      // Fallback : INSERT simple si upsert échoue (pas de contrainte unique)
      const { error: insertErr } = await supabase
        .from('suivi_poids')
        .insert({ client_id: user.id, coach_id: coachId, date_pesee: datePesee, poids })

      if (insertErr) {
        toast.error(insertErr.message || 'Erreur lors de l\'enregistrement')
        setSavingPoids(false)
        return
      }
    }

    // Mettre à jour le poids dans la table clients aussi
    await supabase.from('clients').update({ poids }).eq('id', user.id)

    toast.success(`Pesée enregistrée : ${poids} kg !`)
    setShowPesee(false)
    setNewPoids('')
    setSavingPoids(false)

    // Refresh data
    const { data: freshPoids } = await supabase
      .from('suivi_poids')
      .select('poids, date_pesee')
      .eq('client_id', user.id)
      .order('date_pesee', { ascending: true })
    setPoidsData(freshPoids ?? [])
    setPoidsActuel(poids)
  }

  // ── Objectifs CRUD ──
  const mettreAJourScore = async (objectifId, nouveauScore) => {
    const score = Math.min(100, Math.max(0, Number(nouveauScore)))
    setSaving(objectifId)
    const { error } = await supabase.from('objectifs').update({ score }).eq('id', objectifId)
    if (error) {
      toast.error(error.message || 'Erreur mise à jour')
    } else {
      setObjectifs(prev => prev.map(o => o.id === objectifId ? { ...o, score } : o))
      if (score === 100) {
        setShowConfetti(false)
        setTimeout(() => setShowConfetti(true), 50)
        toast.success('Objectif atteint ! 🎉')
      }
    }
    setEditScore(prev => ({ ...prev, [objectifId]: undefined }))
    setSaving(null)
  }

  const archiverObjectif = async (objectifId) => {
    await supabase.from('objectifs').update({ archive: true }).eq('id', objectifId)
    setObjectifs(prev => prev.filter(o => o.id !== objectifId))
    toast.success('Objectif archivé !')
  }

  const ajouterObjectif = async (e) => {
    e.preventDefault()
    if (!titre.trim()) return
    setAjout(true)
    const { data, error } = await supabase.from('objectifs').insert({
      client_id: user.id,
      titre: titre.trim(),
      description: description.trim() || null,
      date_cible: dateCible || null,
      score: 0,
    }).select().single()
    if (!error && data) {
      setObjectifs(prev => [data, ...prev])
      toast.success('Objectif créé !')
      setTitre(''); setDescription(''); setDateCible(''); setModalOuvert(false)
    } else if (error) {
      toast.error(error.message || 'Erreur création objectif')
    }
    setAjout(false)
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="p-4 space-y-3 max-w-2xl animate-pulse">
        <div className="pt-4 flex justify-between items-center">
          <div className="h-7 w-36 bg-[#2A2A2A] rounded" />
          <div className="h-9 w-24 bg-[#2A2A2A] rounded-lg" />
        </div>
        <div className="h-48 bg-[#2A2A2A] rounded-xl" />
        {[1, 2].map(i => <div key={i} className="h-28 bg-[#2A2A2A] rounded-xl" />)}
      </div>
    )
  }

  const termines = objectifs.filter(o => o.score === 100).length

  return (
    <div className="p-4 pb-28 space-y-5 max-w-2xl">
      <Confetti active={showConfetti} />

      {/* ═══════════ SECTION POIDS ═══════════ */}
      <div className="pt-2">
        <h1 className="text-[#F5F5F3] text-xl font-bold flex items-center gap-2">
          <Scale size={20} className="text-[#FF6B2B]" />
          Suivi & Objectifs
        </h1>
        <p className="text-white/40 text-sm mt-0.5">Ton évolution et tes objectifs personnels</p>
      </div>

      {/* Carte poids actuel + bouton pesée */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/40 text-[11px] uppercase tracking-wider font-semibold">Mon poids</p>
            <button
              onClick={() => setShowPesee(true)}
              className="px-3 py-1.5 rounded-xl bg-[#FF6B2B] text-white text-xs font-semibold hover:bg-[#e55a1b] transition-colors flex items-center gap-1.5 shadow-lg shadow-[#FF6B2B]/20"
            >
              <Scale size={13} />
              Nouvelle pesée
            </button>
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-[#0D0D0D] rounded-xl p-3 text-center">
              <p className="text-[#F5F5F3] text-xl font-bold">
                {dernierPoids ? `${dernierPoids}` : '—'}
              </p>
              <p className="text-white/30 text-[9px] uppercase mt-0.5">Actuel (kg)</p>
            </div>
            <div className="bg-[#0D0D0D] rounded-xl p-3 text-center">
              <p className="text-white/50 text-xl font-bold">
                {poidsCible ? `${poidsCible}` : '—'}
              </p>
              <p className="text-white/30 text-[9px] uppercase mt-0.5">Objectif (kg)</p>
            </div>
            <div className="bg-[#0D0D0D] rounded-xl p-3 text-center">
              {delta !== null ? (
                <div className="flex items-center justify-center gap-1">
                  {delta < 0 ? (
                    <TrendingDown size={14} className="text-emerald-400" />
                  ) : delta > 0 ? (
                    <TrendingUp size={14} className="text-red-400" />
                  ) : (
                    <MinusIcon size={14} className="text-white/30" />
                  )}
                  <p className={`text-xl font-bold ${
                    delta < 0 ? 'text-emerald-400' : delta > 0 ? 'text-red-400' : 'text-white/50'
                  }`}>
                    {delta > 0 ? '+' : ''}{delta}
                  </p>
                </div>
              ) : (
                <p className="text-white/30 text-xl font-bold">—</p>
              )}
              <p className="text-white/30 text-[9px] uppercase mt-0.5">Évolution (kg)</p>
            </div>
          </div>

          {/* Graphique poids */}
          {chartData.length >= 2 ? (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={['dataMin - 1', 'dataMax + 1']}
                    tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<WeightTooltip />} cursor={false} />
                  <Line
                    type="monotone"
                    dataKey="poids"
                    stroke="#FF6B2B"
                    strokeWidth={2.5}
                    dot={{ fill: '#FF6B2B', r: 4, strokeWidth: 0 }}
                    activeDot={{ fill: '#FF6B2B', r: 6, stroke: '#FF6B2B', strokeWidth: 2, strokeOpacity: 0.3 }}
                  />
                  {/* Ligne objectif si défini */}
                  {poidsCible && (
                    <Line
                      type="monotone"
                      dataKey={() => poidsCible}
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth={1}
                      strokeDasharray="6 4"
                      dot={false}
                      activeDot={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : chartData.length === 1 ? (
            <div className="text-center py-6">
              <p className="text-white/25 text-xs">Enregistre une 2ème pesée pour voir ta courbe d'évolution.</p>
            </div>
          ) : (
            <div className="text-center py-6">
              <Scale size={24} className="text-white/10 mx-auto mb-2" />
              <p className="text-white/25 text-xs">Aucune pesée enregistrée.</p>
              <button onClick={() => setShowPesee(true)} className="mt-2 text-[#FF6B2B] text-xs font-semibold hover:underline">
                Enregistrer ma première pesée
              </button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* ═══════════ SECTION OBJECTIFS ═══════════ */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[#F5F5F3] text-lg font-bold flex items-center gap-2">
            <Target size={18} className="text-[#FF6B2B]" />
            Objectifs
          </h2>
          <p className="text-white/40 text-xs mt-0.5">
            {termines > 0 ? `${termines} atteint${termines > 1 ? 's' : ''} 🎉 · ` : ''}
            {objectifs.length} en cours
          </p>
        </div>
        <Button onClick={() => setModalOuvert(true)} size="sm">
          <Plus size={15} /> Ajouter
        </Button>
      </div>

      {objectifs.length === 0 ? (
        <Card>
          <CardBody className="text-center py-10">
            <Target size={32} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">Aucun objectif pour l'instant.</p>
            <button onClick={() => setModalOuvert(true)} className="mt-3 text-[#FF6B2B] text-sm font-medium hover:underline">
              + Définir mon premier objectif
            </button>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {objectifs.map((o) => {
            const scoreEdit = editScore[o.id] ?? o.score
            const estTermine = o.score === 100

            return (
              <Card key={o.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[#F5F5F3] text-sm font-medium truncate">{o.titre}</p>
                        {o.assigned_by && (
                          <Lock size={11} className="text-white/25 flex-shrink-0" title="Assigné par votre coach" />
                        )}
                      </div>
                      {o.description && (
                        <p className="text-white/35 text-xs mt-1 line-clamp-2">{o.description}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[#F5F5F3] text-lg font-bold">{o.score}%</p>
                      {o.date_cible && (
                        <div className="flex items-center gap-1 justify-end text-white/30 text-xs mt-0.5">
                          <Calendar size={10} />
                          {new Date(o.date_cible).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </div>
                      )}
                    </div>
                  </div>

                  <ProgressBar score={o.score} />

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={scoreEdit}
                        onChange={(e) => setEditScore(prev => ({ ...prev, [o.id]: Number(e.target.value) }))}
                        className="flex-1 accent-[#FF6B2B]"
                      />
                      <span className="text-[#F5F5F3] text-sm font-mono w-8 text-right">{scoreEdit}%</span>
                    </div>

                    <div className="flex gap-2">
                      {scoreEdit !== o.score && (
                        <Button
                          size="sm"
                          className="flex-1"
                          loading={saving === o.id}
                          onClick={() => mettreAJourScore(o.id, scoreEdit)}
                        >
                          Mettre à jour
                        </Button>
                      )}
                      {estTermine && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1"
                          onClick={() => archiverObjectif(o.id)}
                        >
                          <Archive size={13} /> Archiver 🎉
                        </Button>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      {/* ═══════════ MODALE NOUVEL OBJECTIF ═══════════ */}
      <Modal isOpen={modalOuvert} onClose={() => setModalOuvert(false)} title="Nouvel objectif">
        <form onSubmit={ajouterObjectif} className="space-y-4">
          <Input
            label="Titre de l'objectif"
            placeholder="Ex : Courir un semi-marathon"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            required
            autoFocus
          />
          <div>
            <label className="text-sm text-white/60 font-medium block mb-1.5">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Pourquoi cet objectif compte pour toi…"
              rows={3}
              className="w-full bg-[#2A2A2A] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#FF6B2B]/50 resize-none"
            />
          </div>
          <Input
            label="Date cible (optionnel)"
            type="date"
            value={dateCible}
            onChange={(e) => setDateCible(e.target.value)}
          />
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOuvert(false)}>Annuler</Button>
            <Button type="submit" loading={ajout} className="flex-1">Créer</Button>
          </div>
        </form>
      </Modal>

      {/* ═══════════ MODALE NOUVELLE PESÉE ═══════════ */}
      {showPesee && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPesee(false)} />
          <div className="relative z-[101] bg-[#18181b] border border-[#27272a] w-full sm:w-[400px] sm:rounded-2xl rounded-t-2xl overflow-hidden">

            {/* Header */}
            <div className="px-4 py-3 border-b border-[#27272a] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale size={16} className="text-[#FF6B2B]" />
                <h3 className="text-[#F5F5F3] font-semibold text-sm">Nouvelle pesée</h3>
              </div>
              <button onClick={() => setShowPesee(false)} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-[#27272a] transition-colors">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={enregistrerPesee} className="p-5 space-y-5">
              {/* Gros input poids */}
              <div className="text-center">
                <p className="text-white/40 text-xs mb-3">
                  {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <div className="flex items-end justify-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="20"
                    max="300"
                    value={newPoids}
                    onChange={(e) => setNewPoids(e.target.value)}
                    placeholder={dernierPoids ? String(dernierPoids) : '75.0'}
                    autoFocus
                    className="w-32 bg-transparent text-center text-[#F5F5F3] text-4xl font-extrabold placeholder:text-white/15 focus:outline-none border-b-2 border-[#FF6B2B]/30 focus:border-[#FF6B2B] transition-colors pb-1"
                  />
                  <span className="text-white/30 text-lg font-semibold pb-2">kg</span>
                </div>

                {/* Comparaison rapide */}
                {dernierPoids && newPoids && (
                  <div className="mt-3">
                    {(() => {
                      const diff = +(parseFloat(newPoids) - dernierPoids).toFixed(1)
                      if (isNaN(diff)) return null
                      return (
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          diff < 0 ? 'bg-emerald-500/10 text-emerald-400' :
                          diff > 0 ? 'bg-red-500/10 text-red-400' :
                          'bg-white/[0.06] text-white/40'
                        }`}>
                          {diff > 0 ? '+' : ''}{diff} kg vs dernière pesée
                        </span>
                      )
                    })()}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={savingPoids || !newPoids}
                className="w-full py-3 rounded-xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#e55a1b] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B2B]/20"
              >
                {savingPoids ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Scale size={15} />
                    Enregistrer
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
