import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import { Send, MessageSquare, Mic, PenSquare, X, Search, Check, Users, Loader2 } from 'lucide-react'
import { AudioBubble, VoiceRecorder } from '../../components/chat/VoiceMessage'

// Initiales colorées pour la liste de clients
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

export default function CoachMessagesPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const [clients, setClients] = useState([])
  const [clientSelectionne, setClientSelectionne] = useState(null)
  const clientSelectionneRef = useRef(null) // ref pour accéder dans le callback realtime
  const [messages, setMessages] = useState([])
  const [texte, setTexte] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // ── Marquer les notifications "message" comme lues à l'arrivée sur la page ──
  useEffect(() => {
    if (!user) return
    supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('coach_id', user.id)
      .eq('destinataire', 'coach')
      .eq('type', 'message')
      .eq('is_read', false)
      .then(({ error }) => { if (error) console.warn('[CoachMessages] markRead:', error.message) })
  }, [user])

  // ── Modale Nouveau Message ──
  const [showNewMsg, setShowNewMsg] = useState(false)
  const [newMsgSearch, setNewMsgSearch] = useState('')
  const [allClients, setAllClients] = useState([]) // tous les clients du coach (pour la modale)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [broadcastText, setBroadcastText] = useState('')
  const [sending, setSending] = useState(false)

  // Synchroniser la ref avec le state
  useEffect(() => {
    clientSelectionneRef.current = clientSelectionne
  }, [clientSelectionne])

  // ── Charge la liste des clients avec le dernier message ──
  const chargerClients = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data: clientsData, error: clientsErr } = await supabase
      .from('clients')
      .select('id, prenom, profiles(nom, email)')
      .eq('coach_id', user.id)
      .eq('actif', true)
      .order('created_at', { ascending: false })

    if (clientsErr) {
      console.error('[CoachMessages] Erreur chargement clients:', clientsErr)
    }

    if (!clientsData?.length) {
      console.log('[CoachMessages] Aucun client actif trouvé pour coach_id:', user.id)
      setLoading(false)
      return
    }

    console.log('[CoachMessages] Clients chargés:', clientsData.length, '| coach_id:', user.id)

    const clientIds = clientsData.map(c => c.id)

    const { data: derniersMsgs, error: msgsErr } = await supabase
      .from('messages')
      .select('client_id, contenu, created_at, lu, expediteur, audio_url')
      .eq('coach_id', user.id)
      .in('client_id', clientIds)
      .order('created_at', { ascending: false })

    if (msgsErr) {
      console.error('[CoachMessages] Erreur chargement derniers messages:', msgsErr)
    }

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

  // ── Charge et ouvre la conversation d'un client ──
  const ouvrirConversation = async (client) => {
    setClientSelectionne(client)
    console.log('[CoachMessages] Ouverture conversation client:', client.id, '| coach_id:', user.id)

    const { data: msgs, error } = await supabase
      .from('messages')
      .select('*')
      .eq('coach_id', user.id)
      .eq('client_id', client.id)
      .order('created_at')

    if (error) {
      console.error('[CoachMessages] Erreur chargement conversation:', error)
    }

    console.log('[CoachMessages] Messages chargés:', msgs?.length ?? 0)
    setMessages(msgs ?? [])

    // Marque les messages du client comme lus
    await supabase.from('messages')
      .update({ lu: true })
      .eq('coach_id', user.id)
      .eq('client_id', client.id)
      .eq('expediteur', 'client')
      .eq('lu', false)

    setClients(prev => prev.map(c => c.id === client.id ? { ...c, nonLus: 0 } : c))

    inputRef.current?.focus()
  }

  // ── Abonnement Realtime UNIQUE — écoute TOUS les messages adressés au coach ──
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
        console.log('[CoachMessages] Nouveau message reçu depuis Supabase:', newMsg)

        const currentClient = clientSelectionneRef.current

        // ── CAS 1 : Le message est dans la conversation actuellement ouverte ──
        if (currentClient && newMsg.client_id === currentClient.id) {
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })

          if (newMsg.expediteur === 'client') {
            supabase.from('messages').update({ lu: true }).eq('id', newMsg.id)
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

        // ── CAS 2 : Le message vient d'un AUTRE client (pas la conversation ouverte) ──
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
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  // Scroll vers le bas à chaque nouveau message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
      console.error('[CoachMessages] Erreur envoi message:', error)
      toast.error(error.message || 'Erreur lors de l\'envoi')
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setTexte(messageToSend)
    } else if (data) {
      setMessages(prev => prev.map(m => m.id === tempId ? data : m))
      // Notification au client
      supabase.from('notifications').insert({
        coach_id: user.id,
        client_id: clientSelectionne.id,
        titre: 'Nouveau message 💬',
        message: messageToSend.length > 80 ? messageToSend.slice(0, 80) + '…' : messageToSend,
        type: 'message',
        destinataire: 'client',
      }).then(({ error: nErr }) => { if (nErr) console.warn('[Notif]', nErr.message) })
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
      console.error('[CoachMessages] Erreur envoi vocal:', error)
      toast.error(error.message || 'Erreur envoi vocal')
    }
    if (data) {
      setMessages(prev => prev.map(m => m.id === tempId ? data : m))
      // Notification au client
      supabase.from('notifications').insert({
        coach_id: user.id,
        client_id: clientSelectionne.id,
        titre: 'Nouveau message 💬',
        message: '🎤 Note vocale reçue',
        type: 'message',
        destinataire: 'client',
      }).then(({ error: nErr }) => { if (nErr) console.warn('[Notif]', nErr.message) })
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

    // Fetch tous les clients du coach (avec prenom pour un meilleur affichage)
    const { data, error } = await supabase
      .from('clients')
      .select('id, prenom, profiles(nom, email)')
      .eq('coach_id', user.id)
      .eq('actif', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[CoachMessages] Erreur fetch clients modale:', error)
    }
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

  // Nom d'affichage d'un client
  const displayName = (c) => {
    const prenom = c.prenom || ''
    const nom = c.profiles?.nom || ''
    if (prenom && nom) return `${prenom} ${nom}`
    return prenom || nom || c.profiles?.email || '?'
  }

  // Filtre de recherche
  const filteredModalClients = newMsgSearch.trim()
    ? allClients.filter(c => displayName(c).toLowerCase().includes(newMsgSearch.toLowerCase()))
    : allClients

  // ── Action : 1-à-1 ou Broadcast ──
  const handleModalAction = async () => {
    if (selectedIds.size === 0) return

    // ── CAS 1 : Un seul client → ouvrir la conversation ──
    if (selectedIds.size === 1) {
      const selectedId = [...selectedIds][0]
      // Chercher dans la liste enrichie (sidebar) ou dans allClients
      const clientEnrichi = clients.find(c => c.id === selectedId)
      if (clientEnrichi) {
        setShowNewMsg(false)
        ouvrirConversation(clientEnrichi)
      } else {
        // Client sans historique — le construire à la volée
        const clientData = allClients.find(c => c.id === selectedId)
        if (clientData) {
          const fakeEnrichi = {
            ...clientData,
            dernierMsg: null,
            nonLus: 0,
            couleur: COULEURS[clients.length % COULEURS.length],
          }
          // Ajouter à la sidebar s'il n'y est pas
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

    // ── CAS 2 : Plusieurs clients → Mode Broadcast ──
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
      // INSERT en batch (Supabase supporte l'insert de tableau)
      const { error } = await supabase.from('messages').insert(inserts)

      if (error) {
        console.error('[CoachMessages] Erreur broadcast:', error)
        toast.error(error.message || 'Erreur lors de l\'envoi groupé')
      } else {
        toast.success(`Message envoyé à ${ids.length} client${ids.length > 1 ? 's' : ''} !`)
        // Notifications aux clients
        const notifInserts = ids.map(clientId => ({
          coach_id: user.id,
          client_id: clientId,
          titre: 'Nouveau message 💬',
          message: message.length > 80 ? message.slice(0, 80) + '…' : message,
          type: 'message',
          destinataire: 'client',
        }))
        supabase.from('notifications').insert(notifInserts)
          .then(({ error: nErr }) => { if (nErr) console.warn('[Notif broadcast]', nErr.message) })
        setShowNewMsg(false)
        // Rafraîchir la sidebar pour voir les derniers messages
        chargerClients()
      }
    } catch (err) {
      console.error('[CoachMessages] Erreur broadcast:', err)
      toast.error('Erreur inattendue lors de l\'envoi')
    }

    setSending(false)
  }

  const isBroadcast = selectedIds.size > 1

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
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
            <button onClick={() => setClientSelectionne(null)} className="md:hidden text-white/40 hover:text-white p-1">
              ←
            </button>
            <Initiales nom={clientSelectionne.profiles?.nom} couleur={clientSelectionne.couleur} size="sm" />
            <div>
              <p className="text-[#F5F5F3] font-medium text-sm">
                {clientSelectionne.profiles?.nom ?? clientSelectionne.profiles?.email}
              </p>
              <p className="text-white/30 text-xs">{clientSelectionne.profiles?.email}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <MessageSquare size={28} className="text-white/15 mx-auto mb-2" />
                <p className="text-white/30 text-sm">Démarrez la conversation.</p>
              </div>
            ) : (
              messages.map((msg) => (
                msg.audio_url ? (
                  <AudioBubble
                    key={msg.id}
                    audioUrl={msg.audio_url}
                    audioDuration={msg.audio_duration}
                    estMoi={msg.expediteur === 'coach'}
                    createdAt={msg.created_at}
                  />
                ) : (
                  <div key={msg.id} className={`flex ${msg.expediteur === 'coach' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-sm ${
                      msg.expediteur === 'coach'
                        ? 'bg-[#FF6B2B] text-white rounded-br-sm'
                        : 'bg-[#2A2A2A] text-[#F5F5F3] rounded-bl-sm'
                    }`}>
                      <p>{msg.contenu}</p>
                      <p className={`text-[10px] mt-1 ${msg.expediteur === 'coach' ? 'text-white/60' : 'text-white/30'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Raccourcis */}
          <div className="flex gap-2 px-4 pb-2 overflow-x-auto">
            {['Bravo cette semaine 💪', 'Continue comme ça !', 'Tu es sur la bonne voie 🚀', 'N\'hésite pas à me contacter 😊'].map((m) => (
              <button key={m} onClick={() => setTexte(m)}
                className="flex-shrink-0 text-xs bg-[#2A2A2A] text-white/50 hover:text-white border border-white/[0.06] rounded-full px-3 py-1.5 transition-colors">
                {m}
              </button>
            ))}
          </div>

          {/* Saisie */}
          <form onSubmit={envoyerMessage} className="flex items-center gap-2 px-4 py-3 border-t border-white/[0.06] flex-shrink-0">
            {isRecording ? (
              <VoiceRecorder onSend={envoyerVocal} disabled={envoi} />
            ) : (
              <>
                <input
                  ref={inputRef}
                  value={texte}
                  onChange={(e) => setTexte(e.target.value)}
                  placeholder="Écrire un message…"
                  className="flex-1 bg-[#2A2A2A] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[16px] text-[#F5F5F3] placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#FF6B2B]/40"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) envoyerMessage(e) }}
                />
                {!texte.trim() ? (
                  <button
                    type="button"
                    onClick={() => setIsRecording(true)}
                    className="w-10 h-10 rounded-xl bg-[#2A2A2A] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-[#FF6B2B] hover:border-[#FF6B2B]/30 transition-all flex-shrink-0"
                    title="Note vocale"
                  >
                    <Mic size={16} />
                  </button>
                ) : (
                  <button type="submit" disabled={!texte.trim() || envoi}
                    className="w-10 h-10 rounded-xl bg-[#FF6B2B] flex items-center justify-center hover:bg-[#FF9A6C] transition-colors disabled:opacity-40 flex-shrink-0">
                    <Send size={16} className="text-white" />
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
                  className="w-full bg-[#0f0f10] border border-[#27272a] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#F5F5F3] placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-[#FF6B2B]/40 transition-all"
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
                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected ? 'bg-[#FF6B2B] border-[#FF6B2B]' : 'border-[#27272a]'
                      }`}>
                        {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                      </div>

                      {/* Avatar */}
                      <Initiales nom={name} couleur={couleur} size="sm" />

                      {/* Infos */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[#F5F5F3] text-sm font-medium truncate">{name}</p>
                        <p className="text-white/20 text-[10px] truncate mt-0.5">{c.profiles?.email}</p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* ── Zone broadcast (textarea) visible si > 1 sélectionné ── */}
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
                  className="w-full bg-[#0f0f10] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F3] placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-[#FF6B2B]/40 resize-none transition-all"
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
