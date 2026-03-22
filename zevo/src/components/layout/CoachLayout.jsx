import { useState, useEffect, useCallback } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserPlus, CalendarDays,
  Dumbbell, Apple, Activity, Video,
  Receipt, UsersRound, HardDrive, Zap, Bell,
  Search, MessageCircle, Rocket, LogOut, Menu, X,
  Settings, ChevronDown, ChevronLeft, BookOpen, Layers, ClipboardList,
  FileText, BarChart3, CreditCard, Paintbrush, Send
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
      { to: '/coach/programmes', icon: Layers, label: 'Programmes' },
    ],
  },
  {
    title: 'RESSOURCES',
    items: [
      { to: '/coach/bibliotheque', icon: BookOpen, label: 'Bibliothèque' },
      { to: '/coach/formulaires', icon: ClipboardList, label: 'Formulaires' },
      { to: '/coach/rapports', icon: FileText, label: 'Rapports' },
      { to: '/coach/statistiques', icon: BarChart3, label: 'Statistiques' },
      { to: '/coach/drive', icon: HardDrive, label: 'Drive' },
    ],
  },
  {
    title: 'GESTION',
    items: [
      { to: '/coach/abonnements', icon: CreditCard, label: 'Abonnements' },
      { to: '/coach/app-builder', icon: Paintbrush, label: 'App Builder' },
      { to: '/coach/parametres', icon: Settings, label: 'Paramètres' },
    ],
  },
]

