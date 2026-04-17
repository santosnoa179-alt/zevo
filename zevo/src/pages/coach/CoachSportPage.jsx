import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import ProgramBuilder from './ProgramBuilder'
import Ring from '../../components/ui/Ring'
import {
  Search, Filter, Plus, Calendar, RefreshCw, X,
  Dumbbell, Loader2, ChevronRight, Tag, Users, Activity, CheckCircle,
  CalendarDays, Clock, MoreHorizontal, MoreVertical, Layers, Trash2, Eye, EyeOff
} from 'lucide-react'

// Palette avatar atténuée — cohérence Fitness OS
const AVATAR_COLORS = ['#FF6B2B', '#64748b', '#475569', '#9ca3af', '#334155', '#7c7c7c', '#FF9A6C']

const TABS = [
  { id: 'assigned', label: 'Programmes assignés' },
  { id: 'templates', label: 'Modèles' },
]

export default function CoachSportPage() {
  const { user } = useAuth()
  const toast = useToast()

  const [currentView, setCurrentView] = useState('dashboard')
  const [builderProgramme, setBuilderProgramme] = useState(null)

  // Real data
  const [programmes, setProgrammes] = useState([])
  const [programmesPro, setProgrammesPro] = useState([])
  const [assignations, setAssignations] = useState({}) // { programme_id: { client_nom, client_initials, statut, client_id } }
  const [suiviData, setSuiviData] = useState({}) // { programme_id_client_id: [{ numero_semaine }] }
  const [isLoading, setIsLoading] = useState(true)

  const [activeTab, setActiveTab] = useState('assigned')
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  // ── Create modal state ──
  const [createMode, setCreateMode] = useState('programme') // 'programme' | 'modele'
  const [programType, setProgramType] = useState('calendrier') // 'calendrier' | 'flexible'
  const [createTitle, setCreateTitle] = useState('')
  const [createDate, setCreateDate] = useState(new Date().toISOString().split('T')[0])
  const [createTags, setCreateTags] = useState('')
  const [createClient, setCreateClient] = useState('')
  const [creating, setCreating] = useState(false)

  // ── Assign model modal ──
  const [showAssignModal, setShowAssignModal] = useState(false)
  // ── Assignation programme Pro ──
  const [proAssignId, setProAssignId] = useState(null)      // null = fermé
  const [proAssignClientId, setProAssignClientId] = useState('')
  const [assigningPro, setAssigningPro] = useState(false)
  const [assignModelId, setAssignModelId] = useState('')
  const [assignClientId, setAssignClientId] = useState('')
  const [assigning, setAssigning] = useState(false)

  // ── Actions menu + filter ──
  const [actionMenuId, setActionMenuId] = useState(null) // programme id with open menu
  const [filterStatus, setFilterStatus] = useState('tous') // 'tous' | 'actif' | 'brouillon'
  const [showFilterMenu, setShowFilterMenu] = useState(false)

  // ── Clients for dropdown ──
  const [clients, setClients] = useState([])
  useEffect(() => {
    if (!user) return
    supabase.from('clients').select('id, profiles!inner(id, nom, prenom, email)').eq('coach_id', user.id).eq('actif', true)
      .then(({ data }) => { console.log('[CoachSportPage] Clients chargés:', data); setClients(data || []) })
  }, [user])

  // ── Fetch programmes from Supabase ──
  const fetchProgrammes = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      // Fetch all programmes — simple query, no complex joins
      console.log('[CoachSportPage] Fetching programmes for coach:', user.id)
      const { data: progs, error } = await supabase
        .from('programmes')
        .select('*')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false })

      console.log('[CoachSportPage] Programmes récupérés:', progs)
      if (error) {
        console.error('[CoachSportPage] Erreur fetch programmes:', error)
      }
      setProgrammes(progs || [])

      // Fetch programmes Pro (nouveau builder multi-phases)
      try {
        const { data: pro } = await supabase
          .from('sport_programmes')
          .select('*, profiles:client_id(id, nom, prenom)')
          .eq('coach_id', user.id)
          .order('created_at', { ascending: false })
        setProgrammesPro(pro || [])
      } catch (e) {
        console.warn('[CoachSportPage] sport_programmes indisponible (schema non appliqué ?):', e)
        setProgrammesPro([])
      }

      // Fetch assignations with client names (separate query, won't break if it fails)
      try {
        const { data: assigns, error: assignErr } = await supabase
          .from('programme_assignations')
          .select('programme_id, client_id, statut, date_debut, clients(id, profiles(nom, prenom))')
          .eq('coach_id', user.id)

        console.log('[CoachSportPage] Assignations récupérées:', assigns)
        if (assignErr) console.error('[CoachSportPage] Erreur fetch assignations:', assignErr)

        const assignMap = {}
        ;(assigns || []).forEach(a => {
          const p = a.clients?.profiles
          const prenom = p?.prenom || ''
          const nom = p?.nom || ''
          const fullName = (prenom && nom) ? `${prenom} ${nom}` : nom || prenom || 'Client'
          const initials = getInitials(prenom, nom)
          assignMap[a.programme_id] = {
            client_nom: fullName,
            client_initials: initials,
            statut: a.statut || 'en_cours',
            date_debut: a.date_debut,
            client_id: a.clients?.id || null,
          }
        })
        setAssignations(assignMap)

        // Récupérer le suivi de progression via SECURITY DEFINER (bypass RLS)
        const { data: suivis, error: suiviErr } = await supabase
          .rpc('get_coach_suivi_programmes', { coach_uid: user.id })

        if (suiviErr) {
          console.warn('[CoachSportPage] suivi RPC error:', suiviErr.message)
        }

        const suiviMap = {}
        ;(suivis || []).forEach(s => {
          const key = `${s.programme_id}_${s.client_id}`
          if (!suiviMap[key]) suiviMap[key] = []
          suiviMap[key].push(s)
        })
        console.log('[CoachSportPage] suiviMap:', suiviMap)
        setSuiviData(suiviMap)
      } catch (assignCatchErr) {
        console.error('[CoachSportPage] Assignations fetch crashed:', assignCatchErr)
        // Non-blocking — continue without assignations
      }
    } catch (err) {
      console.error('[CoachSportPage] ERREUR CRITIQUE:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => { fetchProgrammes() }, [fetchProgrammes])

  // Helper: get displayable client name
  const getClientName = (c) => {
    if (!c?.profiles) return 'Client'
    const { prenom, nom } = c.profiles
    if (prenom && nom) return `${prenom} ${nom}`
    if (nom) return nom
    if (prenom) return prenom
    return c.profiles.email || 'Client'
  }

  // Helper: get initials from prenom/nom
  const getInitials = (prenom, nom) => {
    if (prenom && nom) return (prenom[0] + nom[0]).toUpperCase()
    if (nom && nom.length >= 2) return nom.slice(0, 2).toUpperCase()
    if (prenom && prenom.length >= 2) return prenom.slice(0, 2).toUpperCase()
    return '?'
  }

  // Models = programmes without assignation
  const modelProgrammes = programmes.filter(p => !assignations[p.id])

  // ── Assign model to client ──
  const handleAssignModelToClient = async () => {
    if (!assignModelId || !assignClientId) return
    setAssigning(true)
    try {
      // Check if assignation already exists (avoid 409)
      const { data: existing } = await supabase
        .from('programme_assignations')
        .select('id')
        .eq('programme_id', assignModelId)
        .eq('client_id', assignClientId)
        .maybeSingle()

      let error = null
      if (!existing) {
        const res = await supabase.from('programme_assignations').insert({
          programme_id: assignModelId,
          client_id: assignClientId,
          coach_id: user.id,
          date_debut: new Date().toISOString().split('T')[0],
          phase_actuelle: 1,
          statut: 'en_cours',
        })
        error = res.error
      }

      if (error) {
        console.error('[CoachSportPage] Erreur assignation:', error)
        toast.error('Erreur : ' + (error.message || 'Réessayez'))
      } else {
        const progName = programmes.find(p => p.id === assignModelId)?.titre || 'Programme'
        const clientObj = clients.find(c => c.profiles?.id === assignClientId)
        const clientName = clientObj ? getClientName(clientObj) : 'Client'
        toast.success(`"${progName}" assigné à ${clientName} !`)
        setShowAssignModal(false)
        setAssignModelId('')
        setAssignClientId('')
        fetchProgrammes()
      }
    } catch (err) {
      console.error('[CoachSportPage] Erreur assignation crash:', err)
      toast.error('Erreur inattendue')
    }
    setAssigning(false)
  }

  // ── Delete programme ──
  const handleDeleteProgramme = async (progId) => {
    if (!confirm('Supprimer ce programme ? Les assignations et séances liées seront aussi supprimées.')) return
    try {
      // Delete assignations
      await supabase.from('programme_assignations').delete().eq('programme_id', progId)
      // Delete seances linked to this programme
      const marker = `programme:${progId}`
      await supabase.from('seances').delete().eq('notes', marker)
      // Delete programme
      const { error } = await supabase.from('programmes').delete().eq('id', progId)
      if (error) throw error
      toast.success('Programme supprimé !')
      setActionMenuId(null)
      fetchProgrammes()
    } catch (err) {
      console.error('[CoachSportPage] Erreur suppression:', err)
      toast.error('Erreur : ' + (err.message || 'Réessayez'))
    }
  }

  // Filter programmes by search + tab + status
  // Legacy programmes (table `programmes`) + Pro programmes (table `sport_programmes`)
  const assignedCount =
    programmes.filter(p => assignations[p.id]).length +
    programmesPro.filter(p => p.client_id).length
  const templatesCount =
    programmes.filter(p => !assignations[p.id]).length +
    programmesPro.filter(p => !p.client_id).length

  const filteredProgrammes = programmes.filter(p => {
    const matchSearch = !search || p.titre?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'tous' || (filterStatus === 'actif' && p.actif) || (filterStatus === 'brouillon' && !p.actif)
    if (activeTab === 'assigned') return matchSearch && matchStatus && assignations[p.id]
    if (activeTab === 'templates') return matchSearch && matchStatus && !assignations[p.id]
    return matchSearch
  })

  // Programmes Pro filtrés (pour ajout dans les mêmes onglets)
  const filteredProgrammesPro = programmesPro.filter(p => {
    const matchSearch = !search || p.nom?.toLowerCase().includes(search.toLowerCase())
    if (activeTab === 'assigned') return matchSearch && p.client_id
    if (activeTab === 'templates') return matchSearch && !p.client_id
    return matchSearch
  })

  // Assigner un programme Pro à un client = clone complet du programme + toutes ses phases/seances/exos
  const handleAssignPro = async () => {
    if (!proAssignId || !proAssignClientId) return
    setAssigningPro(true)
    try {
      // 1. Fetch source programme + tout l'arbre
      const [srcProgRes, srcPhasesRes, srcSeanceTypesRes, srcPhaseJoursRes, srcExosRes] = await Promise.all([
        supabase.from('sport_programmes').select('*').eq('id', proAssignId).single(),
        supabase.from('sport_phases').select('*').eq('programme_id', proAssignId).order('ordre'),
        supabase.from('sport_seance_types').select('*').order('ordre'),
        supabase.from('sport_phase_jours').select('*'),
        supabase.from('sport_seance_exercices').select('*').order('ordre'),
      ])
      const srcProg = srcProgRes.data
      if (!srcProg) throw new Error('Programme introuvable')

      const phaseIds = (srcPhasesRes.data || []).map(p => p.id)
      const seanceTypes = (srcSeanceTypesRes.data || []).filter(st => phaseIds.includes(st.phase_id))
      const phaseJours = (srcPhaseJoursRes.data || []).filter(pj => phaseIds.includes(pj.phase_id))
      const stIds = seanceTypes.map(st => st.id)
      const exos = (srcExosRes.data || []).filter(e => stIds.includes(e.seance_type_id))

      // 2. Créer nouveau programme assigné au client
      const { data: newProg, error: newProgErr } = await supabase.from('sport_programmes').insert({
        coach_id: user.id,
        client_id: proAssignClientId,
        nom: srcProg.nom,
        description: srcProg.description,
        objectif: srcProg.objectif,
        duree_semaines: srcProg.duree_semaines,
        frequence_hebdo: srcProg.frequence_hebdo,
        niveau: srcProg.niveau,
        is_template: false,
        is_active: true,
        date_debut: new Date().toISOString().slice(0, 10),
      }).select().single()
      if (newProgErr) throw newProgErr

      // 3. Dupliquer phases + mapper IDs
      const phaseIdMap = {} // old → new
      for (const ph of srcPhasesRes.data || []) {
        const { data: newPh, error } = await supabase.from('sport_phases').insert({
          programme_id: newProg.id,
          nom: ph.nom,
          ordre: ph.ordre,
          semaine_debut: ph.semaine_debut,
          duree_semaines: ph.duree_semaines,
          objectif_focus: ph.objectif_focus,
          volume_cible_hebdo_sets: ph.volume_cible_hebdo_sets,
          notes: ph.notes,
        }).select().single()
        if (error) throw error
        phaseIdMap[ph.id] = newPh.id
      }

      // 4. Dupliquer seance_types + mapper IDs
      const stIdMap = {}
      for (const st of seanceTypes) {
        const { data: newSt, error } = await supabase.from('sport_seance_types').insert({
          phase_id: phaseIdMap[st.phase_id],
          nom: st.nom, focus: st.focus, icon: st.icon, ordre: st.ordre,
          duree_estimee_min: st.duree_estimee_min, notes: st.notes,
        }).select().single()
        if (error) throw error
        stIdMap[st.id] = newSt.id
      }

      // 5. Dupliquer exercices (avec tous les params : RPE, tempo, progression, supersets...)
      if (exos.length) {
        const exoRows = exos.map(e => ({
          seance_type_id: stIdMap[e.seance_type_id],
          exercice_id: e.exercice_id,
          exercice_nom_custom: e.exercice_nom_custom,
          ordre: e.ordre,
          series: e.series, reps_cible: e.reps_cible,
          charge_kg: e.charge_kg, charge_unite: e.charge_unite,
          progression_type: e.progression_type, progression_value: e.progression_value, progression_freq: e.progression_freq,
          rpe_cible: e.rpe_cible, rir_cible: e.rir_cible,
          tempo: e.tempo, rest_sec: e.rest_sec,
          superset_group: e.superset_group, technique: e.technique,
          notes_coach: e.notes_coach,
        }))
        const { error: exoErr } = await supabase.from('sport_seance_exercices').insert(exoRows)
        if (exoErr) throw exoErr
      }

      // 6. Dupliquer phase_jours (assignation jour → seance_type)
      if (phaseJours.length) {
        const pjRows = phaseJours.map(pj => ({
          phase_id: phaseIdMap[pj.phase_id],
          jour_semaine: pj.jour_semaine,
          seance_type_id: pj.seance_type_id ? stIdMap[pj.seance_type_id] : null,
        })).filter(pj => pj.phase_id)
        if (pjRows.length) {
          const { error: pjErr } = await supabase.from('sport_phase_jours').insert(pjRows)
          if (pjErr) throw pjErr
        }
      }

      // 7. DÉPLOIEMENT AUTO : générer les séances individuelles dans le calendrier
      //    Pour chaque phase, chaque semaine, chaque jour avec assignation →
      //    créer une séance + copier les exercices (avec charge progressée)
      const dateDebut = new Date()
      dateDebut.setHours(0, 0, 0, 0)
      const allSeancesToInsert = []
      const exosSourceByStId = {} // stId old → [exo sources]
      ;(exos || []).forEach(e => {
        if (!exosSourceByStId[e.seance_type_id]) exosSourceByStId[e.seance_type_id] = []
        exosSourceByStId[e.seance_type_id].push(e)
      })
      // Pour chaque phase source, construire les séances à créer
      for (const phSrc of (srcPhasesRes.data || [])) {
        const newPhaseId = phaseIdMap[phSrc.id]
        const pjForPhase = phaseJours.filter(pj => pj.phase_id === phSrc.id)
        for (let weekOffset = 0; weekOffset < phSrc.duree_semaines; weekOffset++) {
          const weekNumber = phSrc.semaine_debut + weekOffset
          for (const pj of pjForPhase) {
            if (!pj.seance_type_id) continue
            const stSrc = seanceTypes.find(s => s.id === pj.seance_type_id)
            if (!stSrc) continue
            const date = new Date(dateDebut)
            date.setDate(dateDebut.getDate() + (weekNumber - 1) * 7 + pj.jour_semaine)
            allSeancesToInsert.push({
              __stSrcId: stSrc.id, // temp pour lier les exos après
              __weekOffset: weekOffset,
              coach_id: user.id,
              client_id: proAssignClientId,
              titre: stSrc.nom || 'Séance',
              date_prevue: date.toISOString().slice(0, 10),
              is_template: false,
              is_completed: false,
              sport_programme_id: newProg.id,
              sport_phase_id: newPhaseId,
              sport_seance_type_id: stIdMap[stSrc.id],
              week_number: weekNumber,
              duree_estimee_min: stSrc.duree_estimee_min || null,
              notes: `programme_pro:${newProg.id}`,
            })
          }
        }
      }
      // Insérer toutes les séances en batch
      if (allSeancesToInsert.length) {
        const seancesPayload = allSeancesToInsert.map(({ __stSrcId, __weekOffset, ...row }) => row)
        const { data: insertedSeances, error: seancesErr } = await supabase.from('seances').insert(seancesPayload).select()
        if (seancesErr) throw seancesErr

        // Pour chaque séance insérée, retrouver ses exos sources via l'index
        const exosToInsert = []
        insertedSeances.forEach((seanceRow, idx) => {
          const meta = allSeancesToInsert[idx]
          const sources = exosSourceByStId[meta.__stSrcId] || []
          sources.forEach(exo => {
            // Calcul de la charge pour cette semaine (progression auto)
            const baseCharge = +exo.charge_kg || 0
            let chargeAtWeek = baseCharge
            if (baseCharge > 0 && exo.progression_type && exo.progression_value) {
              if (exo.progression_type === 'lineaire') chargeAtWeek = baseCharge + (+exo.progression_value * meta.__weekOffset)
              else if (exo.progression_type === 'pourcentage') chargeAtWeek = baseCharge * Math.pow(1 + (+exo.progression_value / 100), meta.__weekOffset)
            }
            exosToInsert.push({
              seance_id: seanceRow.id,
              // exercice_id (uuid, legacy exercices) laissé null : exo.exercice_id est un text
              // qui pointe vers exercises (ExerciseDB). On retrouve l'exo via sport_seance_exercice_id.
              exercice_id: null,
              ordre: exo.ordre,
              series: exo.series,
              reps_cible: exo.reps_cible,
              charge_kg: Math.round(chargeAtWeek * 10) / 10 || null,
              charge_unite: exo.charge_unite || 'kg',
              rpe_cible: exo.rpe_cible,
              rir_cible: exo.rir_cible,
              tempo: exo.tempo,
              rest_sec: exo.rest_sec,
              superset_group: exo.superset_group,
              technique: exo.technique,
              notes_coach: exo.notes_coach,
              progression_type: exo.progression_type,
              progression_value: exo.progression_value,
              progression_freq: exo.progression_freq,
              sport_seance_exercice_id: exo.id,
            })
          })
        })
        if (exosToInsert.length) {
          const { error: exosErr } = await supabase.from('seance_exercices').insert(exosToInsert)
          if (exosErr) throw exosErr
        }
      }

      toast.success(`Programme assigné — ${allSeancesToInsert.length} séances déployées !`)
      setProAssignId(null)
      setProAssignClientId('')
      fetchProgrammes()
    } catch (err) {
      console.error('[handleAssignPro]', err)
      toast.error('Erreur : ' + (err.message || err))
    }
    setAssigningPro(false)
  }

  const openCreate = () => {
    setCreateMode('programme')
    setProgramType('calendrier')
    setCreateTitle('')
    setCreateDate(new Date().toISOString().split('T')[0])
    setCreateTags('')
    setCreateClient('')
    setShowCreateModal(true)
  }

  const handleCreate = async () => {
    if (!createTitle.trim()) return
    setCreating(true)

    // Build programme object — NO frontend-generated ID
    // The ProgramBuilder will create it in Supabase on first save/publish
    const newProg = {
      // id intentionally omitted — will be created by Supabase
      titre: createTitle.trim(),
      type: programType,
      mode: createMode,
      date_debut: createDate,
      tags: createTags,
      client_id: createClient || null,
      duree_semaines: 4,
    }

    console.log('[CoachSportPage] Nouveau programme créé (local):', newProg)

    setShowCreateModal(false)
    setCreating(false)
    setBuilderProgramme(newProg)
    setCurrentView('builder')
    toast.success(`Programme "${createTitle}" prêt à construire !`)
  }

  // ── Builder view ──
  if (currentView === 'builder' && builderProgramme) {
    return (
      <ProgramBuilder
        programme={builderProgramme}
        onBack={() => { setCurrentView('dashboard'); setBuilderProgramme(null); fetchProgrammes() }}
      />
    )
  }

  // Stats overview
  const assignedProgrammes = programmes.filter(p => assignations[p.id])
  const totalAssigned = assignedProgrammes.length
  const enCoursCount = assignedProgrammes.filter(p => {
    const a = assignations[p.id]
    return a && a.statut !== 'termine'
  }).length
  const termineCount = assignedProgrammes.filter(p => {
    const a = assignations[p.id]
    return a && a.statut === 'termine'
  }).length
  const progressAvg = (() => {
    if (assignedProgrammes.length === 0) return 0
    let total = 0
    assignedProgrammes.forEach(p => {
      const a = assignations[p.id]
      if (!a) return
      const weeks = p.duree_semaines || 4
      const done = (suiviData[`${p.id}_${a.client_id}`] || []).length
      total += Math.min(100, Math.round((done / weeks) * 100))
    })
    return Math.round(total / assignedProgrammes.length)
  })()

  // ── Dashboard view ──
  return (
    <div className="p-4 md:p-6 w-full max-w-[1400px] mx-auto space-y-5 md:space-y-6">

      {/* ═══ Header ═══ */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[var(--text-primary)] text-2xl md:text-3xl font-bold tracking-tight">Sport</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1.5">Programmes multi-phases avec phases, séances types et exercices</p>
        </div>
        <button onClick={() => window.location.href = '/coach/sport/programme/new'}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-all active:scale-95 shrink-0">
          <Plus size={15} /> Créer un programme
        </button>
      </div>

      {/* ═══ Stats overview — metric-card ═══ */}
      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Assignés', value: totalAssigned, icon: Users, ringValue: totalAssigned, ringMax: Math.max(1, totalAssigned) },
            { label: 'En cours', value: enCoursCount, icon: Activity, ringValue: enCoursCount, ringMax: Math.max(1, totalAssigned) },
            { label: 'Progression moy.', value: `${progressAvg}%`, icon: Dumbbell, ringValue: progressAvg, ringMax: 100 },
            { label: 'Terminés', value: termineCount, icon: CheckCircle, ringValue: termineCount, ringMax: Math.max(1, totalAssigned) },
          ].map((s, i) => (
            <div key={i} className="metric-card p-3 md:p-4">
              <div className="relative z-[1] flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-2">
                    <s.icon size={11} className="text-[var(--text-muted)]" />
                    <p className="text-[var(--text-muted)] text-[10px] font-semibold uppercase tracking-[0.14em] truncate">{s.label}</p>
                  </div>
                  <p className="text-[var(--text-primary)] text-[22px] md:text-[24px] font-black tabular-nums tracking-tight leading-none">{s.value}</p>
                </div>
                <Ring
                  value={s.ringValue}
                  max={s.ringMax}
                  size={40}
                  thickness={3.5}
                  color="#FF6B2B"
                  trackColor="var(--ring-track)"
                  className="shrink-0"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Tabs + Search ═══ */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl p-1">
          {[
            { key: 'assigned', label: 'Assignés', count: assignedCount },
            { key: 'templates', label: 'Modèles', count: templatesCount },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`py-2 px-4 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                activeTab === t.key
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-base)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-transparent'
              }`}>
              {t.label}
              <span className={`ml-1.5 text-[10px] font-bold tabular-nums ${activeTab === t.key ? 'text-[#FF6B2B]' : 'text-[var(--text-muted)]'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 md:flex-none max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full md:w-56 bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl pl-9 pr-3 py-2 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/40 focus:ring-1 focus:ring-[#FF6B2B]/10 transition-all" />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin text-[#FF6B2B]" size={20} />
          <span className="text-[var(--text-muted)] text-sm">Chargement des programmes...</span>
        </div>
      )}

      {/* ═══════ ONGLET : PROGRAMMES ASSIGNÉS (legacy + Pro) ═══════ */}
      {!isLoading && activeTab === 'assigned' && (
        <>
          {filteredProgrammes.length === 0 && filteredProgrammesPro.length === 0 ? (
            <div className="hero-card p-12 text-center">
              <Dumbbell size={28} className="text-[var(--text-muted)] mx-auto mb-4 animate-breathe" strokeWidth={1.5} />
              <h3 className="text-[var(--text-primary)] font-bold text-base mb-2 tracking-tight">
                {search ? 'Aucun résultat' : 'Aucun programme assigné'}
              </h3>
              <p className="text-[var(--text-muted)] text-sm mb-5 max-w-sm mx-auto">
                {search ? `Aucun résultat pour "${search}"` : 'Crée un modèle puis assigne-le à un client.'}
              </p>
              {!search && (
                <button onClick={() => setActiveTab('templates')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-surface)] text-[var(--text-secondary)] text-xs font-semibold hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-all">
                  <Layers size={13} /> Voir les modèles
                </button>
              )}
            </div>
          ) : (
            /* Grid responsive — scale avec beaucoup de clients (1 / 2 / 3 colonnes) */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredProgrammes.map((prog, idx) => {
                const assign = assignations[prog.id]
                if (!assign) return null

                const totalWeeks = prog.duree_semaines || 4
                const suiviKey = assign.client_id ? `${prog.id}_${assign.client_id}` : null
                const weeksDone = suiviKey ? (suiviData[suiviKey] || []).length : 0
                const progressPct = Math.min(100, Math.round((weeksDone / totalWeeks) * 100))
                const isComplete = progressPct >= 100
                const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length]
                const statusLabel = assign.statut === 'termine' ? 'Terminé' : assign.statut === 'pause' ? 'Pause' : 'En cours'
                const statusColor = assign.statut === 'termine' ? 'text-[var(--text-muted)]' : assign.statut === 'pause' ? 'text-[#FF6B2B]' : 'text-[#FF6B2B]'
                const statusDot = assign.statut === 'termine' ? 'bg-[var(--text-muted)]' : assign.statut === 'pause' ? 'bg-[#FF6B2B]' : 'bg-[#FF6B2B]'

                return (
                  <div key={prog.id}
                    onClick={() => {
                      setBuilderProgramme({ ...prog, mode: 'programme' })
                      setCurrentView('builder')
                    }}
                    className="group hero-card p-4 hover:border-[#FF6B2B]/30 transition-all cursor-pointer">

                    <div className="flex items-start gap-3">
                      {/* Avatar palette atténuée */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 uppercase"
                        style={{ backgroundColor: avatarColor }}>
                        {assign.client_initials}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-[var(--text-primary)] font-bold text-sm leading-tight truncate">{assign.client_nom}</h3>
                        <p className="text-[var(--text-muted)] text-xs truncate mt-0.5">{prog.titre}</p>

                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${statusColor}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                            {statusLabel}
                          </span>
                          {prog.categorie && (
                            <>
                              <span className="text-[var(--text-muted)] text-[10px]">·</span>
                              <span className="text-[var(--text-muted)] text-[10px] truncate">{prog.categorie}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Mini-ring progression */}
                      <Ring
                        value={weeksDone}
                        max={totalWeeks}
                        size={42}
                        thickness={3.5}
                        color={isComplete ? '#FF6B2B' : '#FF6B2B'}
                        trackColor="var(--ring-track)"
                        className="shrink-0"
                      >
                        <span className={`text-[9px] font-black tabular-nums ${isComplete ? 'text-[#FF6B2B]' : 'text-[var(--text-primary)]'}`}>{weeksDone}/{totalWeeks}</span>
                      </Ring>

                      <button onClick={e => { e.stopPropagation(); handleDeleteProgramme(prog.id) }}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                        title="Supprimer le programme assigné">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* ── Programmes Pro assignés (sport_programmes) ── */}
              {filteredProgrammesPro.map((pro, idx) => {
                const avatarColor = AVATAR_COLORS[(filteredProgrammes.length + idx) % AVATAR_COLORS.length]
                const clientName = pro.profiles ? [pro.profiles.prenom, pro.profiles.nom].filter(Boolean).join(' ') : 'Client'
                const initials = clientName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <div key={`pro-${pro.id}`}
                    onClick={() => window.location.href = `/coach/sport/programme/${pro.id}`}
                    className="group hero-card p-4 hover:border-[#FF6B2B]/30 transition-all cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 uppercase"
                        style={{ backgroundColor: avatarColor }}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[var(--text-primary)] font-bold text-sm leading-tight truncate">{clientName}</h3>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FF6B2B]/10 text-[#FF6B2B] border border-[#FF6B2B]/20 shrink-0">PRO</span>
                        </div>
                        <p className="text-[var(--text-muted)] text-xs truncate mt-0.5">{pro.nom}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${pro.is_active ? 'text-[#FF6B2B]' : 'text-[var(--text-muted)]'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${pro.is_active ? 'bg-[#FF6B2B]' : 'bg-[var(--text-muted)]'}`} />
                            {pro.is_active ? 'Actif' : 'Inactif'}
                          </span>
                          <span className="text-[var(--text-muted)] text-[10px]">·</span>
                          <span className="text-[var(--text-muted)] text-[10px] tabular-nums">{pro.duree_semaines} sem.</span>
                          {pro.objectif && (
                            <>
                              <span className="text-[var(--text-muted)] text-[10px]">·</span>
                              <span className="text-[var(--text-muted)] text-[10px] capitalize">{pro.objectif}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ═══════ ONGLET : MODÈLES (legacy + Pro) ═══════ */}
      {!isLoading && activeTab === 'templates' && (
        <>
          {filteredProgrammes.length === 0 && filteredProgrammesPro.length === 0 ? (
            <div className="hero-card p-16 text-center">
              <Dumbbell size={32} className="text-[var(--text-muted)] mx-auto mb-4 animate-breathe" strokeWidth={1.5} />
              <h3 className="text-[var(--text-primary)] font-bold text-lg mb-2 tracking-tight">
                {search ? 'Aucun résultat' : 'Aucun programme'}
              </h3>
              <p className="text-[var(--text-muted)] text-sm mb-6 max-w-md mx-auto">
                {search ? `Aucun modèle pour "${search}"` : 'Crée ton premier programme de coaching structuré.'}
              </p>
              {!search && (
                <button onClick={() => window.location.href = '/coach/sport/programme/new'}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-all active:scale-95">
                  <Plus size={15} /> Créer un programme
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredProgrammes.map(prog => (
                <div key={prog.id}
                  className="hero-card p-4 hover:border-[#FF6B2B]/30 transition-all group">

                  <div className="flex items-start gap-3 mb-4">
                    <Dumbbell size={16} className="text-[var(--text-muted)] shrink-0 mt-0.5" strokeWidth={1.75} />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[var(--text-primary)] font-bold text-sm leading-tight truncate">{prog.titre}</h3>
                      {prog.description && (
                        <p className="text-[var(--text-muted)] text-[11px] mt-0.5 line-clamp-2">{prog.description}</p>
                      )}
                    </div>
                    <button onClick={e => { e.stopPropagation(); handleDeleteProgramme(prog.id) }}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    <span className="inline-flex items-center gap-1 bg-[var(--bg-base)] px-2 py-1 rounded-md text-[10px] text-[var(--text-muted)] font-semibold border border-[var(--border-subtle)] tabular-nums">
                      <Calendar size={11} /> {prog.duree_semaines || 4} sem.
                    </span>
                    {prog.categorie && (
                      <span className="px-2 py-1 rounded-md bg-[#FF6B2B]/10 text-[#FF6B2B] text-[10px] font-semibold">
                        {prog.categorie}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold ${
                      prog.actif
                        ? 'text-[#FF6B2B] bg-[#FF6B2B]/10'
                        : 'text-[var(--text-muted)] bg-[var(--bg-surface)]'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${prog.actif ? 'bg-[#FF6B2B]' : 'bg-[var(--text-muted)]'}`} />
                      {prog.actif ? 'Publié' : 'Brouillon'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { setBuilderProgramme({ ...prog, mode: 'modele', client_id: null }); setCurrentView('builder') }}
                      className="py-2 rounded-lg bg-[var(--bg-surface)] text-[var(--text-secondary)] text-xs font-semibold hover:text-[var(--text-primary)] transition-colors flex items-center justify-center gap-1.5 border border-[var(--border-subtle)]">
                      <Eye size={12} /> Modifier
                    </button>
                    <button onClick={() => { setShowAssignModal(true); setAssignModelId(prog.id); setAssignClientId('') }}
                      className="py-2 rounded-lg bg-[#FF6B2B] text-white text-xs font-semibold hover:bg-[#FF6B2B]/90 transition-all flex items-center justify-center gap-1.5 active:scale-95">
                      <Users size={12} /> Assigner
                    </button>
                  </div>
                </div>
              ))}

              {/* ── Programmes Pro modèles (sport_programmes) ── */}
              {filteredProgrammesPro.map(pro => (
                <div key={`pro-${pro.id}`}
                  className="hero-card p-4 hover:border-[#FF6B2B]/30 transition-all group">
                  <div className="flex items-start gap-3 mb-3 cursor-pointer"
                    onClick={() => window.location.href = `/coach/sport/programme/${pro.id}`}>
                    <Layers size={16} className="text-[var(--text-muted)] shrink-0 mt-0.5" strokeWidth={1.75} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[var(--text-primary)] font-bold text-sm leading-tight truncate">{pro.nom}</h3>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FF6B2B]/10 text-[#FF6B2B] border border-[#FF6B2B]/20 shrink-0">PRO</span>
                      </div>
                      {pro.description && (
                        <p className="text-[var(--text-muted)] text-[11px] mt-0.5 line-clamp-2">{pro.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className="inline-flex items-center gap-1 bg-[var(--bg-base)] px-2 py-1 rounded-md text-[10px] text-[var(--text-muted)] font-semibold border border-[var(--border-subtle)] tabular-nums">
                      <Calendar size={11} /> {pro.duree_semaines} sem.
                    </span>
                    {pro.objectif && (
                      <span className="px-2 py-1 rounded-md bg-[#FF6B2B]/10 text-[#FF6B2B] text-[10px] font-semibold capitalize">
                        {pro.objectif}
                      </span>
                    )}
                    {pro.niveau && (
                      <span className="px-2 py-1 rounded-md bg-[var(--bg-surface)] text-[var(--text-muted)] text-[10px] font-semibold capitalize">
                        {pro.niveau}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => window.location.href = `/coach/sport/programme/${pro.id}`}
                      className="py-2 rounded-lg bg-[var(--bg-surface)] text-[var(--text-secondary)] text-xs font-semibold hover:text-[var(--text-primary)] transition-colors flex items-center justify-center gap-1.5 border border-[var(--border-subtle)]">
                      <Eye size={12} /> Modifier
                    </button>
                    <button onClick={() => { setProAssignId(pro.id); setProAssignClientId('') }}
                      className="py-2 rounded-lg bg-[#FF6B2B] text-white text-xs font-semibold hover:bg-[#FF6B2B]/90 transition-all flex items-center justify-center gap-1.5 active:scale-95">
                      <Users size={12} /> Assigner
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* MODALE — Créer un nouveau programme    */}
      {/* ═══════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-xl bg-[var(--bg-card)] rounded-2xl border border-[var(--border-base)] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="px-7 pt-6 pb-4 border-b border-[var(--border-base)]">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <CalendarDays size={20} className="text-[#FF6B2B]" />
                </div>
                <div>
                  <h2 className="text-[var(--text-primary)] text-lg font-bold">Créer un nouveau programme</h2>
                  <p className="text-[var(--text-muted)] text-sm mt-0.5">Créez un programme personnalisé pour un client</p>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="ml-auto p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-all">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="px-7 py-5 space-y-6">

              {/* ── Créer : Programme / Modèle ── */}
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-2.5">Créer</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setCreateMode('programme')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      createMode === 'programme'
                        ? 'border-[#FF6B2B] bg-[#FF6B2B]/5'
                        : 'border-[var(--border-base)] hover:border-[var(--border-base)]/80 bg-[var(--bg-base)]'
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarDays size={16} className={createMode === 'programme' ? 'text-[#FF6B2B]' : 'text-[var(--text-muted)]'} />
                      <span className={`text-sm font-bold ${createMode === 'programme' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>Programme</span>
                    </div>
                    <p className="text-[var(--text-muted)] text-[11px]">Pour un client spécifique</p>
                  </button>
                  <button onClick={() => setCreateMode('modele')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      createMode === 'modele'
                        ? 'border-[#FF6B2B] bg-[#FF6B2B]/5'
                        : 'border-[var(--border-base)] hover:border-[var(--border-base)]/80 bg-[var(--bg-base)]'
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Dumbbell size={16} className={createMode === 'modele' ? 'text-[#FF6B2B]' : 'text-[var(--text-muted)]'} />
                      <span className={`text-sm font-bold ${createMode === 'modele' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>Modèle</span>
                    </div>
                    <p className="text-[var(--text-muted)] text-[11px]">Réutilisable pour plusieurs clients</p>
                  </button>
                </div>
              </div>

              {/* ── Type de programme ── */}
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-2.5">Type de programme <span className="text-[#FF6B2B]">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Calendrier */}
                  <button onClick={() => setProgramType('calendrier')}
                    className={`p-5 rounded-xl border-2 text-left transition-all relative ${
                      programType === 'calendrier'
                        ? 'border-[#FF6B2B] bg-[#FF6B2B]/5'
                        : 'border-[var(--border-base)] hover:border-[var(--border-base)]/80 bg-[var(--bg-base)]'
                    }`}>
                    <CalendarDays size={22} className={`mb-3 ${programType === 'calendrier' ? 'text-[#FF6B2B]' : 'text-[var(--text-muted)]'}`} />
                    <p className={`text-sm font-bold mb-1 ${programType === 'calendrier' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                      Programme Calendrier
                    </p>
                    <p className="text-[var(--text-muted)] text-[11px] leading-relaxed">
                      Planification structurée jour par jour avec une durée définie et une date de fin calculée automatiquement
                    </p>
                    {programType === 'calendrier' && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#FF6B2B] flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </button>
                  {/* Flexible */}
                  <button onClick={() => setProgramType('flexible')}
                    className={`p-5 rounded-xl border-2 text-left transition-all relative ${
                      programType === 'flexible'
                        ? 'border-[#FF6B2B] bg-[#FF6B2B]/5'
                        : 'border-[var(--border-base)] hover:border-[var(--border-base)]/80 bg-[var(--bg-base)]'
                    }`}>
                    <RefreshCw size={22} className={`mb-3 ${programType === 'flexible' ? 'text-[#FF6B2B]' : 'text-[var(--text-muted)]'}`} />
                    <p className={`text-sm font-bold mb-1 ${programType === 'flexible' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                      Programme Flexible
                    </p>
                    <p className="text-[var(--text-muted)] text-[11px] leading-relaxed">
                      Séances types flexibles que le coaché fait quand il veut, avec date de fin optionnelle
                    </p>
                    {programType === 'flexible' && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#FF6B2B] flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* ── Formulaire ── */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-2">Titre du programme <span className="text-[#FF6B2B]">*</span></label>
                  <input type="text" value={createTitle} onChange={e => setCreateTitle(e.target.value)}
                    placeholder="Ex: Programme débutant"
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/40 transition-all" />
                </div>

                <div>
                  <label className="block text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-2">Date de début <span className="text-[#FF6B2B]">*</span></label>
                  <input type="date" value={createDate} onChange={e => setCreateDate(e.target.value)}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B2B]/40 transition-all" />
                  <div className="flex items-start gap-2 mt-2 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg px-3 py-2">
                    <Clock size={13} className="text-[var(--text-muted)] mt-0.5 shrink-0" />
                    <p className="text-[var(--text-muted)] text-[11px]">La date de fin sera calculée automatiquement en fonction du nombre de séances.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-2">Tags</label>
                  <input type="text" value={createTags} onChange={e => setCreateTags(e.target.value)}
                    placeholder="Ex: débutant, force, endurance"
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/40 transition-all" />
                  <p className="text-[var(--text-muted)] text-[10px] mt-1">Appuyez sur Entrée ou virgule pour ajouter un tag</p>
                </div>

                {createMode === 'programme' && (
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-2">Assigner à <span className="text-[#FF6B2B]">*</span></label>
                    <select value={createClient} onChange={e => setCreateClient(e.target.value)}
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B2B]/40 transition-all appearance-none">
                      <option value="" className="bg-[var(--bg-card)]">Sélectionner un client</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.profiles?.id} className="bg-[var(--bg-card)]">{getClientName(c)}</option>
                      ))}
                    </select>
                  </div>
                )}

                {!createDate && (
                  <div className="flex items-start gap-2 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg px-3 py-2">
                    <span className="text-[var(--text-muted)] text-sm">⚠</span>
                    <p className="text-[var(--text-muted)] text-[11px]">Veuillez sélectionner une date de début</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-7 py-4 border-t border-[var(--border-base)] flex items-center justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)}
                className="px-5 py-2.5 rounded-xl text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors font-medium">
                Annuler
              </button>
              <button onClick={handleCreate}
                disabled={creating || !createTitle.trim() || (createMode === 'programme' && !createClient)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#FF6B2B]/90 transition-all disabled:opacity-40 shadow-lg shadow-[#FF6B2B]/20">
                {creating ? <Loader2 size={14} className="animate-spin" /> : null}
                Créer le programme
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* MODALE — Assigner un modèle            */}
      {/* ═══════════════════════════════════════ */}
      {/* ══ Modal Assigner programme Pro à un client ══ */}
      {proAssignId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setProAssignId(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md hero-card shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-5 pb-4 border-b border-[var(--border-base)] flex items-center justify-between">
              <div>
                <h2 className="text-[var(--text-primary)] text-lg font-bold tracking-tight">Assigner le programme</h2>
                <p className="text-[var(--text-muted)] text-sm mt-0.5">Le programme sera cloné pour le client sélectionné</p>
              </div>
              <button onClick={() => setProAssignId(null)}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-2 font-semibold uppercase tracking-wider">
                  Client <span className="text-[var(--text-muted)] normal-case tracking-normal">({clients.length} trouvé{clients.length > 1 ? 's' : ''})</span>
                </label>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {clients.length === 0 ? (
                    <p className="text-[var(--text-muted)] text-xs text-center py-4">Aucun client actif</p>
                  ) : clients.map(c => {
                    const prenom = c.profiles?.prenom || ''
                    const nom = c.profiles?.nom || ''
                    const email = c.profiles?.email || ''
                    const displayName = (prenom && nom) ? `${prenom} ${nom}` : (prenom || nom || email || 'Client')
                    const isSelected = proAssignClientId === (c.profiles?.id || c.id)
                    const cid = c.profiles?.id || c.id
                    const initials = `${prenom ? prenom[0] : (email ? email[0] : '?')}${nom ? nom[0] : ''}`.toUpperCase()
                    return (
                      <button key={c.id} onClick={() => setProAssignClientId(cid)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                          isSelected ? 'bg-[#FF6B2B]/10 border border-[#FF6B2B]/30' : 'hover:bg-[var(--bg-surface)] border border-transparent'
                        }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected ? 'bg-[#FF6B2B] text-white' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                        }`}>{initials}</div>
                        <span className={`text-sm font-medium flex-1 truncate ${isSelected ? 'text-[#FF6B2B]' : 'text-[var(--text-primary)]'}`}>{displayName}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setProAssignId(null)}
                className="flex-1 py-3 rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all border border-[var(--border-subtle)]">
                Annuler
              </button>
              <button onClick={handleAssignPro} disabled={!proAssignClientId || assigningPro}
                className="flex-1 py-3 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95">
                {assigningPro ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
                {assigningPro ? 'Assignation...' : 'Assigner'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAssignModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-[var(--bg-card)] rounded-2xl border border-[var(--border-base)] shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="h-1 bg-gradient-to-r from-[#FF6B2B] to-[#FF9A6C]" />

            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-[var(--border-base)]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[var(--text-primary)] text-lg font-bold">Assigner un modèle</h2>
                  <p className="text-[var(--text-muted)] text-sm mt-0.5">Déployez un programme existant pour un client</p>
                </div>
                <button onClick={() => setShowAssignModal(false)}
                  className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-all">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Model select */}
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-2">Choisir un modèle</label>
                {modelProgrammes.length === 0 ? (
                  <p className="text-[var(--text-muted)] text-sm py-3 text-center bg-[var(--bg-base)] rounded-xl border border-[var(--border-base)]">
                    Aucun modèle disponible — créez-en un d'abord
                  </p>
                ) : (
                  <select value={assignModelId} onChange={e => setAssignModelId(e.target.value)}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B2B]/40 transition-all">
                    <option value="">Sélectionner un programme...</option>
                    {modelProgrammes.map(p => (
                      <option key={p.id} value={p.id}>{p.titre} ({p.duree_semaines || '?'} sem.)</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Client select */}
              <div>
                <label className="block text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-2">À quel client ?</label>
                <select value={assignClientId} onChange={e => setAssignClientId(e.target.value)}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-base)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#FF6B2B]/40 transition-all">
                  <option value="">Sélectionner un client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.profiles?.id}>{getClientName(c)}</option>
                  ))}
                </select>
              </div>

              {/* Summary */}
              {assignModelId && assignClientId && (
                <div className="bg-[var(--bg-base)] rounded-xl p-4 border border-[var(--border-subtle)]">
                  <p className="text-xs text-[var(--text-muted)] mb-1">Résumé</p>
                  <p className="text-sm text-[var(--text-primary)]">
                    <span className="font-semibold text-[#FF6B2B]">{programmes.find(p => p.id === assignModelId)?.titre}</span>
                    {' → '}
                    <span className="font-semibold">{clients.find(c => c.profiles?.id === assignClientId)?.profiles?.nom}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex items-center gap-3">
              <button onClick={() => setShowAssignModal(false)}
                className="flex-1 py-3 rounded-xl text-sm text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-all border border-[var(--border-subtle)]">
                Annuler
              </button>
              <button onClick={handleAssignModelToClient}
                disabled={!assignModelId || !assignClientId || assigning}
                className="flex-1 py-3 rounded-xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#FF6B2B]/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B2B]/20">
                {assigning ? <Loader2 size={14} className="animate-spin" /> : <Dumbbell size={14} />}
                {assigning ? 'Assignation...' : 'Assigner le programme'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
