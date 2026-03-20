import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { calculerScoreBienEtre, couleurScore, labelScore } from '../../utils/wellbeing'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import {
  ArrowLeft, CheckCircle2, Circle, Target, MessageSquare,
  Plus, Lock, TrendingUp, Layers, Play, Pause, CheckSquare, Download
} from 'lucide-react'
import { exportHabitudes, exportObjectifs } from '../../utils/exportCsv'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const ONGLETS = ['Aperçu', 'Habitudes', 'Objectifs', 'Messages']
const COULEURS_HAB = ['#FF6B2B', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b']

export default function CoachClientFichePage() {
  const { clientId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [onglet, setOnglet] = useState('Aperçu')
  const [loading, setLoading] = useState(true)
  const [profil, setProfil] = useState(null)
  const [habitudes, setHabitudes] = useState([])
  const [objectifs, setObjectifs] = useState([])
  const [logs30j, setLogs30j] = useState([])
  const [scoresSemaine, setScoresSemaine] = useState([])
  const [sommeilLog, setSommeilLog] = useState([])
  const [humeurLog, setHumeurLog] = useState([])
  const [messages, setMessages] = useState([])

  // Programme assigné
  const [assignation, setAssignation] = useState(null)
  const [programmePhases, setProgrammePhases] = useState([])
  const [programmeTitre, setProgrammeTitre] = useState('')

  // Modals assignation
  const [modalHab, setModalHab] = useState(false)
  const [modalObj, setModalObj] = useState(false)
  const [modalProg, setModalProg] = useState(false)
  const [programmes, setProgrammes] = useState([])
  const [loadingProgs, setLoadingProgs] = useState(false)
  const [nomHab, setNomHab] = useState('')
  const [couleurHab, setCouleurHab] = useState(COULEURS_HAB[0])
  const [titreObj, setTitreObj] = useState('')
  const [descObj, setDescObj] = useState('')
  const [dateCibleObj, setDateCibleObj] = useState('')
  const [savingHab, setSavingHab] = useState(false)
  const [savingObj, setSavingObj] = useState(false)

  // Saisie message
  const [texteMsg, setTexteMsg] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const chargerDonnees = useCallback(async () => {
    if (!user || !clientId) return
    setLoading(true)

    const il30j = new Date()
    il30j.setDate(il30j.getDate() - 29)
    const dateMin = il30j.toISOString().split('T')[0]

    const [
      profilRes, habsRes, objRes, logsRes,
      sommeilRes, humeurRes, sportRes, msgsRes
    ] = await Promise.all([
      supabase.from('profiles').select('nom, email').eq('id', clientId).single(),
      supabase.from('habitudes').select('*').eq('client_id', clientId).eq('actif', true).order('created_at'),
      supabase.from('objectifs').select('*').eq('client_id', clientId).eq('archive', false).order('created_at', { ascending: false }),
      supabase.from('habitudes_log').select('habitude_id, date').eq('client_id', clientId).gte('date', dateMin),
      supabase.from('sommeil_log').select('date, heures, qualite').eq('client_id', clientId).gte('date', dateMin).order('date'),
      supabase.from('humeur_log').select('date, score').eq('client_id', clientId).gte('date', dateMin).order('date'),
      supabase.from('sport_log').select('date, intensite').eq('client_id', clientId).gte('date', dateMin),
      supabase.from('messages').select('*').eq('coach_id', user.id).eq('client_id', clientId).order('created_at').limit(50),
    ])

    const habs = habsRes.data ?? []
    const logs = logsRes.data ?? []
    const sommeils = sommeilRes.data ?? []
    const humeurs = humeurRes.data ?? []
    const sports = sportRes.data ?? []

    setProfil(profilRes.data)
    setHabitudes(habs)
    setObjectifs(objRes.data ?? [])
    setLogs30j(logs)
    setSommeilLog(sommeils)
    setHumeurLog(humeurs)
    setMessages(msgsRes.data ?? [])

    // Scores des 7 derniers jours pour le graphique
    const scores = []
    const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      const cochees = logs.filter(l => l.date === ds).length
      const score = calculerScoreBienEtre({
        habitudes: { cochees, total: habs.length },
        sommeil: sommeils.find(s => s.date === ds) ?? null,
        humeur: humeurs.find(h => h.date === ds) ?? null,
        sport: sports.find(s => s.date === ds) ?? null,
      })
      scores.push({ jour: JOURS[d.getDay()], score })
    }
    setScoresSemaine(scores)

    // Charge le programme assigné au client (en cours)
    const { data: assignData } = await supabase
      .from('programme_assignations')
      .select('*, programmes(titre, duree_semaines)')
      .eq('client_id', clientId)
      .eq('statut', 'en_cours')
      .limit(1)
      .single()

    if (assignData) {
      setAssignation(assignData)
      setProgrammeTitre(assignData.programmes?.titre || '')
      // Charge les phases du programme
      const { data: phasesData } = await supabase
        .from('programme_phases')
        .select('*')
        .eq('programme_id', assignData.programme_id)
        .order('ordre')
      setProgrammePhases(phasesData || [])
    }

    // Marque les messages du client comme lus
    await supabase.from('messages')
      .update({ lu: true })
      .eq('coach_id', user.id).eq('client_id', clientId)
      .eq('expediteur', 'client').eq('lu', false)

    setLoading(false)
  }, [user, clientId, today])

  useEffect(() => { chargerDonnees() }, [chargerDonnees])

  // Assigne une habitude au client
  const assignerHabitude = async (e) => {
    e.preventDefault()
    if (!nomHab.trim()) return
    setSavingHab(true)
    const { data, error } = await supabase.from('habitudes').insert({
      client_id: clientId,
      assigned_by: user.id,
      nom: nomHab.trim(),
      couleur: couleurHab,
    }).select().single()
    if (!error && data) {
      setHabitudes(prev => [...prev, data])
      setNomHab(''); setModalHab(false)
    }
    setSavingHab(false)
  }

  // Assigne un objectif au client
  const assignerObjectif = async (e) => {
    e.preventDefault()
    if (!titreObj.trim()) return
    setSavingObj(true)
    const { data, error } = await supabase.from('objectifs').insert({
      client_id: clientId,
      assigned_by: user.id,
      titre: titreObj.trim(),
      description: descObj.trim() || null,
      date_cible: dateCibleObj || null,
      peut_supprimer: false,
    }).select().single()
    if (!error && data) {
      setObjectifs(prev => [data, ...prev])
      setTitreObj(''); setDescObj(''); setDateCibleObj(''); setModalObj(false)
    }
    setSavingObj(false)
  }

  // Ouvre le modal de sélection de programme
  const ouvrirModalProgramme = async () => {
    setLoadingProgs(true)
    setModalProg(true)
    const { data } = await supabase
      .from('programmes')
      .select('id, titre, duree_semaines, categorie')
      .eq('coach_id', user.id)
      .eq('actif', true)
      .order('created_at', { ascending: false })
    setProgrammes(data || [])
    setLoadingProgs(false)
  }

  // Assigner un programme au client
  const assignerProgramme = async (progId) => {
    // Charge les phases pour créer automatiquement les habitudes/objectifs de la phase 1
    const { data: phasesData } = await supabase
      .from('programme_phases')
      .select('*')
      .eq('programme_id', progId)
      .order('ordre')

    const phase1 = phasesData?.[0]

    // Crée l'assignation
    const { data: newAssign } = await supabase
      .from('programme_assignations')
      .insert({
        programme_id: progId,
        client_id: clientId,
        coach_id: user.id,
        phase_actuelle: 1,
      })
      .select('*, programmes(titre, duree_semaines)')
      .single()

    // Crée automatiquement les habitudes de la phase 1
    if (phase1?.habitudes?.length) {
      const habInserts = phase1.habitudes.map(h => ({
        client_id: clientId,
        assigned_by: user.id,
        nom: h.nom,
        couleur: h.couleur || '#FF6B2B',
      }))
      await supabase.from('habitudes').insert(habInserts)
    }

    // Crée automatiquement les objectifs de la phase 1
    if (phase1?.objectifs?.length) {
      const objInserts = phase1.objectifs.map(o => ({
        client_id: clientId,
        assigned_by: user.id,
        titre: o.titre,
        peut_supprimer: false,
      }))
      await supabase.from('objectifs').insert(objInserts)
    }

    setModalProg(false)
    // Recharger les données pour voir le programme et les nouvelles habitudes/objectifs
    chargerDonnees()
  }

  // Envoie un message au client
  const envoyerMessage = async (e) => {
    e.preventDefault()
    if (!texteMsg.trim() || envoi) return
    setEnvoi(true)
    const msg = { coach_id: user.id, client_id: clientId, expediteur: 'coach', contenu: texteMsg.trim() }
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, { ...msg, id: tempId, created_at: new Date().toISOString(), lu: false }])
    setTexteMsg('')
    const { data } = await supabase.from('messages').insert(msg).select().single()
    if (data) setMessages(prev => prev.map(m => m.id === tempId ? data : m))
    setEnvoi(false)
  }

  // Score du jour
  const todayLogs = logs30j.filter(l => l.date === today)
  const todaySommeil = sommeilLog.find(s => s.date === today) ?? null
  const todayHumeur = humeurLog.find(h => h.date === today) ?? null
  const scoreAujourdhui = calculerScoreBienEtre({
    habitudes: { cochees: todayLogs.length, total: habitudes.length },
    sommeil: todaySommeil,
    humeur: todayHumeur,
    sport: null,
  })
  const couleur = couleurScore(scoreAujourdhui)

  if (loading) {
    return (
      <div className="p-6 max-w-3xl animate-pulse space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#2A2A2A] rounded" />
          <div className="h-7 w-48 bg-[#2A2A2A] rounded" />
        </div>
        <div className="h-32 bg-[#2A2A2A] rounded-xl" />
        <div className="h-48 bg-[#2A2A2A] rounded-xl" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl space-y-5">

      {/* ── En-tête ── */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/coach/clients')} className="text-white/40 hover:text-white transition-colors p-1">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-[#F5F5F3] text-xl font-bold">
            {profil?.nom ?? profil?.email}
          </h1>
          <p className="text-white/30 text-sm">{profil?.email}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-bold" style={{ color: couleur }}>{scoreAujourdhui}</p>
          <p className="text-white/30 text-xs">{labelScore(scoreAujourdhui)}</p>
        </div>
      </div>

      {/* ── Onglets ── */}
      <div className="flex gap-1 bg-[#1E1E1E] border border-white/[0.08] rounded-xl p-1">
        {ONGLETS.map((o) => (
          <button
            key={o}
            onClick={() => setOnglet(o)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              onglet === o
                ? 'bg-[#FF6B2B] text-white'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            {o}
          </button>
        ))}
      </div>

      {/* ── Export CSV ── */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => {
            const il30j = new Date(); il30j.setDate(il30j.getDate() - 30)
            exportHabitudes(supabase, clientId, profil?.nom, il30j.toISOString().split('T')[0], new Date().toISOString().split('T')[0])
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/[0.04] border border-white/[0.08] transition-colors"
        >
          <Download size={12} />
          Export habitudes (30j)
        </button>
        <button
          onClick={() => exportObjectifs(supabase, clientId, profil?.nom)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/[0.04] border border-white/[0.08] transition-colors"
        >
          <Download size={12} />
          Export objectifs
        </button>
      </div>

      {/* ══════════ ONGLET APERÇU ══════════ */}
      {onglet === 'Aperçu' && (
        <div className="space-y-4">
          {/* Graphique score 7j */}
          <Card>
            <CardBody>
              <p className="text-white/40 text-[11px] uppercase tracking-wider mb-3">Score bien-être 7 jours</p>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={scoresSemaine} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <XAxis dataKey="jour" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} ticks={[0, 50, 100]} />
                  <Tooltip
                    contentStyle={{ background: '#1E1E1E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#F5F5F3' }}
                    formatter={(v) => [`${v}/100`, 'Score']}
                  />
                  <Line type="monotone" dataKey="score" stroke="#FF6B2B" strokeWidth={2} dot={{ fill: '#FF6B2B', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* Résumé du jour */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardBody className="text-center py-3">
                <p className="text-white/30 text-xs mb-1">Habitudes</p>
                <p className="text-[#F5F5F3] font-bold">{todayLogs.length}/{habitudes.length}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center py-3">
                <p className="text-white/30 text-xs mb-1">Sommeil</p>
                <p className="text-[#F5F5F3] font-bold">{todaySommeil ? `${todaySommeil.heures}h` : '—'}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center py-3">
                <p className="text-white/30 text-xs mb-1">Humeur</p>
                <p className="text-[#F5F5F3] font-bold">{todayHumeur ? `${todayHumeur.score}/10` : '—'}</p>
              </CardBody>
            </Card>
          </div>

          {/* Programme en cours */}
          {assignation ? (
            <Card>
              <CardBody>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-[#FF6B2B]" />
                    <p className="text-white/40 text-[11px] uppercase tracking-wider">Programme en cours</p>
                  </div>
                  <span className="text-xs text-white/30">Phase {assignation.phase_actuelle}/{programmePhases.length}</span>
                </div>
                <p className="text-[#F5F5F3] font-semibold text-sm mb-2">{programmeTitre}</p>
                {/* Barre progression phases */}
                <div className="flex gap-1">
                  {programmePhases.map((ph, i) => (
                    <div
                      key={ph.id}
                      className="h-1.5 rounded-full flex-1"
                      style={{
                        backgroundColor: i < assignation.phase_actuelle ? '#FF6B2B' : 'rgba(255,255,255,0.08)',
                      }}
                    />
                  ))}
                </div>
                <p className="text-white/30 text-xs mt-2">
                  {programmePhases[assignation.phase_actuelle - 1]?.titre || ''}
                </p>
              </CardBody>
            </Card>
          ) : (
            <button
              onClick={ouvrirModalProgramme}
              className="w-full py-3 rounded-xl border border-dashed border-white/[0.12] text-white/40 text-sm hover:text-white/70 hover:border-white/[0.2] transition-colors flex items-center justify-center gap-2"
            >
              <Layers size={16} />
              Assigner un programme
            </button>
          )}
        </div>
      )}

      {/* ══════════ ONGLET HABITUDES ══════════ */}
      {onglet === 'Habitudes' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setModalHab(true)}>
              <Plus size={14} /> Assigner une habitude
            </Button>
          </div>

          {habitudes.length === 0 ? (
            <Card><CardBody className="text-center py-8 text-white/30 text-sm">Aucune habitude assignée.</CardBody></Card>
          ) : (
            habitudes.map((h) => {
              const logsDates = logs30j.filter(l => l.habitude_id === h.id).map(l => l.date)
              const cocheeAujourdHui = logsDates.includes(today)
              const pct = Math.round((logsDates.length / 30) * 100)
              return (
                <Card key={h.id}>
                  <CardBody className="flex items-center gap-3 py-3">
                    {cocheeAujourdHui
                      ? <CheckCircle2 size={18} style={{ color: h.couleur }} />
                      : <Circle size={18} className="text-white/20" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-[#F5F5F3] text-sm">{h.nom}</p>
                      <div className="mt-1.5 h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: h.couleur }} />
                      </div>
                    </div>
                    <span className="text-white/30 text-xs">{pct}%</span>
                    {h.assigned_by === user.id && <Lock size={11} className="text-[#FF6B2B]/50" />}
                  </CardBody>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* ══════════ ONGLET OBJECTIFS ══════════ */}
      {onglet === 'Objectifs' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setModalObj(true)}>
              <Plus size={14} /> Assigner un objectif
            </Button>
          </div>

          {objectifs.length === 0 ? (
            <Card><CardBody className="text-center py-8 text-white/30 text-sm">Aucun objectif.</CardBody></Card>
          ) : (
            objectifs.map((o) => {
              const couleurO = couleurScore(o.score)
              return (
                <Card key={o.id}>
                  <CardBody>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[#F5F5F3] text-sm font-medium truncate">{o.titre}</p>
                          {!o.peut_supprimer && <Lock size={11} className="text-[#FF6B2B]/50 flex-shrink-0" />}
                        </div>
                        {o.description && <p className="text-white/30 text-xs mt-0.5 line-clamp-1">{o.description}</p>}
                      </div>
                      <p className="font-bold flex-shrink-0" style={{ color: couleurO }}>{o.score}%</p>
                    </div>
                    <div className="mt-2 h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${o.score}%`, backgroundColor: couleurO }} />
                    </div>
                  </CardBody>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* ══════════ ONGLET MESSAGES ══════════ */}
      {onglet === 'Messages' && (
        <div className="flex flex-col h-[500px]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-2 mb-3">
            {messages.length === 0 ? (
              <div className="text-center py-10">
                <MessageSquare size={28} className="text-white/15 mx-auto mb-2" />
                <p className="text-white/30 text-sm">Aucun message pour l'instant.</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.expediteur === 'coach' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
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
          </div>

          {/* Raccourcis encouragements */}
          <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
            {['Bravo cette semaine 💪', 'Continue comme ça !', 'Tu es sur la bonne voie 🚀'].map((msg) => (
              <button key={msg} onClick={() => setTexteMsg(msg)}
                className="flex-shrink-0 text-xs bg-[#2A2A2A] text-white/50 hover:text-white border border-white/[0.08] rounded-full px-3 py-1.5 transition-colors">
                {msg}
              </button>
            ))}
          </div>

          {/* Saisie message */}
          <form onSubmit={envoyerMessage} className="flex gap-2">
            <input
              value={texteMsg}
              onChange={(e) => setTexteMsg(e.target.value)}
              placeholder="Écrire un message…"
              className="flex-1 bg-[#2A2A2A] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-[#F5F5F3] placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#FF6B2B]/40"
            />
            <button type="submit" disabled={!texteMsg.trim() || envoi}
              className="w-10 h-10 rounded-xl bg-[#FF6B2B] flex items-center justify-center hover:bg-[#FF9A6C] transition-colors disabled:opacity-40">
              <TrendingUp size={15} className="text-white" />
            </button>
          </form>
        </div>
      )}

      {/* ══════════ MODALS ══════════ */}

      {/* Modal assigner habitude */}
      <Modal isOpen={modalHab} onClose={() => setModalHab(false)} title="Assigner une habitude">
        <form onSubmit={assignerHabitude} className="space-y-4">
          <Input label="Nom de l'habitude" placeholder="Ex : Boire 2L d'eau" value={nomHab} onChange={(e) => setNomHab(e.target.value)} required autoFocus />
          <div>
            <p className="text-sm text-white/60 font-medium mb-2">Couleur</p>
            <div className="flex gap-2">
              {COULEURS_HAB.map((c) => (
                <button key={c} type="button" onClick={() => setCouleurHab(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${couleurHab === c ? 'ring-2 ring-offset-2 ring-offset-[#1E1E1E] ring-white/60 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalHab(false)}>Annuler</Button>
            <Button type="submit" loading={savingHab} className="flex-1">Assigner</Button>
          </div>
        </form>
      </Modal>

      {/* Modal assigner programme */}
      <Modal isOpen={modalProg} onClose={() => setModalProg(false)} title="Assigner un programme">
        {loadingProgs ? (
          <div className="py-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-[#FF6B2B] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : programmes.length === 0 ? (
          <div className="text-center py-8">
            <Layers size={28} className="text-white/15 mx-auto mb-2" />
            <p className="text-white/30 text-sm mb-3">Aucun programme créé</p>
            <Button size="sm" onClick={() => { setModalProg(false); window.location.href = '/coach/programmes' }}>
              Créer un programme
            </Button>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {programmes.map((prog) => (
              <button
                key={prog.id}
                onClick={() => assignerProgramme(prog.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#2A2A2A]/50 hover:bg-[#2A2A2A] text-left transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center shrink-0">
                  <Layers size={18} className="text-[#FF6B2B]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#F5F5F3] text-sm font-medium truncate">{prog.titre}</p>
                  <p className="text-white/30 text-xs">{prog.duree_semaines} sem. {prog.categorie ? `· ${prog.categorie}` : ''}</p>
                </div>
                <Play size={14} className="text-[#FF6B2B] shrink-0" />
              </button>
            ))}
          </div>
        )}
      </Modal>

      {/* Modal assigner objectif */}
      <Modal isOpen={modalObj} onClose={() => setModalObj(false)} title="Assigner un objectif">
        <form onSubmit={assignerObjectif} className="space-y-4">
          <Input label="Titre de l'objectif" placeholder="Ex : Perdre 5kg d'ici juin" value={titreObj} onChange={(e) => setTitreObj(e.target.value)} required autoFocus />
          <div>
            <label className="text-sm text-white/60 font-medium block mb-1.5">Description (optionnel)</label>
            <textarea value={descObj} onChange={(e) => setDescObj(e.target.value)} placeholder="Contexte, étapes clés…" rows={2}
              className="w-full bg-[#2A2A2A] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#FF6B2B]/50 resize-none" />
          </div>
          <Input label="Date cible (optionnel)" type="date" value={dateCibleObj} onChange={(e) => setDateCibleObj(e.target.value)} />
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalObj(false)}>Annuler</Button>
            <Button type="submit" loading={savingObj} className="flex-1">Assigner</Button>
          </div>
        </form>
      </Modal>

    </div>
  )
}
