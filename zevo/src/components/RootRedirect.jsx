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

export default function RootRedirect() {
  const { user, loading: authLoading } = useAuth()
  const { role, loading: roleLoading } = useRole()

  // Si pas connecté (et auth chargé) → redirect hard vers la landing marketing
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.replace(MARKETING_URL)
    }
  }, [authLoading, user])

  // Pendant le chargement → petit splash (le splash HTML du index.html a déjà
  // caché l'écran blanc de React, ici on évite juste un flash).
  if (authLoading || (user && roleLoading)) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
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
      height: '100vh',
      background: '#060606',
    }} />
  )
}
