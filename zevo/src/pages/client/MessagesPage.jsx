import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import { Send, Mic } from 'lucide-react'
import { AudioBubble, VoiceRecorder } from '../../components/chat/VoiceMessage'

// Bulle de message individuelle — style iMessage
function Bulle({ message, estMoi }) {
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
    <div className={`flex ${estMoi ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[78%] px-4 py-2.5 text-sm ${
          estMoi
            ? 'bg-[#FF6B2B] text-white rounded-2xl rounded-br-md'
            : 'bg-[#2A2A2A] text-[#F5F5F3] rounded-2xl rounded-bl-md'
        }`}
      >
        <p className="leading-relaxed">{message.contenu}</p>
        <p className={`text-[10px] mt-1 ${estMoi ? 'text-white/50' : 'text-white/25'}`}>
          {new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

export default function MessagesClientPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [messages, setMessages] = useState([])
  const [coachId, setCoachId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [texte, setTexte] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // ── Chargement initial des messages ──
  const chargerMessages = useCallback(async () => {
    if (!user) return

    const { data: clientData, error: clientErr } = await supabase
      .from('clients')
      .select('coach_id')
      .eq('id', user.id)
      .single()

    if (clientErr) {
      console.error('[MessagesClient] Erreur chargement coach_id:', clientErr)
    }

    if (!clientData?.coach_id) { setLoading(false); return }
    setCoachId(clientData.coach_id)

    const { data: msgs, error: msgsErr } = await supabase
      .from('messages')
      .select('*')
      .eq('coach_id', clientData.coach_id)
      .eq('client_id', user.id)
      .order('created_at', { ascending: true })

    if (msgsErr) {
      console.error('[MessagesClient] Erreur chargement messages:', msgsErr)
    }

    setMessages(msgs ?? [])

    // Marquer les messages du coach comme lus
    await supabase
      .from('messages')
      .update({ lu: true })
      .eq('coach_id', clientData.coach_id)
      .eq('client_id', user.id)
      .eq('expediteur', 'coach')
      .eq('lu', false)

    setLoading(false)
  }, [user])

  // ── Realtime — écoute les INSERT sur client_id ──
  useEffect(() => {
    if (!user || !coachId) return

    const channel = supabase
      .channel(`messages-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `client_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[MessagesClient] Nouveau message reçu:', payload.new?.id)
          setMessages(prev => {
            if (prev.find(m => m.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user, coachId])

  useEffect(() => { chargerMessages() }, [chargerMessages])

  // ── Auto-scroll vers le bas à chaque nouveau message ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── PAS de visualViewport listener (cause écran noir sur iOS) ──

  // ── Envoi message texte ──
  const envoyerMessage = async (e) => {
    e.preventDefault()
    const messageToSend = texte.trim()
    if (!messageToSend || !coachId || envoi) return

    // Vider l'input IMMÉDIATEMENT (sensation instantanée)
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
      console.error('[MessagesClient] Erreur envoi message:', error)
      toast.error(error.message || 'Erreur lors de l\'envoi du message')
      // Restaurer le texte seulement en cas d'erreur
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setTexte(messageToSend)
    } else if (data) {
      setMessages(prev => prev.map(m => m.id === tempId ? data : m))
    }

    setEnvoi(false)
    inputRef.current?.focus()
  }

  // ── Envoi message vocal ──
  const envoyerVocal = async (audioUrl, audioDuration) => {
    if (!coachId) return
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
      console.error('[MessagesClient] Erreur envoi vocal:', error)
      toast.error(error.message || 'Erreur lors de l\'envoi du message vocal')
    }
    if (!error && data) {
      setMessages(prev => prev.map(m => m.id === tempId ? data : m))
    }
    setIsRecording(false)
  }

  // ══════════ RENDER ══════════

  if (loading) {
    return (
      <div className="flex flex-col h-[100dvh] w-full items-center justify-center">
        <div className="w-7 h-7 border-2 border-[#FF6B2B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!coachId) {
    return (
      <div className="flex flex-col h-[100dvh] w-full items-center justify-center p-4 text-center">
        <p className="text-4xl mb-3">💬</p>
        <p className="text-white/40 text-sm">Aucun coach associé à votre compte.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full">

      {/* ── Header iMessage ── */}
      <div className="shrink-0 px-4 py-3 border-b border-white/[0.06] bg-[#0D0D0D]/90 backdrop-blur-lg">
        <h1 className="text-[#F5F5F3] font-semibold text-sm">Mon coach</h1>
        <p className="text-white/30 text-xs mt-0.5">Conversation privée</p>
      </div>

      {/* ── Zone des messages — flex-1 overflow-y-auto ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">👋</p>
            <p className="text-white/30 text-sm">Dis bonjour à ton coach !</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <Bulle
                key={msg.id}
                message={msg}
                estMoi={msg.expediteur === 'client'}
              />
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Zone de saisie — shrink-0 + safe-area ── */}
      <form
        onSubmit={envoyerMessage}
        className="shrink-0 flex items-center gap-2 px-4 py-3 bg-[#0D0D0D]/95 backdrop-blur-xl border-t border-white/[0.06] mb-[env(safe-area-inset-bottom)]"
      >
        {isRecording ? (
          <VoiceRecorder onSend={envoyerVocal} disabled={envoi} />
        ) : (
          <>
            {/* text-[16px] empêche le zoom iOS auto sur inputs < 16px */}
            <input
              ref={inputRef}
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              placeholder="Message..."
              className="flex-1 bg-[#1E1E1E] border border-white/[0.08] rounded-2xl px-4 py-2.5 text-[16px] text-[#F5F5F3] placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-[#FF6B2B]/40 transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) envoyerMessage(e)
              }}
            />
            {!texte.trim() ? (
              <button
                type="button"
                onClick={() => setIsRecording(true)}
                className="w-10 h-10 rounded-2xl bg-[#1E1E1E] border border-white/[0.08] flex items-center justify-center flex-shrink-0 text-white/35 hover:text-[#FF6B2B] hover:border-[#FF6B2B]/30 transition-all active:scale-90"
                title="Note vocale"
              >
                <Mic size={16} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!texte.trim() || envoi}
                className="w-10 h-10 rounded-2xl bg-[#FF6B2B] flex items-center justify-center flex-shrink-0 hover:bg-[#FF9A6C] transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#FF6B2B]/20"
              >
                <Send size={16} className="text-white" />
              </button>
            )}
          </>
        )}
      </form>

    </div>
  )
}
