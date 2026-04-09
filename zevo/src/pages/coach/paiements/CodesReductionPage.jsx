import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { supabase } from '../../../lib/supabase'
import { TicketPercent, Plus, Copy, CheckCircle, Trash2, X, Users } from 'lucide-react'

export default function CodesReductionPage() {
  const { user } = useAuth()
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(null)
  const [form, setForm] = useState({ code: '', type: 'pourcentage', valeur: '', limite: '', expiration: '' })

  useEffect(() => {
    if (!user) return
    loadCodes()
  }, [user])

  const loadCodes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('codes_reduction')
        .select('*')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false })
      if (!error) setCodes(data || [])
    } catch { /* table pas encore créée */ }
    setLoading(false)
  }

  const creerCode = async () => {
    if (!form.code.trim() || !form.valeur) return
    setSaving(true)
    const { error } = await supabase
      .from('codes_reduction')
      .insert({
        coach_id: user.id,
        code: form.code.toUpperCase().trim(),
        type: form.type,
        valeur: form.type === 'pourcentage' ? parseInt(form.valeur) : Math.round(parseFloat(form.valeur) * 100),
        limite_utilisations: form.limite ? parseInt(form.limite) : null,
        date_expiration: form.expiration || null,
      })
    if (!error) {
      setShowModal(false)
      setForm({ code: '', type: 'pourcentage', valeur: '', limite: '', expiration: '' })
      await loadCodes()
    }
    setSaving(false)
  }

  const supprimerCode = async (id) => {
    if (!confirm('Supprimer ce code ?')) return
    await supabase.from('codes_reduction').delete().eq('id', id).eq('coach_id', user.id)
    await loadCodes()
  }

  const handleCopy = (id, code) => {
    navigator.clipboard.writeText(code)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-5xl">
        <div className="skel-block h-8 w-48 rounded mb-4" />
        {[1,2,3].map(i => <div key={i} className="glass-card p-4 h-16 animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Codes de réduction</h2>
          <p className="text-xs text-[var(--text-muted)]">{codes.filter(c => c.actif).length} code{codes.filter(c => c.actif).length > 1 ? 's' : ''} actif{codes.filter(c => c.actif).length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #F59E0B, #F59E0BD0)', boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)' }}>
          <Plus size={14} />
          Nouveau code
        </button>
      </div>

      {codes.length === 0 ? (
        <div className="glass-card border-dashed p-10 text-center">
          <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center bg-[#F59E0B]/8">
            <TicketPercent size={24} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-[var(--text-secondary)] text-sm font-medium">Aucun code de réduction</p>
          <p className="text-[var(--text-muted)] text-xs mt-1">Créez un code promo pour attirer de nouveaux clients</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block glass-card overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_100px_100px_90px_50px] gap-3 px-5 py-3 border-b border-[var(--border-base)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <span>Code</span>
              <span>Réduction</span>
              <span>Utilisations</span>
              <span>Expiration</span>
              <span>Statut</span>
              <span></span>
            </div>
            {codes.map(c => (
              <div key={c.id} className={`grid grid-cols-[1fr_120px_100px_100px_90px_50px] gap-3 px-5 py-3.5 border-b border-[var(--border-base)]/50 items-center hover:bg-[var(--bg-surface)]/30 transition-colors group ${!c.actif ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-2">
                  <code className="text-[13px] font-mono font-bold text-[#F59E0B]">{c.code}</code>
                  <button onClick={() => handleCopy(c.id, c.code)} className="p-1 rounded-md text-[var(--text-muted)] hover:text-[#F59E0B] hover:bg-[#F59E0B]/10 transition-colors">
                    {copied === c.id ? <CheckCircle size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                </div>
                <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                  {c.type === 'pourcentage' ? `-${c.valeur}%` : `-${(c.valeur / 100).toFixed(0)} €`}
                </span>
                <div className="flex items-center gap-1.5">
                  <Users size={12} className="text-[var(--text-muted)]" />
                  <span className="text-[12px] text-[var(--text-secondary)]">{c.utilisations}{c.limite_utilisations ? `/${c.limite_utilisations}` : ''}</span>
                </div>
                <span className="text-[12px] text-[var(--text-muted)]">
                  {c.date_expiration ? new Date(c.date_expiration).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '∞'}
                </span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-lg w-fit ${c.actif ? 'text-emerald-400 bg-emerald-500/10' : 'text-[var(--text-muted)] bg-[var(--bg-surface)]'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${c.actif ? 'bg-emerald-400' : 'bg-[var(--text-muted)]'}`} />
                  {c.actif ? 'Actif' : 'Expiré'}
                </span>
                <button onClick={() => supprimerCode(c.id)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {codes.map(c => (
              <div key={c.id} className={`glass-card p-4 ${!c.actif ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <code className="text-[14px] font-mono font-bold text-[#F59E0B]">{c.code}</code>
                    <button onClick={() => handleCopy(c.id, c.code)} className="p-1 rounded-md text-[var(--text-muted)]">
                      {copied === c.id ? <CheckCircle size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-lg ${c.actif ? 'text-emerald-400 bg-emerald-500/10' : 'text-[var(--text-muted)] bg-[var(--bg-surface)]'}`}>
                    {c.actif ? 'Actif' : 'Expiré'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-base)]/50">
                  <span className="text-sm font-bold text-[var(--text-primary)]">{c.type === 'pourcentage' ? `-${c.valeur}%` : `-${(c.valeur / 100).toFixed(0)} €`}</span>
                  <span className="text-[11px] text-[var(--text-muted)]">{c.utilisations} utilisation{c.utilisations > 1 ? 's' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="glass-card relative w-full md:max-w-md md:rounded-2xl rounded-t-2xl rounded-b-none md:rounded-b-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(135deg, #F59E0B, #F59E0BD0)' }} />
            <div className="p-4 md:p-5 border-b border-[var(--border-base)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F59E0B, #F59E0BD0)' }}>
                  <TicketPercent size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-[var(--text-primary)] font-semibold">Nouveau code</h3>
                  <p className="text-[var(--text-muted)] text-[11px]">Créez un code de réduction</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 md:p-5 space-y-4">
              <div>
                <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Code *</label>
                <input type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="Ex : BIENVENUE20" className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#F59E0B]/50 focus:outline-none transition-all uppercase font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Type</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] focus:border-[#F59E0B]/50 focus:outline-none transition-all">
                    <option value="pourcentage">Pourcentage (%)</option>
                    <option value="fixe">Montant fixe (€)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Valeur *</label>
                  <input type="number" value={form.valeur} onChange={e => setForm({...form, valeur: e.target.value})} placeholder="20" className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#F59E0B]/50 focus:outline-none transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Limite d'utilisation</label>
                  <input type="number" value={form.limite} onChange={e => setForm({...form, limite: e.target.value})} placeholder="Illimité" className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#F59E0B]/50 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[var(--text-secondary)] text-xs font-medium mb-1.5">Expiration</label>
                  <input type="date" value={form.expiration} onChange={e => setForm({...form, expiration: e.target.value})} className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-3.5 py-3 text-sm text-[var(--text-primary)] focus:border-[#F59E0B]/50 focus:outline-none transition-all" />
                </div>
              </div>
            </div>
            <div className="p-4 md:p-5 border-t border-[var(--border-base)] flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl text-sm text-[var(--text-muted)] hover:bg-[var(--bg-surface)] transition-all">Annuler</button>
              <button onClick={creerCode} disabled={saving || !form.code.trim() || !form.valeur} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 active:scale-95" style={{ background: 'linear-gradient(135deg, #F59E0B, #F59E0BD0)' }}>
                {saving ? 'Création...' : 'Créer le code'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
