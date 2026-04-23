import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import { usePageTransition } from '../../hooks/useAnimations'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { User, LogOut, Save, Mail, Phone, Target, Weight, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function ProfilPage() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Champs profil
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [objectifs, setObjectifs] = useState('')
  const [poids, setPoids] = useState('')

  const chargerDonnees = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const [profilRes, clientRes] = await Promise.all([
      supabase.from('profiles').select('nom, email').eq('id', user.id).single(),
      supabase.from('clients').select('prenom, telephone, objectifs, poids').eq('id', user.id).maybeSingle(),
    ])

    const p = profilRes.data
    const c = clientRes.data

    setNom(p?.nom ?? '')
    setEmail(p?.email ?? user.email ?? '')
    setPrenom(c?.prenom ?? '')
    setTelephone(c?.telephone ?? '')
    setObjectifs(c?.objectifs ?? '')
    setPoids(c?.poids != null ? String(c.poids) : '')

    setLoading(false)
  }, [user])

  useEffect(() => { chargerDonnees() }, [chargerDonnees])

  const sauvegarder = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const [profilRes, clientRes] = await Promise.all([
        supabase.from('profiles').update({ nom: nom.trim() }).eq('id', user.id),
        supabase.from('clients').update({
          prenom: prenom.trim() || null,
          telephone: telephone.trim() || null,
          objectifs: objectifs.trim() || null,
          poids: poids ? Number(poids) : null,
        }).eq('id', user.id),
      ])

      if (profilRes.error) throw profilRes.error
      if (clientRes.error) throw clientRes.error

      setSaved(true)
      toast.success('Profil mis à jour !')
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      console.error('[Profil] Erreur sauvegarde:', err)
      toast.error(err.message || 'Erreur lors de la sauvegarde du profil')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const pageTransition = usePageTransition()

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#FF6B2B]" size={28} />
      </div>
    )
  }

  return (
    <div className={`p-4 space-y-4 max-w-4xl mx-auto ${pageTransition.className}`}>

      {/* ── En-tête ── */}
      <div className="pt-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#FF6B2B]/10 flex items-center justify-center">
            <User size={24} className="text-[#FF6B2B]" />
          </div>
          <div>
            <h1 className="text-[var(--text-primary)] text-xl font-bold">Mon profil</h1>
            <p className="text-[var(--text-muted)] text-sm mt-0.5">{email}</p>
          </div>
        </div>
      </div>

      {/* ── Formulaire profil complet ── */}
      <Card>
        <CardBody>
          <p className="text-[var(--text-muted)] text-[11px] uppercase tracking-wider mb-4">Informations personnelles</p>
          <form onSubmit={sauvegarder} className="space-y-4">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ton nom"
              />
              <Input
                label="Prénom"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Ton prénom"
              />
            </div>

            <div className="relative">
              <Input
                label="Email"
                value={email}
                disabled
                className="opacity-50 cursor-not-allowed"
              />
              <div className="absolute right-3 top-8">
                <Mail size={14} className="text-[var(--text-muted)]" />
              </div>
            </div>

            <Input
              label="Téléphone"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="+33 6 12 34 56 78"
              type="tel"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Poids actuel (kg)"
                value={poids}
                onChange={(e) => setPoids(e.target.value)}
                placeholder="75"
                type="number"
                step="0.1"
              />
            </div>

            <div>
              <label className="text-[var(--text-secondary)] text-sm block mb-1.5">Objectifs</label>
              <textarea
                value={objectifs}
                onChange={(e) => setObjectifs(e.target.value)}
                placeholder="Décris tes objectifs de coaching..."
                rows={3}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[#FF6B2B]/40 transition-all resize-none"
              />
            </div>

            <Button type="submit" loading={saving} className="w-full">
              {saved ? (
                <span className="flex items-center gap-2">
                  <Save size={15} /> Enregistré !
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save size={15} /> Modifier mes informations
                </span>
              )}
            </Button>
          </form>
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
