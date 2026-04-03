import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  Plus, Trash2, CreditCard, Euro, Filter,
  CheckCircle, Clock, XCircle, RefreshCw, Eye, EyeOff,
  Sparkles, Package, ArrowDownCircle, X, Zap
} from 'lucide-react'

// Frequences
const FREQ_LABELS = {
  unique: 'Paiement unique',
  mensuel: 'Mensuel',
  trimestriel: 'Trimestriel',
  annuel: 'Annuel',
}

const STATUT_CONFIG = {
  paye: { label: 'Paye', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  en_attente: { label: 'En attente', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  echoue: { label: 'Echoue', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  rembourse: { label: 'Rembourse', icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-500/10' },
}

export default function CoachAbonnementsPage() {
  const { user } = useAuth()

  // Offres
  const [offres, setOffres] = useState([])
  const [loadingOffres, setLoadingOffres] = useState(true)
  const [modalOffre, setModalOffre] = useState(false)
  const [offreTitre, setOffreTitre] = useState('')
  const [offreDesc, setOffreDesc] = useState('')
  const [offrePrix, setOffrePrix] = useState('')
  const [offreFreq, setOffreFreq] = useState('mensuel')
  const [savingOffre, setSavingOffre] = useState(false)

  // Paiements
  const [paiements, setPaiements] = useState([])
  const [loadingPaiements, setLoadingPaiements] = useState(true)
  const [filtreStatut, setFiltreStatut] = useState('tous')

  // -- Charger les donnees --
  useEffect(() => {
    if (!user) return
    chargerOffres()
    chargerPaiements()
  }, [user])

  const chargerOffres = async () => {
    setLoadingOffres(true)
    const { data } = await supabase
      .from('offres_coaching')
      .select('*')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })
    setOffres(data || [])
    setLoadingOffres(false)
  }

  const chargerPaiements = async () => {
    setLoadingPaiements(true)
    const { data } = await supabase
      .from('paiements_clients')
      .select('*, clients(profiles(nom, email)), offres_coaching(titre)')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })
    setPaiements(data || [])
    setLoadingPaiements(false)
  }

  // -- Creer une offre --
  const creerOffre = async () => {
    if (!offreTitre.trim() || !offrePrix) return
    setSavingOffre(true)

    const { error } = await supabase
      .from('offres_coaching')
      .insert({
        coach_id: user.id,
        titre: offreTitre,
        description: offreDesc,
        prix: Math.round(parseFloat(offrePrix) * 100),
        frequence: offreFreq,
      })

    if (error) {
      console.error('Erreur creation offre:', error)
      setSavingOffre(false)
      return
    }

    setModalOffre(false)
    setOffreTitre('')
    setOffreDesc('')
    setOffrePrix('')
    setOffreFreq('mensuel')
    setSavingOffre(false)
    await chargerOffres()
  }

  // -- Toggle actif/inactif offre --
  const toggleOffre = async (offre) => {
    await supabase
      .from('offres_coaching')
      .update({ actif: !offre.actif })
      .eq('id', offre.id)
      .eq('coach_id', user.id)
    await chargerOffres()
  }

  // -- Supprimer une offre --
  const supprimerOffre = async (id) => {
    if (!confirm('Supprimer cette offre ?')) return
    await supabase.from('offres_coaching').delete().eq('id', id).eq('coach_id', user.id)
    await chargerOffres()
  }

  // -- Filtrer les paiements --
  const paiementsFiltres = filtreStatut === 'tous'
    ? paiements
    : paiements.filter(p => p.statut === filtreStatut)

  // -- Total encaisse ce mois --
  const moisCourant = new Date().toISOString().slice(0, 7)
  const totalMois = paiements
    .filter(p => p.statut === 'paye' && p.date_paiement?.startsWith(moisCourant))
    .reduce((s, p) => s + (p.montant || 0), 0) / 100

  return (
    <div className="p-4 md:p-6 w-full max-w-6xl mx-auto">

      {/* -- Header -- */}
      <div className="glass-card relative overflow-hidden mb-6">
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8F5E)' }} />
        <div className="p-4 md:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8F5E)' }}>
              <CreditCard size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">Abonnements</h1>
              <p className="text-[var(--text-muted)] text-xs md:text-sm mt-0.5">Gerez vos offres et suivez les paiements</p>
            </div>
          </div>
        </div>
      </div>

      {/* -- Total encaisse -- */}
      <div className="glass-card relative overflow-hidden mb-6">
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8F5E)' }} />
        {/* Cercle decoratif */}
        <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-10" style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8F5E)' }} />
        <div className="relative p-4 md:p-5 flex items-center justify-between">
          <div>
            <p className="text-[var(--text-muted)] text-[11px] uppercase tracking-wider font-semibold">Encaisse ce mois</p>
            <p className="text-3xl md:text-4xl font-bold mt-1" style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8F5E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {totalMois.toFixed(2)} <span className="text-xl">EUR</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255, 107, 43, 0.1)' }}>
            <Euro size={24} className="text-[#FF6B2B]" />
          </div>
        </div>
      </div>

      {/* -- Section Offres -- */}
      <div className="mb-8 md:mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255, 107, 43, 0.1)' }}>
              <Package size={16} className="text-[#FF6B2B]" />
            </div>
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">Mes offres</h2>
          </div>
          <button
            onClick={() => setModalOffre(true)}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #FF6B2B, #FF8F5E)',
              boxShadow: '0 4px 14px rgba(255, 107, 43, 0.3)',
            }}
          >
            <Plus size={14} />
            Creer une offre
          </button>
        </div>

        {loadingOffres ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-2 flex-1">
                    <div className="skel-block h-4 w-3/4 rounded-md" />
                    <div className="skel-block h-3 w-1/3 rounded-md" />
                  </div>
                  <div className="skel-block h-6 w-14 rounded-md" />
                </div>
                <div className="skel-block h-3 w-full rounded-md mb-2" />
                <div className="skel-block h-3 w-2/3 rounded-md mb-3" />
                <div className="pt-3 border-t border-[var(--border-base)]">
                  <div className="skel-block h-7 w-24 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : offres.length === 0 ? (
          <div className="glass-card border-dashed p-8 md:p-10 text-center">
            <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(255, 107, 43, 0.08)' }}>
              <CreditCard size={24} className="text-[var(--text-muted)] animate-breathe" />
            </div>
            <p className="text-[var(--text-secondary)] text-sm font-medium">Aucune offre creee</p>
            <p className="text-[var(--text-muted)] text-xs mt-1">Creez votre premiere offre pour recevoir des paiements</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {offres.map(o => (
              <div
                key={o.id}
                className={`glass-card group relative transition-all ${
                  o.actif ? '' : 'opacity-50'
                }`}
              >
                {/* Barre accent a gauche */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                  style={{ background: o.actif ? 'linear-gradient(180deg, #FF6B2B, #FF8F5E)' : 'var(--border-base)' }}
                />
                <div className="p-4 pl-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="text-[var(--text-primary)] font-semibold truncate">{o.titre}</p>
                      <span className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wide">{FREQ_LABELS[o.frequence]}</span>
                    </div>
                    <p className="text-lg font-bold shrink-0" style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8F5E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      {(o.prix / 100).toFixed(0)}<span className="text-sm">EUR</span>
                    </p>
                  </div>
                  {o.description && (
                    <p className="text-[var(--text-muted)] text-xs mb-3 line-clamp-2 leading-relaxed">{o.description}</p>
                  )}
                  <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-base)]">
                    <button
                      onClick={() => toggleOffre(o)}
                      className="flex items-center gap-1.5 p-2 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all md:opacity-0 md:group-hover:opacity-100"
                      title={o.actif ? 'Desactiver' : 'Activer'}
                    >
                      {o.actif ? <EyeOff size={14} /> : <Eye size={14} />}
                      <span className="md:hidden lg:inline">{o.actif ? 'Desactiver' : 'Activer'}</span>
                    </button>
                    <button
                      onClick={() => supprimerOffre(o.id)}
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all ml-auto md:opacity-0 md:group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* -- Section Paiements recus -- */}
      <div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255, 107, 43, 0.1)' }}>
              <ArrowDownCircle size={16} className="text-[#FF6B2B]" />
            </div>
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">Paiements recus</h2>
          </div>

          {/* Filtres pills */}
          <div className="glass-card p-1 flex gap-0.5 overflow-x-auto no-scrollbar">
            {['tous', 'paye', 'en_attente', 'echoue'].map(s => (
              <button
                key={s}
                onClick={() => setFiltreStatut(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  filtreStatut === s
                    ? 'text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
                style={filtreStatut === s ? {
                  background: 'linear-gradient(135deg, #FF6B2B, #FF8F5E)',
                } : {}}
              >
                {s === 'tous' ? 'Tous' : STATUT_CONFIG[s]?.label}
              </button>
            ))}
          </div>
        </div>

        {loadingPaiements ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card p-4">
                <div className="flex flex-col gap-2">
                  <div className="skel-block h-4 w-1/3 rounded-md" />
                  <div className="skel-block h-3 w-1/2 rounded-md" />
                  <div className="flex justify-between items-center mt-1">
                    <div className="skel-block h-4 w-16 rounded-md" />
                    <div className="skel-block h-5 w-20 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : paiementsFiltres.length === 0 ? (
          <div className="glass-card border-dashed p-8 md:p-10 text-center">
            <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(255, 107, 43, 0.08)' }}>
              <Filter size={24} className="text-[var(--text-muted)] animate-breathe" />
            </div>
            <p className="text-[var(--text-secondary)] text-sm font-medium">
              Aucun paiement{filtreStatut !== 'tous' ? ` "${STATUT_CONFIG[filtreStatut]?.label}"` : ''}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop : table view */}
            <div className="hidden md:block glass-card relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8F5E)' }} />

              {/* Header tableau */}
              <div className="grid grid-cols-5 gap-4 px-5 py-3 border-b border-[var(--border-base)] text-[var(--text-muted)] text-[11px] font-semibold uppercase tracking-wider">
                <span>Client</span>
                <span>Offre</span>
                <span>Montant</span>
                <span>Date</span>
                <span>Statut</span>
              </div>

              {/* Lignes */}
              {paiementsFiltres.map(p => {
                const cfg = STATUT_CONFIG[p.statut] || STATUT_CONFIG.en_attente
                const Icon = cfg.icon
                return (
                  <div key={p.id} className="grid grid-cols-5 gap-4 px-5 py-3.5 border-b border-[var(--border-subtle)] items-center hover:bg-[var(--bg-surface)] transition-colors">
                    <span className="text-[var(--text-primary)] text-sm font-medium truncate">
                      {p.clients?.profiles?.nom || p.clients?.profiles?.email || '\u2014'}
                    </span>
                    <span className="text-[var(--text-muted)] text-sm truncate">
                      {p.offres_coaching?.titre || '\u2014'}
                    </span>
                    <span className="text-[var(--text-primary)] text-sm font-semibold">
                      {(p.montant / 100).toFixed(2)} EUR
                    </span>
                    <span className="text-[var(--text-muted)] text-sm">
                      {p.date_paiement
                        ? new Date(p.date_paiement).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
                        : '\u2014'
                      }
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.color} ${cfg.bg}`}>
                      <Icon size={12} />
                      {cfg.label}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Mobile : card view */}
            <div className="md:hidden space-y-3">
              {paiementsFiltres.map(p => {
                const cfg = STATUT_CONFIG[p.statut] || STATUT_CONFIG.en_attente
                const Icon = cfg.icon
                return (
                  <div key={p.id} className="glass-card p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[var(--text-primary)] text-sm font-medium truncate">
                          {p.clients?.profiles?.nom || p.clients?.profiles?.email || '\u2014'}
                        </p>
                        <p className="text-[var(--text-muted)] text-xs truncate mt-0.5">
                          {p.offres_coaching?.titre || '\u2014'}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${cfg.color} ${cfg.bg}`}>
                        <Icon size={10} />
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                      <span className="text-[var(--text-primary)] text-sm font-semibold">
                        {(p.montant / 100).toFixed(2)} EUR
                      </span>
                      <span className="text-[var(--text-muted)] text-xs">
                        {p.date_paiement
                          ? new Date(p.date_paiement).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
                          : '\u2014'
                        }
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* -- Modal creation offre -- */}
      {modalOffre && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="glass-card relative w-full md:max-w-md md:rounded-2xl rounded-t-2xl rounded-b-none md:rounded-b-2xl overflow-hidden">
            {/* Accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8F5E)' }} />

            {/* Header */}
            <div className="p-4 md:p-5 border-b border-[var(--border-base)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF6B2B, #FF8F5E)' }}>
                  <Sparkles size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-[var(--text-primary)] font-semibold">Nouvelle offre</h3>
                  <p className="text-[var(--text-muted)] text-[11px] mt-0.5">Creez une offre pour vos clients</p>
                </div>
              </div>
              <button
                onClick={() => setModalOffre(false)}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 md:p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Titre *</label>
                <input
                  type="text"
                  value={offreTitre}
                  onChange={(e) => setOffreTitre(e.target.value)}
                  placeholder="Ex : Coaching mensuel Premium"
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#FF6B2B]/50 focus:outline-none focus:ring-1 focus:ring-[#FF6B2B]/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Description</label>
                <textarea
                  value={offreDesc}
                  onChange={(e) => setOffreDesc(e.target.value)}
                  placeholder="Decrivez ce que comprend cette offre..."
                  rows={2}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#FF6B2B]/50 focus:outline-none focus:ring-1 focus:ring-[#FF6B2B]/20 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Prix (EUR) *</label>
                  <input
                    type="number"
                    value={offrePrix}
                    onChange={(e) => setOffrePrix(e.target.value)}
                    placeholder="99"
                    min="1"
                    step="0.01"
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#FF6B2B]/50 focus:outline-none focus:ring-1 focus:ring-[#FF6B2B]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Frequence</label>
                  <select
                    value={offreFreq}
                    onChange={(e) => setOffreFreq(e.target.value)}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] focus:border-[#FF6B2B]/50 focus:outline-none focus:ring-1 focus:ring-[#FF6B2B]/20 transition-all"
                  >
                    {Object.entries(FREQ_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 md:p-5 border-t border-[var(--border-base)] flex gap-3 justify-end">
              <button
                onClick={() => setModalOffre(false)}
                className="px-4 py-2.5 rounded-xl text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all"
              >
                Annuler
              </button>
              <button
                onClick={creerOffre}
                disabled={savingOffre || !offreTitre.trim() || !offrePrix}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #FF6B2B, #FF8F5E)',
                  boxShadow: '0 4px 14px rgba(255, 107, 43, 0.3)',
                }}
              >
                {savingOffre ? (
                  <span className="flex items-center gap-2">
                    <Zap size={14} className="animate-spin" />
                    Creation...
                  </span>
                ) : (
                  "Creer l'offre"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
