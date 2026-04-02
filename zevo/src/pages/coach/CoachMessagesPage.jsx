import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import { Send, MessageSquare, Mic, PenSquare, X, Search, Check, CheckCheck, Users, Loader2, ChevronDown } from 'lucide-react'
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
// SIDEBAR AVATAR
// ═══════════════════════════════════════════════════════════════════════════

const COULEURS = ['#FF6B2B', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ec4899']
function Initiales({ nom, couleur, size = 'md' }) {
  const parts = (nom ?? '?').trim().split(' ')
  const initiales = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : (nom ?? '?')[0]
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return (
    <div className={`${sz} rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white`}
      style={{ backgroundColor: couleur ?? '#FF6B2B' }}>
      {initiales.toUpperCase()}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// BULLE DE MESSAGE (portée du client)
// ═══════════════════════════════════════════════════════════════════════════

function Bulle({ message, estMoi, showTail, clientInitials, clientColor }) {
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
      {/* Avatar client — affiché seulement sur le dernier message d'un groupe */}
      {!estMoi && (
        <div className={`flex-shrink-0 ${showTail ? 'opacity-100' : 'opacity-0'}`}>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ backgroundColor: clientColor || '#3b82f6' }}
          >
            {clientInitials || 'C'}
          </div>
        </div>
      )}

      <div className="max-w-[75%] relative group">
        <div
          className={`px-3.5 py-2.5 text-[15px] leading-relaxed ${
            estMoi
              ? `bg-[#FF6B2B] text-white ${showTail ? 'rounded-2xl rounded-br-md' : 'rounded-2xl'}`
              : `bg-[#2A2A2A] text-[#F5F5F3] ${showTail ? 'rounded-2xl rounded-bl-md' : 'rounded-2xl'}`
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{message.contenu}</p>
        </div>
        {/* Heure + statut de lecture — visible sous le dernier message du groupe */}
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

export default function CoachMessagesPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const [clients, setClients] = useState([])
  const [clientSelectionne, setClientSelectionne] = useState(null)
  const clientSelectionneRef = useRef(null)
  const [messages, setMessages] = useState([])
  const [texte, setTexte] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const bottomRef = useRef(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  // ── Modale Nouveau Message ──
  const [showNewMsg, setShowNewMsg] = useState(false)
  const [newMsgSearch, setNewMsgSearch] = useState('')
  const [allClients, setAllClients] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [broadcastText, setBroadcastText] = useState('')
  const [sending, setSending] = useState(false)

  // ── Marquer les notifications "message" comme lues ──
  useEffect(() => {
    if (!user) return
    supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('coach_id', user.id)
      .eq('destinataire', 'coach')
      .eq('type', 'message')
      .eq('is_read', false)
      .then(() => {})
  }, [user])

  // Synchroniser la ref avec le state
  useEffect(() => {
    clientSelectionneRef.current = clientSelectionne
  }, [clientSelectionne])

  // ── Charge la liste des clients avec le dernier message ──
  const chargerClients = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, prenom, profiles(nom, email)')
      .eq('coach_id', user.id)
      .eq('actif', true)
      .order('created_at', { ascending: false })

    if (!clientsData?.length) {
      setLoading(false)
      return
    }

    const clientIds = clientsData.map(c => c.id)

    const { data: derniersMsgs } = await supabase
      .from('messages')
      .select('client_id, contenu, created_at, lu, expediteur, audio_url')
      .eq('coach_id', user.id)
      .in('client_id', clientIds)
      .order('created_at', { ascending: false })

    const msgs = derniersMsgs ?? []

    const enrichis = clientsData.map((c, idx) => {
      const msgsClient = msgs.filter(m => m.client_id === c.id)
      const dernierMsg = msgsClient[0] ?? null
      const nonLus = msgsClient.filter(m => !m.lu && m.expediteur === 'client').length
      return { ...c, dernierMsg, nonLus, couleur: COULEURS[idx % COULEURS.length] }
    })

    enrichis.sort((a, b) => {
      if (!a.dernierMsg && !b.dernierMsg) return 0
      if (!a.dernierMsg) return 1
      if (!b.dernierMsg) return -1
      return b.dernierMsg.created_at.localeCompare(a.dernierMsg.created_at)
    })

    setClients(enrichis)

    const clientParam = searchParams.get('client')
    if (clientParam) {
      const trouve = enrichis.find(c => c.id === clientParam)
      if (trouve) ouvrirConversation(trouve)
    }

    setLoading(false)
  }, [user, searchParams])

  useEffect(() => { chargerClients() }, [chargerClients])

  // ── Ouvre la conversation d'un client ──
  const ouvrirConversation = async (client) => {
    setClientSelectionne(client)

    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('coach_id', user.id)
      .eq('client_id', client.id)
      .order('created_at')

    setMessages(msgs ?? [])

    // Auto-read : Marque les messages du client comme lus
    await supabase.from('messages')
      .update({ lu: true })
      .eq('coach_id', user.id)
      .eq('client_id', client.id)
      .eq('expediteur', 'client')
      .eq('lu', false)

    setClients(prev => prev.map(c => c.id === client.id ? { ...c, nonLus: 0 } : c))

    inputRef.current?.focus()
  }

  // ── Abonnement Realtime — INSERT + UPDATE ──
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`coach-msgs-all-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `coach_id=eq.${user.id}`,
      }, (payload) => {
        const newMsg = payload.new
        const currentClient = clientSelectionneRef.current

        // CAS 1 : Message dans la conversation ouverte
        if (currentClient && newMsg.client_id === currentClient.id) {
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })

          // Auto-read : messages du client lus immédiatement
          if (newMsg.expediteur === 'client') {
            supabase.from('messages').update({ lu: true }).eq('id', newMsg.id).then(() => {})
          }

          setClients(prev => {
            const updated = prev.map(c => {
              if (c.id !== newMsg.client_id) return c
              return {
                ...c,
                dernierMsg: { contenu: newMsg.contenu, created_at: newMsg.created_at, expediteur: newMsg.expediteur, lu: true },
                nonLus: 0,
              }
            })
            updated.sort((a, b) => {
              if (!a.dernierMsg && !b.dernierMsg) return 0
              if (!a.dernierMsg) return 1
              if (!b.dernierMsg) return -1
              return b.dernierMsg.created_at.localeCompare(a.dernierMsg.created_at)
            })
            return updated
          })
        }

        // CAS 2 : Message d'un AUTRE client
        else if (newMsg.expediteur === 'client') {
          setClients(prev => {
            const updated = prev.map(c => {
              if (c.id !== newMsg.client_id) return c
              return {
                ...c,
                dernierMsg: { contenu: newMsg.contenu, created_at: newMsg.created_at, expediteur: newMsg.expediteur, lu: false },
                nonLus: c.nonLus + 1,
              }
            })
            updated.sort((a, b) => {
              if (!a.dernierMsg && !b.dernierMsg) return 0
              if (!a.dernierMsg) return 1
              if (!b.dernierMsg) return -1
              return b.dernierMsg.created_at.localeCompare(a.dernierMsg.created_at)
            })
            return updated
          })
        }
      })
      // Realtime UPDATE — pour les changements de statut "lu"
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `coach_id=eq.${user.id}`,
      }, (payload) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

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

  // ── Envoie un message texte ──
  const envoyerMessage = async (e) => {
    e.preventDefault()
    const messageToSend = texte.trim()
    if (!messageToSend || !clientSelectionne || envoi) return

    setTexte('')
    setEnvoi(true)

    const msg = {
      coach_id: user.id,
      client_id: clientSelectionne.id,
      sender_id: user.id,
      receiver_id: clientSelectionne.id,
      expediteur: 'coach',
      contenu: messageToSend,
    }

    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, { ...msg, id: tempId, created_at: new Date().toISOString(), lu: false }])

    const { data, error } = await supabase.from('messages').insert(msg).select().single()

    if (error) {
      toast.error(error.message || 'Erreur lors de l\'envoi')
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setTexte(messageToSend)
    } else if (data) {
      setMessages(prev => prev.map(m => m.id === tempId ? data : m))
      supabase.from('notifications').insert({
        coach_id: user.id,
        client_id: clientSelectionne.id,
        titre: 'Nouveau message 💬',
        message: messageToSend.length > 80 ? messageToSend.slice(0, 80) + '…' : messageToSend,
        type: 'message',
        destinataire: 'client',
      }).then(() => {})
    }

    setEnvoi(false)
    inputRef.current?.focus()
  }

  // ── Envoie un message vocal ──
  const envoyerVocal = async (audioUrl, audioDuration) => {
    if (!clientSelectionne) return
    const msg = {
      coach_id: user.id,
      client_id: clientSelectionne.id,
      sender_id: user.id,
      receiver_id: clientSelectionne.id,
      expediteur: 'coach',
      contenu: '🎤 Note vocale',
      audio_url: audioUrl,
      audio_duration: Math.round(audioDuration),
    }
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, { ...msg, id: tempId, created_at: new Date().toISOString(), lu: false }])
    const { data, error } = await supabase.from('messages').insert(msg).select().single()
    if (error) {
      toast.error(error.message || 'Erreur envoi vocal')
    }
    if (data) {
      setMessages(prev => prev.map(m => m.id === tempId ? data : m))
      supabase.from('notifications').insert({
        coach_id: user.id,
        client_id: clientSelectionne.id,
        titre: 'Nouveau message 💬',
        message: '🎤 Note vocale reçue',
        type: 'message',
        destinataire: 'client',
      }).then(() => {})
    }
    setIsRecording(false)
  }

  // ══════════════════════════════════════
  // MODALE — Nouveau Message / Broadcast
  // ══════════════════════════════════════

  const ouvrirModaleNouveauMsg = async () => {
    setShowNewMsg(true)
    setNewMsgSearch('')
    setSelectedIds(new Set())
    setBroadcastText('')

    const { data } = await supabase
      .from('clients')
      .select('id, prenom, profiles(nom, email)')
      .eq('coach_id', user.id)
      .eq('actif', true)
      .order('created_at', { ascending: false })

    setAllClients(data ?? [])
  }

  const toggleClient = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const displayName = (c) => {
    const prenom = c.prenom || ''
    const nom = c.profiles?.nom || ''
    if (prenom && nom) return `${prenom} ${nom}`
    return prenom || nom || c.profiles?.email || '?'
  }

  const filteredModalClients = newMsgSearch.trim()
    ? allClients.filter(c => displayName(c).toLowerCase().includes(newMsgSearch.toLowerCase()))
    : allClients

  const handleModalAction = async () => {
    if (selectedIds.size === 0) return

    // CAS 1 : Un seul client → ouvrir la conversation
    if (selectedIds.size === 1) {
      const selectedId = [...selectedIds][0]
      const clientEnrichi = clients.find(c => c.id === selectedId)
      if (clientEnrichi) {
        setShowNewMsg(false)
        ouvrirConversation(clientEnrichi)
      } else {
        const clientData = allClients.find(c => c.id === selectedId)
        if (clientData) {
          const fakeEnrichi = {
            ...clientData,
            dernierMsg: null,
            nonLus: 0,
            couleur: COULEURS[clients.length % COULEURS.length],
          }
          setClients(prev => {
            if (prev.find(c => c.id === selectedId)) return prev
            return [fakeEnrichi, ...prev]
          })
          setShowNewMsg(false)
          ouvrirConversation(fakeEnrichi)
        }
      }
      return
    }

    // CAS 2 : Broadcast
    const message = broadcastText.trim()
    if (!message) {
      toast.error('Écris un message avant d\'envoyer.')
      return
    }

    setSending(true)

    const ids = [...selectedIds]
    const inserts = ids.map(clientId => ({
      coach_id: user.id,
      client_id: clientId,
      sender_id: user.id,
      receiver_id: clientId,
      expediteur: 'coach',
      contenu: message,
    }))

    try {
      const { error } = await supabase.from('messages').insert(inserts)
      if (error) {
        toast.error(error.message || 'Erreur lors de l\'envoi groupé')
      } else {
        toast.success(`Message envoyé à ${ids.length} client${ids.length > 1 ? 's' : ''} !`)
        const notifInserts = ids.map(clientId => ({
          coach_id: user.id,
          client_id: clientId,
          titre: 'Nouveau message 💬',
          message: message.length > 80 ? message.slice(0, 80) + '…' : message,
          type: 'message',
          destinataire: 'client',
        }))
        supabase.from('notifications').insert(notifInserts).then(() => {})
        setShowNewMsg(false)
        chargerClients()
      }
    } catch (err) {
      toast.error('Erreur inattendue lors de l\'envoi')
    }

    setSending(false)
  }

  const isBroadcast = selectedIds.size > 1

  // ── Group messages by date + determine tail ──
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

  // ── Client display info for active chat ──
  const clientName = clientSelectionne
    ? (clientSelectionne.profiles?.nom ?? clientSelectionne.profiles?.email ?? '?')
    : ''
  const clientInitials = clientName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  // ══════════ RENDER ══════════

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-7 h-7 border-2 border-[#FF6B2B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Sidebar — liste clients ── */}
      <div className={`flex flex-col w-full md:w-72 border-r border-white/[0.06] flex-shrink-0 ${clientSelectionne ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <h1 className="text-[#F5F5F3] font-bold text-lg">Messages</h1>
            <p className="text-white/30 text-xs mt-0.5">{clients.length} conversation{clients.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={ouvrirModaleNouveauMsg}
            className="w-9 h-9 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center text-[#FF6B2B] hover:bg-[#FF6B2B]/20 transition-colors"
            title="Nouveau message"
          >
            <PenSquare size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {clients.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquare size={24} className="text-white/15 mx-auto mb-2" />
              <p className="text-white/30 text-sm">Aucun client actif.</p>
              <button
                onClick={ouvrirModaleNouveauMsg}
                className="mt-3 text-[#FF6B2B] text-xs font-semibold hover:underline"
              >
                Démarrer une conversation
              </button>
            </div>
          ) : (
            clients.map((c) => (
              <button
                key={c.id}
                onClick={() => ouvrirConversation(c)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-white/[0.04] transition-colors hover:bg-white/[0.03] ${
                  clientSelectionne?.id === c.id ? 'bg-[#FF6B2B]/8' : ''
                }`}
              >
                <Initiales nom={c.profiles?.nom} couleur={c.couleur} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm truncate ${c.nonLus > 0 ? 'text-[#F5F5F3] font-semibold' : 'text-[#F5F5F3]'}`}>
                      {c.profiles?.nom ?? c.profiles?.email}
                    </p>
                    {c.nonLus > 0 && (
                      <span className="w-5 h-5 bg-[#FF6B2B] text-white text-[10px] rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                        {c.nonLus}
                      </span>
                    )}
                  </div>
                  {c.dernierMsg && (
                    <p className="text-white/30 text-xs truncate mt-0.5">
                      {c.dernierMsg.expediteur === 'coach' ? 'Vous : ' : ''}{c.dernierMsg.audio_url ? '🎤 Note vocale' : c.dernierMsg.contenu}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Zone de chat ── */}
      {clientSelectionne ? (
        <div className={`flex flex-col flex-1 ${clientSelectionne ? 'flex' : 'hidden md:flex'}`}>
          {/* Header chat */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] flex-shrink-0 bg-[#0D0D0D]/95 backdrop-blur-xl">
            <button onClick={() => setClientSelectionne(null)} className="md:hidden text-white/40 hover:text-white p-1">
              ←
            </button>
            <div className="relative">
              <Initiales nom={clientSelectionne.profiles?.nom} couleur={clientSelectionne.couleur} size="sm" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0D0D0D]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#F5F5F3] font-semibold text-[15px] truncate">
                {clientSelectionne.profiles?.nom ?? clientSelectionne.profiles?.email}
              </p>
              <p className="text-white/30 text-[11px]">{clientSelectionne.profiles?.email}</p>
            </div>
          </div>

          {/* Messages area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 relative">
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-[#FF6B2B]/10 flex items-center justify-center mx-auto mb-4">
                  <Send size={24} className="text-[#FF6B2B]" />
                </div>
                <p className="text-[#F5F5F3] font-semibold text-base mb-1">Démarrez la conversation</p>
                <p className="text-white/30 text-sm">Envoyez un message à {clientName}</p>
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
                      estMoi={item.msg.expediteur === 'coach'}
                      showTail={item.showTail}
                      clientInitials={clientInitials}
                      clientColor={clientSelectionne.couleur}
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

          {/* Quick Replies */}
          <div className="flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-hide">
            {['Bravo cette semaine 💪', 'Continue comme ça !', 'Tu es sur la bonne voie 🚀', 'N\'hésite pas à me contacter 😊'].map((m) => (
              <button key={m} onClick={() => setTexte(m)}
                className="flex-shrink-0 text-xs bg-[#1E1E1E] text-white/40 hover:text-white/70 border border-white/[0.06] rounded-full px-3 py-1.5 transition-colors hover:border-white/[0.12]">
                {m}
              </button>
            ))}
          </div>

          {/* Input zone */}
          <form
            onSubmit={envoyerMessage}
            className="flex items-end gap-2 px-3 py-2.5 border-t border-white/[0.06] flex-shrink-0"
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
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) envoyerMessage(e) }}
                  />
                </div>

                {!texte.trim() ? (
                  <button
                    type="button"
                    onClick={() => setIsRecording(true)}
                    className="w-10 h-10 rounded-full bg-[#1E1E1E] border border-white/[0.08] flex items-center justify-center flex-shrink-0 text-white/30 hover:text-[#FF6B2B] hover:border-[#FF6B2B]/30 transition-all active:scale-90"
                    title="Note vocale"
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
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="text-center">
            <MessageSquare size={40} className="text-white/10 mx-auto mb-3" />
            <p className="text-white/20 text-sm">Sélectionne un client pour démarrer</p>
            <button
              onClick={ouvrirModaleNouveauMsg}
              className="mt-4 px-4 py-2 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55a1b] transition-colors inline-flex items-center gap-2"
            >
              <PenSquare size={14} />
              Nouveau message
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* MODALE — Nouveau message / Broadcast  */}
      {/* ══════════════════════════════════════ */}
      {showNewMsg && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewMsg(false)} />
          <div className="relative z-[101] bg-[#18181b] border border-[#27272a] w-full sm:w-[460px] sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col overflow-hidden">

            {/* Header */}
            <div className="px-4 py-3 border-b border-[#27272a] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <PenSquare size={16} className="text-[#FF6B2B]" />
                <h3 className="text-[#F5F5F3] font-semibold text-sm">
                  {isBroadcast ? 'Envoi groupé' : 'Nouvelle conversation'}
                </h3>
                {selectedIds.size > 0 && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#FF6B2B]/10 text-[#FF6B2B] font-bold">
                    {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button onClick={() => setShowNewMsg(false)} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-[#27272a] transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Recherche */}
            <div className="px-4 py-3 border-b border-[#27272a] flex-shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                <input
                  type="text"
                  value={newMsgSearch}
                  onChange={(e) => setNewMsgSearch(e.target.value)}
                  placeholder="Rechercher un client..."
                  autoFocus
                  className="w-full bg-[#0f0f10] border border-[#27272a] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#F5F5F3] placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/30 transition-all"
                />
              </div>
            </div>

            {/* Liste des clients */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {filteredModalClients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <Users size={28} className="text-white/10 mb-3" />
                  <p className="text-white/25 text-xs">
                    {newMsgSearch ? 'Aucun client trouvé' : 'Aucun client actif'}
                  </p>
                </div>
              ) : (
                filteredModalClients.map((c, idx) => {
                  const isSelected = selectedIds.has(c.id)
                  const name = displayName(c)
                  const couleur = COULEURS[idx % COULEURS.length]

                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleClient(c.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left border-b border-[#27272a]/30 ${
                        isSelected ? 'bg-[#FF6B2B]/[0.06]' : ''
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected ? 'bg-[#FF6B2B] border-[#FF6B2B]' : 'border-[#27272a]'
                      }`}>
                        {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                      </div>
                      <Initiales nom={name} couleur={couleur} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[#F5F5F3] text-sm font-medium truncate">{name}</p>
                        <p className="text-white/20 text-[10px] truncate mt-0.5">{c.profiles?.email}</p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Zone broadcast */}
            {isBroadcast && (
              <div className="px-4 py-3 border-t border-[#27272a] flex-shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={13} className="text-[#FF6B2B]" />
                  <p className="text-white/40 text-[10px] uppercase tracking-wider font-semibold">
                    Message groupé à {selectedIds.size} clients
                  </p>
                </div>
                <textarea
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  placeholder="Écris ton message ici..."
                  rows={3}
                  className="w-full bg-[#0f0f10] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F3] placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/30 resize-none transition-all"
                />
              </div>
            )}

            {/* Bouton d'action */}
            <div className="px-4 py-3 border-t border-[#27272a] flex-shrink-0">
              <button
                onClick={handleModalAction}
                disabled={selectedIds.size === 0 || sending || (isBroadcast && !broadcastText.trim())}
                className="w-full py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#e55a1b] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Envoi en cours...
                  </>
                ) : isBroadcast ? (
                  <>
                    <Send size={14} />
                    Envoyer à {selectedIds.size} clients
                  </>
                ) : selectedIds.size === 1 ? (
                  <>
                    <MessageSquare size={14} />
                    Démarrer la conversation
                  </>
                ) : (
                  'Sélectionne au moins un client'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
