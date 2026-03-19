import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Send } from 'lucide-react'

// Bulle de message individuelle
function Bulle({ message, estMoi }) {
  return (
    <div className={`flex ${estMoi ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm ${
          estMoi
            ? 'bg-[#FF6B2B] text-white rounded-br-sm'
            : 'bg-[#2A2A2A] text-[#F5F5F3] rounded-bl-sm'
        }`}
      >
        <p>{message.contenu}</p>
        <p className={`text-[10px] mt-1 ${estMoi ? 'text-white/60' : 'text-white/30'}`}>
          {new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

export default function MessagesClientPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [coachId, setCoachId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [texte, setTexte] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Charge le coach_id du client + l'historique de messages
  const chargerMessages = useCallback(async () => {
    if (!user) return

    // Récupère le coach_id du client connecté
    const { data: clientData } = await supabase
      .from('clients')
      .select('coach_id')
      .eq('id', user.id)
      .single()

    if (!clientData?.coach_id) { setLoading(false); return }
    setCoachId(clientData.coach_id)

    // Charge les messages de la conversation
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('coach_id', clientData.coach_id)
      .eq('client_id', user.id)
      .order('created_at', { ascending: true })

    setMessages(msgs ?? [])

    // Marque les messages non lus du coach comme lus
    await supabase
      .from('messages')
      .update({ lu: true })
      .eq('coach_id', clientData.coach_id)
      .eq('client_id', user.id)
      .eq('expediteur', 'coach')
      .eq('lu', false)

    setLoading(false)
  }, [user])

  // Abonnement Supabase Realtime — nouveaux messages en direct
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
          setMessages(prev => {
            // Évite les doublons (optimistic update)
            if (prev.find(m => m.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user, coachId])

  useEffect(() => { chargerMessages() }, [chargerMessages])

  // Scroll automatique vers le bas à chaque nouveau message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const envoyerMessage = async (e) => {
    e.preventDefault()
    if (!texte.trim() || !coachId || envoi) return
    setEnvoi(true)

    const msg = {
      coach_id: coachId,
      client_id: user.id,
      expediteur: 'client',
      contenu: texte.trim(),
    }

    // Optimistic update — affiche le message immédiatement
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, { ...msg, id: tempId, created_at: new Date().toISOString(), lu: false }])
    setTexte('')

    const { data, error } = await supabase.from('messages').insert(msg).select().single()

    // Remplace le message temporaire par le vrai
    if (!error && data) {
      setMessages(prev => prev.map(m => m.id === tempId ? data : m))
    } else {
      // Annule l'optimistic update en cas d'erreur
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setTexte(msg.contenu)
    }

    setEnvoi(false)
    inputRef.current?.focus()
  }

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen items-center justify-center">
        <div className="w-7 h-7 border-2 border-[#FF6B2B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!coachId) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen items-center justify-center p-4 text-center">
        <p className="text-4xl mb-3">💬</p>
        <p className="text-white/40 text-sm">Aucun coach associé à votre compte.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen">

      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-white/[0.06] bg-[#0D0D0D] flex-shrink-0">
        <h1 className="text-[#F5F5F3] font-semibold text-sm">Mon coach</h1>
        <p className="text-white/30 text-xs mt-0.5">Conversation privée</p>
      </div>

      {/* ── Zone des messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
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

      {/* ── Zone de saisie ── */}
      <form
        onSubmit={envoyerMessage}
        className="flex items-center gap-2 px-4 py-3 border-t border-white/[0.06] bg-[#0D0D0D] flex-shrink-0"
      >
        <input
          ref={inputRef}
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder="Écris un message…"
          className="flex-1 bg-[#2A2A2A] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F3] placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#FF6B2B]/40"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) envoyerMessage(e)
          }}
        />
        <button
          type="submit"
          disabled={!texte.trim() || envoi}
          className="w-10 h-10 rounded-xl bg-[#FF6B2B] flex items-center justify-center flex-shrink-0 hover:bg-[#FF9A6C] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={16} className="text-white" />
        </button>
      </form>

    </div>
  )
}
