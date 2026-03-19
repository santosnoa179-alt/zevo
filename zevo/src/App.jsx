import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ProtectedRoute } from './components/layout/ProtectedRoute'

// Layouts
import { ClientLayout } from './components/layout/ClientLayout'
import { CoachLayout } from './components/layout/CoachLayout'
import { CoachGuard } from './components/layout/CoachGuard'
import { AdminLayout } from './components/layout/AdminLayout'

// Pages publiques
import LoginPage from './pages/public/LoginPage'
import InvitePage from './pages/public/InvitePage'
import PricingPage from './pages/public/PricingPage'
import NotFoundPage from './pages/public/NotFoundPage'

// Pages client
import DashboardPage from './pages/client/DashboardPage'
import HabitudesPage from './pages/client/HabitudesPage'
import ObjectifsPage from './pages/client/ObjectifsPage'
import MessagesClientPage from './pages/client/MessagesPage'
import ProfilPage from './pages/client/ProfilPage'

// Pages coach
import CoachDashboardPage from './pages/coach/CoachDashboardPage'
import CoachClientsPage from './pages/coach/CoachClientsPage'
import CoachClientFichePage from './pages/coach/CoachClientFichePage'
import CoachMessagesPage from './pages/coach/CoachMessagesPage'
import CoachProgrammesPage from './pages/coach/CoachProgrammesPage'
import CoachParametresPage from './pages/coach/CoachParametresPage'

// Pages admin
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminCoachsPage from './pages/admin/AdminCoachsPage'

export default function App() {
  return (
    <BrowserRouter>
      {/* AuthProvider enveloppe toute l'app pour partager l'état de connexion */}
      <AuthProvider>
        <Routes>
          {/* Routes publiques */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/invite/:token" element={<InvitePage />} />
          <Route path="/pricing" element={<PricingPage />} />

          {/* Redirection racine vers login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* ── Section client ── */}
          <Route
            path="/app"
            element={
              <ProtectedRoute allowedRoles={['client']}>
                <ClientLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="habitudes" element={<HabitudesPage />} />
            <Route path="objectifs" element={<ObjectifsPage />} />
            <Route path="messages" element={<MessagesClientPage />} />
            <Route path="profil" element={<ProfilPage />} />
          </Route>

          {/* ── Section coach — protégée par rôle + guard abonnement ── */}
          <Route
            path="/coach"
            element={
              <ProtectedRoute allowedRoles={['coach']}>
                <CoachGuard>
                  <CoachLayout />
                </CoachGuard>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/coach/dashboard" replace />} />
            <Route path="dashboard" element={<CoachDashboardPage />} />
            <Route path="clients" element={<CoachClientsPage />} />
            <Route path="clients/:clientId" element={<CoachClientFichePage />} />
            <Route path="programmes" element={<CoachProgrammesPage />} />
            <Route path="messages" element={<CoachMessagesPage />} />
            <Route path="parametres" element={<CoachParametresPage />} />
          </Route>

          {/* ── Section admin ── */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="coachs" element={<AdminCoachsPage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
