import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { PlanGate } from './components/PlanGate'

// Layouts — lazy-loaded (chargés uniquement quand on accède à la section)
const ClientLayout = lazy(() => import('./components/layout/ClientLayout').then(m => ({ default: m.ClientLayout })))
const CoachLayout = lazy(() => import('./components/layout/CoachLayout').then(m => ({ default: m.CoachLayout })))
const CoachGuard = lazy(() => import('./components/layout/CoachGuard').then(m => ({ default: m.CoachGuard })))
const AdminLayout = lazy(() => import('./components/layout/AdminLayout').then(m => ({ default: m.AdminLayout })))

// Fallback skeleton pendant le chargement lazy
function PageLoader() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-[var(--bg-surface)] rounded" />
      <div className="h-4 w-72 bg-[var(--bg-surface)] rounded" />
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="h-32 bg-[var(--bg-surface)] rounded-xl" />
        <div className="h-32 bg-[var(--bg-surface)] rounded-xl" />
      </div>
    </div>
  )
}

// ── Pages publiques minimales (auth uniquement) ──
// Les anciennes landing/pricing/demo/blog/features ont été supprimées :
// la landing marketing officielle est sur zevo-one.com (zevo-marketing/),
// l'app ne gère que l'authentification et les invitations.
const LoginPage = lazy(() => import('./pages/public/LoginPage'))
const InvitePage = lazy(() => import('./pages/public/InvitePage'))
const NotFoundPage = lazy(() => import('./pages/public/NotFoundPage'))
const RootRedirect = lazy(() => import('./components/RootRedirect'))

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
const SeancesPage = lazy(() => import('./pages/client/SeancesPage'))
const ClientCalendarPage = lazy(() => import('./pages/client/ClientCalendarPage'))
const WorkoutTrackerPage = lazy(() => import('./pages/client/WorkoutTrackerPage'))

// ── Pages coach (lazy) ──
const CoachDashboardPage = lazy(() => import('./pages/coach/CoachDashboardPage'))
const CoachClientsPage = lazy(() => import('./pages/coach/CoachClientsPage'))
const CoachClientFichePage = lazy(() => import('./pages/coach/CoachClientFichePage'))
const CoachMessagesPage = lazy(() => import('./pages/coach/CoachMessagesPage'))
const CoachProgrammesPage = lazy(() => import('./pages/coach/CoachProgrammesPage'))
const CoachProgrammesHubPage = lazy(() => import('./pages/coach/CoachProgrammesHubPage'))
const CoachSportPage = lazy(() => import('./pages/coach/CoachSportPage'))
const SportProgrammeBuilder = lazy(() => import('./pages/coach/SportProgrammeBuilder'))
const ExerciseLibraryPage = lazy(() => import('./pages/coach/ExerciseLibraryPage'))
const CoachNutritionPage = lazy(() => import('./pages/coach/CoachNutritionPage'))
const NutritionBuilder = lazy(() => import('./pages/coach/NutritionBuilder'))
const NutritionProgrammeBuilder = lazy(() => import('./pages/coach/NutritionProgrammeBuilder'))
const CoachBibliothequePage = lazy(() => import('./pages/coach/CoachBibliothequePage'))
const CoachFormulairesPage = lazy(() => import('./pages/coach/CoachFormulairesPage'))
const CoachRapportsPage = lazy(() => import('./pages/coach/CoachRapportsPage'))
const CoachStatistiquesPage = lazy(() => import('./pages/coach/CoachStatistiquesPage'))
const CoachAbonnementsPage = lazy(() => import('./pages/coach/CoachAbonnementsPage'))
const PaiementsLayout = lazy(() => import('./pages/coach/paiements/PaiementsLayout'))
const PaiementsBusinessPage = lazy(() => import('./pages/coach/paiements/BusinessPage'))
const PaiementsTransactionsPage = lazy(() => import('./pages/coach/paiements/TransactionsPage'))
const PaiementsAbonnementsPage = lazy(() => import('./pages/coach/paiements/AbonnementsListPage'))
const PaiementsFacturesPage = lazy(() => import('./pages/coach/paiements/FacturesPage'))
const PaiementsProduitsPage = lazy(() => import('./pages/coach/paiements/ProduitsPage'))
const PaiementsLiensPage = lazy(() => import('./pages/coach/paiements/LiensPaiementPage'))
const PaiementsCodesPage = lazy(() => import('./pages/coach/paiements/CodesReductionPage'))
const PaiementsParametresPage = lazy(() => import('./pages/coach/paiements/ParametresPaiementPage'))
const CoachAppBuilderPage = lazy(() => import('./pages/coach/CoachAppBuilderPage'))
const CoachParametresPage = lazy(() => import('./pages/coach/CoachParametresPage'))
const CoachProspectsPage = lazy(() => import('./pages/coach/CoachProspectsPage'))
const CoachClientHub = lazy(() => import('./pages/coach/CoachClientHub'))
const CoachOnboarding = lazy(() => import('./pages/coach/CoachOnboarding'))
// CoachDrivePage supprimée — fusionnée dans Bibliothèque
const CoachGlobalCalendarPage = lazy(() => import('./pages/coach/CoachGlobalCalendarPage'))

