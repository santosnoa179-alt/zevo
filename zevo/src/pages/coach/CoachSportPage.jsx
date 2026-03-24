import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import ProgramBuilder from './ProgramBuilder'
import {
  Search, Filter, Plus, Calendar, RefreshCw, X,
  Dumbbell, Loader2, ChevronRight, Tag, Users,
  CalendarDays, Clock, MoreHorizontal, Layers
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

  // ── Clients for dropdown ──
  const [clients, setClients] = useState([])
  useEffect(() => {
    if (!user) return
    supabase.from('clients').select('id, profiles(id, nom)').eq('coach_id', user.id).eq('actif', true)
      .then(({ data }) => setClients(data || []))
  }, [user])

  // ── Fetch programmes from Supabase ──
  const fetchProgrammes = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      // Fetch programmes
      const { data: progs, error } = await supabase
        .from('programmes')
        .select('*')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProgrammes(progs || [])

      // Fetch assignations with client names
      if (progs?.length) {
        const { data: assigns } = await supabase
          .from('programme_assignations')
          .select('programme_id, statut, date_debut, clients(id, profiles(nom))')
          .eq('coach_id', user.id)

        const assignMap = {}
        ;(assigns || []).forEach(a => {
          const nom = a.clients?.profiles?.nom || 'Client'
          const initials = nom.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          assignMap[a.programme_id] = {
            client_nom: nom,
            client_initials: initials,
            statut: a.statut || 'en_cours',
            date_debut: a.date_debut,
          }
        })
        setAssignations(assignMap)
      }
    } catch (err) {
      console.error('Erreur chargement programmes:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => { fetchProgrammes() }, [fetchProgrammes])

  // Filter programmes by search + tab
  const filteredProgrammes = programmes.filter(p => {
    const matchSearch = p.titre?.toLowerCase().includes(search.toLowerCase())
    if (activeTab === 'assigned') return matchSearch && assignations[p.id]
    if (activeTab === 'templates') return matchSearch && !assignations[p.id]
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

    // Build programme object
    const newProg = {
      id: crypto.randomUUID(),
      titre: createTitle.trim(),
      type: programType,
      mode: createMode,
      date_debut: createDate,
      tags: createTags,
      client_id: createClient || null,
      duree_semaines: programType === 'calendrier' ? 4 : 4,
    }

    // TODO: real Supabase insert here

    setTimeout(() => {
      toast.success(`Programme "${createTitle}" créé !`)
      setShowCreateModal(false)
      setCreating(false)
      // Navigate to builder
      setBuilderProgramme(newProg)
      setCurrentView('builder')
    }, 500)
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
        <button className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-white/40 text-sm font-medium hover:text-white/60 hover:bg-[#27272a] transition-all">
          <Filter size={14} /> Filtrer
        </button>
        <div className="flex-1" />
        <button className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#27272a] text-white/40 text-sm font-medium hover:text-white/60 hover:bg-[#18181b] transition-all">
          <Plus size={14} /> Assigner un modèle
        </button>
        <button onClick={openCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-bold hover:bg-[#FF6B2B]/90 transition-all shadow-lg shadow-[#FF6B2B]/20">
          <Plus size={15} /> Créer un programme
        </button>
      </div>

      {/* ═══ Table ═══ */}
      <div className="bg-[#1E1E1E] border border-white/[0.06] rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-[#27272a] text-[10px] text-white/25 font-semibold uppercase tracking-wider">
          <div className="col-span-1">Publié</div>
          <div className="col-span-2">Créé le</div>
          <div className="col-span-3">Nom du programme</div>
          <div className="col-span-1">Type</div>
          <div className="col-span-3">Dates & Progrès</div>
          <div className="col-span-2">Assigné à</div>
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
                {/* Dates & Progrès */}
                <div className="col-span-3">
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
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#FF6B2B]/10 flex items-center justify-center shrink-0">
                        <span className="text-[#FF6B2B] text-[9px] font-bold">{assign.client_initials}</span>
                      </div>
                      <span className="text-white/40 text-xs truncate">{assign.client_nom}</span>
                    </div>
                  ) : (
                    <span className="text-white/15 text-xs">Non assigné</span>
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
                        <option key={c.id} value={c.profiles?.id} className="bg-[#1E1E1E]">{c.profiles?.nom || 'Client'}</option>
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
    </div>
  )
}
