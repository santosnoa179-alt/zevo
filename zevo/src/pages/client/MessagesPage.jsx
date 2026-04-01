import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import { Send, Mic, ChevronDown, Check, CheckCheck, ArrowLeft } from 'lucide-react'
import { AudioBubble, VoiceRecorder } from '../../components/chat/VoiceMessage'

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function formatHeure(dateStr) {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDateSeparator(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - d) / 86400000)
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Hier'
  if (diff < 7) return d.toLocaleDateString('fr-FR', { weekday: 'long' })
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

function isSameDay(a, b) {
  if (!a || !b) return false
  return a.slice(0, 10) === b.slice(0, 10)
}

// ═══════════════════════════════════════════════════════════════════════════
// BULLE DE MESSAGE
// ═══════════════════════════════════════════════════════════════════════════

function Bulle({ message, estMoi, showTail, coachInitials, coachColor }) {
  if (message.audio_url) {
    return (
      <AudioBubble
        audioUrl={message.audio_url}
        audioDuration={message.audio_duration}
        estMoi={estMoi}
        createdAt={message.created_at}
      />
    )
  }

  return (
    <div className={`flex items-end gap-2 ${estMoi ? 'justify-end' : 'justify-start'} ${showTail ? 'mb-3' : 'mb-0.5'}`}>
      {/* Avatar coach — affiché seulement sur le dernier message d'un groupe */}
      {!estMoi && (
        <div className={`flex-shrink-0 ${showTail ? 'opacity-100' : 'opacity-0'}`}>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ backgroundColor: coachColor || '#FF6B2B' }}
          >
            {coachInitials || 'C'}
          </div>
        </div>
      )}

      <div className={`max-w-[75%] relative group`}>
        <div
          className={`px-3.5 py-2.5 text-[15px] leading-relaxed ${
            estMoi
              ? `bg-[#FF6B2B] text-white ${showTail ? 'rounded-2xl rounded-br-md' : 'rounded-2xl'}`
              : `bg-[#2A2A2A] text-[#F5F5F3] ${showTail ? 'rounded-2xl rounded-bl-md' : 'rounded-2xl'}`
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{message.contenu}</p>
        </div>
        {/* Heure + statut — visible sous le dernier message du groupe */}
        {showTail && (
          <div className={`flex items-center gap-1 mt-1 ${estMoi ? 'justify-end pr-1' : 'justify-start pl-1'}`}>
            <span className="text-white/20 text-[10px]">{formatHeure(message.created_at)}</span>
            {estMoi && (
              message.lu
                ? <CheckCheck size={12} className="text-[#FF6B2B]/60" />
                : <Check size={12} className="text-white/20" />
            )}
          </div>
        )}
      </div>

      {/* Spacer pour aligner quand c'est moi */}
      {estMoi && <div className="w-7 flex-shrink-0" />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function MessagesClientPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [messages, setMessages] = useState([])
  const [coachId, setCoachId] = useState(null)
  const [coachInfo, setCoachInfo] = useState(null) // { prenom, nom, avatar_url }
  const [loading, setLoading] = useState(true)
  const [texte, setTexte] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const bottomRef = useRef(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  // ── Mark message notifications as read ──
  useEffect(() => {
    if (!user) return
    supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('client_id', user.id)
      .eq('destinataire', 'client')
      .eq('type', 'message')
      .eq('is_read', false)
      .then(() => {})
  }, [user])

  // ── Fetch coach ID + coach info ──
  const fetchCoachId = useCallback(async () => {
    if (!user) return null
    const { data } = await supabase
      .from('clients')
      .select('coach_id')
      .eq('id', user.id)
      .single()
    return data?.coach_id ?? null
  }, [user])

  // ── Load messages + coach profile ──
  const chargerMessages = useCallback(async () => {
    if (!user) return
    const resolvedCoachId = await fetchCoachId()
    if (!resolvedCoachId) {
      setCoachId(null)
      setLoading(false)
      return
    }
    setCoachId(resolvedCoachId)

    // Fetch en parallèle : messages + profil coach
    const [msgsRes, coachRes] = await Promise.all([
      supabase
        .from('messages')
        .select('*')
        .eq('coach_id', resolvedCoachId)
        .eq('client_id', user.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('coaches')
        .select('prenom, nom, nom_app')
        .eq('id', resolvedCoachId)
        .maybeSingle(),
    ])

    setMessages(msgsRes.data ?? [])
    if (coachRes.data) setCoachInfo(coachRes.data)

    // Marquer les messages du coach comme lus
    await supabase
      .from('messages')
      .update({ lu: true })
      .eq('coach_id', resolvedCoachId)
      .eq('client_id', user.id)
      .eq('expediteur', 'coach')
      .eq('lu', false)

    setLoading(false)
  }, [user, fetchCoachId])

  // ── Realtime subscription ──
  useEffect(() => {
    if (!user || !coachId) return
    const channel = supabase
      .channel(`client-msgs-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `client_id=eq.${user.id}`,
      }, (payload) => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev
          return [...prev, payload.new]
        })
        // Auto-mark coach messages as read since page is open
        if (payload.new.expediteur === 'coach') {
          supabase.from('messages').update({ lu: true }).eq('id', payload.new.id).then(() => {})
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `client_id=eq.${user.id}`,
      }, (payload) => {
        // Update lu status when coach reads our messages
        setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user, coachId])

  useEffect(() => { chargerMessages() }, [chargerMessages])

  // ── Auto-scroll on new messages ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Scroll-to-bottom button visibility ──
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      setShowScrollBtn(distFromBottom > 200)
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // ── Send text message ──
  const envoyerMessage = async (e) => {
    e.preventDefault()
    const messageToSend = texte.trim()
    if (!messageToSend || envoi) return

    if (!coachId) {
      toast.error('Impossible d\'envoyer : aucun coach associé.')
      const refreshed = await fetchCoachId()
      if (refreshed) setCoachId(refreshed)
      return
    }

    setTexte('')
    setEnvoi(true)

    const msg = {
      coach_id: coachId,
      client_id: user.id,
      sender_id: user.id,
      receiver_id: coachId,
      expediteur: 'client',
      contenu: messageToSend,
    }

    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, { ...msg, id: tempId, created_at: new Date().toISOString(), lu: false }])

    const { data, error } = await supabase.from('messages').insert(msg).select().single()

    if (error) {
      toast.error('Erreur lors de l\'envoi du message')
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setTexte(messageToSend)
    } else if (data) {
      setMessages(prev => prev.map(m => m.id === tempId ? data : m))
      supabase.from('notifications').insert({
        coach_id: coachId,
        client_id: user.id,
        titre: 'Nouveau message 💬',
        message: messageToSend.length > 80 ? messageToSend.slice(0, 80) + '…' : messageToSend,
        type: 'message',
        destinataire: 'coach',
      }).then(() => {})
    }

    setEnvoi(false)
    inputRef.current?.focus()
  }

  // ── Send voice message ──
  const envoyerVocal = async (audioUrl, audioDuration) => {
    if (!coachId) {
      toast.error('Impossible d\'envoyer : aucun coach associé.')
      setIsRecording(false)
      return
    }
    const msg = {
      coach_id: coachId,
      client_id: user.id,
      sender_id: user.id,
      receiver_id: coachId,
      expediteur: 'client',
      contenu: '🎤 Note vocale',
      audio_url: audioUrl,
      audio_duration: Math.round(audioDuration),
    }
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, { ...msg, id: tempId, created_at: new Date().toISOString(), lu: false }])

    const { data, error } = await supabase.from('messages').insert(msg).select().single()
    if (error) {
      toast.error('Erreur lors de l\'envoi vocal')
    } else if (data) {
      setMessages(prev => prev.map(m => m.id === tempId ? data : m))
      supabase.from('notifications').insert({
        coach_id: coachId,
        client_id: user.id,
        titre: 'Nouveau message 💬',
        message: '🎤 Note vocale reçue',
        type: 'message',
        destinataire: 'coach',
      }).then(() => {})
    }
    setIsRecording(false)
  }

  // ── Coach display info ──
  const coachName = coachInfo
    ? [coachInfo.prenom, coachInfo.nom].filter(Boolean).join(' ') || coachInfo.nom_app || 'Mon coach'
    : 'Mon coach'
  const coachInitials = coachName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  // ── Group messages by date + determine tail (last message in consecutive group) ──
  const groupedMessages = useMemo(() => {
    if (!messages.length) return []
    const result = []
    let lastDate = null

    messages.forEach((msg, i) => {
      const msgDate = msg.created_at?.slice(0, 10)
      // Insert date separator
      if (msgDate && msgDate !== lastDate) {
        result.push({ type: 'date', date: msg.created_at, key: `date-${msgDate}` })
        lastDate = msgDate
      }
      // Determine if this is the last in a consecutive same-sender group
      const next = messages[i + 1]
      const showTail = !next
        || next.expediteur !== msg.expediteur
        || !isSameDay(msg.created_at, next.created_at)
      result.push({ type: 'message', msg, showTail, key: msg.id })
    })
    return result
  }, [messages])

  // ══════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════

  if (loading) {
    return (
      <div className="flex flex-col h-[100dvh] w-full items-center justify-center bg-[#0D0D0D]">
        <div className="w-7 h-7 border-2 border-[#FF6B2B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!coachId) {
    return (
      <div className="flex flex-col h-[100dvh] w-full items-center justify-center p-4 text-center bg-[#0D0D0D]">
        <div className="w-16 h-16 rounded-full bg-white/[0.04] flex items-center justify-center mb-4">
          <Send size={24} className="text-white/15" />
        </div>
        <p className="text-white/40 text-sm font-medium">Aucun coach associé à votre compte</p>
        <p className="text-white/20 text-xs mt-1">Contactez l'administration pour être rattaché</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#0D0D0D]">

      {/* ═══════════════ HEADER ═══════════════ */}
      <div className="shrink-0 px-4 py-3 border-b border-white/[0.06] bg-[#0D0D0D]/95 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          {/* Avatar coach */}
          <div className="relative">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg"
              style={{ backgroundColor: '#FF6B2B', boxShadow: '0 0 16px rgba(255,107,43,0.2)' }}
            >
              {coachInitials}
            </div>
            {/* Online indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0D0D0D]" />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-[#F5F5F3] font-semibold text-[15px] truncate">{coachName}</h1>
            <p className="text-emerald-400/70 text-[11px] font-medium">En ligne</p>
          </div>
        </div>
      </div>

      {/* ═══════════════ MESSAGES AREA ═══════════════ */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 relative">
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-[#FF6B2B]/10 flex items-center justify-center mx-auto mb-4">
              <Send size={24} className="text-[#FF6B2B]" />
            </div>
            <p className="text-[#F5F5F3] font-semibold text-base mb-1">Démarre la conversation</p>
            <p className="text-white/30 text-sm">Envoie un message à {coachName}</p>
          </div>
        ) : (
          <>
            {groupedMessages.map((item) => {
              if (item.type === 'date') {
                return (
                  <div key={item.key} className="flex justify-center my-4">
                    <span className="px-3 py-1 rounded-full bg-white/[0.04] text-white/25 text-[10px] font-medium uppercase tracking-wider">
                      {formatDateSeparator(item.date)}
                    </span>
                  </div>
                )
              }
              return (
                <Bulle
                  key={item.key}
                  message={item.msg}
                  estMoi={item.msg.expediteur === 'client'}
                  showTail={item.showTail}
                  coachInitials={coachInitials}
                  coachColor="#FF6B2B"
                />
              )
            })}
          </>
        )}
        <div ref={bottomRef} />

        {/* Scroll-to-bottom FAB */}
        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            className="sticky bottom-3 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-[#1E1E1E] border border-white/[0.1] flex items-center justify-center shadow-xl z-10 hover:bg-[#2A2A2A] active:scale-90 transition-all"
          >
            <ChevronDown size={18} className="text-white/50" />
          </button>
        )}
      </div>

      {/* ═══════════════ INPUT ZONE ═══════════════ */}
      <form
        onSubmit={envoyerMessage}
        className="shrink-0 flex items-end gap-2 px-3 py-2.5 bg-[#0D0D0D] border-t border-white/[0.06]"
        style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
      >
        {isRecording ? (
          <VoiceRecorder onSend={envoyerVocal} disabled={envoi} />
        ) : (
          <>
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                placeholder="Écrire un message..."
                className="w-full bg-[#1E1E1E] border border-white/[0.08] rounded-2xl px-4 py-2.5 pr-10 text-[16px] text-[#F5F5F3] placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/30 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) envoyerMessage(e)
                }}
              />
            </div>

            {!texte.trim() ? (
              <button
                type="button"
                onClick={() => setIsRecording(true)}
                className="w-10 h-10 rounded-full bg-[#1E1E1E] border border-white/[0.08] flex items-center justify-center flex-shrink-0 text-white/30 hover:text-[#FF6B2B] hover:border-[#FF6B2B]/30 transition-all active:scale-90"
              >
                <Mic size={18} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!texte.trim() || envoi}
                className="w-10 h-10 rounded-full bg-[#FF6B2B] flex items-center justify-center flex-shrink-0 transition-all active:scale-90 disabled:opacity-40"
                style={{ boxShadow: '0 2px 12px rgba(255,107,43,0.3)' }}
              >
                <Send size={16} className="text-white translate-x-[1px]" />
              </button>
            )}
          </>
        )}
      </form>
    </div>
  )
}
