import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { supabase } from '../../../lib/supabase'
import { RefreshCw, Search, Users, MoreHorizontal, Package, Link2, Check } from 'lucide-react'

const STATUT_CONFIG = {
  actif: { label: 'Actif', color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400' },
  annule: { label: 'Annulé', color: 'text-red-400', bg: 'bg-red-500/10', dot: 'bg-red-400' },
  en_pause: { label: 'En pause', color: 'text-yellow-400', bg: 'bg-yellow-500/10', dot: 'bg-yellow-400' },
  expire: { label: 'Expiré', color: 'text-[var(--text-muted)]', bg: 'bg-[var(--bg-surface)]', dot: 'bg-[var(--text-muted)]' },
}

const STATUTS_LIST = ['actif', 'en_pause', 'annule', 'expire']

export default function AbonnementsListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [abonnements, setAbonnements] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [search, setSearch] = useState('')
  const [filtre, setFiltre] = useState('tous')
  const [menuOpen, setMenuOpen] = useState(null)

  useEffect(() => {
    if (!user) return
    loadAbonnements()
  }, [user])

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = () => setMenuOpen(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [menuOpen])

  const updateStatut = async (aboId, newStatut) => {
    setMenuOpen(null)

    // 1) Trouver le client_id de cet abonnement
    const abo = abonnements.find(a => a.id === aboId)
    if (!abo) return

    // 2) Mettre à jour le statut de l'abonnement
    const updateData = {
      statut: newStatut,
      updated_at: new Date().toISOString(),
    }
    if (newStatut === 'annule') {
      updateData.date_fin = new Date().toISOString()
    }
    if (newStatut === 'actif') {
      updateData.date_fin = null
    }
    await supabase
      .from('abonnements_clients')
      .update(updateData)
      .eq('id', aboId)
      .eq('coach_id', user.id)

    // 3) Synchroniser clients.actif — vérifier si le client a encore un abonnement actif
    const { data: remaining } = await supabase
      .from('abonnements_clients')
      .select('id, statut')
      .eq('client_id', abo.client_id)
      .eq('coach_id', user.id)

    const hasActiveAbo = (remaining || []).some(a => a.statut === 'actif')

    await supabase
      .from('clients')
      .update({ actif: hasActiveAbo })
      .eq('id', abo.client_id)
      .eq('coach_id', user.id)

    await loadAbonnements()
  }

  const loadAbonnements = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const { data, error } = await supabase
        .from('abonnements_clients')
        .select('*, clients(profiles(nom, prenom, email)), offres_coaching(titre)')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false })
      if (error) {
        console.error('[AbonnementsListPage] load error:', error)
        setLoadError(error.message)
      } else {
        setAbonnements(data || [])
      }
    } catch (e) {
      console.error('[AbonnementsListPage] fetch failed:', e)
      setLoadError(String(e))
    }
    setLoading(false)
  }

  const filtered = abonnements
    .filter(a => filtre === 'tous' || a.statut === filtre)
    .filter(a => {
      if (!search) return true
      const name = (a.clients?.profiles?.nom || '').toLowerCase()
      const email = (a.clients?.profiles?.email || '').toLowerCase()
      const q = search.toLowerCase()
      return name.includes(q) || email.includes(q)
    })

  const actifs = abonnements.filter(a => a.statut === 'actif').length
  const mrr = abonnements.filter(a => a.statut === 'actif' && a.frequence === 'mensuel').reduce((s, a) => s + (a.montant || 0), 0)

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-5xl">
        <div className="grid grid-cols-2 gap-3">{[1,2].map(i => <div key={i} className="hero-card p-4 h-20 animate-pulse" />)}</div>
        {[1,2,3].map(i => <div key={i} className="hero-card p-4 h-16 animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl">

      <div className="grid grid-cols-2 gap-3">
        <div className="hero-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-[#64748b]/10 flex items-center justify-center">
              <RefreshCw size={13} className="text-[#64748b]" />
            </div>
            <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">Abonnements actifs</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{actifs}</p>
        </div>
        <div className="hero-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-[#22C55E]/10 flex items-center justify-center">
              <Users size={13} className="text-[#22C55E]" />
            </div>
            <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">MRR</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{(mrr / 100).toLocaleString('fr-FR')} €</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un client..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#FF6B2B]/40 focus:outline-none transition-all" />
        </div>
        <div className="flex gap-1 bg-[var(--bg-surface)] rounded-xl p-1 border border-[var(--border-base)]">
          {['tous', 'actif', 'en_pause', 'annule', 'expire'].map(s => (
            <button key={s} onClick={() => setFiltre(s)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${filtre === s ? 'bg-[#FF6B2B]/15 text-[#FF6B2B]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
              {s === 'tous' ? 'Tous' : STATUT_CONFIG[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <div className="hero-card p-4 border border-red-500/30 bg-red-500/5">
          <p className="text-[13px] font-semibold text-red-400">Erreur de chargement</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">{loadError}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">La table <code className="text-[var(--text-secondary)]">abonnements_clients</code> existe-t-elle ? Exécute <code className="text-[var(--text-secondary)]">schema-paiements-complet.sql</code> + <code className="text-[var(--text-secondary)]">fix-grants-paiements.sql</code> dans Supabase.</p>
        </div>
      )}

      <div className="space-y-2" style={{ overflow: 'visible' }}>
        {abonnements.length === 0 && !loadError ? (
          <div className="hero-card p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-[#64748b]/10 flex items-center justify-center">
                <RefreshCw size={20} className="text-[#64748b]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Aucun abonnement actif</h3>
                <p className="text-[12px] text-[var(--text-muted)]">Pour démarrer un programme récurrent :</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/coach/abonnements/produits')}
                className="p-4 rounded-xl bg-[var(--bg-surface)]/50 border border-[var(--border-base)] hover:border-[#64748b]/40 hover:bg-[var(--bg-surface)] transition-all text-left"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-[#64748b]/15">
                  <Package size={16} className="text-[#64748b]" />
                </div>
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">1. Crée un produit récurrent</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Mensuel, trimestriel ou annuel</p>
              </button>
              <button
                onClick={() => navigate('/coach/abonnements/liens')}
                className="p-4 rounded-xl bg-[var(--bg-surface)]/50 border border-[var(--border-base)] hover:border-[#64748b]/40 hover:bg-[var(--bg-surface)] transition-all text-left"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-[#64748b]/15">
                  <Link2 size={16} className="text-[#64748b]" />
                </div>
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">2. Partage le lien à ton client</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">L'abonnement s'active à la 1re facture</p>
              </button>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-5 pt-4 border-t border-[var(--border-base)]/50">
              💡 MRR, prélèvements récurrents et dates d'échéance s'affichent automatiquement ici.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="hero-card p-12 text-center">
            <RefreshCw size={20} className="text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-[var(--text-muted)] text-sm">Aucun abonnement ne correspond aux filtres</p>
          </div>
        ) : (
          filtered.map(a => {
            const cfg = STATUT_CONFIG[a.statut] || STATUT_CONFIG.actif
            const p = a.clients?.profiles
            const clientName = [p?.prenom, p?.nom].filter(Boolean).join(' ') || 'Client'
            const initials = clientName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
            return (
              <div key={a.id} className="hero-card p-4 hover:border-[var(--text-muted)]/10 transition-all group" style={{ overflow: 'visible' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#64748b]/20 to-[#64748b]/5 flex items-center justify-center flex-shrink-0">
                    <span className="text-[11px] font-bold text-[#64748b]">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{clientName}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-lg ${cfg.color} ${cfg.bg}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">{a.offres_coaching?.titre || '—'}</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-[13px] font-bold text-[var(--text-primary)]">{(a.montant / 100).toFixed(2)} €<span className="text-[10px] text-[var(--text-muted)] font-normal">/{a.frequence === 'mensuel' ? 'mois' : a.frequence === 'trimestriel' ? 'trim' : 'an'}</span></p>
                    {a.date_prochaine_echeance && (
                      <p className="text-[10px] text-[var(--text-muted)]">
                        Prochain : {new Date(a.date_prochaine_echeance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </p>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === a.id ? null : a.id) }}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-colors"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                    {menuOpen === a.id && (
                      <div className="absolute right-0 top-full mt-1 z-[999] w-44 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-base)] shadow-xl shadow-black/30" onClick={e => e.stopPropagation()}>
                        <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Changer le statut</p>
                        {STATUTS_LIST.map(s => {
                          const sc = STATUT_CONFIG[s]
                          const isActive = a.statut === s
                          return (
                            <button
                              key={s}
                              onClick={() => updateStatut(a.id, s)}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12px] transition-colors ${isActive ? 'bg-[var(--bg-surface)]' : 'hover:bg-[var(--bg-surface)]/60'}`}
                            >
                              <div className={`w-2 h-2 rounded-full ${sc.dot}`} />
                              <span className={`flex-1 font-medium ${isActive ? sc.color : 'text-[var(--text-secondary)]'}`}>{sc.label}</span>
                              {isActive && <Check size={12} className={sc.color} />}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
