import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Plus, Lock, Archive, Target, Calendar } from 'lucide-react'
import { Confetti } from '../../components/ui/Confetti'

// Barre de progression colorée selon le score
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

export default function ObjectifsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [objectifs, setObjectifs] = useState([])
  const [modalOuvert, setModalOuvert] = useState(false)
  const [editScore, setEditScore] = useState({}) // { [id]: valeur }
  const [saving, setSaving] = useState(null)

  // Formulaire nouvel objectif
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [dateCible, setDateCible] = useState('')
  const [ajout, setAjout] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const chargerObjectifs = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('objectifs')
      .select('*')
      .eq('client_id', user.id)
      .eq('archive', false)
      .order('created_at', { ascending: false })
    setObjectifs(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { chargerObjectifs() }, [chargerObjectifs])

  // Met à jour le score d'un objectif
  const mettreAJourScore = async (objectifId, nouveauScore) => {
    const score = Math.min(100, Math.max(0, Number(nouveauScore)))
    setSaving(objectifId)
    await supabase.from('objectifs').update({ score }).eq('id', objectifId)
    setObjectifs(prev => prev.map(o => o.id === objectifId ? { ...o, score } : o))
    setEditScore(prev => ({ ...prev, [objectifId]: undefined }))
    setSaving(null)
    // Confettis quand 100% atteint !
    if (score === 100) {
      setShowConfetti(false)
      setTimeout(() => setShowConfetti(true), 50)
    }
  }

  // Archive un objectif accompli
  const archiverObjectif = async (objectifId) => {
    await supabase.from('objectifs').update({ archive: true }).eq('id', objectifId)
    setObjectifs(prev => prev.filter(o => o.id !== objectifId))
  }

  // Ajoute un nouvel objectif personnel
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
      setTitre(''); setDescription(''); setDateCible(''); setModalOuvert(false)
    }
    setAjout(false)
  }

  if (loading) {
    return (
      <div className="p-4 space-y-3 max-w-2xl animate-pulse">
        <div className="pt-4 flex justify-between items-center">
          <div className="h-7 w-36 bg-[#2A2A2A] rounded" />
          <div className="h-9 w-24 bg-[#2A2A2A] rounded-lg" />
        </div>
        {[1, 2, 3].map(i => <div key={i} className="h-28 bg-[#2A2A2A] rounded-xl" />)}
      </div>
    )
  }

  const termines = objectifs.filter(o => o.score === 100).length

  return (
    <div className="p-4 space-y-4 max-w-2xl">
      <Confetti active={showConfetti} />

      {/* ── En-tête ── */}
      <div className="pt-4 flex items-center justify-between">
        <div>
          <h1 className="text-[#F5F5F3] text-xl font-bold">Objectifs</h1>
          <p className="text-white/40 text-sm mt-0.5">
            {termines > 0 ? `${termines} atteint${termines > 1 ? 's' : ''} 🎉 · ` : ''}
            {objectifs.length} en cours
          </p>
        </div>
        <Button onClick={() => setModalOuvert(true)} size="sm">
          <Plus size={15} /> Ajouter
        </Button>
      </div>

      {/* ── Liste des objectifs ── */}
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
                  {/* ── En-tête objectif ── */}
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

                    {/* Score actuel */}
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

                  {/* Barre de progression */}
                  <ProgressBar score={o.score} />

                  {/* Slider de mise à jour */}
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

                    {/* Actions */}
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

      {/* ── Modal ajout objectif ── */}
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

    </div>
  )
}
