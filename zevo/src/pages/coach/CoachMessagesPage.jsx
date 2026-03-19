import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Send, MessageSquare } from 'lucide-react'

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
  const [searchParams] = useSearchParams()
  const [clients, setClients] = useState([])
  const [clientSelectionne, setClientSelectionne] = useState(null)
  const [messages, setMessages] = useState([])
  const [texte, setTexte] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Charge la liste des clients avec le dernier message
  const chargerClients = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, profiles(nom, email)')
      .eq('coach_id', user.id)
      .eq('actif', true)
      .order('created_at', { ascending: false })

    if (!clientsData?.length) { setLoading(false); return }

    const clientIds = clientsData.map(c => c.id)

    // Dernier message + nb non lus par client
    const { data: derniersMsgs } = await supabase
      .from('messages')
      .select('client_id, contenu, created_at, lu, expediteur')
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

    // Trie par dernier message le plus récent
    enrichis.sort((a, b) => {
      if (!a.dernierMsg && !b.dernierMsg) return 0
      if (!a.dernierMsg) return 1
      if (!b.dernierMsg) return -1
      return b.dernierMsg.created_at.localeCompare(a.dernierMsg.created_at)
    })

    setClients(enrichis)

    // Sélectionne le client depuis l'URL param ?client=xxx
    const clientParam = searchParams.get('client')
    if (clientParam) {
      const trouve = enrichis.find(c => c.id === clientParam)
      if (trouve) ouvrirConversation(trouve)
    }

    setLoading(false)
  }, [user, searchParams])

  useEffect(() => { chargerClients() }, [chargerClients])

  // Charge et ouvre la conversation d'un client
  const ouvrirConversation = async (client) => {
    setClientSelectionne(client)

    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('coach_id', user.id)
      .eq('client_id', client.id)
      .order('created_at')

    setMessages(msgs ?? [])

    // Marque les messages du client comme lus
    await supabase.from('messages')
      .update({ lu: true })
      .eq('coach_id', user.id)
      .eq('client_id', client.id)
      .eq('expediteur', 'client')
      .eq('lu', false)

    // Met à jour le badge non lus localement
    setClients(prev => prev.map(c => c.id === client.id ? { ...c, nonLus: 0 } : c))

    inputRef.current?.focus()
  }

  // Abonnement Realtime pour la conversation active
  useEffect(() => {
    if (!user || !clientSelectionne) return
    const channel = supabase
      .channel(`coach-msgs-${clientSelectionne.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `client_id=eq.${clientSelectionne.id}`,
      }, (payload) => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev
          return [...prev, payload.new]
        })
        // Si message du client, le marquer lu immédiatement
        if (payload.new.expediteur === 'client') {
          supabase.from('messages').update({ lu: true }).eq('id', payload.new.id)
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, clientSelectionne])

  // Scroll vers le bas à chaque nouveau message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Envoie un message
  const envoyerMessage = async (e) => {
    e.preventDefault()
    if (!texte.trim() || !clientSelectionne || envoi) return
    setEnvoi(true)
    const msg = { coach_id: user.id, client_id: clientSelectionne.id, expediteur: 'coach', contenu: texte.trim() }
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, { ...msg, id: tempId, created_at: new Date().toISOString(), lu: false }])
    setTexte('')
    const { data } = await supabase.from('messages').insert(msg).select().single()
    if (data) setMessages(prev => prev.map(m => m.id === tempId ? data : m))
    setEnvoi(false)
    inputRef.current?.focus()
  }

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
        <div className="p-4 border-b border-white/[0.06]">
          <h1 className="text-[#F5F5F3] font-bold text-lg">Messages</h1>
          <p className="text-white/30 text-xs mt-0.5">{clients.length} conversation{clients.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {clients.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquare size={24} className="text-white/15 mx-auto mb-2" />
              <p className="text-white/30 text-sm">Aucun client actif.</p>
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
                      {c.dernierMsg.expediteur === 'coach' ? 'Vous : ' : ''}{c.dernierMsg.contenu}
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
            <input
              ref={inputRef}
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              placeholder="Écrire un message…"
              className="flex-1 bg-[#2A2A2A] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F3] placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#FF6B2B]/40"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) envoyerMessage(e) }}
            />
            <button type="submit" disabled={!texte.trim() || envoi}
              className="w-10 h-10 rounded-xl bg-[#FF6B2B] flex items-center justify-center hover:bg-[#FF9A6C] transition-colors disabled:opacity-40">
              <Send size={16} className="text-white" />
            </button>
          </form>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="text-center">
            <MessageSquare size={40} className="text-white/10 mx-auto mb-3" />
            <p className="text-white/20 text-sm">Sélectionne un client pour démarrer</p>
          </div>
        </div>
      )}

    </div>
  )
}
