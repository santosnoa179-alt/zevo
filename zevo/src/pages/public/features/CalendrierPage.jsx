import {
  CalendarDays, Clock, Users, Bell, Repeat, Globe,
  Timer, UserCheck, Monitor, CheckCircle, MapPin, CalendarCheck
} from 'lucide-react'
import FeaturePageLayout from '../../../components/FeaturePageLayout'

/* ─── Mockup: Weekly calendar view ─── */
function CalendarMockup() {
  const days = [
    { label: 'Lun', date: '14' },
    { label: 'Mar', date: '15' },
    { label: 'Mer', date: '16' },
    { label: 'Jeu', date: '17' },
    { label: 'Ven', date: '18' },
    { label: 'Sam', date: '19' },
    { label: 'Dim', date: '20' },
  ]

  const sessions = [
    { day: 0, top: '8%', height: '18%', name: 'Lucas M.', time: '08:00', type: 'Force', color: '#FF6B2B' },
    { day: 0, top: '52%', height: '14%', name: 'Emma R.', time: '14:00', type: 'Cardio', color: '#3B82F6' },
    { day: 1, top: '16%', height: '22%', name: 'Cours collectif', time: '09:30', type: 'HIIT', color: '#8B5CF6' },
    { day: 1, top: '60%', height: '16%', name: 'Sarah K.', time: '16:00', type: 'Souplesse', color: '#10B981' },
    { day: 2, top: '4%', height: '16%', name: 'Thomas B.', time: '07:00', type: 'Force', color: '#FF6B2B' },
    { day: 2, top: '34%', height: '18%', name: 'Julie A.', time: '11:00', type: 'Perte poids', color: '#F59E0B' },
    { day: 2, top: '68%', height: '14%', name: 'Marc D.', time: '17:30', type: 'Perf', color: '#EF4444' },
    { day: 3, top: '12%', height: '20%', name: 'Cours collectif', time: '09:00', type: 'Yoga', color: '#8B5CF6' },
    { day: 3, top: '46%', height: '14%', name: 'Camille P.', time: '13:00', type: 'Rehab', color: '#06B6D4' },
    { day: 4, top: '8%', height: '18%', name: 'Lucas M.', time: '08:00', type: 'Force', color: '#FF6B2B' },
    { day: 4, top: '40%', height: '16%', name: 'Emma R.', time: '12:00', type: 'Cardio', color: '#3B82F6' },
    { day: 4, top: '72%', height: '12%', name: 'Sarah K.', time: '18:00', type: 'Souplesse', color: '#10B981' },
    { day: 5, top: '14%', height: '24%', name: 'Cours collectif', time: '09:00', type: 'CrossFit', color: '#8B5CF6' },
    { day: 5, top: '54%', height: '14%', name: 'Thomas B.', time: '14:30', type: 'Force', color: '#FF6B2B' },
  ]

  return (
    <div className="relative max-w-4xl mx-auto">
      {/* Outer glow */}
      <div className="absolute -inset-4 bg-gradient-to-b from-[#FF6B2B]/[0.06] via-transparent to-transparent rounded-3xl blur-2xl pointer-events-none" />

      <div className="relative rounded-2xl border border-white/[0.08] bg-[#141414]/90 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/40">
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-[#111111]/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5E] flex items-center justify-center">
              <CalendarDays size={14} className="text-white" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[#F5F5F3]/80">Semaine du 14 avril</p>
              <p className="text-[10px] text-[#F5F5F3]/25">14 séances planifiées</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-[#FF6B2B]/10 border border-[#FF6B2B]/20 text-[10px] font-medium text-[#FF6B2B]">Aujourd'hui</span>
            <span className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] text-[#F5F5F3]/30">Semaine</span>
            <span className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] text-[#F5F5F3]/30">Mois</span>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[640px] grid grid-cols-7 gap-px bg-white/[0.03]">
            {/* Day headers */}
            {days.map((d, i) => (
              <div key={i} className={`text-center py-2.5 border-b border-white/[0.04] ${i === 2 ? 'bg-[#FF6B2B]/[0.04]' : 'bg-[#141414]'}`}>
                <p className="text-[10px] text-[#F5F5F3]/25 font-medium">{d.label}</p>
                <p className={`text-[14px] font-bold mt-0.5 ${i === 2 ? 'text-[#FF6B2B]' : 'text-[#F5F5F3]/50'}`}>{d.date}</p>
              </div>
            ))}

            {/* Session columns */}
            {days.map((_, dayIdx) => (
              <div key={dayIdx} className={`relative bg-[#141414] ${dayIdx === 2 ? 'bg-[#FF6B2B]/[0.02]' : ''}`} style={{ height: '260px' }}>
                {/* Time grid lines */}
                {[0, 25, 50, 75].map(t => (
                  <div key={t} className="absolute left-0 right-0 border-t border-white/[0.02]" style={{ top: `${t}%` }} />
                ))}
                {/* Sessions */}
                {sessions.filter(s => s.day === dayIdx).map((s, si) => (
                  <div
                    key={si}
                    className="absolute left-1 right-1 rounded-lg overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-[1.02] hover:z-10"
                    style={{ top: s.top, height: s.height }}
                  >
                    <div className="absolute inset-0 opacity-15 group-hover:opacity-25 transition-opacity" style={{ backgroundColor: s.color }} />
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full" style={{ backgroundColor: s.color }} />
                    <div className="relative px-2 py-1.5">
                      <p className="text-[9px] font-semibold truncate" style={{ color: s.color }}>{s.time}</p>
                      <p className="text-[9px] text-[#F5F5F3]/60 truncate font-medium">{s.name}</p>
                      <p className="text-[8px] text-[#F5F5F3]/25 truncate">{s.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Footer status */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 border-t border-white/[0.04] bg-[#111111]/50">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {[
              { color: '#FF6B2B', label: 'Force' },
              { color: '#3B82F6', label: 'Cardio' },
              { color: '#8B5CF6', label: 'Collectif' },
              { color: '#10B981', label: 'Souplesse' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                <span className="text-[9px] text-[#F5F5F3]/20">{l.label}</span>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-[#F5F5F3]/15">3 créneaux disponibles cette semaine</p>
        </div>
      </div>
    </div>
  )
}

/* ─── Extra: Use-case cards ─── */
function UseCaseSection() {
  const cases = [
    {
      icon: UserCheck,
      title: 'Coaching individuel',
      desc: 'Gère tes séances 1-on-1 avec des créneaux personnalisés par client. Chaque client réserve en fonction de tes disponibilités réelles.',
      accent: '#FF6B2B',
    },
    {
      icon: Users,
      title: 'Cours collectifs',
      desc: 'Planifie tes cours de groupe avec gestion des places, liste d\'attente automatique et notifications aux inscrits.',
      accent: '#8B5CF6',
    },
    {
      icon: Monitor,
      title: 'Suivi à distance',
      desc: 'Organise tes consultations vidéo et check-ins à distance avec rappels automatiques et lien de visio intégré.',
      accent: '#3B82F6',
    },
  ]

  return (
    <section className="py-20 md:py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0E0E0E] to-transparent pointer-events-none" />
      <div className="max-w-6xl mx-auto px-5 md:px-8 relative z-10">
        <div className="text-center mb-14">
          <p className="text-[11px] font-semibold text-[#FF6B2B] uppercase tracking-widest mb-3">Cas d'usage</p>
          <h2 className="text-2xl md:text-4xl font-bold">Adapté à ton activité</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {cases.map((c, i) => {
            const Icon = c.icon
            return (
              <div key={i} className="group rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#151515] to-[#111111] p-7 hover:border-white/[0.1] transition-all duration-500 relative overflow-hidden">
                <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ backgroundColor: `${c.accent}10` }} />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl border flex items-center justify-center mb-5" style={{ backgroundColor: `${c.accent}15`, borderColor: `${c.accent}20` }}>
                    <Icon size={22} style={{ color: c.accent }} />
                  </div>
                  <h3 className="text-[15px] font-semibold mb-2 text-[#F5F5F3]/90">{c.title}</h3>
                  <p className="text-sm text-[#F5F5F3]/30 leading-relaxed">{c.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ─── Page ─── */
export default function CalendrierPage() {
  return (
    <FeaturePageLayout
      badge="Calendrier & Réservations"
      badgeIcon={CalendarDays}
      title="Ton planning,"
      titleAccent="simplifié"
      subtitle="Centralise ton emploi du temps, accepte les réservations en ligne et élimine les allers-retours. Tes clients réservent en autonomie, tu gardes le contrôle."
      stats={[
        { value: '-70%', label: 'de temps admin en moins' },
        { value: '24/7', label: 'réservations en ligne' },
        { value: '0', label: 'no-show avec rappels' },
      ]}
      mockup={<CalendarMockup />}
      features={[
        { icon: CalendarDays, title: 'Calendrier global', desc: 'Vue semaine, mois et jour avec tous tes créneaux, séances et disponibilités en un coup d\'œil.' },
        { icon: Globe, title: 'Réservation en ligne', desc: 'Tes clients réservent directement depuis ton lien personnalisé. Plus besoin d\'échanger des messages.' },
        { icon: Bell, title: 'Rappels automatiques', desc: 'Notifications par email et push avant chaque séance. Fini les oublis et les no-shows.' },
        { icon: Repeat, title: 'Séances récurrentes', desc: 'Programme des séances qui se répètent automatiquement chaque semaine ou chaque mois.' },
        { icon: CalendarCheck, title: 'Sync agenda', desc: 'Synchronise avec Google Calendar, Apple Calendar ou Outlook pour éviter les doublons.' },
        { icon: Timer, title: 'Gestion des durées', desc: 'Définis des durées différentes par type de séance : 30min, 45min, 1h ou personnalisé.' },
      ]}
      stepsTitle="Planifier n'a jamais été aussi simple"
      steps={[
        { title: 'Définis tes disponibilités', desc: 'Configure tes créneaux libres par jour et par type de séance. Bloque les heures où tu n\'es pas disponible.' },
        { title: 'Tes clients réservent', desc: 'Partage ton lien de réservation. Tes clients choisissent un créneau libre et confirment en un clic.' },
        { title: 'Gère tout depuis un seul écran', desc: 'Visualise ta semaine, déplace des séances, annule ou replanifie. Tout est centralisé.' },
      ]}
      extraSection={<UseCaseSection />}
      ctaTitle="Prêt à simplifier"
      ctaAccent="ta planification"
    />
  )
}
