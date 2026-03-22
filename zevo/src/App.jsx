import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ProtectedRoute } from './components/layout/ProtectedRoute'

// Layouts — chargés immédiatement (nécessaires au rendu initial)
import { ClientLayout } from './components/layout/ClientLayout'
import { CoachLayout } from './components/layout/CoachLayout'
import { CoachGuard } from './components/layout/CoachGuard'
import { AdminLayout } from './components/layout/AdminLayout'

// Fallback skeleton pendant le chargement lazy
function PageLoader() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-[#2A2A2A] rounded" />
      <div className="h-4 w-72 bg-[#2A2A2A] rounded" />
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="h-32 bg-[#2A2A2A] rounded-xl" />
        <div className="h-32 bg-[#2A2A2A] rounded-xl" />
      </div>
    </div>
  )
}

// ── Pages publiques (lazy) ──
const LoginPage = lazy(() => import('./pages/public/LoginPage'))
const InvitePage = lazy(() => import('./pages/public/InvitePage'))
const PricingPage = lazy(() => import('./pages/public/PricingPage'))
const NotFoundPage = lazy(() => import('./pages/public/NotFoundPage'))

// ── Pages client (lazy) ──
const DashboardPage = lazy(() => import('./pages/client/DashboardPage'))
const HabitudesPage = lazy(() => import('./pages/client/HabitudesPage'))
const ObjectifsPage = lazy(() => import('./pages/client/ObjectifsPage'))
const MessagesClientPage = lazy(() => import('./pages/client/MessagesPage'))
const ProfilPage = lazy(() => import('./pages/client/ProfilPage'))
const RessourcesPage = lazy(() => import('./pages/client/RessourcesPage'))
const FormulairesPage = lazy(() => import('./pages/client/FormulairesPage'))
const AbonnementPage = lazy(() => import('./pages/client/AbonnementPage'))
const ProgrammePage = lazy(() => import('./pages/client/ProgrammePage'))

// ── Pages coach (lazy) ──
const CoachDashboardPage = lazy(() => import('./pages/coach/CoachDashboardPage'))
const CoachClientsPage = lazy(() => import('./pages/coach/CoachClientsPage'))
const CoachClientFichePage = lazy(() => import('./pages/coach/CoachClientFichePage'))
const CoachMessagesPage = lazy(() => import('./pages/coach/CoachMessagesPage'))
const CoachProgrammesPage = lazy(() => import('./pages/coach/CoachProgrammesPage'))
const CoachBibliothequePage = lazy(() => import('./pages/coach/CoachBibliothequePage'))
const CoachFormulairesPage = lazy(() => import('./pages/coach/CoachFormulairesPage'))
const CoachRapportsPage = lazy(() => import('./pages/coach/CoachRapportsPage'))
const CoachStatistiquesPage = lazy(() => import('./pages/coach/CoachStatistiquesPage'))
const CoachAbonnementsPage = lazy(() => import('./pages/coach/CoachAbonnementsPage'))
const CoachAppBuilderPage = lazy(() => import('./pages/coach/CoachAppBuilderPage'))
const CoachParametresPage = lazy(() => import('./pages/coach/CoachParametresPage'))
const CoachOnboarding = lazy(() => import('./pages/coach/CoachOnboarding'))

// ── Pages admin (lazy) ──
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const AdminCoachsPage = lazy(() => import('./pages/admin/AdminCoachsPage'))

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
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
              <Route path="ressources" element={<RessourcesPage />} />
              <Route path="formulaires" element={<FormulairesPage />} />
              <Route path="abonnement" element={<AbonnementPage />} />
              <Route path="programme" element={<ProgrammePage />} />
            </Route>

            {/* ── Onboarding coach (hors layout) ── */}
            <Route
              path="/coach/onboarding"
              element={
                <ProtectedRoute allowedRoles={['coach']}>
                  <CoachOnboarding />
                </ProtectedRoute>
              }
            />

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
              <Route path="bibliotheque" element={<CoachBibliothequePage />} />
              <Route path="formulaires" element={<CoachFormulairesPage />} />
              <Route path="rapports" element={<CoachRapportsPage />} />
              <Route path="statistiques" element={<CoachStatistiquesPage />} />
              <Route path="abonnements" element={<CoachAbonnementsPage />} />
              <Route path="app-builder" element={<CoachAppBuilderPage />} />
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
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
