import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Moon, Smile, Dumbbell, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// Sélecteur d'étoiles (qualité sommeil 1-5)
function Etoiles({ valeur, onChange }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-xl transition-transform hover:scale-110 ${n <= valeur ? 'opacity-100' : 'opacity-20'}`}
        >
          ⭐
        </button>
      ))}
    </div>
  )
}

// Sélecteur humeur 1-10
function SliderHumeur({ valeur, onChange }) {
  const emojis = ['😞', '😕', '😐', '🙂', '😊', '😄', '🤩']
  const emoji = emojis[Math.floor(((valeur - 1) / 9) * (emojis.length - 1))]
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-3xl">{emoji}</span>
        <span className="text-[#FF6B2B] font-bold text-lg">{valeur}/10</span>
      </div>
      <input
        type="range"
        min="1"
        max="10"
        value={valeur}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#FF6B2B]"
      />
      <div className="flex justify-between text-white/25 text-xs">
        <span>Très mauvais</span>
        <span>Excellent</span>
      </div>
    </div>
  )
}

export default function ProfilPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [profil, setProfil] = useState(null)
  const [saving, setSaving] = useState(false)
  const [nom, setNom] = useState('')

  const today = new Date().toISOString().split('T')[0]

  // Données du jour
  const [sommeil, setSommeil] = useState({ heures: 7, qualite: 3 })
  const [sommeilExistant, setSommeilExistant] = useState(false)
  const [humeur, setHumeur] = useState(7)
  const [humeurExistante, setHumeurExistante] = useState(false)
  const [humeurNote, setHumeurNote] = useState('')
  const [sport, setSport] = useState({ type_activite: '', duree_minutes: 45, intensite: 3 })
  const [sportExistant, setSportExistant] = useState(false)

  const [savingSommeil, setSavingSommeil] = useState(false)
  const [savingHumeur, setSavingHumeur] = useState(false)
  const [savingSport, setSavingSport] = useState(false)
  const [savedSommeil, setSavedSommeil] = useState(false)
  const [savedHumeur, setSavedHumeur] = useState(false)
  const [savedSport, setSavedSport] = useState(false)

  const chargerDonnees = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const [profilRes, sommeilRes, humeurRes, sportRes] = await Promise.all([
      supabase.from('profiles').select('nom, email').eq('id', user.id).single(),
      supabase.from('sommeil_log').select('*').eq('client_id', user.id).eq('date', today).maybeSingle(),
      supabase.from('humeur_log').select('*').eq('client_id', user.id).eq('date', today).maybeSingle(),
      supabase.from('sport_log').select('*').eq('client_id', user.id).eq('date', today).maybeSingle(),
    ])

    setProfil(profilRes.data)
    setNom(profilRes.data?.nom ?? '')

    if (sommeilRes.data) {
      setSommeil({ heures: sommeilRes.data.heures, qualite: sommeilRes.data.qualite })
      setSommeilExistant(true)
    }
    if (humeurRes.data) {
      setHumeur(humeurRes.data.score)
      setHumeurNote(humeurRes.data.note ?? '')
      setHumeurExistante(true)
    }
    if (sportRes.data) {
      setSport({
        type_activite: sportRes.data.type_activite ?? '',
        duree_minutes: sportRes.data.duree_minutes ?? 45,
        intensite: sportRes.data.intensite ?? 3,
      })
      setSportExistant(true)
    }

    setLoading(false)
  }, [user, today])

  useEffect(() => { chargerDonnees() }, [chargerDonnees])

  // Sauvegarde le prénom
  const sauvegarderProfil = async (e) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('profiles').update({ nom: nom.trim() }).eq('id', user.id)
    setSaving(false)
  }

  // Saisie sommeil du jour
  const saisirSommeil = async () => {
    setSavingSommeil(true)
    const payload = { client_id: user.id, date: today, heures: sommeil.heures, qualite: sommeil.qualite }
    if (sommeilExistant) {
      await supabase.from('sommeil_log').update({ heures: sommeil.heures, qualite: sommeil.qualite })
        .eq('client_id', user.id).eq('date', today)
    } else {
      await supabase.from('sommeil_log').insert(payload)
      setSommeilExistant(true)
    }
    setSavingSommeil(false)
    setSavedSommeil(true)
    setTimeout(() => setSavedSommeil(false), 2000)
  }

  // Saisie humeur du jour
  const saisirHumeur = async () => {
    setSavingHumeur(true)
    const payload = { client_id: user.id, date: today, score: humeur, note: humeurNote || null }
    if (humeurExistante) {
      await supabase.from('humeur_log').update({ score: humeur, note: humeurNote || null })
        .eq('client_id', user.id).eq('date', today)
    } else {
      await supabase.from('humeur_log').insert(payload)
      setHumeurExistante(true)
    }
    setSavingHumeur(false)
    setSavedHumeur(true)
    setTimeout(() => setSavedHumeur(false), 2000)
  }

  // Saisie sport du jour
  const saisirSport = async () => {
    setSavingSport(true)
    const payload = { client_id: user.id, date: today, ...sport }
    if (sportExistant) {
      await supabase.from('sport_log').update(sport).eq('client_id', user.id).eq('date', today)
    } else {
      await supabase.from('sport_log').insert(payload)
      setSportExistant(true)
    }
    setSavingSport(false)
    setSavedSport(true)
    setTimeout(() => setSavedSport(false), 2000)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4 max-w-2xl animate-pulse">
        <div className="pt-4 h-7 w-32 bg-[#2A2A2A] rounded" />
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-[#2A2A2A] rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl">

      {/* ── En-tête ── */}
      <div className="pt-4">
        <h1 className="text-[#F5F5F3] text-xl font-bold">Profil</h1>
        <p className="text-white/40 text-sm mt-0.5">{profil?.email}</p>
      </div>

      {/* ── Profil ── */}
      <Card>
        <CardBody>
          <p className="text-white/40 text-[11px] uppercase tracking-wider mb-3">Informations</p>
          <form onSubmit={sauvegarderProfil} className="space-y-3">
            <Input
              label="Prénom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ton prénom"
            />
            <Button type="submit" loading={saving} size="sm">
              Enregistrer
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* ── Saisie sommeil ── */}
      <Card>
        <CardBody>
          <div className="flex items-center gap-2 mb-4">
            <Moon size={15} className="text-blue-400" />
            <p className="text-white/40 text-[11px] uppercase tracking-wider">
              Sommeil d'aujourd'hui
              {sommeilExistant && <span className="ml-2 text-green-400/60 normal-case">✓ enregistré</span>}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-white/60 text-sm">Durée</label>
                <span className="text-[#FF6B2B] font-semibold">{sommeil.heures}h</span>
              </div>
              <input
                type="range" min="3" max="12" step="0.5"
                value={sommeil.heures}
                onChange={(e) => setSommeil(prev => ({ ...prev, heures: Number(e.target.value) }))}
                className="w-full accent-[#FF6B2B]"
              />
            </div>
            <div>
              <label className="text-white/60 text-sm block mb-2">Qualité</label>
              <Etoiles valeur={sommeil.qualite} onChange={(q) => setSommeil(prev => ({ ...prev, qualite: q }))} />
            </div>
            <Button
              onClick={saisirSommeil}
              loading={savingSommeil}
              size="sm"
              variant={savedSommeil ? 'secondary' : 'primary'}
            >
              {savedSommeil ? '✓ Enregistré !' : sommeilExistant ? 'Mettre à jour' : 'Enregistrer'}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* ── Saisie humeur ── */}
      <Card>
        <CardBody>
          <div className="flex items-center gap-2 mb-4">
            <Smile size={15} className="text-yellow-400" />
            <p className="text-white/40 text-[11px] uppercase tracking-wider">
              Humeur d'aujourd'hui
              {humeurExistante && <span className="ml-2 text-green-400/60 normal-case">✓ enregistrée</span>}
            </p>
          </div>
          <div className="space-y-4">
            <SliderHumeur valeur={humeur} onChange={setHumeur} />
            <Input
              label="Note (optionnel)"
              placeholder="Comment tu te sens ?"
              value={humeurNote}
              onChange={(e) => setHumeurNote(e.target.value)}
            />
            <Button
              onClick={saisirHumeur}
              loading={savingHumeur}
              size="sm"
              variant={savedHumeur ? 'secondary' : 'primary'}
            >
              {savedHumeur ? '✓ Enregistré !' : humeurExistante ? 'Mettre à jour' : 'Enregistrer'}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* ── Saisie sport ── */}
      <Card>
        <CardBody>
          <div className="flex items-center gap-2 mb-4">
            <Dumbbell size={15} className="text-[#FF6B2B]" />
            <p className="text-white/40 text-[11px] uppercase tracking-wider">
              Activité physique aujourd'hui
              {sportExistant && <span className="ml-2 text-green-400/60 normal-case">✓ enregistrée</span>}
            </p>
          </div>
          <div className="space-y-3">
            <Input
              label="Type d'activité"
              placeholder="Course, natation, yoga…"
              value={sport.type_activite}
              onChange={(e) => setSport(prev => ({ ...prev, type_activite: e.target.value }))}
            />
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-white/60 text-sm">Durée</label>
                <span className="text-[#FF6B2B] font-semibold">{sport.duree_minutes} min</span>
              </div>
              <input
                type="range" min="10" max="180" step="5"
                value={sport.duree_minutes}
                onChange={(e) => setSport(prev => ({ ...prev, duree_minutes: Number(e.target.value) }))}
                className="w-full accent-[#FF6B2B]"
              />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-white/60 text-sm">Intensité</label>
                <span className="text-[#FF6B2B] font-semibold">{sport.intensite}/5</span>
              </div>
              <input
                type="range" min="1" max="5"
                value={sport.intensite}
                onChange={(e) => setSport(prev => ({ ...prev, intensite: Number(e.target.value) }))}
                className="w-full accent-[#FF6B2B]"
              />
            </div>
            <Button
              onClick={saisirSport}
              loading={savingSport}
              size="sm"
              variant={savedSport ? 'secondary' : 'primary'}
            >
              {savedSport ? '✓ Enregistré !' : sportExistant ? 'Mettre à jour' : 'Enregistrer'}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* ── Déconnexion ── */}
      <Card>
        <CardBody>
          <Button onClick={handleLogout} variant="danger" className="w-full">
            <LogOut size={15} /> Se déconnecter
          </Button>
        </CardBody>
      </Card>

    </div>
  )
}
