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
  Plus, Lock, TrendingUp, Layers, Play, Pause, CheckSquare, Download,
  ChevronRight, Loader2, Dumbbell, Mic, Send
} from 'lucide-react'
import { AudioBubble, VoiceRecorder } from '../../components/chat/VoiceMessage'
import { useToast } from '../../components/ui/Toast'
import { exportHabitudes, exportObjectifs } from '../../utils/exportCsv'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const ONGLETS = ['Aperçu', 'Habitudes', 'Objectifs', 'Messages']
const COULEURS_HAB = ['#FF6B2B', '#FF9A6C', '#FFB892', '#a1a1aa', '#71717a']

export default function CoachClientFichePage() {
  const { clientId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

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
  const [typeObj, setTypeObj] = useState('chiffre')      // 'chiffre' | 'simple'
  const [valeurDepart, setValeurDepart] = useState('')
  const [valeurCible, setValeurCible] = useState('')
  const [uniteObj, setUniteObj] = useState('')
  const [savingHab, setSavingHab] = useState(false)
  const [savingObj, setSavingObj] = useState(false)
  const [assigningProg, setAssigningProg] = useState(null)
  const [advancingPhase, setAdvancingPhase] = useState(false)

  // Saisie message
  const [texteMsg, setTexteMsg] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

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
      supabase.from('profiles').select('prenom, nom, email').eq('id', clientId).single(),
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
    const chiffre = typeObj === 'chiffre'
    if (chiffre && (valeurCible === '' || isNaN(parseFloat(valeurCible)))) {
      toast.error('Renseigne une valeur cible (ex : 75).')
      return
    }
    setSavingObj(true)
    const depart = chiffre ? (valeurDepart === '' ? 0 : parseFloat(valeurDepart)) : null
    const cible = chiffre ? parseFloat(valeurCible) : null
    const { data, error } = await supabase.from('objectifs').insert({
      client_id: clientId,
      assigned_by: user.id,
      titre: titreObj.trim(),
      description: descObj.trim() || null,
      date_cible: dateCibleObj || null,
      peut_supprimer: false,
      type_objectif: chiffre ? 'mesurable' : 'simple',
      valeur_depart: depart,
      valeur_cible: cible,
      valeur_actuelle: depart,
      unite: chiffre ? (uniteObj.trim() || null) : null,
      score: 0,
      statut: 'en_cours',
    }).select().single()
    if (error) {
      toast.error(error.message || 'Erreur lors de la création.')
    } else if (data) {
      setObjectifs(prev => [data, ...prev])
      setTitreObj(''); setDescObj(''); setDateCibleObj('')
      setValeurDepart(''); setValeurCible(''); setUniteObj(''); setTypeObj('chiffre')
      setModalObj(false)
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

  // ── Helper : peupler le dashboard du client avec les données d'une phase ──
  const peuplerPhase = async (phase, progId) => {
    if (!phase) return { habitudes: 0, objectifs: 0, taches: 0 }

    let nbHab = 0, nbObj = 0, nbTaches = 0

    // Crée les habitudes de la phase
    if (phase.habitudes?.length) {
      const habInserts = phase.habitudes.map(h => ({
        client_id: clientId,
        assigned_by: user.id,
        nom: h.nom,
        couleur: h.couleur || '#FF6B2B',
        programme_id: progId,
      }))
      await supabase.from('habitudes').insert(habInserts)
      nbHab = habInserts.length
    }

    // Crée les objectifs de la phase
    if (phase.objectifs?.length) {
      const objInserts = phase.objectifs.map(o => ({
        client_id: clientId,
        assigned_by: user.id,
        titre: o.titre,
        peut_supprimer: false,
        programme_id: progId,
      }))
      await supabase.from('objectifs').insert(objInserts)
      nbObj = objInserts.length
    }

    // Crée des tâches depuis les exercices de la phase
    if (phase.exercices?.length) {
      const tacheInserts = phase.exercices.map(ex => ({
        client_id: clientId,
        assigned_by: user.id,
        titre: `${ex.nom || ex.name}${ex.series && ex.reps ? ` — ${ex.series}×${ex.reps}` : ''}`,
        priorite: 'normal',
        statut: 'en_cours',
        programme_id: progId,
      }))
      await supabase.from('taches').insert(tacheInserts)
      nbTaches = tacheInserts.length
    }

    return { habitudes: nbHab, objectifs: nbObj, taches: nbTaches }
  }

  // ── Assigner un programme au client ──
  const assignerProgramme = async (progId) => {
    setAssigningProg(progId)

    try {
      // Charge les phases pour créer automatiquement les données de la phase 1
      const { data: phasesData } = await supabase
        .from('programme_phases')
        .select('*')
        .eq('programme_id', progId)
        .order('ordre')

      const phase1 = phasesData?.[0]

      // Crée l'assignation
      const { data: newAssign, error: assignError } = await supabase
        .from('programme_assignations')
        .insert({
          programme_id: progId,
          client_id: clientId,
          coach_id: user.id,
          phase_actuelle: 1,
        })
        .select('*, programmes(titre, duree_semaines)')
        .single()

      if (assignError) throw assignError

      // Peuple le dashboard avec les données de la phase 1
      const counts = await peuplerPhase(phase1, progId)

      setModalProg(false)

      // Toast de succès détaillé
      const details = []
      if (counts.habitudes > 0) details.push(`${counts.habitudes} habitude${counts.habitudes > 1 ? 's' : ''}`)
      if (counts.objectifs > 0) details.push(`${counts.objectifs} objectif${counts.objectifs > 1 ? 's' : ''}`)
      if (counts.taches > 0) details.push(`${counts.taches} tache${counts.taches > 1 ? 's' : ''}`)

      toast.success(
        `Programme "${newAssign.programmes?.titre}" assigne !${details.length ? ` ${details.join(', ')} crees.` : ''}`
      )

      // Recharger les données
      chargerDonnees()
    } catch (err) {
      console.error('Erreur assignation programme:', err)
      toast.error('Erreur lors de l\'assignation du programme.')
      setAssigningProg(null)
    }
  }

  // ── Passer à la phase suivante ──
  const changerPhase = async () => {
    if (!assignation || advancingPhase) return

    const phaseActuelle = assignation.phase_actuelle
    const totalPhases = programmePhases.length

    // Vérifier qu'on n'est pas déjà à la dernière phase
    if (phaseActuelle >= totalPhases) {
      // Marquer le programme comme terminé
      await supabase
        .from('programme_assignations')
        .update({ statut: 'termine' })
        .eq('id', assignation.id)

      toast.success('Programme termine ! Bravo au client 🎉')
      chargerDonnees()
      return
    }

    setAdvancingPhase(true)

    try {
      const nouvellePhase = phaseActuelle + 1

      // Désactiver les habitudes de l'ancien programme/phase (soft delete)
      await supabase
        .from('habitudes')
        .update({ actif: false })
        .eq('client_id', clientId)
        .eq('programme_id', assignation.programme_id)

      // Archiver les objectifs de l'ancien programme/phase
      await supabase
        .from('objectifs')
        .update({ archive: true })
        .eq('client_id', clientId)
        .eq('programme_id', assignation.programme_id)

      // Terminer les tâches de l'ancien programme
      await supabase
        .from('taches')
        .update({ statut: 'termine' })
        .eq('client_id', clientId)
        .eq('programme_id', assignation.programme_id)
        .eq('statut', 'en_cours')

      // Mettre à jour la phase actuelle dans l'assignation
      await supabase
        .from('programme_assignations')
        .update({ phase_actuelle: nouvellePhase })
        .eq('id', assignation.id)

      // Peupler le dashboard avec les données de la nouvelle phase
      const newPhaseData = programmePhases.find(p => p.ordre === nouvellePhase)
      const counts = await peuplerPhase(newPhaseData, assignation.programme_id)

      const phaseTitre = newPhaseData?.titre || `Phase ${nouvellePhase}`
      const details = []
      if (counts.habitudes > 0) details.push(`${counts.habitudes} habitude${counts.habitudes > 1 ? 's' : ''}`)
      if (counts.objectifs > 0) details.push(`${counts.objectifs} objectif${counts.objectifs > 1 ? 's' : ''}`)
      if (counts.taches > 0) details.push(`${counts.taches} tache${counts.taches > 1 ? 's' : ''}`)

      toast.success(
        `Phase "${phaseTitre}" activee !${details.length ? ` ${details.join(', ')} crees.` : ''}`
      )

      chargerDonnees()
    } catch (err) {
      console.error('Erreur changement de phase:', err)
      toast.error('Erreur lors du changement de phase.')
    }

    setAdvancingPhase(false)
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

  // Envoie un message vocal
  const envoyerVocal = async (audioUrl, audioDuration) => {
    if (!clientId) return
    const msg = {
      coach_id: user.id,
      client_id: clientId,
      expediteur: 'coach',
      contenu: '🎤 Note vocale',
      audio_url: audioUrl,
      audio_duration: Math.round(audioDuration),
    }
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, { ...msg, id: tempId, created_at: new Date().toISOString(), lu: false }])
    const { data } = await supabase.from('messages').insert(msg).select().single()
    if (data) setMessages(prev => prev.map(m => m.id === tempId ? data : m))
    setIsRecording(false)
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
      <div className="p-6 w-full max-w-4xl animate-pulse space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--bg-surface)] rounded" />
          <div className="h-7 w-48 bg-[var(--bg-surface)] rounded" />
        </div>
        <div className="h-32 bg-[var(--bg-surface)] rounded-xl" />
        <div className="h-48 bg-[var(--bg-surface)] rounded-xl" />
      </div>
    )
  }

  return (
    <div className="p-6 w-full max-w-4xl space-y-5">

      {/* ── En-tête ── */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/coach/clients')} className="text-[var(--text-muted)] hover:text-white transition-colors p-1">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-[var(--text-primary)] text-xl font-bold">
            {[profil?.prenom, profil?.nom].filter(Boolean).join(' ') || profil?.email}
          </h1>
          <p className="text-[var(--text-muted)] text-sm">{profil?.email}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-bold" style={{ color: couleur }}>{scoreAujourdhui}</p>
          <p className="text-[var(--text-muted)] text-xs">{labelScore(scoreAujourdhui)}</p>
        </div>
      </div>

      {/* ── Onglets ── */}
      <div className="flex gap-1 bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl p-1">
        {ONGLETS.map((o) => (
          <button
            key={o}
            onClick={() => setOnglet(o)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              onglet === o
                ? 'bg-[#FF6B2B] text-white'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] border border-[var(--border-base)] transition-colors"
        >
          <Download size={12} />
          Export habitudes (30j)
        </button>
        <button
          onClick={() => exportObjectifs(supabase, clientId, profil?.nom)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] border border-[var(--border-base)] transition-colors"
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
              <p className="text-[var(--text-muted)] text-[11px] uppercase tracking-wider mb-3">Score bien-être 7 jours</p>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={scoresSemaine} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <XAxis dataKey="jour" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} ticks={[0, 50, 100]} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)', borderRadius: 8, color: 'var(--text-primary)' }}
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
                <p className="text-[var(--text-muted)] text-xs mb-1">Habitudes</p>
                <p className="text-[var(--text-primary)] font-bold">{todayLogs.length}/{habitudes.length}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center py-3">
                <p className="text-[var(--text-muted)] text-xs mb-1">Sommeil</p>
                <p className="text-[var(--text-primary)] font-bold">{todaySommeil ? `${todaySommeil.heures}h` : '—'}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center py-3">
                <p className="text-[var(--text-muted)] text-xs mb-1">Humeur</p>
                <p className="text-[var(--text-primary)] font-bold">{todayHumeur ? `${todayHumeur.score}/10` : '—'}</p>
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
                    <p className="text-[var(--text-muted)] text-[11px] uppercase tracking-wider">Programme en cours</p>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">Phase {assignation.phase_actuelle}/{programmePhases.length}</span>
                </div>
                <p className="text-[var(--text-primary)] font-semibold text-sm mb-2">{programmeTitre}</p>
                {/* Barre progression phases */}
                <div className="flex gap-1">
                  {programmePhases.map((ph, i) => (
                    <div
                      key={ph.id}
                      className="h-1.5 rounded-full flex-1"
                      style={{
                        backgroundColor: i < assignation.phase_actuelle ? '#FF6B2B' : 'var(--border-base)',
                      }}
                    />
                  ))}
                </div>
                <p className="text-[var(--text-muted)] text-xs mt-2">
                  {programmePhases[assignation.phase_actuelle - 1]?.titre || ''}
                </p>

                {/* Boutons de gestion de phase */}
                <div className="flex gap-2 mt-4">
                  {assignation.phase_actuelle < programmePhases.length ? (
                    <button
                      onClick={changerPhase}
                      disabled={advancingPhase}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF6B2B] text-white text-xs font-semibold hover:bg-[#e55e24] transition-colors disabled:opacity-50"
                    >
                      {advancingPhase ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <ChevronRight size={13} />
                      )}
                      {advancingPhase ? 'Transition...' : 'Phase suivante'}
                    </button>
                  ) : (
                    <button
                      onClick={changerPhase}
                      disabled={advancingPhase}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF6B2B] text-white text-xs font-semibold hover:bg-[#FF9A6C] transition-colors disabled:opacity-50"
                    >
                      {advancingPhase ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <CheckSquare size={13} />
                      )}
                      Terminer le programme
                    </button>
                  )}
                </div>
              </CardBody>
            </Card>
          ) : (
            <button
              onClick={ouvrirModalProgramme}
              className="w-full py-3 rounded-xl border border-dashed border-[var(--border-base)] text-[var(--text-muted)] text-sm hover:text-[var(--text-secondary)] hover:border-[var(--border-base)] transition-colors flex items-center justify-center gap-2"
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
            <Card><CardBody className="text-center py-8 text-[var(--text-muted)] text-sm">Aucune habitude assignée.</CardBody></Card>
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
                      : <Circle size={18} className="text-[var(--text-muted)]" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-[var(--text-primary)] text-sm">{h.nom}</p>
                      <div className="mt-1.5 h-1 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: h.couleur }} />
                      </div>
                    </div>
                    <span className="text-[var(--text-muted)] text-xs">{pct}%</span>
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
            <Card><CardBody className="text-center py-8 text-[var(--text-muted)] text-sm">Aucun objectif.</CardBody></Card>
          ) : (
            objectifs.map((o) => {
              // Progression réelle : pour un objectif chiffré, calculée depuis
              // les valeurs départ/actuelle/cible (gère croissant ET décroissant,
              // ex. perte de poids). Sinon, on retombe sur le score stocké.
              const chiffre = o.valeur_cible != null && o.valeur_depart != null && o.valeur_cible !== o.valeur_depart
              const actuel = o.valeur_actuelle ?? o.valeur_depart
              const pct = chiffre
                ? Math.round(Math.min(100, Math.max(0, ((actuel - o.valeur_depart) / (o.valeur_cible - o.valeur_depart)) * 100)))
                : (o.score || 0)
              const couleurO = couleurScore(pct)
              return (
                <Card key={o.id}>
                  <CardBody>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[var(--text-primary)] text-sm font-medium truncate">{o.titre}</p>
                          {!o.peut_supprimer && <Lock size={11} className="text-[#FF6B2B]/50 flex-shrink-0" />}
                        </div>
                        {chiffre ? (
                          <p className="text-[var(--text-muted)] text-xs mt-0.5 tabular-nums">
                            {actuel ?? '—'} / <span className="text-[#FF6B2B] font-semibold">{o.valeur_cible}</span> {o.unite || ''}
                          </p>
                        ) : o.description ? (
                          <p className="text-[var(--text-muted)] text-xs mt-0.5 line-clamp-1">{o.description}</p>
                        ) : null}
                      </div>
                      <p className="font-bold flex-shrink-0" style={{ color: couleurO }}>{pct}%</p>
                    </div>
                    <div className="mt-2 h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: couleurO }} />
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
                <MessageSquare size={28} className="text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-[var(--text-muted)] text-sm">Aucun message pour l'instant.</p>
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
                    <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                      msg.expediteur === 'coach'
                        ? 'bg-[#FF6B2B] text-white rounded-br-sm'
                        : 'bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-bl-sm'
                    }`}>
                      <p>{msg.contenu}</p>
                      <p className={`text-[10px] mt-1 ${msg.expediteur === 'coach' ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              ))
            )}
          </div>

          {/* Raccourcis encouragements */}
          <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
            {['Bravo cette semaine 💪', 'Continue comme ça !', 'Tu es sur la bonne voie 🚀'].map((msg) => (
              <button key={msg} onClick={() => setTexteMsg(msg)}
                className="flex-shrink-0 text-xs bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-white border border-[var(--border-base)] rounded-full px-3 py-1.5 transition-colors">
                {msg}
              </button>
            ))}
          </div>

          {/* Saisie message */}
          <form onSubmit={envoyerMessage} className="flex gap-2">
            {isRecording ? (
              <VoiceRecorder onSend={envoyerVocal} disabled={envoi} />
            ) : (
              <>
                <input
                  value={texteMsg}
                  onChange={(e) => setTexteMsg(e.target.value)}
                  placeholder="Écrire un message…"
                  className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#FF6B2B]/40"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) envoyerMessage(e) }}
                />
                {!texteMsg.trim() ? (
                  <button
                    type="button"
                    onClick={() => setIsRecording(true)}
                    className="w-10 h-10 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-base)] flex items-center justify-center text-[var(--text-muted)] hover:text-[#FF6B2B] hover:border-[#FF6B2B]/30 transition-all flex-shrink-0"
                    title="Note vocale"
                  >
                    <Mic size={16} />
                  </button>
                ) : (
                  <button type="submit" disabled={!texteMsg.trim() || envoi}
                    className="w-10 h-10 rounded-xl bg-[#FF6B2B] flex items-center justify-center hover:bg-[#FF9A6C] transition-colors disabled:opacity-40 flex-shrink-0">
                    <Send size={15} className="text-white" />
                  </button>
                )}
              </>
            )}
          </form>
        </div>
      )}

      {/* ══════════ MODALS ══════════ */}

      {/* Modal assigner habitude */}
      <Modal isOpen={modalHab} onClose={() => setModalHab(false)} title="Assigner une habitude">
        <form onSubmit={assignerHabitude} className="space-y-4">
          <Input label="Nom de l'habitude" placeholder="Ex : Boire 2L d'eau" value={nomHab} onChange={(e) => setNomHab(e.target.value)} required autoFocus />
          <div>
            <p className="text-sm text-[var(--text-secondary)] font-medium mb-2">Couleur</p>
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
            <Layers size={28} className="text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-[var(--text-muted)] text-sm mb-3">Aucun programme créé</p>
            <Button size="sm" onClick={() => { setModalProg(false); window.location.href = '/coach/sport' }}>
              Créer un programme
            </Button>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {programmes.map((prog) => (
              <button
                key={prog.id}
                onClick={() => assignerProgramme(prog.id)}
                disabled={assigningProg !== null}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-surface)]/50 hover:bg-[var(--bg-surface)] text-left transition-colors disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center shrink-0">
                  {assigningProg === prog.id ? (
                    <Loader2 size={18} className="text-[#FF6B2B] animate-spin" />
                  ) : (
                    <Layers size={18} className="text-[#FF6B2B]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-primary)] text-sm font-medium truncate">{prog.titre}</p>
                  <p className="text-[var(--text-muted)] text-xs">{prog.duree_semaines} sem. {prog.categorie ? `· ${prog.categorie}` : ''}</p>
                </div>
                {assigningProg === prog.id ? (
                  <span className="text-[#FF6B2B] text-xs shrink-0">Assignation...</span>
                ) : (
                  <Play size={14} className="text-[#FF6B2B] shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </Modal>

      {/* Modal assigner objectif */}
      <Modal isOpen={modalObj} onClose={() => setModalObj(false)} title="Assigner un objectif">
        <form onSubmit={assignerObjectif} className="space-y-4">
          <Input label="Titre de l'objectif" placeholder="Ex : Perdre du poids, Courir 10 km…" value={titreObj} onChange={(e) => setTitreObj(e.target.value)} required autoFocus />

          {/* Type d'objectif */}
          <div>
            <label className="text-sm text-[var(--text-secondary)] font-medium block mb-1.5">Type d'objectif</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'chiffre', label: 'Chiffré', desc: 'Mesurable (kg, km…)' },
                { id: 'simple', label: 'Simple', desc: 'À atteindre' },
              ].map(t => (
                <button key={t.id} type="button" onClick={() => setTypeObj(t.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    typeObj === t.id
                      ? 'border-[#FF6B2B] bg-[#FF6B2B]/10'
                      : 'border-[var(--border-base)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
                  }`}>
                  <p className={`text-sm font-semibold ${typeObj === t.id ? 'text-[#FF6B2B]' : 'text-[var(--text-primary)]'}`}>{t.label}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Cible chiffrée — flexible : n'importe quelle unité */}
          {typeObj === 'chiffre' && (
            <div className="space-y-2.5 rounded-xl border border-[var(--border-base)] bg-[var(--bg-surface)]/40 p-3">
              <div className="grid grid-cols-3 gap-2">
                <Input label="Départ" type="number" step="any" inputMode="decimal" placeholder="80" value={valeurDepart} onChange={(e) => setValeurDepart(e.target.value)} />
                <Input label="Cible" type="number" step="any" inputMode="decimal" placeholder="75" value={valeurCible} onChange={(e) => setValeurCible(e.target.value)} required />
                <Input label="Unité" placeholder="kg" value={uniteObj} onChange={(e) => setUniteObj(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['kg', 'km', 'm', 'cm', '%', 'reps', 'séances', 'min', 'L', 'pas'].map(u => (
                  <button key={u} type="button" onClick={() => setUniteObj(u)}
                    className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                      uniteObj === u ? 'border-[#FF6B2B] text-[#FF6B2B] bg-[#FF6B2B]/10' : 'border-[var(--border-base)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}>{u}</button>
                ))}
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">
                Le client fera progresser sa valeur de <b>{valeurDepart || '…'}</b> vers <b>{valeurCible || '…'}</b> {uniteObj}. La barre de progression se calcule automatiquement.
              </p>
            </div>
          )}

          <div>
            <label className="text-sm text-[var(--text-secondary)] font-medium block mb-1.5">Description (optionnel)</label>
            <textarea value={descObj} onChange={(e) => setDescObj(e.target.value)} placeholder="Contexte, étapes clés…" rows={2}
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg px-3.5 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#FF6B2B]/50 resize-none" />
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
