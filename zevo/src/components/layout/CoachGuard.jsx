import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { ZevoLogo } from '../ui/ZevoLogo'
import { AlertTriangle, CreditCard, LogOut, Loader2 } from 'lucide-react'

// Guard coach : vérifie que abonnement_actif = true
// Si false → affiche la page de renouvellement au lieu du dashboard
export function CoachGuard({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [abonnementActif, setAbonnementActif] = useState(null) // null = chargement
  const [stripeCustomerId, setStripeCustomerId] = useState(null)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    const check = async () => {
      const { data, error } = await supabase
        .from('coaches')
        .select('abonnement_actif, stripe_customer_id')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        // Erreur RLS ou réseau — on ne bloque pas le coach
        console.error('CoachGuard: erreur requête coaches:', error)
        setAbonnementActif(true)
        return
      }

      if (data) {
        // abonnement_actif peut être null si la colonne n'a pas encore de valeur
        setAbonnementActif(data.abonnement_actif === true)
        setStripeCustomerId(data.stripe_customer_id)
      } else {
        // Pas encore de ligne dans coaches — probablement un nouveau coach sans abonnement
        setAbonnementActif(false)
      }
    }
    check()
  }, [user])

  // Chargement
  if (abonnementActif === null) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FF6B2B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Abonnement actif → accès normal au dashboard
  if (abonnementActif) {
    return children
  }

  // Ouvre le Customer Portal pour réactiver l'abonnement
  const handleReactivate = async () => {
    if (stripeCustomerId) {
      setPortalLoading(true)
      try {
        const res = await fetch('/api/create-portal-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId: stripeCustomerId }),
        })
        const { url, error } = await res.json()
        if (error) throw new Error(error)
        window.location.href = url
      } catch (err) {
        console.error('Erreur portal:', err)
        setPortalLoading(false)
      }
    } else {
      // Pas de customer Stripe — redirige vers pricing
      navigate('/pricing')
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // ── Page de renouvellement ──
  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center space-y-8">
        <ZevoLogo size="lg" className="justify-center" />

        <div className="bg-[#1E1E1E] rounded-2xl p-8 space-y-6">
          {/* Icône alerte */}
          <div className="w-16 h-16 rounded-2xl bg-[#FF6B2B]/10 mx-auto flex items-center justify-center">
            <AlertTriangle size={32} className="text-[#FF6B2B]" />
          </div>

          <div>
            <h1 className="text-[#F5F5F3] text-xl font-bold mb-2">
              Abonnement inactif
            </h1>
            <p className="text-white/50 text-sm leading-relaxed">
              Ton abonnement Zevo n'est plus actif. Réactive-le pour retrouver l'accès à ton espace coach et à toutes tes données.
            </p>
          </div>

          {/* Bouton réactiver */}
          <button
            onClick={handleReactivate}
            disabled={portalLoading}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-colors disabled:opacity-50"
          >
            {portalLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CreditCard size={16} />
            )}
            {stripeCustomerId ? 'Réactiver mon abonnement' : 'Choisir un plan'}
          </button>

          {/* Déconnexion */}
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 transition-colors"
          >
            <LogOut size={14} />
            Se déconnecter
          </button>
        </div>

        <p className="text-white/20 text-xs">
          Tes données sont conservées — elles seront disponibles dès la réactivation.
        </p>
      </div>
    </div>
  )
}
