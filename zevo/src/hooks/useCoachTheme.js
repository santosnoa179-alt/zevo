import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Convertit un hex (#RRGGBB ou #RGB) en [r, g, b] (0-255)
function hexToRgbArr(hex) {
  if (typeof hex !== 'string') return null
  let h = hex.trim().replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  if (h.length !== 6) return null
  const n = parseInt(h, 16)
  if (Number.isNaN(n)) return null
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// Éclaircit une couleur en la mélangeant vers le blanc (factor 0..1).
// Sert à dériver --color-primary-light depuis la couleur du coach pour que les
// dégradés "couleur → couleur claire" suivent le thème (et pas l'orange Zevo).
function lighten([r, g, b], factor) {
  return [r, g, b].map(c => Math.round(c + (255 - c) * factor))
}

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
    let cancelled = false

    const loadTheme = async () => {
      // Récupère le coach_id du client connecté
      const { data: clientData, error: clientErr } = await supabase
        .from('clients')
        .select('coach_id')
        .eq('id', user.id)
        .maybeSingle()

      if (cancelled) return
      if (clientErr || !clientData?.coach_id) {
        setLoading(false)
        return
      }

      // Charge les paramètres visuels du coach
      const { data: coachData, error: coachErr } = await supabase
        .from('coaches')
        .select('couleur_primaire, nom_app, logo_url, message_bienvenue, modules')
        .eq('id', clientData.coach_id)
        .maybeSingle()

      if (cancelled) return
      if (coachErr || !coachData) {
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
        const rgbArr = hexToRgbArr(coachData.couleur_primaire)
        if (rgbArr) {
          // Composantes RGB pour les rgba() dynamiques (halos, ombres)
          root.style.setProperty('--color-primary-rgb', rgbArr.join(', '))
          // Version claire DÉRIVÉE de la couleur du coach (mélange vers blanc)
          // → les dégradés "couleur → couleur claire" suivent le thème
          //   (ex. violet → violet clair) au lieu de virer orange Zevo.
          const lightArr = lighten(rgbArr, 0.35)
          root.style.setProperty('--color-primary-light', `rgb(${lightArr.join(', ')})`)
          root.style.setProperty('--color-primary-light-rgb', lightArr.join(', '))
        }
      }
      if (coachData.nom_app) {
        document.title = coachData.nom_app
      }

      setLoading(false)
    }

    loadTheme()
    return () => { cancelled = true }
  }, [user])

  return { nomApp, logoUrl, couleur, messageBienvenue, modules, loading }
}
