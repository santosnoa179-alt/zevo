import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { supabase } from '../../../lib/supabase'
import { Link2, Plus, Copy, ExternalLink, CheckCircle, Trash2, X } from 'lucide-react'

export default function LiensPaiementPage() {
  const { user } = useAuth()
  const [liens, setLiens] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(null)
  const [form, setForm] = useState({ titre: '', montant: '', description: '' })

  useEffect(() => {
    if (!user) return
    loadLiens()
  }, [user])

  const loadLiens = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('liens_paiement')
      .select('*')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })
    setLiens(data || [])
    setLoading(false)
  }

  const creerLien = async () => {
    if (!form.titre.trim()) return
    setSaving(true)
    const slug = form.titre.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30) + '_' + Date.now().toString(36)
    const { error } = await supabase
      .from('liens_paiement')
      .insert({
        coach_id: user.id,
        titre: form.titre,
        description: form.description,
        montant: form.montant ? Math.round(parseFloat(form.montant) * 100) : 0,
        slug,
      })
    if (!error) {
      setShowModal(false)
      setForm({ titre: '', montant: '', description: '' })
      await loadLiens()
    }
    setSaving(false)
  }

  const supprimerLien = async (id) => {
    if (!confirm('Supprimer ce lien ?')) return
    await supabase.from('liens_paiement').delete().eq('id', id).eq('coach_id', user.id)
    await loadLiens()
  }

  const handleCopy = (id, slug) => {
    const url = `${window.location.origin}/pay/${slug}`
    navigator.clipboard.writeText(url)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-5xl">
        <div className="skel-block h-8 w-48 rounded mb-4" />
        {[1,2,3].map(i => <div key={i} className="glass-card p-4 h-24 animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Liens de paiement</h2>
          <p className="text-xs text-[var(--text-muted)]">Partagez des liens pour recevoir des paiements</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #3B82F6, #3B82F6D0)', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.25)' }}>
          <Plus size={14} />
          Nouveau lien
        </button>
      </div>

      {liens.length === 0 ? (
        <div className="glass-card border-dashed p-10 text-center">
          <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center bg-[#3B82F6]/8">
            <Link2 size={24} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-[var(--text-secondary)] text-sm font-medium">Aucun lien de paiement</p>
          <p className="text-[var(--text-muted)] text-xs mt-1">Créez un lien pour recevoir des paiements facilement</p>
        </div>
      ) : (
        <div className="space-y-3">
          {liens.map(l => (
            <div key={l.id} className={`glass-card p-4 group hover:border-[var(--text-muted)]/10 transition-all ${!l.actif ? 'opacity-50' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#3B82F6]/10">
                  <Link2 size={16} className="text-[#3B82F6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">{l.titre}</h3>
                    {l.montant > 0 ? (
                      <span className="text-[12px] font-bold text-[#F59E0B]">{(l.montant / 100).toFixed(0)} €</span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400">Gratuit</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <code className="text-[11px] text-[var(--text-muted)] font-mono truncate">{window.location.origin}/pay/{l.slug}</code>
                    <button onClick={() => handleCopy(l.id, l.slug)} className="p-1 rounded-md text-[var(--text-muted)] hover:text-[#3B82F6] hover:bg-[#3B82F6]/10 transition-colors flex-shrink-0">
                      {copied === l.id ? <CheckCircle size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] text-[var(--text-muted)]"><span className="font-semibold text-[var(--text-secondary)]">{l.vues}</span> vues</span>
                    <span className="text-[11px] text-[var(--text-muted)]"><span className="font-semibold text-emerald-400">{l.paiements_recus}</span> payés</span>
                    <span className="text-[11px] text-[var(--text-muted)]">Taux : <span className="font-semibold text-[var(--text-secondary)]">{l.vues > 0 ? Math.round((l.paiements_recus / l.vues) * 100) : 0}%</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => supprimerLien(l.id)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="glass-card relative w-full md:max-w-md md:rounded-2xl rounded-t-2xl rounded-b-none md:rounded-b-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(135deg, #3B82F6, #3B82F6D0)' }} />
            <div className="p-4 md:p-5 border-b border-[var(--border-base)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#3B82F6]">
                  <Link2 size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-[var(--text-primary)] font-semibold">Nouveau lien de paiement</h3>
                  <p className="text-[var(--text-muted)] text-[11px]">Créez un lien partageable</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 md:p-5 space-y-4">
              <div>
                <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Titre *</label>
                <input type="text" value={form.titre} onChange={e => setForm({...form, titre: e.target.value})} placeholder="Ex : Coaching Premium" className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#3B82F6]/50 focus:outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Montant (€)</label>
                <input type="number" value={form.montant} onChange={e => setForm({...form, montant: e.target.value})} placeholder="0 = gratuit" className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#3B82F6]/50 focus:outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} placeholder="Ce que le client recevra..." className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#3B82F6]/50 focus:outline-none transition-all resize-none" />
              </div>
            </div>
            <div className="p-4 md:p-5 border-t border-[var(--border-base)] flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl text-sm text-[var(--text-muted)] hover:bg-[var(--bg-surface)] transition-all">Annuler</button>
              <button onClick={creerLien} disabled={saving || !form.titre.trim()} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 active:scale-95" style={{ background: 'linear-gradient(135deg, #3B82F6, #3B82F6D0)' }}>
                {saving ? 'Création...' : 'Créer le lien'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
