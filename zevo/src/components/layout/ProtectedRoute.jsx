import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useRole } from '../../hooks/useRole'

// Redirige vers /login si non connecté, ou vers la bonne section si mauvais rôle
export function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading: authLoading } = useAuth()
  const { role, loading: roleLoading } = useRole()

  console.log('ProtectedRoute — authLoading:', authLoading, '| roleLoading:', roleLoading, '| user:', !!user, '| role:', role, '| allowed:', allowedRoles)

  // Affiche un spinner tant que auth OU role n'est pas résolu
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FF6B2B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Non connecté → page de login
  if (!user) {
    console.log('ProtectedRoute — pas de user → /login')
    return <Navigate to="/login" replace />
  }

  // Mauvais rôle → redirection vers la bonne section
  if (allowedRoles && !allowedRoles.includes(role)) {
    const redirects = { admin: '/admin', coach: '/coach', client: '/app' }
    const target = redirects[role]
    console.log('ProtectedRoute — mauvais rôle, redirect vers:', target || '/login')
    return <Navigate to={target ?? '/login'} replace />
  }

  return children
}
