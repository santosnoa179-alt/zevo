import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { supabase } from '../../../lib/supabase'
import { Package, Plus, Users, Eye, EyeOff, Trash2, Edit3, X } from 'lucide-react'

const FREQ_LABELS = {
  unique: 'Paiement unique',
  mensuel: '/ mois',
  trimestriel: '/ trimestre',
  annuel: '/ an',
}

export default function ProduitsPage() {
  const { user } = useAuth()
  const [produits, setProduits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ titre: '', description: '', prix: '', frequence: 'mensuel' })

  useEffect(() => {
    if (!user) return
    loadProduits()
  }, [user])

  const loadProduits = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('offres_coaching')
      .select('*')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })

    // Compter les abonnements actifs par offre
    const enriched = await Promise.all((data || []).map(async (offre) => {
      const { count } = await supabase
        .from('abonnements_clients')
        .select('id', { count: 'exact', head: true })
        .eq('offre_id', offre.id)
        .eq('statut', 'actif')
      return { ...offre, clientsActifs: count || 0 }
    }))

    setProduits(enriched)
    setLoading(false)
  }

  const creerProduit = async () => {
    if (!form.titre.trim() || !form.prix) return
    setSaving(true)
    const { error } = await supabase
      .from('offres_coaching')
      .insert({
        coach_id: user.id,
        titre: form.titre,
        description: form.description,
        prix: Math.round(parseFloat(form.prix) * 100),
        frequence: form.frequence,
      })
    if (!error) {
      setShowModal(false)
      setForm({ titre: '', description: '', prix: '', frequence: 'mensuel' })
      await loadProduits()
    }
    setSaving(false)
  }

  const toggleProduit = async (offre) => {
    await supabase.from('offres_coaching').update({ actif: !offre.actif }).eq('id', offre.id).eq('coach_id', user.id)
    await loadProduits()
  }

  const supprimerProduit = async (id) => {
    if (!confirm('Supprimer ce produit ?')) return
    await supabase.from('offres_coaching').delete().eq('id', id).eq('coach_id', user.id)
    await loadProduits()
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-5xl">
        <div className="skel-block h-8 w-32 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="glass-card p-4 h-36 animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Produits</h2>
          <p className="text-xs text-[var(--text-muted)]">{produits.length} produit{produits.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #F59E0B, #F59E0BD0)', boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)' }}>
          <Plus size={14} />
          Nouveau produit
        </button>
      </div>

      {produits.length === 0 ? (
        <div className="glass-card border-dashed p-10 text-center">
          <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center bg-[#F59E0B]/8">
            <Package size={24} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-[var(--text-secondary)] text-sm font-medium">Aucun produit créé</p>
          <p className="text-[var(--text-muted)] text-xs mt-1">Créez votre premier produit pour recevoir des paiements</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {produits.map(p => (
            <div key={p.id} className={`glass-card group relative overflow-hidden transition-all hover:border-[var(--text-muted)]/10 ${!p.actif ? 'opacity-50' : ''}`}>
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: p.actif ? 'linear-gradient(90deg, #F59E0B, #F59E0B60)' : 'var(--border-base)' }} />
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 mr-2">
                    <h3 className="text-[14px] font-semibold text-[var(--text-primary)] truncate">{p.titre}</h3>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2">{p.description}</p>
                  </div>
                </div>
                <div className="mb-3">
                  <span className="text-xl font-bold text-[var(--text-primary)]">{(p.prix / 100).toFixed(0)}</span>
                  <span className="text-sm text-[var(--text-muted)] ml-0.5">€</span>
                  <span className="text-[11px] text-[var(--text-muted)] ml-1">{FREQ_LABELS[p.frequence]}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-[var(--border-base)]/50">
                  <div className="flex items-center gap-1.5">
                    <Users size={12} className="text-[var(--text-muted)]" />
                    <span className="text-[11px] text-[var(--text-muted)]">{p.clientsActifs} client{p.clientsActifs > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => toggleProduit(p)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-colors" title={p.actif ? 'Désactiver' : 'Activer'}>
                      {p.actif ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <button onClick={() => supprimerProduit(p.id)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="glass-card relative w-full md:max-w-md md:rounded-2xl rounded-t-2xl rounded-b-none md:rounded-b-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(135deg, #F59E0B, #F59E0BD0)' }} />
            <div className="p-4 md:p-5 border-b border-[var(--border-base)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F59E0B, #F59E0BD0)' }}>
                  <Package size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-[var(--text-primary)] font-semibold">Nouveau produit</h3>
                  <p className="text-[var(--text-muted)] text-[11px]">Créez une offre pour vos clients</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 md:p-5 space-y-4">
              <div>
                <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Nom du produit *</label>
                <input type="text" value={form.titre} onChange={e => setForm({...form, titre: e.target.value})} placeholder="Ex : Coaching Premium" className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#F59E0B]/50 focus:outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Décrivez votre produit..." rows={2} className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#F59E0B]/50 focus:outline-none transition-all resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Prix (€) *</label>
                  <input type="number" value={form.prix} onChange={e => setForm({...form, prix: e.target.value})} placeholder="99" className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#F59E0B]/50 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Fréquence</label>
                  <select value={form.frequence} onChange={e => setForm({...form, frequence: e.target.value})} className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] focus:border-[#F59E0B]/50 focus:outline-none transition-all">
                    <option value="mensuel">Mensuel</option>
                    <option value="trimestriel">Trimestriel</option>
                    <option value="annuel">Annuel</option>
                    <option value="unique">Unique</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 md:p-5 border-t border-[var(--border-base)] flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl text-sm text-[var(--text-muted)] hover:bg-[var(--bg-surface)] transition-all">Annuler</button>
              <button onClick={creerProduit} disabled={saving || !form.titre.trim() || !form.prix} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 active:scale-95" style={{ background: 'linear-gradient(135deg, #F59E0B, #F59E0BD0)' }}>
                {saving ? 'Création...' : 'Créer le produit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