// ── Pages admin (lazy) ──
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const AdminCoachsPage = lazy(() => import('./pages/admin/AdminCoachsPage'))
const AdminAbonnementsPage = lazy(() => import('./pages/admin/AdminAbonnementsPage'))

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Routes publiques minimales : auth + invite */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<LoginPage />} />
            <Route path="/invite/:token" element={<InvitePage />} />

            {/* Racine : redirige vers dashboard si connecté, sinon vers la
                landing marketing (zevo-one.com). Plus de landing dans l'app. */}
            <Route path="/" element={<RootRedirect />} />

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
              <Route path="seances" element={<ClientCalendarPage />} />
            </Route>

            {/* ── Workout Tracker — hors layout (plein écran immersif) ── */}
            <Route
              path="/app/workout/:seanceId"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <WorkoutTrackerPage />
                </ProtectedRoute>
              }
            />

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
              <Route path="client-hub" element={<CoachClientHub />} />
              <Route path="programmes" element={<CoachProgrammesHubPage />} />
              <Route path="sport" element={<CoachSportPage />} />
              <Route path="sport/programme/new" element={<SportProgrammeBuilder />} />
              <Route path="sport/programme/:programmeId" element={<SportProgrammeBuilder />} />
              <Route path="exercices" element={<ExerciseLibraryPage />} />
              <Route path="nutrition" element={<CoachNutritionPage />} />
              <Route path="nutrition/new" element={<NutritionBuilder />} />
              <Route path="nutrition/:planId" element={<NutritionBuilder />} />
              <Route path="nutrition/programme/new" element={<NutritionProgrammeBuilder />} />
              <Route path="nutrition/programme/:programmeId" element={<NutritionProgrammeBuilder />} />
              <Route path="bibliotheque" element={<CoachBibliothequePage />} />
              <Route path="formulaires" element={<CoachFormulairesPage />} />
              <Route path="rapports" element={<PlanGate feature="rapports"><CoachRapportsPage /></PlanGate>} />
              <Route path="statistiques" element={<PlanGate feature="statistiques"><CoachStatistiquesPage /></PlanGate>} />
              <Route path="abonnements" element={<PaiementsLayout />}>
                <Route index element={<PaiementsBusinessPage />} />
                <Route path="transactions" element={<PaiementsTransactionsPage />} />
                {/* Solde fusionné dans Business — l'ancienne URL redirige */}
                <Route path="solde" element={<Navigate to="/coach/abonnements" replace />} />
                <Route path="abonnements" element={<PaiementsAbonnementsPage />} />
                <Route path="factures" element={<PaiementsFacturesPage />} />
                <Route path="produits" element={<PaiementsProduitsPage />} />
                <Route path="liens" element={<PaiementsLiensPage />} />
                <Route path="codes" element={<PaiementsCodesPage />} />
                <Route path="parametres" element={<PaiementsParametresPage />} />
              </Route>
              <Route path="app-builder" element={<PlanGate feature="appBuilder"><CoachAppBuilderPage /></PlanGate>} />
              <Route path="messages" element={<CoachMessagesPage />} />
              <Route path="parametres" element={<CoachParametresPage />} />
              <Route path="prospects" element={<CoachProspectsPage />} />
              <Route path="drive" element={<Navigate to="/coach/bibliotheque" replace />} />
              <Route path="calendar" element={<CoachGlobalCalendarPage />} />
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
              <Route path="abonnements" element={<AdminAbonnementsPage />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
