import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { CreditCard, CheckCircle, Clock, ExternalLink, Package } from 'lucide-react'

const FREQ_LABELS = {
  unique: 'Paiement unique',
  mensuel: '/ mois',
  trimestriel: '/ trimestre',
  annuel: '/ an',
}

export default function AbonnementPage() {
  const { user } = useAuth()
  const [offres, setOffres] = useState([])
  const [paiements, setPaiements] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)

  // Vérifier si succès de paiement (retour Stripe)
  const params = new URLSearchParams(window.location.search)
  const paiementSuccess = params.get('paiement') === 'success'

  useEffect(() => {
    if (!user) return
    chargerDonnees()
  }, [user])

  const chargerDonnees = async () => {
    setLoading(true)

    // Récupérer le coach_id du client
    const { data: client } = await supabase
      .from('clients')
      .select('coach_id')
      .eq('id', user.id)
      .single()

    if (!client) { setLoading(false); return }

    // Charger les offres actives du coach
    const [offresRes, paiementsRes] = await Promise.all([
      supabase
        .from('offres_coaching')
        .select('*')
        .eq('coach_id', client.coach_id)
        .eq('actif', true)
        .order('prix'),
      supabase
        .from('paiements_clients')
        .select('*, offres_coaching(titre)')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false }),
    ])

    setOffres(offresRes.data || [])
    setPaiements(paiementsRes.data || [])
    setLoading(false)
  }

  // ── Payer une offre ──
  const payer = async (offre) => {
    setProcessing(offre.id)

    try {
      const res = await fetch('/api/client-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offreId: offre.id,
          clientId: user.id,
        }),
      })

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Erreur lors de la création du paiement')
      }
    } catch (err) {
      console.error('Erreur paiement:', err)
      alert('Erreur de connexion')
    }

    setProcessing(null)
  }

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="h-8 w-48 bg-[#1E1E1E] rounded-lg animate-pulse mb-8" />
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="h-32 bg-[#1E1E1E] rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[#F5F5F3] mb-1">Mon abonnement</h1>
      <p className="text-white/40 text-sm mb-8">Offres de coaching et historique de paiements</p>

      {/* Message de succès */}
      {paiementSuccess && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
          <p className="text-green-400 text-sm">Paiement effectué avec succès ! Merci.</p>
        </div>
      )}

      {/* ── Offres disponibles ── */}
      {offres.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">Offres disponibles</h2>
          <div className="space-y-4">
            {offres.map(o => (
              <div
                key={o.id}
                className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-5 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <Package size={18} className="text-[#FF6B2B]" />
                    <h3 className="text-[#F5F5F3] font-semibold">{o.titre}</h3>
                  </div>
                  {o.description && (
                    <p className="text-white/40 text-sm ml-[30px] mb-2">{o.description}</p>
                  )}
                  <p className="text-white/30 text-xs ml-[30px]">{FREQ_LABELS[o.frequence]}</p>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <div className="text-right">
                    <p className="text-[#F5F5F3] text-2xl font-bold">{(o.prix / 100).toFixed(0)}€</p>
                    <p className="text-white/25 text-xs">{FREQ_LABELS[o.frequence]}</p>
                  </div>
                  <button
                    onClick={() => payer(o)}
                    disabled={processing === o.id}
                    className="flex items-center gap-2 bg-[#FF6B2B] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-50"
                  >
                    {processing === o.id ? (
                      'Redirection...'
                    ) : (
                      <>
                        <CreditCard size={16} />
                        Payer
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Historique de paiements ── */}
      <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">Historique</h2>

      {paiements.length === 0 ? (
        <div className="bg-[#1E1E1E] rounded-xl border border-dashed border-white/[0.08] p-10 text-center">
          <CreditCard size={28} className="text-white/15 mx-auto mb-2" />
          <p className="text-white/30 text-sm">Aucun paiement effectué</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paiements.map(p => (
            <div
              key={p.id}
              className="bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <p className="text-[#F5F5F3] text-sm font-medium">
                  {p.offres_coaching?.titre || 'Paiement'}
                </p>
                <p className="text-white/30 text-xs mt-0.5">
                  {p.date_paiement
                    ? new Date(p.date_paiement).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                    : 'En attente'
                  }
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-[#F5F5F3] font-bold">{(p.montant / 100).toFixed(2)} €</p>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  p.statut === 'paye' ? 'bg-green-500/10 text-green-400'
                    : p.statut === 'en_attente' ? 'bg-yellow-500/10 text-yellow-400'
                    : p.statut === 'echoue' ? 'bg-red-500/10 text-red-400'
                    : 'bg-blue-500/10 text-blue-400'
                }`}>
                  {p.statut === 'paye' ? 'Payé' : p.statut === 'en_attente' ? 'En attente' : p.statut === 'echoue' ? 'Échoué' : 'Remboursé'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
