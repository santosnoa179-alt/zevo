import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Card, CardBody } from '../../components/ui/Card'
import {
  FileText, Video, Link2, Image, BookOpen,
  ExternalLink, Download, Loader2, Search
} from 'lucide-react'

// Icônes et couleurs par type
const TYPE_CONFIG = {
  pdf:   { icon: FileText, color: '#EF4444', label: 'PDF' },
  video: { icon: Video,    color: '#8B5CF6', label: 'Vidéo' },
  lien:  { icon: Link2,    color: '#3B82F6', label: 'Lien' },
  image: { icon: Image,    color: '#10B981', label: 'Image' },
  guide: { icon: BookOpen, color: '#F59E0B', label: 'Guide' },
}

export default function RessourcesPage() {
  const { user } = useAuth()
  const [ressources, setRessources] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user) return
    const load = async () => {
      // Charge les ressources partagées avec ce client via la table de jointure
      const { data } = await supabase
        .from('ressources_partages')
        .select('ressource_id, ressources(id, titre, type, url, categorie, description, created_at)')
        .eq('client_id', user.id)
        .order('partage_at', { ascending: false })

      // Extraire les ressources
      const res = (data || [])
        .map(p => p.ressources)
        .filter(Boolean)

      setRessources(res)
      setLoading(false)
    }
    load()
  }, [user])

  const filtered = ressources.filter(r =>
    !search || r.titre.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[var(--color-primary,#FF6B2B)]" size={32} />
      </div>
    )
  }

  return (
    <div className="p-4 max-w-2xl space-y-4">
      <div className="pt-4">
        <h1 className="text-[#F5F5F3] text-xl font-bold">Ressources</h1>
        <p className="text-white/40 text-sm mt-0.5">Fichiers et liens partagés par ton coach</p>
      </div>

      {/* Recherche */}
      {ressources.length > 3 && (
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#1E1E1E] border border-white/[0.08] rounded-xl text-[#F5F5F3] text-sm placeholder:text-white/20 focus:outline-none focus:border-[var(--color-primary,#FF6B2B)]/50"
          />
        </div>
      )}

      {/* Liste vide */}
      {ressources.length === 0 && (
        <Card>
          <CardBody className="text-center py-12">
            <BookOpen size={36} className="text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm">Ton coach n'a pas encore partagé de ressources</p>
          </CardBody>
        </Card>
      )}

      {/* Liste des ressources */}
      <div className="space-y-2">
        {filtered.map((res) => {
          const config = TYPE_CONFIG[res.type] || TYPE_CONFIG.lien
          const Icon = config.icon
          const isPDF = res.type === 'pdf' || res.type === 'image'

          return (
            <a
              key={res.id}
              href={res.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-[#1E1E1E] border border-white/[0.08] rounded-xl hover:border-white/[0.15] transition-colors"
            >
              {/* Icône type */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${config.color}15` }}
              >
                <Icon size={18} style={{ color: config.color }} />
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <p className="text-[#F5F5F3] text-sm font-medium truncate">{res.titre}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${config.color}15`, color: config.color }}
                  >
                    {config.label}
                  </span>
                  {res.categorie && (
                    <span className="text-white/30 text-[10px]">{res.categorie}</span>
                  )}
                </div>
                {res.description && (
                  <p className="text-white/30 text-xs mt-1 line-clamp-1">{res.description}</p>
                )}
              </div>

              {/* Action */}
              {isPDF ? (
                <Download size={16} className="text-white/30 shrink-0" />
              ) : (
                <ExternalLink size={16} className="text-white/30 shrink-0" />
              )}
            </a>
          )
        })}
      </div>
    </div>
  )
}
