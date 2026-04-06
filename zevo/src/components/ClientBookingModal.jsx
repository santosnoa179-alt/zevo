import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from './ui/Toast'
import {
  CalendarPlus, X, Loader2, Clock, ChevronLeft, ChevronRight, MessageSquare, Check
} from 'lucide-react'

const JOURS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export default function ClientBookingModal({ open, onClose, coachId }) {
  const { user } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [disponibilites, setDisponibilites] = useState([])
  const [reservations, setReservations] = useState([])
  const [coachEvents, setCoachEvents] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [notes, setNotes] = useState('')
  const [step, setStep] = useState('date') // date | slot | confirm
  const [weekOffset, setWeekOffset] = useState(0)

  // ── Charger les données ──
  useEffect(() => {
    if (!open || !coachId) return
    const load = async () => {
      setLoading(true)
      const now = new Date()
      const end = new Date(now)
      end.setDate(end.getDate() + 28) // 4 semaines

      const [dispoRes, reservRes, eventsRes] = await Promise.all([
        supabase
          .from('coach_disponibilites')
          .select('*')
          .eq('coach_id', coachId)
          .eq('est_actif', true),
        supabase
          .from('reservations')
          .select('date_debut, date_fin')
          .eq('coach_id', coachId)
          .eq('statut', 'confirmee')
          .gte('date_debut', now.toISOString())
          .lte('date_debut', end.toISOString()),
        supabase
          .from('coach_events')
          .select('event_date')
          .eq('coach_id', coachId)
          .gte('event_date', now.toISOString())
          .lte('event_date', end.toISOString()),
      ])

      setDisponibilites(dispoRes.data || [])
      setReservations(reservRes.data || [])
      setCoachEvents(eventsRes.data || [])
      setLoading(false)
    }
    load()
    // Reset state
    setSelectedDate(null)
    setSelectedSlot(null)
    setNotes('')
    setStep('date')
    setWeekOffset(0)
  }, [open, coachId])

  // ── Générer les 14 prochains jours ──
  const days = useMemo(() => {
    const result = []
    const now = new Date()
    for (let i = 1; i <= 28; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() + i)
      d.setHours(0, 0, 0, 0)
      result.push(d)
    }
    return result
  }, [])

  const visibleDays = days.slice(weekOffset * 7, weekOffset * 7 + 7)

  // ── Vérifier si un jour a des créneaux ──
  const dayHasSlots = (date) => {
    // ISO: lundi=1 ... dimanche=7 → on veut 0=lundi ... 6=dimanche
    let dayOfWeek = date.getDay() - 1
    if (dayOfWeek < 0) dayOfWeek = 6
    return disponibilites.some(d => d.jour_semaine === dayOfWeek)
  }

  // ── Générer les créneaux pour un jour ──
  const getSlotsForDay = (date) => {
    let dayOfWeek = date.getDay() - 1
    if (dayOfWeek < 0) dayOfWeek = 6

    const dayDispos = disponibilites.filter(d => d.jour_semaine === dayOfWeek)
    const slots = []

    dayDispos.forEach(dispo => {
      const [startH, startM] = dispo.heure_debut.split(':').map(Number)
      const [endH, endM] = dispo.heure_fin.split(':').map(Number)
      const duree = dispo.duree_creneau

      let currentMin = startH * 60 + startM
      const endMin = endH * 60 + endM

      while (currentMin + duree <= endMin) {
        const slotStart = new Date(date)
        slotStart.setHours(Math.floor(currentMin / 60), currentMin % 60, 0, 0)
        const slotEnd = new Date(date)
        slotEnd.setHours(Math.floor((currentMin + duree) / 60), (currentMin + duree) % 60, 0, 0)

        // Vérifier si le créneau est déjà pris
        const isTaken = reservations.some(r => {
          const rStart = new Date(r.date_debut).getTime()
          const rEnd = new Date(r.date_fin).getTime()
          return slotStart.getTime() < rEnd && slotEnd.getTime() > rStart
        })

        // Vérifier si le coach a un événement
        const hasEvent = coachEvents.some(e => {
          const evDate = new Date(e.event_date)
          return Math.abs(evDate.getTime() - slotStart.getTime()) < duree * 60000
        })

        // Ne pas afficher les créneaux passés
        const isPast = slotStart.getTime() < Date.now()

        if (!isTaken && !hasEvent && !isPast) {
          slots.push({
            start: slotStart,
            end: slotEnd,
            label: `${String(slotStart.getHours()).padStart(2, '0')}:${String(slotStart.getMinutes()).padStart(2, '0')}`,
            labelEnd: `${String(slotEnd.getHours()).padStart(2, '0')}:${String(slotEnd.getMinutes()).padStart(2, '0')}`,
          })
        }

        currentMin += duree
      }
    })

    return slots.sort((a, b) => a.start - b.start)
  }

  // ── Réserver ──
  const handleBook = async () => {
    if (!selectedSlot || !user || !coachId) return
    setBooking(true)

    const { error } = await supabase.from('reservations').insert({
      coach_id: coachId,
      client_id: user.id,
      date_debut: selectedSlot.start.toISOString(),
      date_fin: selectedSlot.end.toISOString(),
      notes_client: notes || null,
    })

    if (error) {
      console.error('Erreur réservation:', error)
      toast.error('Erreur lors de la réservation')
      setBooking(false)
      return
    }

    // Notification au coach
    await supabase.from('notifications').insert({
      coach_id: coachId,
      client_id: user.id,
      titre: 'Nouvelle réservation',
      message: `Créneau du ${selectedSlot.start.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à ${selectedSlot.label}`,
      type: 'calendrier',
      destinataire: 'coach',
    })

    toast.success('Créneau réservé avec succès !')
    setBooking(false)
    onClose()
  }

  if (!open) return null

  const slotsForSelected = selectedDate ? getSlotsForDay(selectedDate) : []

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-md max-h-[90vh] overflow-hidden bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col z-10">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-base)] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#06b6d4]/10">
              <CalendarPlus className="w-5 h-5 text-[#06b6d4]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Réserver un créneau</h2>
              <p className="text-[10px] text-[var(--text-muted)]">
                {step === 'date' ? 'Choisissez un jour' : step === 'slot' ? 'Choisissez un horaire' : 'Confirmer'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--text-muted)]">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#06b6d4]" />
          </div>
        ) : disponibilites.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <Clock size={32} className="text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">Aucune disponibilité configurée</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Ton coach n'a pas encore défini ses créneaux</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* ── Étape 1 : Sélection du jour ── */}
            {step === 'date' && (
              <div className="p-5 space-y-4">
                {/* Navigation semaines */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
                    disabled={weekOffset === 0}
                    className="p-2 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--text-muted)] disabled:opacity-30"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">
                    {visibleDays[0]?.toLocaleDateString('fr-FR', { month: 'long' })}
                  </span>
                  <button
                    onClick={() => setWeekOffset(Math.min(3, weekOffset + 1))}
                    disabled={weekOffset >= 3}
                    className="p-2 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--text-muted)] disabled:opacity-30"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* Grille jours */}
                <div className="grid grid-cols-7 gap-1.5">
                  {JOURS_SHORT.map(j => (
                    <div key={j} className="text-center text-[9px] font-semibold text-[var(--text-muted)] uppercase pb-1">{j}</div>
                  ))}
                  {visibleDays.map((day, i) => {
                    const hasSlots = dayHasSlots(day)
                    const isSelected = selectedDate && day.getTime() === selectedDate.getTime()
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          if (!hasSlots) return
                          setSelectedDate(day)
                          setSelectedSlot(null)
                          setStep('slot')
                        }}
                        disabled={!hasSlots}
                        className={`aspect-square rounded-xl text-sm font-semibold transition-all flex flex-col items-center justify-center gap-0.5 ${
                          isSelected
                            ? 'bg-[#06b6d4] text-white'
                            : hasSlots
                            ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[#06b6d4]/15 hover:text-[#06b6d4]'
                            : 'text-[var(--text-muted)] opacity-30 cursor-not-allowed'
                        }`}
                      >
                        <span>{day.getDate()}</span>
                        {hasSlots && <div className="w-1 h-1 rounded-full bg-[#06b6d4]" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Étape 2 : Sélection du créneau ── */}
            {step === 'slot' && selectedDate && (
              <div className="p-5 space-y-4">
                <button
                  onClick={() => { setStep('date'); setSelectedSlot(null) }}
                  className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <ChevronLeft size={14} />
                  {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </button>

                {slotsForSelected.length === 0 ? (
                  <div className="py-10 text-center">
                    <Clock size={24} className="text-[var(--text-muted)] mx-auto mb-2" />
                    <p className="text-sm text-[var(--text-muted)]">Aucun créneau disponible ce jour</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {slotsForSelected.map((slot, i) => {
                      const isSelected = selectedSlot && slot.start.getTime() === selectedSlot.start.getTime()
                      return (
                        <button
                          key={i}
                          onClick={() => { setSelectedSlot(slot); setStep('confirm') }}
                          className={`px-3 py-3 rounded-xl text-center transition-all ${
                            isSelected
                              ? 'bg-[#06b6d4] text-white'
                              : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[#06b6d4]/40 hover:bg-[#06b6d4]/10'
                          }`}
                        >
                          <p className="text-sm font-semibold">{slot.label}</p>
                          <p className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-[var(--text-muted)]'}`}>
                            → {slot.labelEnd}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Étape 3 : Confirmation ── */}
            {step === 'confirm' && selectedSlot && (
              <div className="p-5 space-y-5">
                <button
                  onClick={() => setStep('slot')}
                  className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <ChevronLeft size={14} /> Changer l'horaire
                </button>

                {/* Récapitulatif */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#06b6d4]/10 flex items-center justify-center">
                      <CalendarPlus size={20} className="text-[#06b6d4]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">
                        {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      <p className="text-xs text-[#06b6d4] font-semibold">
                        {selectedSlot.label} → {selectedSlot.labelEnd}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Note optionnelle */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] mb-2">
                    <MessageSquare size={12} /> Message (optionnel)
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Ex: Je souhaite travailler sur..."
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[#06b6d4] outline-none resize-none"
                    rows={3}
                  />
                </div>

                {/* Bouton confirmer */}
                <button
                  onClick={handleBook}
                  disabled={booking}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}
                >
                  {booking ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Confirmer la réservation
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
