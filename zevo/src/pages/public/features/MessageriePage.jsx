import FeaturePageLayout from '../../../components/FeaturePageLayout'
import {
  MessageCircle, Bell, Paperclip, UsersRound, Search, CheckCheck,
  Send, Image, Smile, Phone, MoreVertical, Circle, Clock,
  ArrowRight, Star, Pin
} from 'lucide-react'

/* ── Mockup: Chat interface ── */
function ChatMockup() {
  const conversations = [
    { name: 'Marie Lefevre', initials: 'ML', lastMsg: 'Super, merci coach !', time: '14:32', unread: 0, active: true, online: true },
    { name: 'Thomas Dupont', initials: 'TD', lastMsg: 'J\'ai une question sur le programme...', time: '13:15', unread: 2, online: true },
    { name: 'Julie Martin', initials: 'JM', lastMsg: 'Photo envoyee', time: '11:40', unread: 0, online: false },
    { name: 'Lucas Bernard', initials: 'LB', lastMsg: 'OK je fais ca demain', time: 'Hier', unread: 0, online: false },
    { name: 'Emma Petit', initials: 'EP', lastMsg: 'Bilan envoye', time: 'Hier', unread: 1, online: true },
  ]

  const messages = [
    { from: 'client', text: 'Salut coach ! J\'ai fait ma seance upper body ce matin', time: '14:20' },
    { from: 'client', text: 'Par contre j\'ai eu mal au coude sur le curl. C\'est normal ?', time: '14:21' },
    { from: 'coach', text: 'Bravo pour la seance Marie ! Pour le coude, reduis un peu la charge et controle bien la descente. Si ca persiste on adapte le programme.', time: '14:28' },
    { from: 'client', text: 'Super, merci coach !', time: '14:32', read: true },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="rounded-2xl border border-white/[0.06] bg-[#141414] overflow-hidden shadow-2xl shadow-black/40 h-[420px] flex">

        {/* Conversation list */}
        <div className="w-72 border-r border-white/[0.04] flex flex-col hidden md:flex">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-white/[0.06] bg-[#111111] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF6B2B]/20 to-[#FF8F5E]/10 border border-[#FF6B2B]/15 flex items-center justify-center">
                <MessageCircle size={12} className="text-[#FF6B2B]" />
              </div>
              <p className="text-xs font-semibold text-[#F5F5F3]/80">Messages</p>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <Search size={10} className="text-[#F5F5F3]/20" />
              <span className="text-[9px] text-[#F5F5F3]/15">Rechercher</span>
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-hidden">
            <div className="p-2 space-y-0.5">
              {conversations.map((c, i) => (
                <div key={i} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${c.active ? 'bg-[#FF6B2B]/[0.06] border border-[#FF6B2B]/10' : 'border border-transparent hover:bg-white/[0.02]'}`}>
                  <div className="relative flex-shrink-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-bold ${c.active ? 'bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5E] text-white' : 'bg-white/[0.04] text-[#F5F5F3]/30'}`}>
                      {c.initials}
                    </div>
                    {c.online && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[#141414]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-[11px] font-semibold truncate ${c.active ? 'text-[#F5F5F3]/80' : 'text-[#F5F5F3]/50'}`}>{c.name}</p>
                      <span className="text-[8px] text-[#F5F5F3]/15 flex-shrink-0 ml-2">{c.time}</span>
                    </div>
                    <p className="text-[9px] text-[#F5F5F3]/20 truncate mt-0.5">{c.lastMsg}</p>
                  </div>
                  {c.unread > 0 && (
                    <div className="w-4 h-4 rounded-full bg-[#FF6B2B] flex items-center justify-center flex-shrink-0">
                      <span className="text-[8px] font-bold text-white">{c.unread}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {/* Chat header */}
          <div className="px-5 py-3 border-b border-white/[0.06] bg-[#111111] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5E] flex items-center justify-center text-[10px] font-bold text-white">ML</div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[#111111]" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#F5F5F3]/80">Marie Lefevre</p>
                <p className="text-[8px] text-green-400">En ligne</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={13} className="text-[#F5F5F3]/15 hover:text-[#FF6B2B] cursor-pointer transition-colors" />
              <Pin size={13} className="text-[#F5F5F3]/15 hover:text-[#FF6B2B] cursor-pointer transition-colors" />
              <MoreVertical size={13} className="text-[#F5F5F3]/15 hover:text-[#FF6B2B] cursor-pointer transition-colors" />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 space-y-3 overflow-hidden">
            {/* Date separator */}
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-white/[0.04]" />
              <span className="text-[8px] text-[#F5F5F3]/15 font-medium">Aujourd'hui</span>
              <div className="flex-1 h-px bg-white/[0.04]" />
            </div>

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'coach' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl ${msg.from === 'coach'
                  ? 'bg-gradient-to-r from-[#FF6B2B]/15 to-[#FF8F5E]/10 border border-[#FF6B2B]/10 rounded-br-md'
                  : 'bg-white/[0.04] border border-white/[0.06] rounded-bl-md'
                }`}>
                  <p className="text-[11px] text-[#F5F5F3]/60 leading-relaxed">{msg.text}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[8px] text-[#F5F5F3]/15">{msg.time}</span>
                    {msg.from === 'coach' && <CheckCheck size={10} className="text-[#FF6B2B]/40" />}
                    {msg.read && msg.from === 'client' && <CheckCheck size={10} className="text-blue-400/40" />}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            <div className="flex justify-start">
              <div className="px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.05] rounded-bl-md">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#F5F5F3]/20 animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#F5F5F3]/20 animate-pulse [animation-delay:0.15s]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#F5F5F3]/20 animate-pulse [animation-delay:0.3s]" />
                </div>
              </div>
            </div>
          </div>

          {/* Input area */}
          <div className="px-4 py-3 border-t border-white/[0.06] bg-[#0F0F0F]">
            <div className="flex items-center gap-2">
              <Paperclip size={15} className="text-[#F5F5F3]/15 hover:text-[#FF6B2B] cursor-pointer transition-colors flex-shrink-0" />
              <Image size={15} className="text-[#F5F5F3]/15 hover:text-[#FF6B2B] cursor-pointer transition-colors flex-shrink-0" />
              <div className="flex-1 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <span className="text-[11px] text-[#F5F5F3]/15 flex-1">Ecrire un message...</span>
                <Smile size={13} className="text-[#F5F5F3]/15" />
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5E] flex items-center justify-center cursor-pointer hover:shadow-lg hover:shadow-[#FF6B2B]/20 transition-all flex-shrink-0">
                <Send size={13} className="text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MessageriePage() {
  return (
    <FeaturePageLayout
      badge="Messagerie"
      badgeIcon={MessageCircle}
      title="La communication,"
      titleAccent="fluide"
      subtitle="Chat en temps reel avec tes clients. Plus besoin de jongler entre WhatsApp, email et SMS."
      stats={[
        { value: 'Temps reel', label: 'MESSAGES INSTANTANES' },
        { value: '100%', label: 'HISTORIQUE CONSERVE' },
        { value: '0', label: 'MESSAGES PERDUS' },
      ]}
      mockup={<ChatMockup />}
      features={[
        { icon: MessageCircle, title: 'Chat temps reel', desc: 'Messages instantanes avec tes clients. Fluidite et reactivite pour un suivi optimal.' },
        { icon: Bell, title: 'Notifications push', desc: 'Recois une alerte des qu\'un client t\'envoie un message. Ne rate plus rien.' },
        { icon: Paperclip, title: 'Partage de fichiers', desc: 'Envoie photos, videos, PDF et documents directement dans la conversation.' },
        { icon: UsersRound, title: 'Conversations groupees', desc: 'Cree des groupes pour les challenges, cours collectifs ou communautes.' },
        { icon: Search, title: 'Historique searchable', desc: 'Retrouve n\'importe quel message, fichier ou information en quelques secondes.' },
        { icon: CheckCheck, title: 'Accuses de lecture', desc: 'Sache quand ton client a vu ton message. Plus de doute sur la reception.' },
      ]}
      stepsTitle="Communique simplement"
      steps={[
        { title: 'Ton client t\'ecrit', desc: 'Depuis son espace, ton client t\'envoie un message, une photo ou un document. Tout est centralise.' },
        { title: 'Tu recois une notification', desc: 'Alerte push instantanee. Tu sais immediatement quand un client a besoin de toi.' },
        { title: 'Reponds depuis l\'app', desc: 'Reponds directement depuis Zevo. Plus besoin de switcher entre 5 applications de messagerie.' },
      ]}
      ctaTitle="Pret a simplifier"
      ctaAccent="ta communication"
    />
  )
}
