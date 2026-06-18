import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from './ui/Toast'
import {
  Clock, X, Plus, Trash2, Save, Loader2, ToggleLeft, ToggleRight
} from 'lucide-react'

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const DUREES = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1h' },
  { value: 90, label: '1h30' },
]

export default function CoachDisponibilites({ open, onClose }) {
  const { user } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [globalDuree, setGlobalDuree] = useState(60)

  // schedule[0..6] = { actif, ranges: [{ debut, fin }] }
  const [schedule, setSchedule] = useState(
    JOURS.map(() => ({ actif: false, ranges: [] }))
  )

  // ── Charger les disponibilités existantes ──
  useEffect(() => {
    if (!open || !user) return
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('coach_disponibilites')
        .select('*')
        .eq('coach_id', user.id)
        .order('jour_semaine')

      if (error) {
        console.error('Erreur chargement dispos:', error)
        setLoading(false)
        return
      }

      if (data && data.length > 0) {
        // Reconstruire le schedule
        const s = JOURS.map(() => ({ actif: false, ranges: [] }))
        let duree = 60
        data.forEach(d => {
          const jour = d.jour_semaine
          if (!s[jour]) return
          if (!d.heure_debut || !d.heure_fin) return
          s[jour].actif = d.est_actif
          s[jour].ranges.push({
            debut: d.heure_debut.slice(0, 5),
            fin: d.heure_fin.slice(0, 5),
          })
          duree = d.duree_creneau
        })
        setSchedule(s)
        setGlobalDuree(duree)
      } else {
        // Default : Lun-Ven 9h-18h
        setSchedule(JOURS.map((_, i) => ({
          actif: i < 5,
          ranges: i < 5 ? [{ debut: '09:00', fin: '18:00' }] : [],
        })))
      }
      setLoading(false)
    }
    load()
  }, [open, user])

  // ── Toggle jour ──
  const toggleJour = (idx) => {
    setSchedule(prev => prev.map((day, i) => {
      if (i !== idx) return day
      const newActif = !day.actif
      return {
        ...day,
        actif: newActif,
        ranges: newActif && day.ranges.length === 0
          ? [{ debut: '09:00', fin: '18:00' }]
          : day.ranges,
      }
    }))
  }

  // ── Modifier un créneau ──
  const updateRange = (jourIdx, rangeIdx, field, value) => {
    setSchedule(prev => prev.map((day, i) => {
      if (i !== jourIdx) return day
      return {
        ...day,
        ranges: day.ranges.map((r, ri) =>
          ri === rangeIdx ? { ...r, [field]: value } : r
        ),
      }
    }))
  }

  // ── Ajouter un créneau ──
  const addRange = (jourIdx) => {
    setSchedule(prev => prev.map((day, i) => {
      if (i !== jourIdx) return day
      const lastEnd = day.ranges.length > 0 ? day.ranges[day.ranges.length - 1].fin : '09:00'
      return { ...day, ranges: [...day.ranges, { debut: lastEnd, fin: '18:00' }] }
    }))
  }

  // ── Supprimer un créneau ──
  const removeRange = (jourIdx, rangeIdx) => {
    setSchedule(prev => prev.map((day, i) => {
      if (i !== jourIdx) return day
      return { ...day, ranges: day.ranges.filter((_, ri) => ri !== rangeIdx) }
    }))
  }

  // ── Sauvegarder ──
  const handleSave = async () => {
    if (!user) return
    setSaving(true)

    // Supprimer toutes les anciennes dispos
    await supabase
      .from('coach_disponibilites')
      .delete()
      .eq('coach_id', user.id)

    // Insérer les nouvelles
    const rows = []
    schedule.forEach((day, jourIdx) => {
      if (day.ranges.length === 0) return
      day.ranges.forEach(range => {
        rows.push({
          coach_id: user.id,
          jour_semaine: jourIdx,
          heure_debut: range.debut,
          heure_fin: range.fin,
          duree_creneau: globalDuree,
          est_actif: day.actif,
        })
      })
    })

    if (rows.length > 0) {
      const { error } = await supabase
        .from('coach_disponibilites')
        .insert(rows)

      if (error) {
        console.error('Erreur save dispos:', error)
        toast.error('Erreur lors de la sauvegarde')
        setSaving(false)
        return
      }
    }

    toast.success('Disponibilités enregistrées')
    setSaving(false)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-2xl shadow-2xl flex flex-col z-10">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-base)] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))' }}>
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Disponibilités</h2>
              <p className="text-[11px] text-[var(--text-muted)]">Définissez vos créneaux de réservation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--text-muted)]">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Durée globale */}
            <div className="px-6 py-3 border-b border-[var(--border-subtle)] flex items-center gap-4 flex-shrink-0">
              <span className="text-xs text-[var(--text-secondary)] font-medium">Durée d'un créneau :</span>
              <div className="flex gap-1.5">
                {DUREES.map(d => (
                  <button
                    key={d.value}
                    onClick={() => setGlobalDuree(d.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      globalDuree === d.value
                        ? 'bg-primary text-white'
                        : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Planning hebdomadaire */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {JOURS.map((jour, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border transition-colors ${
                    schedule[idx].actif
                      ? 'border-[var(--border-base)] bg-[var(--bg-card)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-base)] opacity-60'
                  }`}
                >
                  {/* Jour header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => toggleJour(idx)}
                      className="flex-shrink-0"
                    >
                      {schedule[idx].actif ? (
                        <ToggleRight size={24} className="text-primary" />
                      ) : (
                        <ToggleLeft size={24} className="text-[var(--text-muted)]" />
                      )}
                    </button>
                    <span className={`text-sm font-semibold flex-1 ${
                      schedule[idx].actif ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
                    }`}>
                      {jour}
                    </span>
                    {schedule[idx].actif && (
                      <button
                        onClick={() => addRange(idx)}
                        className="flex items-center gap-1 text-[10px] text-primary font-semibold hover:bg-primary/10 px-2 py-1 rounded-lg transition-colors"
                      >
                        <Plus size={12} /> Ajouter
                      </button>
                    )}
                  </div>

                  {/* Créneaux */}
                  {schedule[idx].actif && schedule[idx].ranges.length > 0 && (
                    <div className="px-4 pb-3 space-y-2">
                      {schedule[idx].ranges.map((range, ri) => (
                        <div key={ri} className="flex items-center gap-2">
                          <input
                            type="time"
                            value={range.debut}
                            onChange={e => updateRange(idx, ri, 'debut', e.target.value)}
                            className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-primary outline-none"
                          />
                          <span className="text-[var(--text-muted)] text-xs">→</span>
                          <input
                            type="time"
                            value={range.fin}
                            onChange={e => updateRange(idx, ri, 'fin', e.target.value)}
                            className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-primary outline-none"
                          />
                          {schedule[idx].ranges.length > 1 && (
                            <button
                              onClick={() => removeRange(idx, ri)}
                              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--border-base)] flex items-center justify-end gap-3 flex-shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))' }}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Enregistrer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
