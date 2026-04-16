import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import ProgramBuilder from './ProgramBuilder'
import {
  Search, Filter, Plus, Calendar, RefreshCw, X,
  Dumbbell, Loader2, ChevronRight, Tag, Users,
  CalendarDays, Clock, MoreHorizontal, MoreVertical, Layers, Trash2, Eye, EyeOff
} from 'lucide-react'

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
  const assignedCount = programmes.filter(p => assignations[p.id]).length
  const templatesCount = programmes.filter(p => !assignations[p.id]).length

  const filteredProgrammes = programmes.filter(p => {
    const matchSearch = !search || p.titre?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'tous' || (filterStatus === 'actif' && p.actif) || (filterStatus === 'brouillon' && !p.actif)
    if (activeTab === 'assigned') return matchSearch && matchStatus && assignations[p.id]
    if (activeTab === 'templates') return matchSearch && matchStatus && !assignations[p.id]
    return matchSearch
  })

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

  // ── Dashboard view ──
  return (
    <div className="p-4 md:p-8 w-full max-w-5xl mx-auto space-y-8">

      {/* ═══ Header ═══ */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[var(--text-primary)] text-3xl font-bold tracking-tight">Programmes Sport</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1.5">Parcours multi-semaines pour tes clients</p>
        </div>
        <button onClick={openCreate}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#FF6B2B]/90 transition-all shadow-xl shadow-[#FF6B2B]/25 shrink-0">
          <Plus size={16} /> Créer un programme
        </button>
      </div>

      {/* ═══ Tabs + Search ═══ */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 bg-[var(--bg-card)] rounded-2xl p-1 border border-[var(--border-base)]">
          {[
            { key: 'assigned', label: 'Assignés', count: assignedCount },
            { key: 'templates', label: 'Modèles', count: templatesCount },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`py-2.5 px-5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === t.key
                  ? 'bg-[#FF6B2B] text-white shadow-lg shadow-[#FF6B2B]/20'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}>
              {t.label}
              <span className={`ml-1.5 text-xs ${activeTab === t.key ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-56 bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl pl-10 pr-4 py-2.5 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#FF6B2B]/40 focus:ring-1 focus:ring-[#FF6B2B]/10 transition-all" />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin text-[#FF6B2B]" size={24} />
          <span className="text-[var(--text-muted)] text-sm">Chargement des programmes...</span>
        </div>
      )}

      {/* ═══════ ONGLET : PROGRAMMES ASSIGNÉS ═══════ */}
      {!isLoading && activeTab === 'assigned' && (
        <>
          {filteredProgrammes.length === 0 ? (
            <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-base)] p-16 text-center">
              <div className="w-16 h-16 bg-[#FF6B2B]/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Dumbbell size={28} className="text-[#FF6B2B]" />
              </div>
              <h3 className="text-[var(--text-primary)] font-bold text-lg mb-2">
                {search ? 'Aucun résultat' : 'Aucun programme assigné'}
              </h3>
              <p className="text-[var(--text-muted)] text-sm mb-6 max-w-sm mx-auto">
                {search ? `Aucun résultat pour "${search}"` : 'Crée un modèle puis assigne-le à un client.'}
              </p>
              {!search && (
                <button onClick={() => setActiveTab('templates')}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--bg-surface)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-surface)] transition-all">
                  <Layers size={14} /> Voir les modèles
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProgrammes.map(prog => {
                const assign = assignations[prog.id]
                if (!assign) return null

                const totalWeeks = prog.duree_semaines || 4
                const suiviKey = assign.client_id ? `${prog.id}_${assign.client_id}` : null
                const weeksDone = suiviKey ? (suiviData[suiviKey] || []).length : 0
                const progressPct = Math.min(100, Math.round((weeksDone / totalWeeks) * 100))
                const isComplete = progressPct >= 100

                return (
                  <div key={prog.id}
                    onClick={() => {
                      setBuilderProgramme({ ...prog, mode: 'programme' })
                      setCurrentView('builder')
                    }}
                    className="group bg-[var(--bg-card)] rounded-2xl border border-[var(--border-base)] p-5 md:p-6 hover:border-[var(--border-base)] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 transition-all duration-300 cursor-pointer">

                    <div className="flex items-start gap-4">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold shrink-0 uppercase ${
                        isComplete ? 'bg-emerald-500/15 text-emerald-400 ring-2 ring-emerald-500/20' : 'bg-[#FF6B2B]/15 text-[#FF6B2B] ring-2 ring-[#FF6B2B]/10'
                      }`}>
                        {assign.client_initials}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                          <h3 className="text-[var(--text-primary)] font-bold text-sm">{assign.client_nom}</h3>
                          <span className="w-1 h-1 rounded-full bg-white/15" />
                          <span className="text-[var(--text-muted)] text-sm truncate">{prog.titre}</span>
                        </div>

                        <div className="flex items-center gap-2 mb-3.5">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                            assign.statut === 'termine'
                              ? 'text-[var(--text-muted)] bg-white/5 border-white/10'
                              : assign.statut === 'pause'
                                ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                                : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                          }`}>
                            {assign.statut === 'termine' ? 'Terminé' : assign.statut === 'pause' ? 'Pause' : 'En cours'}
                          </span>
                          {prog.categorie && (
                            <span className="text-[var(--text-muted)] text-xs">{prog.categorie}</span>
                          )}
                          {assign.date_debut && (
                            <span className="text-[var(--text-muted)] text-xs">
                              Depuis le {new Date(assign.date_debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ease-out ${
                                isComplete
                                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                  : 'bg-gradient-to-r from-[#FF6B2B] to-[#FF9A6C]'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold shrink-0 tabular-nums ${isComplete ? 'text-emerald-400' : 'text-[#FF6B2B]'}`}>
                            {weeksDone}/{totalWeeks} sem.
                          </span>
                        </div>
                      </div>

                      <button onClick={e => { e.stopPropagation(); handleDeleteProgramme(prog.id) }}
                        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                        title="Supprimer le programme assigné">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ═══════ ONGLET : MODÈLES ═══════ */}
      {!isLoading && activeTab === 'templates' && (
        <>
          {filteredProgrammes.length === 0 ? (
            <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-base)] p-20 text-center">
              <div className="w-20 h-20 bg-[#FF6B2B]/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Dumbbell size={32} className="text-[#FF6B2B]" />
              </div>
              <h3 className="text-[var(--text-primary)] font-bold text-xl mb-2">
                {search ? 'Aucun résultat' : 'Aucun programme'}
              </h3>
              <p className="text-[var(--text-muted)] text-sm mb-8 max-w-md mx-auto">
                {search ? `Aucun modèle pour "${search}"` : 'Crée ton premier programme de coaching structuré.'}
              </p>
              {!search && (
                <button onClick={openCreate}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#FF6B2B]/90 transition-all shadow-xl shadow-[#FF6B2B]/25">
                  <Plus size={16} /> Créer un programme
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredProgrammes.map(prog => (
                <div key={prog.id}
                  className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-base)] overflow-hidden hover:border-[var(--border-base)] hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 transition-all duration-300 group">

                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF6B2B] to-[#FF9A6C] flex items-center justify-center shrink-0 shadow-lg shadow-[#FF6B2B]/20">
                        <Dumbbell size={20} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[var(--text-primary)] font-bold text-base leading-tight truncate">{prog.titre}</h3>
                        {prog.description && (
                          <p className="text-[var(--text-muted)] text-sm mt-1 line-clamp-2">{prog.description}</p>
                        )}
                      </div>
                      <button onClick={e => { e.stopPropagation(); handleDeleteProgramme(prog.id) }}
                        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 shrink-0">
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mb-6">
                      <span className="inline-flex items-center gap-1.5 bg-[var(--bg-base)] px-3 py-1.5 rounded-xl text-xs text-[var(--text-muted)] font-medium border border-[var(--border-subtle)]">
                        <Calendar size={12} /> {prog.duree_semaines || 4} sem.
                      </span>
                      {prog.categorie && (
                        <span className="px-3 py-1.5 rounded-xl bg-[#FF6B2B]/10 text-[#FF6B2B] text-xs font-semibold border border-[#FF6B2B]/15">
                          {prog.categorie}
                        </span>
                      )}
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                        prog.actif
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                          : 'bg-white/5 text-[var(--text-muted)] border-[var(--border-subtle)]'
                      }`}>
                        {prog.actif ? 'Publié' : 'Brouillon'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => { setBuilderProgramme({ ...prog, mode: 'modele', client_id: null }); setCurrentView('builder') }}
                        className="py-2.5 rounded-xl bg-[var(--bg-surface)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-surface)] hover:text-white transition-all flex items-center justify-center gap-2 border border-[var(--border-subtle)]">
                        <Eye size={14} /> Modifier
                      </button>
                      <button onClick={() => { setShowAssignModal(true); setAssignModelId(prog.id); setAssignClientId('') }}
                        className="py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#FF6B2B]/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B2B]/20">
                        <Users size={14} /> Assigner
                      </button>
                    </div>
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
                  <div className="flex items-start gap-2 mt-2 bg-blue-500/5 border border-blue-500/10 rounded-lg px-3 py-2">
                    <Clock size={13} className="text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-blue-400/70 text-[11px]">La date de fin sera calculée automatiquement en fonction du nombre de séances.</p>
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
                  <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2">
                    <span className="text-amber-400 text-sm">⚠</span>
                    <p className="text-amber-400/70 text-[11px]">Veuillez sélectionner une date de début</p>
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
