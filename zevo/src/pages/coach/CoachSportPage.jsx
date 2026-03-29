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
  const [assignations, setAssignations] = useState({}) // { programme_id: { client_nom, client_initials, statut } }
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
          .select('programme_id, statut, date_debut, clients(id, profiles(nom, prenom))')
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
          }
        })
        setAssignations(assignMap)
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
    <div className="p-4 md:p-6 w-full space-y-6">

      {/* ═══ Header ═══ */}
      <div>
        <h1 className="text-[#F5F5F3] text-2xl md:text-3xl font-bold tracking-tight">Vos programmes sport</h1>
        <p className="text-white/25 text-sm mt-1">Visualisez tous vos programmes : modèles, assignés, en cours.</p>
      </div>

      {/* ═══ Tabs ═══ */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="bg-[#18181b] p-1 flex rounded-xl w-fit">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[#27272a] text-[#F5F5F3] shadow-sm'
                  : 'text-white/35 hover:text-white/60'
              }`}>
              {tab.label}
              {!isLoading && (
                <span className={`ml-1.5 text-[10px] ${activeTab === tab.id ? 'text-white/40' : 'text-white/20'}`}>
                  {tab.id === 'assigned' ? assignedCount : templatesCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Toolbar ═══ */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un programme..."
            className="w-full bg-[#18181b] border border-[#27272a] rounded-xl pl-10 pr-4 py-2.5 text-[#F5F5F3] text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/40 transition-all" />
        </div>
        <div className="relative">
          <button onClick={() => setShowFilterMenu(!showFilterMenu)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              filterStatus !== 'tous'
                ? 'bg-[#FF6B2B]/10 border-[#FF6B2B]/30 text-[#FF6B2B]'
                : 'bg-[#18181b] border-[#27272a] text-white/40 hover:text-white/60 hover:bg-[#27272a]'
            }`}>
            <Filter size={14} /> {filterStatus === 'tous' ? 'Filtrer' : filterStatus === 'actif' ? 'Publiés' : 'Brouillons'}
          </button>
          {showFilterMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowFilterMenu(false)} />
              <div className="absolute top-full mt-1 left-0 z-40 w-40 bg-[#1E1E1E] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden">
                {[
                  { id: 'tous', label: 'Tous' },
                  { id: 'actif', label: 'Publiés' },
                  { id: 'brouillon', label: 'Brouillons' },
                ].map(f => (
                  <button key={f.id} onClick={() => { setFilterStatus(f.id); setShowFilterMenu(false) }}
                    className={`w-full px-4 py-2.5 text-left text-xs font-medium transition-all ${
                      filterStatus === f.id ? 'bg-[#FF6B2B]/10 text-[#FF6B2B]' : 'text-white/50 hover:bg-white/[0.04] hover:text-white'
                    }`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="flex-1" />
        <button onClick={() => { setShowAssignModal(true); setAssignModelId(''); setAssignClientId('') }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#27272a] text-white/40 text-sm font-medium hover:text-white/60 hover:bg-[#18181b] transition-all">
          <Plus size={14} /> Assigner un modèle
        </button>
        <button onClick={openCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#FF6B2B]/90 transition-all shadow-lg shadow-[#FF6B2B]/20">
          <Plus size={15} /> Créer un programme
        </button>
      </div>

      {/* ═══ Table ═══ */}
      <div className="bg-[#1E1E1E] border border-white/[0.06] rounded-2xl overflow-visible">
        {/* Table header */}
        <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-[#27272a] text-[10px] text-white/25 font-semibold uppercase tracking-wider">
          <div className="col-span-1">Publié</div>
          <div className="col-span-2">Créé le</div>
          <div className="col-span-3">Nom du programme</div>
          <div className="col-span-1">Type</div>
          <div className="col-span-2">Progrès</div>
          <div className="col-span-2">Assigné à</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Table body */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-[#FF6B2B]" size={20} />
            <span className="text-white/25 text-sm">Chargement de vos programmes...</span>
          </div>
        ) : filteredProgrammes.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-[#FF6B2B]/10 flex items-center justify-center mx-auto mb-4">
              <Layers size={28} className="text-[#FF6B2B]" />
            </div>
            <p className="text-[#F5F5F3] font-semibold text-base mb-1">
              {search ? 'Aucun résultat' : activeTab === 'assigned' ? 'Aucun programme assigné' : 'Aucun modèle'}
            </p>
            <p className="text-white/25 text-sm mb-6 max-w-xs mx-auto">
              {search ? `Aucun programme ne correspond à "${search}"` : 'Créez votre premier programme pour commencer.'}
            </p>
            {!search && (
              <button onClick={openCreate}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#FF6B2B]/90 transition-all shadow-lg shadow-[#FF6B2B]/20">
                <Plus size={15} /> Créer un programme
              </button>
            )}
          </div>
        ) : (
          filteredProgrammes.map(prog => {
            const assign = assignations[prog.id]
            const isActive = prog.actif
            const dureeText = prog.duree_semaines ? `${prog.duree_semaines} sem.` : '—'
            const categorie = prog.categorie || null

            return (
              <div key={prog.id}
                onClick={() => {
                  setBuilderProgramme({
                    ...prog,
                    mode: assign ? 'programme' : 'modele',
                    client_id: assign ? undefined : null,
                  })
                  setCurrentView('builder')
                }}
                className="grid grid-cols-12 gap-3 px-5 py-4 border-b border-[#27272a]/30 hover:bg-white/[0.02] transition-colors items-center cursor-pointer group">
                {/* Publié */}
                <div className="col-span-1">
                  <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-[#FF6B2B]' : 'bg-[#27272a]'}`} />
                </div>
                {/* Créé le */}
                <div className="col-span-2 text-white/30 text-xs">
                  {new Date(prog.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </div>
                {/* Nom */}
                <div className="col-span-3">
                  <p className="text-[#F5F5F3] text-sm font-semibold truncate group-hover:text-[#FF6B2B] transition-colors">{prog.titre}</p>
                </div>
                {/* Type / Catégorie */}
                <div className="col-span-1">
                  {categorie ? (
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold bg-[#FF6B2B]/10 text-[#FF6B2B] truncate">
                      {categorie.length > 12 ? categorie.slice(0, 12) + '…' : categorie}
                    </span>
                  ) : (
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold bg-[#27272a] text-white/25">—</span>
                  )}
                </div>
                {/* Progrès */}
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#FF6B2B] transition-all" style={{ width: '0%' }} />
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold shrink-0 ${
                      assign?.statut === 'en_cours' ? 'text-emerald-400' : isActive ? 'text-white/30' : 'text-white/15'
                    }`}>
                      {assign?.statut === 'en_cours' ? 'En cours' : isActive ? 'Publié' : 'Brouillon'}
                    </span>
                  </div>
                  <p className="text-white/15 text-[10px] mt-0.5">{dureeText}</p>
                </div>
                {/* Assigné à */}
                <div className="col-span-2">
                  {assign ? (
                    <div className="flex items-center gap-2.5" title={assign.client_nom}>
                      <div className="w-8 h-8 rounded-full bg-[#FF6B2B]/15 flex items-center justify-center shrink-0">
                        <span className="text-[#FF6B2B] text-xs font-bold">{assign.client_initials}</span>
                      </div>
                      <span className="text-white/50 text-xs font-medium truncate">{assign.client_nom}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5" title="Non assigné">
                      <div className="w-8 h-8 rounded-full bg-[#27272a] flex items-center justify-center shrink-0">
                        <Plus size={12} className="text-white/15" />
                      </div>
                      <span className="text-white/15 text-xs">Modèle</span>
                    </div>
                  )}
                </div>
                {/* Actions */}
                <div className="col-span-1 flex justify-end relative">
                  <button onClick={e => { e.stopPropagation(); setActionMenuId(actionMenuId === prog.id ? null : prog.id) }}
                    className="p-1.5 rounded-lg text-white/15 hover:text-white/50 hover:bg-white/[0.06] transition-all">
                    <MoreVertical size={14} />
                  </button>
                  {actionMenuId === prog.id && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={e => { e.stopPropagation(); setActionMenuId(null) }} />
                      <div className="absolute right-0 top-full mt-1 z-[100] w-48 bg-[#1E1E1E] border border-[#27272a] rounded-xl shadow-2xl">
                        <button onClick={e => { e.stopPropagation(); setActionMenuId(null); setBuilderProgramme({ ...prog, mode: assign ? 'programme' : 'modele' }); setCurrentView('builder') }}
                          className="w-full px-4 py-2.5 text-left text-xs font-medium text-white/50 hover:bg-white/[0.04] hover:text-white transition-all flex items-center gap-2">
                          <Eye size={12} /> Ouvrir dans le builder
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDeleteProgramme(prog.id) }}
                          className="w-full px-4 py-2.5 text-left text-xs font-medium text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-2">
                          <Trash2 size={12} /> Supprimer le programme
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* MODALE — Créer un nouveau programme    */}
      {/* ═══════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-xl bg-[#1E1E1E] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="px-7 pt-6 pb-4 border-b border-[#27272a]">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#FF6B2B]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <CalendarDays size={20} className="text-[#FF6B2B]" />
                </div>
                <div>
                  <h2 className="text-[#F5F5F3] text-lg font-bold">Créer un nouveau programme</h2>
                  <p className="text-white/25 text-sm mt-0.5">Créez un programme personnalisé pour un client</p>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="ml-auto p-2 rounded-xl text-white/20 hover:text-white hover:bg-white/[0.06] transition-all">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="px-7 py-5 space-y-6">

              {/* ── Créer : Programme / Modèle ── */}
              <div>
                <label className="block text-xs text-white/30 font-semibold uppercase tracking-wider mb-2.5">Créer</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setCreateMode('programme')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      createMode === 'programme'
                        ? 'border-[#FF6B2B] bg-[#FF6B2B]/5'
                        : 'border-[#27272a] hover:border-[#27272a]/80 bg-[#0D0D0D]'
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarDays size={16} className={createMode === 'programme' ? 'text-[#FF6B2B]' : 'text-white/30'} />
                      <span className={`text-sm font-bold ${createMode === 'programme' ? 'text-[#F5F5F3]' : 'text-white/50'}`}>Programme</span>
                    </div>
                    <p className="text-white/25 text-[11px]">Pour un client spécifique</p>
                  </button>
                  <button onClick={() => setCreateMode('modele')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      createMode === 'modele'
                        ? 'border-[#FF6B2B] bg-[#FF6B2B]/5'
                        : 'border-[#27272a] hover:border-[#27272a]/80 bg-[#0D0D0D]'
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Dumbbell size={16} className={createMode === 'modele' ? 'text-[#FF6B2B]' : 'text-white/30'} />
                      <span className={`text-sm font-bold ${createMode === 'modele' ? 'text-[#F5F5F3]' : 'text-white/50'}`}>Modèle</span>
                    </div>
                    <p className="text-white/25 text-[11px]">Réutilisable pour plusieurs clients</p>
                  </button>
                </div>
              </div>

              {/* ── Type de programme ── */}
              <div>
                <label className="block text-xs text-white/30 font-semibold uppercase tracking-wider mb-2.5">Type de programme <span className="text-[#FF6B2B]">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Calendrier */}
                  <button onClick={() => setProgramType('calendrier')}
                    className={`p-5 rounded-xl border-2 text-left transition-all relative ${
                      programType === 'calendrier'
                        ? 'border-[#FF6B2B] bg-[#FF6B2B]/5'
                        : 'border-[#27272a] hover:border-[#27272a]/80 bg-[#0D0D0D]'
                    }`}>
                    <CalendarDays size={22} className={`mb-3 ${programType === 'calendrier' ? 'text-[#FF6B2B]' : 'text-white/20'}`} />
                    <p className={`text-sm font-bold mb-1 ${programType === 'calendrier' ? 'text-[#F5F5F3]' : 'text-white/50'}`}>
                      Programme Calendrier
                    </p>
                    <p className="text-white/20 text-[11px] leading-relaxed">
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
                        : 'border-[#27272a] hover:border-[#27272a]/80 bg-[#0D0D0D]'
                    }`}>
                    <RefreshCw size={22} className={`mb-3 ${programType === 'flexible' ? 'text-[#FF6B2B]' : 'text-white/20'}`} />
                    <p className={`text-sm font-bold mb-1 ${programType === 'flexible' ? 'text-[#F5F5F3]' : 'text-white/50'}`}>
                      Programme Flexible
                    </p>
                    <p className="text-white/20 text-[11px] leading-relaxed">
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
                  <label className="block text-xs text-white/30 font-semibold uppercase tracking-wider mb-2">Titre du programme <span className="text-[#FF6B2B]">*</span></label>
                  <input type="text" value={createTitle} onChange={e => setCreateTitle(e.target.value)}
                    placeholder="Ex: Programme débutant"
                    className="w-full bg-[#0D0D0D] border border-[#27272a] rounded-xl px-4 py-3 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B]/40 transition-all" />
                </div>

                <div>
                  <label className="block text-xs text-white/30 font-semibold uppercase tracking-wider mb-2">Date de début <span className="text-[#FF6B2B]">*</span></label>
                  <input type="date" value={createDate} onChange={e => setCreateDate(e.target.value)}
                    className="w-full bg-[#0D0D0D] border border-[#27272a] rounded-xl px-4 py-3 text-[#F5F5F3] text-sm focus:outline-none focus:border-[#FF6B2B]/40 transition-all" />
                  <div className="flex items-start gap-2 mt-2 bg-blue-500/5 border border-blue-500/10 rounded-lg px-3 py-2">
                    <Clock size={13} className="text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-blue-400/70 text-[11px]">La date de fin sera calculée automatiquement en fonction du nombre de séances.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/30 font-semibold uppercase tracking-wider mb-2">Tags</label>
                  <input type="text" value={createTags} onChange={e => setCreateTags(e.target.value)}
                    placeholder="Ex: débutant, force, endurance"
                    className="w-full bg-[#0D0D0D] border border-[#27272a] rounded-xl px-4 py-3 text-[#F5F5F3] text-sm placeholder:text-white/15 focus:outline-none focus:border-[#FF6B2B]/40 transition-all" />
                  <p className="text-white/15 text-[10px] mt-1">Appuyez sur Entrée ou virgule pour ajouter un tag</p>
                </div>

                {createMode === 'programme' && (
                  <div>
                    <label className="block text-xs text-white/30 font-semibold uppercase tracking-wider mb-2">Assigner à <span className="text-[#FF6B2B]">*</span></label>
                    <select value={createClient} onChange={e => setCreateClient(e.target.value)}
                      className="w-full bg-[#0D0D0D] border border-[#27272a] rounded-xl px-4 py-3 text-[#F5F5F3] text-sm focus:outline-none focus:border-[#FF6B2B]/40 transition-all appearance-none">
                      <option value="" className="bg-[#1E1E1E]">Sélectionner un client</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.profiles?.id} className="bg-[#1E1E1E]">{getClientName(c)}</option>
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
            <div className="px-7 py-4 border-t border-[#27272a] flex items-center justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)}
                className="px-5 py-2.5 rounded-xl text-sm text-white/30 hover:text-white/60 transition-colors font-medium">
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
          <div className="relative w-full max-w-md bg-[#1E1E1E] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="h-1 bg-gradient-to-r from-[#FF6B2B] to-[#FF9A6C]" />

            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-[#27272a]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[#F5F5F3] text-lg font-bold">Assigner un modèle</h2>
                  <p className="text-white/30 text-sm mt-0.5">Déployez un programme existant pour un client</p>
                </div>
                <button onClick={() => setShowAssignModal(false)}
                  className="p-2 rounded-xl text-white/20 hover:text-white hover:bg-white/[0.06] transition-all">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Model select */}
              <div>
                <label className="block text-xs text-white/30 font-semibold uppercase tracking-wider mb-2">Choisir un modèle</label>
                {modelProgrammes.length === 0 ? (
                  <p className="text-white/20 text-sm py-3 text-center bg-[#0D0D0D] rounded-xl border border-[#27272a]">
                    Aucun modèle disponible — créez-en un d'abord
                  </p>
                ) : (
                  <select value={assignModelId} onChange={e => setAssignModelId(e.target.value)}
                    className="w-full bg-[#0D0D0D] border border-[#27272a] rounded-xl px-4 py-3 text-[#F5F5F3] text-sm focus:outline-none focus:border-[#FF6B2B]/40 transition-all">
                    <option value="">Sélectionner un programme...</option>
                    {modelProgrammes.map(p => (
                      <option key={p.id} value={p.id}>{p.titre} ({p.duree_semaines || '?'} sem.)</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Client select */}
              <div>
                <label className="block text-xs text-white/30 font-semibold uppercase tracking-wider mb-2">À quel client ?</label>
                <select value={assignClientId} onChange={e => setAssignClientId(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#27272a] rounded-xl px-4 py-3 text-[#F5F5F3] text-sm focus:outline-none focus:border-[#FF6B2B]/40 transition-all">
                  <option value="">Sélectionner un client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.profiles?.id}>{getClientName(c)}</option>
                  ))}
                </select>
              </div>

              {/* Summary */}
              {assignModelId && assignClientId && (
                <div className="bg-[#0D0D0D] rounded-xl p-4 border border-white/[0.04]">
                  <p className="text-xs text-white/30 mb-1">Résumé</p>
                  <p className="text-sm text-[#F5F5F3]">
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
                className="flex-1 py-3 rounded-xl text-sm text-white/40 hover:text-white hover:bg-white/[0.04] transition-all border border-white/[0.04]">
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
