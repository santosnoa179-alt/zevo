import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserPlus, CalendarDays,
  Dumbbell, Apple, Activity, Video,
  Receipt, UsersRound, Zap, Bell,
  Search, MessageCircle, Rocket, LogOut, Menu, X,
  Settings, ChevronDown, ChevronLeft, BookOpen, Layers, ClipboardList,
  FileText, BarChart3, CreditCard, Paintbrush, Send, Mic,
  CheckCircle, Flame, TrendingDown, FolderOpen, Trophy, UtensilsCrossed
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

// ══════════════════════════════════════
// SIDEBAR NAV — Structure par sections
// ══════════════════════════════════════

const NAV_SECTIONS = [
  {
    title: null,
    items: [
      { to: '/coach/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
      { to: '/coach/client-hub', icon: Users, label: 'Clients' },
      { to: '/coach/calendar', icon: CalendarDays, label: 'Calendrier' },
      { to: '/coach/prospects', icon: UserPlus, label: 'Prospects', badge: 'Nouveau' },
    ],
  },
  {
    title: 'RESSOURCES',
    items: [
      { to: '/coach/sport', icon: Trophy, label: 'Sport' },
      { to: '/coach/nutrition', icon: UtensilsCrossed, label: 'Nutrition' },
      { to: '/coach/bibliotheque', icon: BookOpen, label: 'Bibliothèque' },
      { to: '/coach/formulaires', icon: ClipboardList, label: 'Formulaires' },
      { to: '/coach/rapports', icon: FileText, label: 'Rapports' },
      { to: '/coach/statistiques', icon: BarChart3, label: 'Statistiques' },
    ],
  },
  {
    title: 'GESTION',
    items: [
      { to: '/coach/abonnements', icon: CreditCard, label: 'Abonnements' },
      { to: '/coach/app-builder', icon: Paintbrush, label: 'App Builder', badge: 'PRO' },
      { to: '/coach/parametres', icon: Settings, label: 'Paramètres' },
    ],
  },
]

// Items pour la bottom nav mobile — Messages redirige vers la vraie page
const MOBILE_NAV = [
  { to: '/coach/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { to: '/coach/client-hub', icon: Users, label: 'Clients' },
  { to: '/coach/sport', icon: Trophy, label: 'Sport' },
  { to: '/coach/messages', icon: MessageCircle, label: 'Messages' },
  { to: '/coach/parametres', icon: Settings, label: 'Plus' },
]

// Titres de pages dynamiques
const PAGE_TITLES = {
  '/coach/dashboard': 'Tableau de bord',
  '/coach/clients': 'Clients',
  '/coach/client-hub': 'Hub Client 360°',
  '/coach/prospects': 'Prospects',
  '/coach/sport': 'Sport',
  '/coach/nutrition': 'Nutrition',
  '/coach/bibliotheque': 'Bibliothèque',
  '/coach/formulaires': 'Formulaires',
  '/coach/rapports': 'Rapports',
  '/coach/statistiques': 'Statistiques',
  '/coach/abonnements': 'Abonnements',
  '/coach/app-builder': 'App Builder',
  '/coach/parametres': 'Paramètres',
  '/coach/calendar': 'Calendrier',
  '/coach/messages': 'Messages',
}

// ══════════════════════════════════════
// MAIN LAYOUT
// ══════════════════════════════════════

export function CoachLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [coachProfile, setCoachProfile] = useState(null)

  // Charge le profil coach pour afficher nom + avatar
  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data } = await supabase
        .from('coaches')
        .select('prenom, nom, nom_app, logo_url')
        .eq('id', user.id)
        .maybeSingle()
      if (data) setCoachProfile(data)
    }
    load()
  }, [user])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Titre de page dynamique
  const currentPath = location.pathname
  const pageTitle = PAGE_TITLES[currentPath]
    || (currentPath.startsWith('/coach/clients/') ? 'Fiche client' : 'Coach')

  const coachName = coachProfile
    ? [coachProfile.prenom, coachProfile.nom].filter(Boolean).join(' ') || 'Coach'
    : 'Coach'
  const coachInitials = coachName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-[#18181b] flex flex-col md:flex-row">

      {/* ══════════════════════════════════════ */}
      {/* HEADER MOBILE                         */}
      {/* ══════════════════════════════════════ */}
      <header className="md:hidden sticky top-0 z-50 bg-[#09090b] border-b border-[#27272a] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/icons/Gemini_Generated_Image_vsyssevsyssevsys-Photoroom.png"
            alt="Zevo"
            className="h-10 w-10 rounded-xl object-contain flex-shrink-0"
          />
          <span className="font-extrabold tracking-tight text-[#F5F5F3] text-xl">Zevo</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/coach/messages')}
            className="p-2 text-white/40 hover:text-white transition-colors"
          >
            <MessageCircle size={18} />
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-white/50 hover:text-white p-1.5 transition-colors"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* ── Menu mobile overlay ── */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 top-[53px] z-40 bg-[#09090b]/95 backdrop-blur-sm overflow-auto">
          <nav className="p-4">
            {NAV_SECTIONS.map((section, si) => (
              <div key={si} className={si > 0 ? 'mt-4' : ''}>
                {section.title && (
                  <p className="text-[10px] uppercase tracking-widest text-white/20 font-semibold px-3 mb-2">
                    {section.title}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {section.items.map(({ to, icon: Icon, label }) => (
                    <li key={to}>
                      <NavLink
                        to={to}
                        onClick={() => setMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-[#FF6B2B]/10 text-[#FF6B2B]'
                              : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                          }`
                        }
                      >
                        <Icon size={18} />
                        {label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="mt-4 pt-4 border-t border-[#27272a]">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors w-full"
              >
                <LogOut size={18} />
                Se déconnecter
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* SIDEBAR DESKTOP                       */}
      {/* ══════════════════════════════════════ */}
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-[#09090b] border-r border-[#27272a] flex-col sticky top-0 h-screen">

        {/* Logo */}
        <div className="px-5 py-6 border-b border-[#27272a]">
          <div className="flex items-center gap-4">
            <img
              src="/icons/Gemini_Generated_Image_vsyssevsyssevsys-Photoroom.png"
              alt="Zevo"
              className="h-12 w-12 rounded-xl object-contain flex-shrink-0"
            />
            <div className="flex flex-col">
              <p className="text-[#F5F5F3] font-extrabold text-2xl tracking-tight leading-none">Zevo</p>
              <p className="text-zinc-500 text-xs font-medium mt-1.5 tracking-wide">Espace coach</p>
            </div>
          </div>
        </div>

        {/* Navigation par sections */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
          {NAV_SECTIONS.map((section, si) => (
            <div key={si}>
              {section.title && (
                <p className="text-[10px] uppercase tracking-widest text-white/20 font-semibold px-3 mb-2">
                  {section.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map(({ to, icon: Icon, label, badge }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all group ${
                          isActive
                            ? 'bg-[#27272a]/60 text-[#F5F5F3]'
                            : 'text-white/40 hover:text-white/70 hover:bg-[#27272a]/30'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon size={17} className={`flex-shrink-0 transition-colors ${isActive ? 'text-[#FF6B2B]' : 'text-white/30 group-hover:text-white/50'}`} />
                          <span className="flex-1">{label}</span>
                          {badge && (
                            <span className="text-[9px] bg-[#FF6B2B] text-white px-1.5 py-0.5 rounded-full font-bold">
                              {badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bas de sidebar */}
        <div className="px-3 pb-4 space-y-2 border-t border-[#27272a] pt-3">
          {/* Bouton Démarrage */}
          <button
            onClick={() => navigate('/coach/onboarding')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#FF6B2B]/10 text-[#FF6B2B] text-sm font-semibold hover:bg-[#FF6B2B]/15 transition-colors"
          >
            <Rocket size={15} />
            Démarrage 🚀
          </button>

          {/* Profil coach */}
          <button
            onClick={() => navigate('/coach/parametres')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#27272a]/40 transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-[#FF6B2B]/15 flex items-center justify-center flex-shrink-0">
              <span className="text-[#FF6B2B] text-xs font-bold">{coachInitials}</span>
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[#F5F5F3] text-xs font-medium truncate">{coachName}</p>
              <p className="text-white/20 text-[10px] truncate">{user?.email}</p>
            </div>
            <LogOut
              size={14}
              className="text-white/15 group-hover:text-white/40 transition-colors flex-shrink-0 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); handleLogout() }}
            />
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════ */}
      {/* CONTENU PRINCIPAL (Header + Outlet)   */}
      {/* ══════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* Header desktop */}
        <header className="hidden md:flex h-14 items-center justify-between px-6 bg-[#09090b] border-b border-[#27272a] flex-shrink-0">
          {/* Titre de page dynamique */}
          <h1 className="text-[#F5F5F3] text-lg font-semibold">{pageTitle}</h1>

          {/* Actions header */}
          <div className="flex items-center gap-2">
            {/* Bouton upgrade */}
            <button
              onClick={() => navigate('/pricing')}
              className="px-3.5 py-1.5 rounded-lg bg-[#F5F5F3] text-[#09090b] text-xs font-semibold hover:bg-white transition-colors"
            >
              Mettre à niveau
            </button>

            {/* Recherche */}
            <button className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-[#27272a]/50 transition-colors">
              <Search size={17} />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className={`p-2 rounded-lg transition-colors relative ${
                  notifOpen ? 'text-[#FF6B2B] bg-[#27272a]/50' : 'text-white/30 hover:text-white/60 hover:bg-[#27272a]/50'
                }`}
              >
                <Bell size={17} />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#FF6B2B]" />
              </button>

              {/* Dropdown notifications */}
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 bg-[#09090b] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="px-5 py-3.5 border-b border-[#27272a] flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-[#F5F5F3] text-sm font-bold">Notifications</h3>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B] font-bold">3 nouvelles</span>
                      </div>
                      <button
                        className="text-xs text-zinc-400 hover:text-white transition-colors"
                        onClick={() => setNotifOpen(false)}
                      >
                        Tout marquer comme lu
                      </button>
                    </div>

                    {/* Liste */}
                    <div className="max-h-96 overflow-y-auto">
                      {[
                        {
                          icon: CheckCircle, iconColor: 'text-emerald-400', iconBg: 'bg-emerald-500/10',
                          title: 'Séance terminée',
                          text: 'Noa SANTOS a terminé sa séance "Haut du corps"',
                          time: 'Il y a 10 min', unread: true,
                        },
                        {
                          icon: MessageCircle, iconColor: 'text-blue-400', iconBg: 'bg-blue-500/10',
                          title: 'Nouveau message',
                          text: 'Marie LEFORT vous a envoyé un message',
                          time: 'Il y a 1 heure', unread: true,
                        },
                        {
                          icon: Flame, iconColor: 'text-[#FF6B2B]', iconBg: 'bg-[#FF6B2B]/10',
                          title: 'Objectif atteint 🎉',
                          text: 'Thomas DUBOIS a perdu 2kg — objectif atteint !',
                          time: 'Il y a 3 heures', unread: true,
                        },
                        {
                          icon: TrendingDown, iconColor: 'text-amber-400', iconBg: 'bg-amber-500/10',
                          title: 'Rapport hebdomadaire',
                          text: 'Votre rapport de la semaine est prêt à consulter',
                          time: 'Hier', unread: false,
                        },
                      ].map((n, i) => (
                        <button key={i} className={`w-full flex items-start gap-3 px-5 py-4 hover:bg-white/[0.03] transition-colors text-left border-b border-[#27272a]/30 ${n.unread ? 'bg-white/[0.01]' : ''}`}>
                          <div className={`w-9 h-9 rounded-xl ${n.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <n.icon size={16} className={n.iconColor} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[#F5F5F3] text-xs font-semibold">{n.title}</p>
                              {n.unread && <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B2B] flex-shrink-0" />}
                            </div>
                            <p className="text-white/40 text-[11px] mt-0.5 leading-relaxed">{n.text}</p>
                            <p className="text-white/20 text-[10px] mt-1 font-medium">{n.time}</p>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 border-t border-[#27272a]">
                      <button className="text-[#FF6B2B] text-xs font-semibold hover:text-[#FF9A6C] transition-colors w-full text-center">
                        Voir toutes les notifications
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Messagerie — redirige vers la vraie page */}
            <button
              onClick={() => { navigate('/coach/messages'); setNotifOpen(false) }}
              className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-[#27272a]/50 transition-colors relative"
            >
              <MessageCircle size={17} />
            </button>
          </div>
        </header>

        {/* Zone de contenu */}
        <main className="flex-1 overflow-auto pb-16 md:pb-0 bg-[#18181b]">
          <Outlet />
        </main>
      </div>

      {/* ══════════════════════════════════════ */}
      {/* BOTTOM NAV MOBILE                     */}
      {/* ══════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#09090b] border-t border-[#27272a]">
        <ul className="flex items-center justify-around h-14">
          {MOBILE_NAV.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-2 py-1.5 transition-colors ${
                    isActive ? 'text-[#FF6B2B]' : 'text-white/30'
                  }`
                }
              >
                <Icon size={18} />
                <span className="text-[9px] font-medium">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