// Items pour la bottom nav mobile (Messages est un bouton spécial, pas un NavLink)
const MOBILE_NAV = [
  { to: '/coach/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { to: '/coach/client-hub', icon: Users, label: 'Clients' },
  { to: '/coach/programmes', icon: Layers, label: 'Programmes' },
  { to: null, icon: MessageCircle, label: 'Messages', action: 'openMessages' },
  { to: '/coach/parametres', icon: Settings, label: 'Plus' },
]

// Titres de pages dynamiques
const PAGE_TITLES = {
  '/coach/dashboard': 'Tableau de bord',
  '/coach/clients': 'Clients',
  '/coach/client-hub': 'Hub Client 360°',
  '/coach/prospects': 'Prospects',
  '/coach/programmes': 'Programmes',
  '/coach/bibliotheque': 'Bibliothèque',
  '/coach/formulaires': 'Formulaires',
  '/coach/rapports': 'Rapports',
  '/coach/statistiques': 'Statistiques',
  '/coach/abonnements': 'Abonnements',
  '/coach/app-builder': 'App Builder',
  '/coach/parametres': 'Paramètres',
  '/coach/drive': 'Drive',
  '/coach/calendar': 'Calendrier',
}

// ══════════════════════════════════════
// MESSAGING DRAWER
// ══════════════════════════════════════

function MessagingDrawer({ open, onClose }) {
  const [tab, setTab] = useState('actifs')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContact, setSelectedContact] = useState(null)
  const [messageInput, setMessageInput] = useState('')
  const [messages, setMessages] = useState({})
  const [isComposingNew, setIsComposingNew] = useState(false)
  const [newMsgSearch, setNewMsgSearch] = useState('')
  const [composeMode, setComposeMode] = useState('direct') // 'direct' | 'group'
  const [groupName, setGroupName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState(new Set())

  const TABS = [
    { id: 'actifs', label: 'Actifs' },
    { id: 'tous', label: 'Tous' },
    { id: 'non_lus', label: 'Non lus' },
    { id: 'groupes', label: 'Groupes' },
  ]

  const FAKE_CONTACTS = [
    { id: 'noa', initials: 'NS', name: 'Noa SANTOS', message: 'Nouvelle conversation', time: '12:48', unread: true, status: 'actif', group: false },
    { id: 'marie', initials: 'ML', name: 'Marie LEFORT', message: 'Merci pour le programme !', time: '11:22', unread: false, status: 'actif', group: false },
    { id: 'thomas', initials: 'TD', name: 'Thomas DUBOIS', message: 'J\'ai une question sur...', time: 'Hier', unread: true, status: 'inactif', group: false },
    { id: 'groupe1', initials: 'GP', name: 'Groupe Remise en Forme', message: 'Prochaine séance lundi', time: 'Lun', unread: false, status: 'actif', group: true },
  ]

  // Messages fictifs par contact
  const FAKE_MESSAGES = {
    noa: [
      { id: 1, from: 'client', text: 'Bonjour coach ! J\'ai bien fait ma séance ce matin.', time: '12:30' },
      { id: 2, from: 'coach', text: 'Super Noa ! Comment tu te sens après ?', time: '12:35' },
      { id: 3, from: 'client', text: 'Très bien, les squats étaient durs mais j\'ai tenu !', time: '12:42' },
      { id: 4, from: 'coach', text: 'Parfait 💪 On augmente les charges la semaine prochaine.', time: '12:45' },
      { id: 5, from: 'client', text: 'Nouvelle conversation', time: '12:48' },
    ],
    marie: [
      { id: 1, from: 'client', text: 'Bonjour ! J\'ai reçu le nouveau programme.', time: '10:50' },
      { id: 2, from: 'coach', text: 'Oui, dis-moi si tu as des questions !', time: '11:05' },
      { id: 3, from: 'client', text: 'Merci pour le programme !', time: '11:22' },
    ],
    thomas: [
      { id: 1, from: 'client', text: 'Coach, je peux décaler ma séance de jeudi ?', time: 'Hier 18:20' },
      { id: 2, from: 'coach', text: 'Bien sûr, quel jour te convient ?', time: 'Hier 18:45' },
      { id: 3, from: 'client', text: 'J\'ai une question sur les exercices de dos.', time: 'Hier 19:10' },
    ],
    groupe1: [
      { id: 1, from: 'coach', text: 'Rappel : séance collective lundi à 18h !', time: 'Lun 09:00' },
      { id: 2, from: 'client', text: 'Présent !', time: 'Lun 09:15' },
      { id: 3, from: 'coach', text: 'Prochaine séance lundi', time: 'Lun 10:00' },
    ],
  }

  // Filtrage par onglet
  const filteredContacts = FAKE_CONTACTS.filter((c) => {
    if (tab === 'actifs') return c.status === 'actif' && !c.group
    if (tab === 'non_lus') return c.unread
    if (tab === 'groupes') return c.group
    return !c.group // "tous" = tous sauf groupes (groupes ont leur onglet)
  })

  // Filtrage par recherche
  const visibleContacts = searchQuery
    ? filteredContacts.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : filteredContacts

  // Tous les contacts individuels (pour la vue "Nouveau message")
  const allIndividualContacts = FAKE_CONTACTS.filter(c => !c.group)
  const filteredNewContacts = newMsgSearch
    ? allIndividualContacts.filter(c => c.name.toLowerCase().includes(newMsgSearch.toLowerCase()))
    : allIndividualContacts

  // Sélection d'un contact
  const openConversation = (contact) => {
    setSelectedContact(contact)
    setIsComposingNew(false)
    setNewMsgSearch('')
    if (!messages[contact.id]) {
      setMessages((prev) => ({ ...prev, [contact.id]: FAKE_MESSAGES[contact.id] || [] }))
    }
  }

  // Toggle member selection for group
  const toggleMember = (id) => {
    setSelectedMembers(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Create group
  const createGroup = () => {
    if (!groupName.trim() || selectedMembers.size === 0) return
    const memberNames = allIndividualContacts
      .filter(c => selectedMembers.has(c.id))
      .map(c => c.name.split(' ')[0])
      .join(', ')
    const newGroup = {
      id: `group_${Date.now()}`,
      initials: groupName.slice(0, 2).toUpperCase(),
      name: groupName.trim(),
      message: `Groupe créé avec ${memberNames}`,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      unread: false,
      status: 'actif',
      group: true,
    }
    openConversation(newGroup)
  }

  // Retour à la liste
  const backToList = () => {
    setSelectedContact(null)
    setMessageInput('')
    setIsComposingNew(false)
    setNewMsgSearch('')
    setComposeMode('direct')
    setGroupName('')
    setSelectedMembers(new Set())
  }

  // Envoi d'un message
  const sendMessage = () => {
    if (!messageInput.trim() || !selectedContact) return
    const newMsg = {
      id: Date.now(),
      from: 'coach',
      text: messageInput.trim(),
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages((prev) => ({
      ...prev,
      [selectedContact.id]: [...(prev[selectedContact.id] || []), newMsg],
    }))
    setMessageInput('')
  }

  // Reset quand le tiroir se ferme
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setSelectedContact(null)
        setMessageInput('')
        setIsComposingNew(false)
        setNewMsgSearch('')
        setComposeMode('direct')
        setGroupName('')
        setSelectedMembers(new Set())
      }, 300)
    }
  }, [open])

  const currentMessages = selectedContact ? (messages[selectedContact.id] || FAKE_MESSAGES[selectedContact.id] || []) : []

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full md:w-[380px] md:max-w-[90vw] bg-[#09090b] border-l border-[#27272a] flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* ── VUE CONVERSATION ── */}
        {selectedContact ? (
          <>
            {/* Header conversation */}
            <div className="px-4 py-3.5 border-b border-[#27272a] flex items-center gap-3">
              <button
                onClick={backToList}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="w-9 h-9 rounded-full bg-[#FF6B2B]/15 flex items-center justify-center flex-shrink-0">
                <span className="text-[#FF6B2B] text-sm font-bold">{selectedContact.initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#F5F5F3] text-sm font-semibold truncate">{selectedContact.name}</p>
                <p className="text-white/25 text-[10px]">En ligne</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Zone de messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {currentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.from === 'coach' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.from === 'coach'
                        ? 'bg-[#FF6B2B] text-white rounded-br-md'
                        : 'bg-[#27272a] text-[#F5F5F3] rounded-bl-md'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <p className={`text-[9px] mt-1 ${msg.from === 'coach' ? 'text-white/50' : 'text-white/25'}`}>
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Zone de saisie */}
            <div className="px-4 py-3 border-t border-[#27272a]">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Écrivez votre message..."
                  className="flex-1 bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F3] placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageInput.trim()}
                  className="p-2.5 rounded-xl bg-[#FF6B2B] text-white hover:bg-[#e55e24] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        ) : isComposingNew ? (
          /* ── VUE NOUVEAU MESSAGE / CRÉER GROUPE ── */
          <>
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-[#27272a] flex items-center gap-3">
              <button
                onClick={backToList}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <h2 className="text-[#F5F5F3] font-semibold text-base flex-1">
                {composeMode === 'direct' ? 'Nouveau message' : 'Créer un groupe'}
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Toggle Direct / Groupe */}
            <div className="px-5 py-3 flex gap-0 border-b border-[#27272a]">
              {[
                { id: 'direct', label: 'Message direct' },
                { id: 'group', label: 'Créer un groupe' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setComposeMode(m.id); setNewMsgSearch(''); setSelectedMembers(new Set()); setGroupName('') }}
                  className={`flex-1 py-2 text-xs font-medium transition-colors relative ${
                    composeMode === m.id ? 'text-[#FF6B2B]' : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  {m.label}
                  {composeMode === m.id && (
                    <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#FF6B2B] rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {composeMode === 'group' && (
              /* Nom du groupe */
              <div className="px-5 py-3 border-b border-[#27272a]">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Nom du groupe..."
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-4 py-2 text-sm text-[#F5F5F3] placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
                />
              </div>
            )}

            {composeMode === 'direct' && (
              /* Barre "À :" pour message direct */
              <div className="px-5 py-3 border-b border-[#27272a]">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm font-medium">À :</span>
                  <input
                    type="text"
                    value={newMsgSearch}
                    onChange={(e) => setNewMsgSearch(e.target.value)}
                    placeholder="Rechercher un client..."
                    autoFocus
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-10 pr-4 py-2 text-sm text-[#F5F5F3] placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
                  />
                </div>
              </div>
            )}

            {composeMode === 'group' && (
              /* Recherche membres */
              <div className="px-5 py-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                  <input
                    type="text"
                    value={newMsgSearch}
                    onChange={(e) => setNewMsgSearch(e.target.value)}
                    placeholder="Rechercher des membres..."
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-9 pr-4 py-2 text-sm text-[#F5F5F3] placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
                  />
                </div>
                {selectedMembers.size > 0 && (
                  <p className="text-[#FF6B2B] text-[10px] font-medium mt-1.5">
                    {selectedMembers.size} membre{selectedMembers.size > 1 ? 's' : ''} sélectionné{selectedMembers.size > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            {/* Liste des clients */}
            <div className="flex-1 overflow-y-auto">
              {filteredNewContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <Users size={28} className="text-white/10 mb-3" />
                  <p className="text-white/25 text-xs">Aucun client trouvé</p>
                </div>
              ) : (
                filteredNewContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => composeMode === 'direct' ? openConversation(contact) : toggleMember(contact.id)}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.03] transition-colors text-left border-b border-[#27272a]/50 ${
                      selectedMembers.has(contact.id) ? 'bg-[#FF6B2B]/[0.04]' : ''
                    }`}
                  >
                    {composeMode === 'group' && (
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        selectedMembers.has(contact.id) ? 'bg-[#FF6B2B] border-[#FF6B2B]' : 'border-[#27272a]'
                      }`}>
                        {selectedMembers.has(contact.id) && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        )}
                      </div>
                    )}
                    <div className="w-10 h-10 rounded-full bg-[#FF6B2B]/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#FF6B2B] text-sm font-bold">{contact.initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#F5F5F3] text-sm font-medium truncate">{contact.name}</p>
                      <p className="text-white/20 text-[10px] mt-0.5">
                        {composeMode === 'direct' ? 'Démarrer une conversation' : 'Ajouter au groupe'}
                      </p>
                    </div>
                    {composeMode === 'direct' && <Send size={14} className="text-white/15 flex-shrink-0" />}
                  </button>
                ))
              )}
            </div>

            {/* Bouton "Créer le groupe" */}
            {composeMode === 'group' && (
              <div className="px-5 py-3 border-t border-[#27272a]">
                <button
                  onClick={createGroup}
                  disabled={!groupName.trim() || selectedMembers.size === 0}
                  className="w-full py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Users size={15} />
                  Créer le groupe ({selectedMembers.size})
                </button>
              </div>
            )}
          </>
        ) : (
          /* ── VUE LISTE DES CONTACTS ── */
          <>
            {/* Header du tiroir */}
            <div className="px-5 py-4 border-b border-[#27272a] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-[#F5F5F3] font-semibold text-lg">Messagerie</h2>
                <BookOpen size={16} className="text-white/30" />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsComposingNew(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6B2B] text-white text-xs font-semibold hover:bg-[#e55e24] transition-colors"
                >
                  Nouveau
                  <ChevronDown size={12} />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Recherche */}
            <div className="px-5 py-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une conversation..."
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-9 pr-4 py-2 text-sm text-[#F5F5F3] placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/50 transition-colors"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="px-5 flex gap-0 border-b border-[#27272a]">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-3 py-2.5 text-xs font-medium transition-colors relative ${
                    tab === t.id ? 'text-[#FF6B2B]' : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  {t.label}
                  {tab === t.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FF6B2B] rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Liste des conversations */}
            <div className="flex-1 overflow-y-auto">
              {visibleContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <MessageCircle size={32} className="text-white/10 mb-3" />
                  <p className="text-white/30 text-sm">Aucune conversation</p>
                  <p className="text-white/15 text-xs mt-1">
                    {tab === 'non_lus' ? 'Pas de messages non lus' : tab === 'groupes' ? 'Aucun groupe créé' : 'Démarrez une conversation'}
                  </p>
                </div>
              ) : (
                visibleContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => openConversation(contact)}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.03] transition-colors text-left border-b border-[#27272a]/50"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#FF6B2B]/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#FF6B2B] text-sm font-bold">{contact.initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[#F5F5F3] text-sm font-medium truncate">{contact.name}</p>
                        <span className="text-white/20 text-[10px] flex-shrink-0 ml-2">{contact.time}</span>
                      </div>
                      <p className="text-white/35 text-xs truncate mt-0.5">{contact.message}</p>
                    </div>
                    {contact.unread && (
                      <div className="w-2 h-2 rounded-full bg-[#FF6B2B] flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ══════════════════════════════════════
// MAIN LAYOUT
// ══════════════════════════════════════

export function CoachLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [msgDrawerOpen, setMsgDrawerOpen] = useState(false)
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
            className="h-8 w-auto rounded-lg object-contain"
          />
          <span className="font-bold tracking-tight text-[#F5F5F3] text-base">Zevo</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMsgDrawerOpen(true)}
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
        <div className="px-5 py-5 border-b border-[#27272a]">
          <div className="flex items-center gap-3">
            <img
              src="/icons/Gemini_Generated_Image_vsyssevsyssevsys-Photoroom.png"
              alt="Zevo"
              className="h-10 w-auto rounded-lg object-contain"
            />
            <div>
              <p className="text-[#F5F5F3] font-bold text-lg tracking-tight leading-none">Zevo</p>
              <p className="text-white/25 text-[10px] mt-0.5">Espace coach</p>
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
                  <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-[#09090b] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#27272a] flex items-center justify-between">
                      <h3 className="text-[#F5F5F3] text-sm font-semibold">Notifications</h3>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B] font-bold">3 nouvelles</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {[
                        { text: 'Nouveau client inscrit via votre lien', time: 'Il y a 2h', dot: true },
                        { text: 'Rapport hebdomadaire prêt à télécharger', time: 'Il y a 5h', dot: true },
                        { text: 'Mise à jour du programme "Remise en forme"', time: 'Hier', dot: true },
                        { text: 'Paiement reçu — Abonnement Pro', time: 'Il y a 3j', dot: false },
                      ].map((n, i) => (
                        <button key={i} className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left border-b border-[#27272a]/30">
                          {n.dot && <div className="w-2 h-2 rounded-full bg-[#FF6B2B] mt-1.5 flex-shrink-0" />}
                          {!n.dot && <div className="w-2 h-2 mt-1.5 flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-[#F5F5F3] text-xs">{n.text}</p>
                            <p className="text-white/20 text-[10px] mt-0.5">{n.time}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="px-4 py-2.5 border-t border-[#27272a]">
                      <button className="text-[#FF6B2B] text-xs font-medium hover:underline w-full text-center">
                        Tout marquer comme lu
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Messagerie */}
            <button
              onClick={() => { setMsgDrawerOpen(true); setNotifOpen(false) }}
              className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-[#27272a]/50 transition-colors relative"
            >
              <MessageCircle size={17} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#FF6B2B]" />
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
          {MOBILE_NAV.map(({ to, icon: Icon, label, action }) => (
            <li key={to || action}>
              {action === 'openMessages' ? (
                <button
                  onClick={() => setMsgDrawerOpen(true)}
                  className="flex flex-col items-center gap-0.5 px-2 py-1.5 transition-colors text-white/30 hover:text-[#FF6B2B] relative"
                >
                  <Icon size={18} />
                  <span className="text-[9px] font-medium">{label}</span>
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#FF6B2B]" />
                </button>
              ) : (
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
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* ══════════════════════════════════════ */}
      {/* MESSAGING DRAWER                      */}
      {/* ══════════════════════════════════════ */}
      <MessagingDrawer
        open={msgDrawerOpen}
        onClose={() => setMsgDrawerOpen(false)}
      />
    </div>
  )
}
