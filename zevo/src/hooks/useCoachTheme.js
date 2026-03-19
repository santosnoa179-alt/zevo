import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Charge le thème du coach, injecte les CSS variables, et retourne les données
// Utilisé par ClientLayout pour afficher nom/logo/couleur du coach
// et pour masquer les modules désactivés
export function useCoachTheme() {
  const { user } = useAuth()

  const [nomApp, setNomApp] = useState('Zevo')
  const [logoUrl, setLogoUrl] = useState('')
  const [couleur, setCouleur] = useState('#FF6B2B')
  const [messageBienvenue, setMessageBienvenue] = useState('')
  const [modules, setModules] = useState({ sport: true, sommeil: true, humeur: true, routines: true })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const loadTheme = async () => {
      // Récupère le coach_id du client connecté
      const { data: clientData } = await supabase
        .from('clients')
        .select('coach_id')
        .eq('id', user.id)
        .single()

      if (!clientData?.coach_id) {
        setLoading(false)
        return
      }

      // Charge les paramètres visuels du coach
      const { data: coachData } = await supabase
        .from('coaches')
        .select('couleur_primaire, nom_app, logo_url, message_bienvenue, modules')
        .eq('id', clientData.coach_id)
        .single()

      if (!coachData) {
        setLoading(false)
        return
      }

      // Met à jour l'état local
      if (coachData.nom_app) setNomApp(coachData.nom_app)
      if (coachData.logo_url) setLogoUrl(coachData.logo_url)
      if (coachData.couleur_primaire) setCouleur(coachData.couleur_primaire)
      if (coachData.message_bienvenue) setMessageBienvenue(coachData.message_bienvenue)
      if (coachData.modules) setModules(prev => ({ ...prev, ...coachData.modules }))

      // Injecte dans les variables CSS — le client voit les couleurs de son coach
      const root = document.documentElement
      if (coachData.couleur_primaire) {
        root.style.setProperty('--color-primary', coachData.couleur_primaire)
      }
      if (coachData.nom_app) {
        document.title = coachData.nom_app
      }

      setLoading(false)
    }

    loadTheme()
  }, [user])

  return { nomApp, logoUrl, couleur, messageBienvenue, modules, loading }
}
