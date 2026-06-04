import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useRole } from '../hooks/useRole'

/**
 * Route "/" de l'app : redirige intelligemment.
 *
 * - Utilisateur non connecté → hard redirect vers la landing marketing
 *   (https://zevo-one.com) — on ne garde PAS de landing dupliquée dans l'app.
 * - Utilisateur connecté → dashboard approprié selon son rôle.
 *
 * Raison : éviter la duplication de contenu entre zevo-one.com (marketing
 * Next.js) et l'app React, qui créait des incohérences de chiffres/copy
 * et un risque de pénalité SEO (duplicate content).
 */
const MARKETING_URL = 'https://zevo-one.com'

// Détecte un retour de confirmation email / magic link / OAuth : Supabase
// renvoie le token dans le hash (#access_token=...) ou en query (?code=...).
// Dans ce cas il ne faut SURTOUT pas bounce vers le marketing — getSession()
// peut renvoyer null (localStorage vide) AVANT que detectSessionInUrl ait fini
// de parser le token de l'URL. On attend que la session s'établisse.
function hasAuthCallbackInUrl() {
  if (typeof window === 'undefined') return false
  const hash = window.location.hash || ''
  const search = window.location.search || ''
  return (
    hash.includes('access_token') ||
    hash.includes('refresh_token') ||
    hash.includes('error') ||
    /[?&]code=/.test(search) ||
    /[?&]token_hash=/.test(search) ||
    /[?&]type=(signup|recovery|magiclink|invite|email_change)/.test(search)
  )
}

export default function RootRedirect() {
  const { user, loading: authLoading } = useAuth()
  const { role, loading: roleLoading } = useRole()

  // Si pas connecté (et auth chargé) → redirect hard vers la landing marketing.
  // Sauf si l'URL contient un callback d'auth en cours de traitement.
  useEffect(() => {
    if (authLoading || user) return
    if (hasAuthCallbackInUrl()) return // attend que Supabase établisse la session
    window.location.replace(MARKETING_URL)
  }, [authLoading, user])

  // Filet de sécurité : si l'URL contient un callback d'auth mais que la session
  // ne s'établit jamais (token expiré/invalide), on ne reste pas bloqué sur le
  // splash → on bascule vers /login après 5s.
  useEffect(() => {
    if (!hasAuthCallbackInUrl()) return
    const t = setTimeout(() => {
      if (!user) window.location.replace('/login')
    }, 5000)
    return () => clearTimeout(t)
  }, [user])

  // Pendant le chargement → petit splash (le splash HTML du index.html a déjà
  // caché l'écran blanc de React, ici on évite juste un flash).
  if (authLoading || (user && roleLoading)) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100dvh',
        background: '#060606',
      }} />
    )
  }

  // Connecté + rôle connu → dashboard approprié
  if (user && role) {
    if (role === 'admin') return <Navigate to="/admin" replace />
    if (role === 'coach') return <Navigate to="/coach" replace />
    return <Navigate to="/app" replace />
  }

  // Pas de user et redirect en cours → écran noir pour éviter le flash
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100dvh',
      background: '#060606',
    }} />
  )
}
