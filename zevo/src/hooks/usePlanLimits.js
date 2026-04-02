import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Limites par plan
const PLAN_CONFIG = {
  starter: {
    price: 29,
    maxClients: 5,
    features: {
      dashboard: true,
      messagerie: true,
      bienEtre: true,
      formulaires: true,
      bibliotheque: true,
      programmes: true,
      rapports: false,
      statistiques: false,
      appBuilder: false,
    },
  },
  pro: {
    price: 49,
    maxClients: 50,
    features: {
      dashboard: true,
      messagerie: true,
      bienEtre: true,
      formulaires: true,
      bibliotheque: true,
      rapports: true,
      programmes: true,
      statistiques: true,
      appBuilder: true,
    },
  },
  unlimited: {
    price: 79,
    maxClients: Infinity,
    features: {
      dashboard: true,
      messagerie: true,
      bienEtre: true,
      formulaires: true,
      bibliotheque: true,
      rapports: true,
      programmes: true,
      statistiques: true,
      appBuilder: true,
    },
  },
}

// Labels pour l'UI
const FEATURE_LABELS = {
  rapports: 'Rapports PDF',
  statistiques: 'Statistiques avancées',
  appBuilder: 'App Builder (branding)',
}

// Plan minimum requis pour chaque feature verrouillée
const FEATURE_MIN_PLAN = {
  rapports: 'pro',
  statistiques: 'pro',
  appBuilder: 'pro',
}

export function usePlanLimits() {
  const { user } = useAuth()
  const [plan, setPlan] = useState('starter')
  const [clientCount, setClientCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const load = async () => {
      const [coachRes, clientsRes] = await Promise.all([
        supabase
          .from('coaches')
          .select('plan')
          .eq('id', user.id)
          .single(),
        supabase
          .from('clients')
          .select('id', { count: 'exact', head: true })
          .eq('coach_id', user.id),
      ])

      setPlan(coachRes.data?.plan || 'starter')
      setClientCount(clientsRes.count || 0)
      setLoading(false)
    }

    load()
  }, [user])

  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.starter
  const maxClients = config.maxClients
  const canAddClient = clientCount < maxClients
  const clientsRemaining = maxClients === Infinity ? Infinity : maxClients - clientCount

  // Vérifie si une feature est accessible dans le plan actuel
  const hasFeature = (featureKey) => {
    return config.features[featureKey] ?? false
  }

  // Retourne le plan minimum requis pour une feature
  const getMinPlan = (featureKey) => {
    return FEATURE_MIN_PLAN[featureKey] || 'starter'
  }

  // Retourne le label d'une feature
  const getFeatureLabel = (featureKey) => {
    return FEATURE_LABELS[featureKey] || featureKey
  }

  return {
    plan,
    loading,
    config,
    clientCount,
    maxClients,
    canAddClient,
    clientsRemaining,
    hasFeature,
    getMinPlan,
    getFeatureLabel,
    PLAN_CONFIG,
  }
}
