import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  Plus, Trash2, CreditCard, Euro, Filter,
  CheckCircle, Clock, XCircle, RefreshCw, Eye, EyeOff
} from 'lucide-react'

// Fréquences
const FREQ_LABELS = {
  unique: 'Paiement unique',
  mensuel: 'Mensuel',
  trimestriel: 'Trimestriel',
  annuel: 'Annuel',
}

const STATUT_CONFIG = {
  paye: { label: 'Payé', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  en_attente: { label: 'En attente', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  echoue: { label: 'Échoué', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  rembourse: { label: 'Remboursé', icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-500/10' },
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

  // ── Charger les données ──
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

  // ── Créer une offre ──
  const creerOffre = async () => {
    if (!offreTitre.trim() || !offrePrix) return
    setSavingOffre(true)

    const { error } = await supabase
      .from('offres_coaching')
      .insert({
        coach_id: user.id,
        titre: offreTitre,
        description: offreDesc,
        prix: Math.round(parseFloat(offrePrix) * 100), // Convertir en centimes
        frequence: offreFreq,
      })

    if (error) {
      console.error('Erreur création offre:', error)
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

  // ── Toggle actif/inactif offre ──
  const toggleOffre = async (offre) => {
    await supabase
      .from('offres_coaching')
      .update({ actif: !offre.actif })
      .eq('id', offre.id)
      .eq('coach_id', user.id)
    await chargerOffres()
  }

  // ── Supprimer une offre ──
  const supprimerOffre = async (id) => {
    if (!confirm('Supprimer cette offre ?')) return
    await supabase.from('offres_coaching').delete().eq('id', id).eq('coach_id', user.id)
    await chargerOffres()
  }

  // ── Filtrer les paiements ──
  const paiementsFiltres = filtreStatut === 'tous'
    ? paiements
    : paiements.filter(p => p.statut === filtreStatut)

  // ── Total encaissé ce mois ──
  const moisCourant = new Date().toISOString().slice(0, 7)
  const totalMois = paiements
    .filter(p => p.statut === 'paye' && p.date_paiement?.startsWith(moisCourant))
    .reduce((s, p) => s + (p.montant || 0), 0) / 100

  return (
    <div className="p-6 w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Abonnements</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">Gérez vos offres de coaching et suivez les paiements</p>
      </div>

      {/* ── Total encaissé ── */}
      <div className="bg-gradient-to-r from-[#FF6B2B]/10 to-transparent border border-[#FF6B2B]/20 rounded-xl p-5 mb-8 flex items-center justify-between">
        <div>
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold">Encaissé ce mois</p>
          <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">{totalMois.toFixed(2)} €</p>
        </div>
        <Euro size={32} className="text-[#FF6B2B]/30" />
      </div>

      {/* ── Section Offres ── */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">Mes offres</h2>
          <button
            onClick={() => setModalOffre(true)}
            className="flex items-center gap-2 bg-[#FF6B2B] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#e55e24] transition-colors"
          >
            <Plus size={14} />
            Créer une offre
          </button>
        </div>

        {loadingOffres ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-36 bg-[var(--bg-card)] rounded-xl animate-pulse" />)}
          </div>
        ) : offres.length === 0 ? (
          <div className="bg-[var(--bg-card)] rounded-xl border border-dashed border-[var(--border-base)] p-10 text-center">
            <CreditCard size={28} className="text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-[var(--text-muted)] text-sm">Aucune offre créée</p>
            <p className="text-[var(--text-muted)] text-xs mt-1">Créez votre première offre pour recevoir des paiements</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {offres.map(o => (
              <div
                key={o.id}
                className={`bg-[var(--bg-card)] border rounded-xl p-4 transition-all ${
                  o.actif ? 'border-[var(--border-base)]' : 'border-[var(--border-subtle)] opacity-50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[var(--text-primary)] font-medium">{o.titre}</p>
                    <span className="text-xs text-[var(--text-muted)]">{FREQ_LABELS[o.frequence]}</span>
                  </div>
                  <p className="text-[#FF6B2B] font-bold text-lg">
                    {(o.prix / 100).toFixed(0)}€
                  </p>
                </div>
                {o.description && (
                  <p className="text-[var(--text-muted)] text-xs mb-3 line-clamp-2">{o.description}</p>
                )}
                <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-base)]">
                  <button
                    onClick={() => toggleOffre(o)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-colors"
                    title={o.actif ? 'Désactiver' : 'Activer'}
                  >
                    {o.actif ? <EyeOff size={12} /> : <Eye size={12} />}
                    {o.actif ? 'Désactiver' : 'Activer'}
                  </button>
                  <button
                    onClick={() => supprimerOffre(o.id)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--bg-surface)] transition-colors ml-auto"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section Paiements reçus ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">Paiements reçus</h2>
          <div className="flex bg-[var(--bg-card)] rounded-lg p-0.5 border border-[var(--border-base)]">
            {['tous', 'paye', 'en_attente', 'echoue'].map(s => (
              <button
                key={s}
                onClick={() => setFiltreStatut(s)}
                className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                  filtreStatut === s
                    ? 'bg-[#FF6B2B] text-white font-medium'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {s === 'tous' ? 'Tous' : STATUT_CONFIG[s]?.label}
              </button>
            ))}
          </div>
        </div>

        {loadingPaiements ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-[var(--bg-card)] rounded-xl animate-pulse" />)}
          </div>
        ) : paiementsFiltres.length === 0 ? (
          <div className="bg-[var(--bg-card)] rounded-xl border border-dashed border-[var(--border-base)] p-10 text-center">
            <p className="text-[var(--text-muted)] text-sm">Aucun paiement{filtreStatut !== 'tous' ? ` avec le statut "${STATUT_CONFIG[filtreStatut]?.label}"` : ''}</p>
          </div>
        ) : (
          <div className="bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl overflow-hidden">
            {/* Header tableau */}
            <div className="grid grid-cols-5 gap-4 px-5 py-3 border-b border-[var(--border-base)] text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider">
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
                <div key={p.id} className="grid grid-cols-5 gap-4 px-5 py-3 border-b border-[var(--border-subtle)] items-center hover:bg-[var(--bg-surface)]">
                  <span className="text-[var(--text-primary)] text-sm truncate">
                    {p.clients?.profiles?.nom || p.clients?.profiles?.email || '—'}
                  </span>
                  <span className="text-[var(--text-muted)] text-sm truncate">
                    {p.offres_coaching?.titre || '—'}
                  </span>
                  <span className="text-[var(--text-primary)] text-sm font-medium">
                    {(p.montant / 100).toFixed(2)} €
                  </span>
                  <span className="text-[var(--text-muted)] text-sm">
                    {p.date_paiement
                      ? new Date(p.date_paiement).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
                      : '—'
                    }
                  </span>
                  <span className={`flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
                    <Icon size={12} />
                    {cfg.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modal création offre ── */}
      {modalOffre && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-base)] rounded-2xl w-full max-w-md">
            <div className="p-5 border-b border-[var(--border-base)]">
              <h3 className="text-[var(--text-primary)] font-semibold">Nouvelle offre</h3>
              <p className="text-[var(--text-muted)] text-xs mt-1">Créez une offre que vos clients pourront souscrire</p>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[var(--text-secondary)] text-xs mb-1.5">Titre *</label>
                <input
                  type="text"
                  value={offreTitre}
                  onChange={(e) => setOffreTitre(e.target.value)}
                  placeholder="Ex : Coaching mensuel Premium"
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#FF6B2B]/50 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] text-xs mb-1.5">Description</label>
                <textarea
                  value={offreDesc}
                  onChange={(e) => setOffreDesc(e.target.value)}
                  placeholder="Décrivez ce que comprend cette offre..."
                  rows={2}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#FF6B2B]/50 focus:outline-none transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[var(--text-secondary)] text-xs mb-1.5">Prix (€) *</label>
                  <input
                    type="number"
                    value={offrePrix}
                    onChange={(e) => setOffrePrix(e.target.value)}
                    placeholder="99"
                    min="1"
                    step="0.01"
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#FF6B2B]/50 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-secondary)] text-xs mb-1.5">Fréquence</label>
                  <select
                    value={offreFreq}
                    onChange={(e) => setOffreFreq(e.target.value)}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[#FF6B2B]/50 focus:outline-none transition-colors"
                  >
                    {Object.entries(FREQ_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-[var(--border-base)] flex gap-3 justify-end">
              <button
                onClick={() => setModalOffre(false)}
                className="px-4 py-2.5 rounded-xl text-sm text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={creerOffre}
                disabled={savingOffre || !offreTitre.trim() || !offrePrix}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#FF6B2B] text-white hover:bg-[#e55e24] transition-colors disabled:opacity-40"
              >
                {savingOffre ? 'Création...' : 'Créer l\'offre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
