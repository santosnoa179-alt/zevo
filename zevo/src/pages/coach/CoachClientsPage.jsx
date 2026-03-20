import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { calculerScoreBienEtre, couleurScore } from '../../utils/wellbeing'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { UserPlus, Search, ChevronRight, Mail, Users } from 'lucide-react'

// Initiales colorées
function Initiales({ nom, couleur }) {
  const parts = (nom ?? '?').trim().split(' ')
  const initiales = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : (nom ?? '?')[0]
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
      style={{ backgroundColor: couleur ?? '#FF6B2B' }}>
      {initiales.toUpperCase()}
    </div>
  )
}

const COULEURS_AVATAR = ['#FF6B2B', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ec4899', '#14b8a6']

export default function CoachClientsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState([])
  const [recherche, setRecherche] = useState('')
  const [modalInvit, setModalInvit] = useState(false)
  const [invitEmail, setInvitEmail] = useState('')
  const [invitPrenom, setInvitPrenom] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [invitSuccess, setInvitSuccess] = useState(null)
  const [invitationsEnAttente, setInvitationsEnAttente] = useState([])

  const today = new Date().toISOString().split('T')[0]

  const chargerClients = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, created_at, actif, profiles(nom, email)')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })

    if (!clientsData?.length) { setLoading(false); return }

    const clientIds = clientsData.map(c => c.id)

    const il7j = new Date()
    il7j.setDate(il7j.getDate() - 7)
    const dateMin = il7j.toISOString().split('T')[0]

    const [logsRes, habsRes, sommeilRes, humeurRes, invRes] = await Promise.all([
      supabase.from('habitudes_log').select('client_id, date').in('client_id', clientIds).gte('date', dateMin),
      supabase.from('habitudes').select('id, client_id').in('client_id', clientIds).eq('actif', true),
      supabase.from('sommeil_log').select('client_id, date, qualite').in('client_id', clientIds).eq('date', today),
      supabase.from('humeur_log').select('client_id, date, score').in('client_id', clientIds).eq('date', today),
      supabase.from('invitations').select('*').eq('coach_id', user.id).eq('acceptee', false).order('created_at', { ascending: false }),
    ])

    const logs = logsRes.data ?? []
    const habs = habsRes.data ?? []

    const enrichis = clientsData.map((c, idx) => {
      const clientHabs = habs.filter(h => h.client_id === c.id)
      const cochees = logs.filter(l => l.client_id === c.id && l.date === today).length
      const sommeil = (sommeilRes.data ?? []).find(s => s.client_id === c.id) ?? null
      const humeur = (humeurRes.data ?? []).find(h => h.client_id === c.id) ?? null
      const score = calculerScoreBienEtre({
        habitudes: { cochees, total: clientHabs.length },
        sommeil, humeur, sport: null,
      })
      const logsClient = logs.filter(l => l.client_id === c.id).sort((a, b) => b.date.localeCompare(a.date))
      return {
        ...c,
        score,
        derniereActivite: logsClient[0]?.date ?? null,
        couleurAvatar: COULEURS_AVATAR[idx % COULEURS_AVATAR.length],
      }
    })

    setClients(enrichis)
    setInvitationsEnAttente(invRes.data ?? [])
    setLoading(false)
  }, [user, today])

  useEffect(() => { chargerClients() }, [chargerClients])

  // Envoie une invitation (génère token + insert DB)
  const envoyerInvitation = async (e) => {
    e.preventDefault()
    setEnvoi(true)

    const { data, error } = await supabase
      .from('invitations')
      .insert({ coach_id: user.id, email: invitEmail.trim() })
      .select()
      .single()

    if (!error && data) {
      const lien = `${window.location.origin}/invite/${data.token}`
      setInvitSuccess({ email: invitEmail, lien, prenom: invitPrenom })
      setInvitEmail(''); setInvitPrenom('')
      setInvitationsEnAttente(prev => [data, ...prev])
    }

    setEnvoi(false)
  }

  const clientsFiltres = clients.filter(c => {
    const terme = recherche.toLowerCase()
    return (
      c.profiles?.nom?.toLowerCase().includes(terme) ||
      c.profiles?.email?.toLowerCase().includes(terme)
    )
  })

  if (loading) {
    return (
      <div className="p-6 space-y-4 w-full animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 w-32 bg-[#2A2A2A] rounded" />
          <div className="h-10 w-36 bg-[#2A2A2A] rounded-lg" />
        </div>
        <div className="h-11 bg-[#2A2A2A] rounded-lg" />
        {[1, 2, 3].map(i => <div key={i} className="h-18 bg-[#2A2A2A] rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="p-6 w-full space-y-5">

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#F5F5F3] text-2xl font-bold">Clients</h1>
          <p className="text-white/40 text-sm mt-0.5">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => { setModalInvit(true); setInvitSuccess(null) }}>
          <UserPlus size={15} /> Inviter
        </Button>
      </div>

      {/* ── Recherche ── */}
      {clients.length > 3 && (
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un client…"
            className="w-full bg-[#2A2A2A] border border-white/[0.08] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#F5F5F3] placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#FF6B2B]/40"
          />
        </div>
      )}

      {/* ── Liste des clients ── */}
      {clientsFiltres.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <Users size={36} className="text-white/15 mx-auto mb-3" />
            <p className="text-white/30 text-sm">
              {recherche ? 'Aucun client ne correspond.' : 'Aucun client pour l\'instant.'}
            </p>
            {!recherche && (
              <button onClick={() => setModalInvit(true)} className="mt-3 text-[#FF6B2B] text-sm font-medium hover:underline">
                + Inviter mon premier client
              </button>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {clientsFiltres.map((c) => {
            const couleur = couleurScore(c.score)
            return (
              <Card key={c.id}
                className="cursor-pointer hover:border-white/[0.14] transition-colors"
                onClick={() => navigate(`/coach/clients/${c.id}`)}
              >
                <CardBody className="flex items-center gap-3 py-3">
                  <Initiales nom={c.profiles?.nom} couleur={c.couleurAvatar} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#F5F5F3] text-sm font-medium truncate">
                      {c.profiles?.nom ?? c.profiles?.email}
                    </p>
                    {c.profiles?.nom && (
                      <p className="text-white/30 text-xs truncate">{c.profiles.email}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: couleur }}>{c.score}/100</p>
                    <p className="text-white/25 text-[10px] mt-0.5">
                      {c.derniereActivite
                        ? new Date(c.derniereActivite).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                        : 'inactif'}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-white/20 flex-shrink-0" />
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Invitations en attente ── */}
      {invitationsEnAttente.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-white/40 text-xs uppercase tracking-wider">
            Invitations en attente ({invitationsEnAttente.length})
          </h2>
          {invitationsEnAttente.map((inv) => (
            <Card key={inv.id} className="border-dashed border-white/[0.06]">
              <CardBody className="flex items-center gap-3 py-3">
                <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                  <Mail size={14} className="text-white/30" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/60 text-sm truncate">{inv.email}</p>
                  <p className="text-white/25 text-xs mt-0.5">
                    Expire {new Date(inv.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <span className="text-[10px] bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full flex-shrink-0">
                  en attente
                </span>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* ── Modal invitation ── */}
      <Modal isOpen={modalInvit} onClose={() => setModalInvit(false)} title="Inviter un client">
        {!invitSuccess ? (
          <form onSubmit={envoyerInvitation} className="space-y-4">
            <Input
              label="Prénom du client"
              placeholder="Lucas"
              value={invitPrenom}
              onChange={(e) => setInvitPrenom(e.target.value)}
              autoFocus
            />
            <Input
              label="Adresse email"
              type="email"
              placeholder="lucas@exemple.com"
              value={invitEmail}
              onChange={(e) => setInvitEmail(e.target.value)}
              required
            />
            <p className="text-white/30 text-xs">
              Un lien d'invitation valable 7 jours sera généré. Copiez-le et envoyez-le à votre client.
            </p>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalInvit(false)}>
                Annuler
              </Button>
              <Button type="submit" loading={envoi} className="flex-1">
                Générer le lien
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <p className="text-green-400 text-sm font-medium mb-1">✓ Invitation créée !</p>
              <p className="text-white/40 text-xs">Envoyez ce lien à {invitSuccess.prenom || invitSuccess.email} :</p>
            </div>
            <div className="bg-[#2A2A2A] rounded-lg p-3">
              <p className="text-[#FF6B2B] text-xs font-mono break-all">{invitSuccess.lien}</p>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                navigator.clipboard.writeText(invitSuccess.lien)
              }}
              variant="secondary"
            >
              Copier le lien
            </Button>
            <Button className="w-full" onClick={() => { setModalInvit(false); setInvitSuccess(null) }}>
              Fermer
            </Button>
          </div>
        )}
      </Modal>

    </div>
  )
}
