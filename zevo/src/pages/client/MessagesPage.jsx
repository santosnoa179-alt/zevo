import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import { Send, Mic, ChevronDown, Check, CheckCheck, ArrowLeft, Phone, MessageCircle } from 'lucide-react'
import { AudioBubble, VoiceRecorder } from '../../components/chat/VoiceMessage'
import { ImageBubble, FileBubble, FilePickerButton } from '../../components/chat/FileMessage'
import { useNavigate } from 'react-router-dom'

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
  // Image message
  if (message.image_url) {
    return (
      <ImageBubble
        imageUrl={message.image_url}
        contenu={message.contenu}
        estMoi={estMoi}
        createdAt={message.created_at}
      />
    )
  }

  // File message (PDF, video, etc.)
  if (message.file_url) {
    return (
      <FileBubble
        fileUrl={message.file_url}
        fileName={message.file_name}
        fileType={message.file_type}
        estMoi={estMoi}
        createdAt={message.created_at}
      />
    )
  }

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
      {/* Avatar coach */}
      {!estMoi && (
        <div className={`flex-shrink-0 ${showTail ? 'opacity-100' : 'opacity-0'}`}>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-white/5"
            style={{ backgroundColor: coachColor || '#FF6B2B' }}
          >
            {coachInitials || 'C'}
          </div>
        </div>
      )}

      <div className="max-w-[78%] relative group">
        <div
          className={`px-3.5 py-2.5 text-[15px] leading-relaxed ${
            estMoi
              ? `text-white ${showTail ? 'rounded-[20px] rounded-br-[6px]' : 'rounded-[20px]'}`
              : `bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-subtle)] ${showTail ? 'rounded-[20px] rounded-bl-[6px]' : 'rounded-[20px]'}`
          }`}
          style={estMoi ? {
            background: 'linear-gradient(135deg, #FF6B2B 0%, #FF8F5E 100%)',
            boxShadow: '0 2px 12px rgba(255,107,43,0.2)',
          } : undefined}
        >
          <p className="whitespace-pre-wrap break-words">{message.contenu}</p>
        </div>
        {/* Timestamp + read status */}
        {showTail && (
          <div className={`flex items-center gap-1 mt-1 px-1 ${estMoi ? 'justify-end' : 'justify-start'}`}>
            <span className="text-[var(--text-muted)] text-[10px] tabular-nums">{formatHeure(message.created_at)}</span>
            {estMoi && (
              message.lu
                ? <CheckCheck size={12} className="text-[#FF6B2B]/70" />
                : <Check size={12} className="text-[var(--text-muted)]" />
            )}
          </div>
        )}
      </div>

      {/* Spacer */}
      {estMoi && <div className="w-7 flex-shrink-0" />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPING INDICATOR
// ═══════════════════════════════════════════════════════════════════════════

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]"
          style={{
            animation: 'typing-dot 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function MessagesClientPage() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [coachId, setCoachId] = useState(null)
  const [coachInfo, setCoachInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [texte, setTexte] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
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

    const [msgsRes, coachRes] = await Promise.all([
      supabase
        .from('messages')
        .select('*')
        .eq('coach_id', resolvedCoachId)
        .eq('client_id', user.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('coaches')
        .select('prenom, nom, nom_app, telephone')
        .eq('id', resolvedCoachId)
        .maybeSingle(),
    ])

    setMessages(msgsRes.data ?? [])
    if (coachRes.data) setCoachInfo(coachRes.data)

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
      toast.error('Impossible d\'envoyer : aucun coach associe.')
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
        titre: 'Nouveau message',
        message: messageToSend.length > 80 ? messageToSend.slice(0, 80) + '...' : messageToSend,
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
      toast.error('Impossible d\'envoyer : aucun coach associe.')
      setIsRecording(false)
      return
    }
    const msg = {
      coach_id: coachId,
      client_id: user.id,
      sender_id: user.id,
      receiver_id: coachId,
      expediteur: 'client',
      contenu: 'Note vocale',
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
        titre: 'Nouveau message',
        message: 'Note vocale recue',
        type: 'message',
        destinataire: 'coach',
      }).then(() => {})
    }
    setIsRecording(false)
  }

  // ── Send file/image message ──
  const envoyerFichier = async (file) => {
    if (!coachId || uploading) return

    // Vérifier taille (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (10 MB max)')
      return
    }

    setUploading(true)

    const isImage = file.type.startsWith('image/')
    const ext = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

    // Upload vers Supabase Storage
    const { error: uploadErr } = await supabase.storage
      .from('messages-fichiers')
      .upload(fileName, file, { contentType: file.type, upsert: false })

    if (uploadErr) {
      toast.error('Erreur lors de l\'upload du fichier')
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('messages-fichiers')
      .getPublicUrl(fileName)

    const publicUrl = urlData?.publicUrl
    if (!publicUrl) {
      toast.error('Erreur lors de la récupération du lien')
      setUploading(false)
      return
    }

    const msg = {
      coach_id: coachId,
      client_id: user.id,
      sender_id: user.id,
      receiver_id: coachId,
      expediteur: 'client',
      contenu: isImage ? 'Photo' : file.name,
      ...(isImage ? { image_url: publicUrl } : { file_url: publicUrl, file_name: file.name }),
      file_type: file.type,
    }

    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, { ...msg, id: tempId, created_at: new Date().toISOString(), lu: false }])

    const { data, error } = await supabase.from('messages').insert(msg).select().single()

    if (error) {
      toast.error('Erreur lors de l\'envoi')
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } else if (data) {
      setMessages(prev => prev.map(m => m.id === tempId ? data : m))
      supabase.from('notifications').insert({
        coach_id: coachId,
        client_id: user.id,
        titre: 'Nouveau message',
        message: isImage ? '📷 Photo reçue' : `📎 ${file.name}`,
        type: 'message',
        destinataire: 'coach',
      }).then(() => {})
    }

    setUploading(false)
  }

  // ── Coach display info ──
  const coachName = coachInfo
    ? [coachInfo.prenom, coachInfo.nom].filter(Boolean).join(' ') || coachInfo.nom_app || 'Mon coach'
    : 'Mon coach'
  const coachInitials = coachName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  // ── Group messages by date + determine tail ──
  const groupedMessages = useMemo(() => {
    if (!messages.length) return []
    const result = []
    let lastDate = null

    messages.forEach((msg, i) => {
      const msgDate = msg.created_at?.slice(0, 10)
      if (msgDate && msgDate !== lastDate) {
        result.push({ type: 'date', date: msg.created_at, key: `date-${msgDate}` })
        lastDate = msgDate
      }
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
      <div className="fixed inset-0 md:left-56 flex flex-col items-center justify-center bg-[var(--bg-base)] z-50">
        <div className="relative">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--border-base)]" />
          <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-transparent border-t-[#FF6B2B] animate-spin" />
        </div>
      </div>
    )
  }

  if (!coachId) {
    return (
      <div className="fixed inset-0 md:left-56 flex flex-col items-center justify-center p-6 text-center bg-[var(--bg-base)] z-50">
        <div className="w-20 h-20 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-base)] flex items-center justify-center mb-5">
          <MessageCircle size={32} className="text-[var(--text-muted)]" />
        </div>
        <p className="text-[var(--text-primary)] font-semibold text-lg mb-1">Aucun coach associe</p>
        <p className="text-[var(--text-muted)] text-sm max-w-[260px]">Contactez l'administration pour etre rattache a un coach</p>
        <button
          onClick={() => navigate('/app/dashboard')}
          className="mt-6 px-5 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-base)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-surface)] transition-colors"
        >
          Retour au dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 md:left-56 flex flex-col bg-[var(--bg-base)] z-50">

      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="shrink-0 relative z-10">
        {/* Ambient glow behind header */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FF6B2B]/[0.03] to-transparent pointer-events-none" />
        <div
          className="relative px-4 py-3 border-b border-[var(--border-base)] bg-[var(--bg-base)]/95 backdrop-blur-xl"
          style={{ paddingTop: 'max(12px, env(safe-area-inset-top, 0px))' }}
        >
          <div className="flex items-center gap-3">
            {/* Back button — mobile only */}
            <button
              onClick={() => navigate('/app/dashboard')}
              className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-colors active:scale-90 flex-shrink-0 -ml-1"
            >
              <ArrowLeft size={20} />
            </button>

            {/* Coach avatar */}
            <div className="relative">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{
                  background: 'linear-gradient(135deg, #FF6B2B 0%, #FF8F5E 100%)',
                  boxShadow: '0 2px 12px rgba(255,107,43,0.25)',
                }}
              >
                {coachInitials}
              </div>
              {/* Online dot */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[var(--bg-base)]" />
            </div>

            {/* Coach name */}
            <div className="flex-1 min-w-0">
              <h1 className="text-[var(--text-primary)] font-semibold text-[15px] truncate leading-tight">{coachName}</h1>
              <p className="text-emerald-400/70 text-[11px] font-medium mt-0.5">En ligne</p>
            </div>

            {/* Call button */}
            {coachInfo?.telephone ? (
              <a
                href={`tel:${coachInfo.telephone}`}
                title={`Appeler ${coachInfo.telephone}`}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all active:scale-90 flex-shrink-0"
              >
                <Phone size={17} />
              </a>
            ) : (
              <button
                title="Aucun numero renseigne"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] opacity-30 cursor-not-allowed flex-shrink-0"
                disabled
              >
                <Phone size={17} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ═══════════════ MESSAGES AREA ═══════════════ */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain relative"
      >
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 0.5px, transparent 0.5px)',
          backgroundSize: '24px 24px',
        }} />

        <div className="relative px-4 py-4">
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <div className="relative inline-flex items-center justify-center mb-5">
                <div className="absolute w-24 h-24 rounded-full bg-[#FF6B2B]/5 animate-breathe" />
                <div className="relative w-16 h-16 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-base)] flex items-center justify-center">
                  <Send size={24} className="text-[#FF6B2B]" />
                </div>
              </div>
              <p className="text-[var(--text-primary)] font-semibold text-base mb-1">Demarre la conversation</p>
              <p className="text-[var(--text-muted)] text-sm">Envoie un message a {coachName}</p>
            </div>
          ) : (
            <>
              {groupedMessages.map((item) => {
                if (item.type === 'date') {
                  return (
                    <div key={item.key} className="flex justify-center my-5">
                      <span className="px-3.5 py-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] text-[10px] font-medium uppercase tracking-widest">
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
        </div>

        {/* Scroll-to-bottom FAB */}
        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            className="sticky bottom-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-[var(--bg-card)]/95 backdrop-blur-lg border border-[var(--border-base)] flex items-center justify-center shadow-xl z-10 hover:bg-[var(--bg-surface)] active:scale-90 transition-all"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
          >
            <ChevronDown size={18} className="text-[var(--text-secondary)]" />
          </button>
        )}
      </div>

      {/* ═══════════════ INPUT ZONE ═══════════════ */}
      <div className="shrink-0 relative z-20">
        {/* Top fade for seamless blend */}
        <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-[var(--bg-base)] to-transparent pointer-events-none" />

        <form
          onSubmit={envoyerMessage}
          className="relative bg-[var(--bg-base)] border-t border-[var(--border-subtle)] px-3 py-2.5"
          style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
        >
          {isRecording ? (
            <VoiceRecorder onSend={envoyerVocal} disabled={envoi} />
          ) : (
            <div className="flex items-end gap-2">
              {/* Bouton fichier/photo */}
              <FilePickerButton onFileSelected={envoyerFichier} uploading={uploading} />

              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  value={texte}
                  onChange={(e) => setTexte(e.target.value)}
                  placeholder="Ecrire un message..."
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-base)] rounded-2xl px-4 py-2.5 pr-10 text-[16px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/40 focus:ring-1 focus:ring-[#FF6B2B]/20 transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) envoyerMessage(e)
                  }}
                />
              </div>

              {!texte.trim() ? (
                <button
                  type="button"
                  onClick={() => setIsRecording(true)}
                  className="w-11 h-11 rounded-full bg-[var(--bg-card)] border border-[var(--border-base)] flex items-center justify-center flex-shrink-0 text-[var(--text-muted)] hover:text-[#FF6B2B] hover:border-[#FF6B2B]/30 transition-all active:scale-90"
                >
                  <Mic size={19} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!texte.trim() || envoi}
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(135deg, #FF6B2B 0%, #FF8F5E 100%)',
                    boxShadow: '0 4px 16px rgba(255,107,43,0.35)',
                  }}
                >
                  <Send size={17} className="text-white translate-x-[1px]" />
                </button>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Typing dots animation keyframes */}
      <style>{`
        @keyframes typing-dot {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
    </div>
  )
}
