# 📋 Session README — Reprise du travail Zevo

> Dernière mise à jour : **16 juin 2026** — section 3 (flow coach) : 8 bugs corrigés + 1 feature post-séance, nettoyage DB
> Pour reprendre dans un nouveau chat Claude Code, **lis ce fichier en premier** puis attaque la todo.

---

## 🆕 Session du 16 juin 2026 — tests flow coach : 8 bugs + feature post-séance

Reprise des tests `LAUNCH-CHECKLIST.md`. Sections 1 (Auth) et 2 (Stripe) validées. Section 3 (flow coach) : gros travail sur sport/client/formulaires (bugs trouvés en test live par Noa) + audit nutrition + 1 feature.

### 🎯 Commits de la session (du plus récent au plus ancien)

| SHA | Description |
|---|---|
| `3752047` | fix(coach-rapports): prénom + nom du client (sélecteur, aperçu, PDF, fichier) |
| `46260d4` | fix(coach-fiche): prénom + nom du client dans le header |
| `028cafa` | fix(coach-biblio): trad FR import + partage plus clair + prénom nom |
| `1a470e6` | feat(formulaires): réponses post-séance liées à la séance (badge coach) |
| `6987dd8` | fix(coach-formulaires): afficher prénom + nom du client |
| `73952e2` | chore(sentry): ignorer les erreurs de chunk lazy obsolète |
| `19754a9` | fix(client): séances types sport invisibles (colonne objectif_seance) |
| `4974d06` | fix(client): tuto à chaque login (récursion RLS profiles — impact large) |
| `139a4ed` / `7e71820` | docs session (bugs 5 & 6) |
| `1699ce9` | docs session 16 juin |
| `933e17e` | fix(sport): séances orphelines après suppression programme |
| `a61e17b` | chore: untrack zevo-marketing/zevo-video + gitignore |
| `17554bc` | fix(sport): exercices Pro invisibles (migration seance_exercices) |
| `10f947f` | fix(sport): builder 400 + Planifié + superset bouton |
| `f294f3d` | ux(pricing): boutons gradient orange au survol |
| `aa66754` | fix(invite): nom d'app coach via RPC |
| `58ab810` | fix(auth): page /reset-password manquante |

### ✅ Section 3 (flow coach) — TERMINÉE
Tous les modules testés : Dashboard, Clients, Sport, Nutrition, Messages, Formulaires, Bibliothèque, Calendrier global. Le calendrier global a été vérifié : événement créé (coach_events) avec toutes ses infos (titre/date/heure/type/notes/client) → bien pris en compte dans le calendrier + détail + hub client. Aucune info perdue.

### 🔴 À FAIRE EN PRIORITÉ À LA REPRISE
- [ ] **Vérifier sur la prod** (après déploiement Vercel) tous les fixes de code ci-dessus, surtout : tracker client (nom/GIF), programme client (séances types), tuto qui ne revient plus, profil client modifiable, formulaires post-séance, traductions biblio.
- [x] **4 migrations DB versionnées** (`aa2fd18`) dans `supabase/*.sql` (convention du projet, pas de dossier migrations/) : add-seance-exercices-reps-cible, fix-rls-sport-exos-client-read, fix-rls-profiles-recursion, add-formulaire-reponses-seance.
- [ ] **Passe prénom + nom client — écrans restants** : bug récurrent corrigé sur 5 écrans (messagerie, formulaires, biblio, fiche, rapports). Reste : CoachClientsPage, CoachAbonnementsPage, CoachProgrammesPage, CoachSportPage, CoachDashboardPage, CoachGlobalCalendarPage, CoachClientHub, paiements/AbonnementsListPage. Un chip de tâche de fond existe (lancer en 1 clic) avec la liste détaillée.
- [ ] **Sections 4-9** : côté client complet, admin, mobile, monitoring, légal.

### ✅ Section 1 Auth — TERMINÉE
- Reset password : page `/reset-password` créée (manquait totalement — le lien email ne menait nulle part) + flow email réel validé
- Login, sécurité routes, invitation client : tous OK

### ✅ Section 2 Stripe — validée (l'essentiel)
- Paiement réel + webhook + remboursement + Connect déjà validés le 21 avril (Noa confirme). Cas secondaires (upgrade, promo, 3DS, Connect client→commission) non testés mais non bloquants soft launch.

### ✅ Section 3 — Builder programme SPORT : 4 bugs corrigés

| Commit | Bug |
|---|---|
| `f294f3d` | UX pricing : boutons Starter/Unlimited en gradient orange au survol |
| `10f947f` | 400 console (relation `exercices` FR inexistante → `exercises`) + label "Réalisé" trompeur → "Planifié" + superset cryptique (champ texte A/B) → bouton "Lier au précédent" |
| `17554bc` | **Exercices Pro invisibles client/coach** : migration DB `seance_exercices` (ajout `reps_cible` text + `exercice_id` nullable) — l'insert échouait (PGRST204), séances déployées vides. + `reps:null` au déploiement (DEFAULT 12 masquait le range) + résolution nom/gif exos Pro via `sport_seance_exercices→exercises` dans 5 vues |
| `933e17e` | **Séances orphelines après suppression programme** : FK `seances.sport_programme_id` est ON DELETE SET NULL → supprimer le prog laissait les séances dans le calendrier. Fix : delete seances AVANT le programme (seance_exercices cascade) |

**Bug 5 (côté client, RLS — pas de commit, migration DB)** : dans le tracker (`/app/workout/:id`), pas de nom ni de GIF d'exercice. Cause : le join `sport_seance_exercices` renvoyait `null` car la policy SELECT n'autorisait le client que si le **programme** lui appartient — or `sport_seance_exercice_id` pointe vers les exos du **template** (client_id null). Fix = nouvelle policy RLS `clients_read_sport_exos_via_seances` sur `sport_seance_exercices` : le client peut lire un exo source dès qu'il est référencé par une de SES séances. Couvre l'existant + le futur. Vérifié en preview (nom + GIF OK).

**Bug 6 (client, RLS récursif — commit `4974d06` + migration DB) — IMPACT LARGE** : le tutoriel client revenait à **chaque** connexion. Cause : la policy UPDATE `profiles_update_own` faisait `role = (SELECT role FROM profiles ...)` dans son WITH CHECK → **récursion infinie 42P17** → **TOUT UPDATE de `profiles` par un user authenticated plantait en 500** (pas juste `tutorial_seen` : aussi modif profil client/coach, poids, objectifs…). `AppTutorial.markSeen` ignorait l'erreur → flag jamais persisté. Fix : policy récursive supprimée + protection du `role` déplacée dans un trigger `lock_profile_role` (BEFORE UPDATE, non-récursif) ; `markSeen` lit désormais l'erreur. Vérifié : client peut maj son profil, ne peut toujours pas s'auto-promouvoir admin.

**Feature (commit `1a470e6`) : formulaires post-séance liés à la séance** — les formulaires récurrents `recurrence.intervalle = 'post_seance'` génèrent désormais un questionnaire PAR séance terminée (anti-doublon par `seance_id` dans WorkoutTrackerPage au lieu d'un seul global) ; chaque réponse est rattachée à sa séance ; CoachFormulairesPage affiche un badge « Séance : <titre> — <date> » sur chaque réponse. Brainstormé + validé avant implémentation. Vérifié en preview.

**⚠️ Migrations DB hors code de cette session** (à rejouer si la DB est recréée — pas encore dans `supabase/migrations`) :
1. `ALTER TABLE seance_exercices ADD COLUMN IF NOT EXISTS reps_cible text;` + `ALTER COLUMN exercice_id DROP NOT NULL;`
2. Policy `clients_read_sport_exos_via_seances` (SELECT) sur `sport_seance_exercices` (cf. bug 5).
3. `DROP POLICY profiles_update_own` + fonction/trigger `lock_profile_role` sur `profiles` (cf. bug 6) — SQL dans `/tmp/zevo_profiles_fix.sql` reproduit ci-dessus.
4. `ALTER TABLE formulaire_reponses ADD COLUMN seance_id uuid REFERENCES seances(id) ON DELETE SET NULL;` + index `idx_formulaire_reponses_seance` (feature post-séance).

**Nettoyage DB** : 44 séances orphelines supprimées (32 Pro + 12 legacy, toutes compte test, aucune complétée d'un vrai client).

**Cleanup repo** (`a61e17b`) : `zevo-marketing` (repo séparé, ajouté par erreur en submodule) + `zevo-video` retirés du tracking + `.gitignore` créé.

### ✅ Nutrition Pro — auditée, structurellement saine (pas de fix nécessaire)
- Colonnes des tables = payloads de déploiement (pas de mismatch type sport)
- Suppression programme : toutes les FK en CASCADE → pas d'orphelins
- Pas de déploiement de séances datées (le client lit le programme cloné directement) → pas le bug d'invisibilité
- Test live Noa : OK

### 💡 Note technique réutilisée
- Requêtes DB prod + récupération service_role via API Management (token CLI keychain). Sessions coach en preview via `admin/generate_link` + `verify` magiclink → injection localStorage `sb-<ref>-auth-token`. Permet de tester les vues coach/client en preview sans mot de passe.

### ⏳ Reste à tester (section 3-9)
- [x] Messages (temps réel coach↔client, lu/non-lu, images) — testé OK par Noa le 16 juin
- [ ] Calendrier global, Bibliothèque, Formulaires
- [ ] Sections 4-9 : côté client, admin, mobile, monitoring, légal

### Note Sentry
- Erreurs `Failed to fetch dynamically imported module` (chunk lazy obsolète post-déploiement) : bénin, auto-reload géré par `main.jsx`. Ajoutées à `ignoreErrors` Sentry (`73952e2`) pour ne plus polluer le dashboard. Astuce : hard refresh (Cmd+Shift+R) après un déploiement pendant le dev.

---

## 🆕 Session du 11 juin 2026 — vérification SQL pack + invitation + templates email

### ✅ Vérifié (priorité 1 de la session précédente)

**1. SQL pack du 26 mai : ENTIÈREMENT EXÉCUTÉ ✅** (vérifié en live via API Management Supabase)
- `REVOKE anon profiles` ✅ — curl anon sur `/rest/v1/profiles` → `42501 permission denied` (faille fermée)
- Colonne `profiles.tutorial_seen` ✅ présente
- Trigger `handle_new_user()` v2 ✅ — gère coach (metadata role) + client invité (lookup coach_id depuis `invitations` par token, INSERT `clients`, marque `acceptee`)

**2. Invitation client re-testée de bout en bout (niveau DB) ✅**
- Test réel : INSERT invitation test → signup anon avec metadata (`role: client`, `invitation_token`) → vérifié : `profiles` créé (role=client), `clients` créé avec le bon `coach_id`, invitation `acceptee=true` → cleanup (cascade auth.users → profiles → clients OK)
- Reste à tester par Noa : le flow UI complet avec un vrai email (lien reçu → confirmation → login)

### ✅ Livré

**3. Les 3 templates email restants installés dans Supabase** (via API Management, pas de commit)
- Reset password : sujet "Réinitialise ton mot de passe Zevo" + HTML dark brandé
- Magic link : sujet "Ton lien de connexion Zevo"
- Email change : sujet "Confirme ta nouvelle adresse email"
- Tous dérivés du template Confirm signup déjà en place (même design, textes adaptés, "expire dans 1 heure" aligné sur `mailer_otp_exp=3600`)
- **Les 4 templates email Supabase sont maintenant tous FR brandés ✅**

**4bis. Fix P0 reset password — page `/reset-password` manquante (`58ab810`)**
- Trouvé par Noa en testant : le lien email de reset redirigeait vers `/login` et… rien. Aucun formulaire de nouveau mot de passe n'existait dans l'app (aucun `updateUser`, aucun handling `PASSWORD_RECOVERY`)
- Fix : nouvelle page publique `ResetPasswordPage.jsx` (route `/reset-password`) — attend la session de recovery établie par `detectSessionInUrl`, formulaire nouveau mdp + confirmation, erreurs FR, gestion lien expiré (`#error=` Supabase + filet 5s), écran succès → bouton vers l'espace
- `useAuth.resetPassword` : `redirectTo` pointe sur `/reset-password`
- Testé en preview avec un user de test réel : login → formulaire → updateUser → vérifié côté serveur (ancien mdp rejeté `invalid_credentials`, nouveau accepté) → user de test supprimé
- ⚠️ Piège preview rencontré : sur une page fraîchement créée, les clics ne déclenchaient pas les handlers React (module HMR stale) → toujours faire un hard reload avant de tester une nouvelle page

**4. Fix backlog : InvitePage affiche le nom d'app du coach (`aa66754`)**
- RPC `get_invitation_by_token` recréée avec `coach_nom_app` (LEFT JOIN coaches, SECURITY DEFINER — la lecture directe `coaches` en anon était bloquée RLS → fallback 'Zevo' systématique)
- `InvitePage.jsx` lit `data.coach_nom_app` de la RPC (une requête en moins)
- Vérifié en preview : `/invite/<token>` affiche "Bienvenue sur Zevo Démo" ✅, zéro erreur console

### 💡 Astuce technique découverte cette session
- **Requêter la DB prod sans psql/Docker** : `POST https://api.supabase.com/v1/projects/pairqvridvjdktnuvwud/database/query` avec le token CLI (keychain macOS : `security find-generic-password -s "Supabase CLI" -w | sed 's/^go-keyring-base64://' | base64 -d`). Fonctionne pour SELECT/INSERT/DDL. Idem pour la config auth : `GET/PATCH /v1/projects/{ref}/config/auth` (templates email).

### ⏳ TODO restants — prochaine session

**Tests live — section 1 Auth de `LAUNCH-CHECKLIST.md` : ✅ TERMINÉE le 11 juin**
- [x] Login (reconnexion + mauvais mdp) ✅
- [x] Sécurité routes (coach tape /admin, logout + URL protégée) ✅
- [x] Reset password ✅ — page `/reset-password` créée (`58ab810`), flow email réel validé
- [x] Invitation client flow UI complet ✅ — email réel + nom d'app coach affiché + confirmation + arrivée sur /app
- [x] Section 2 Stripe ✅ — l'essentiel validé (paiement 29€ réel le 21 avril : webhook reçu + remboursement + annulation propagée ; Connect : compte créé + webhook account.updated 200). Cas secondaires non testés mais non bloquants soft launch : upgrade Starter→Pro, code promo, CB refusée/3DS, Connect client→commission.
- [ ] Sections 3-9 de la checklist (métier coach/client, admin, mobile, monitoring, légal) — **section 3 flow coach = en cours**

**Backlog technique (non bloquant launch)**
- [ ] Colonnes mortes table `messages` (`sender_id`/`receiver_id`/`content`/`is_read`) — à dropper un jour
- [ ] ~65 `.single()` en lecture — les critiques sont fixés, audit complet à faire au calme
- [ ] Supabase free tier : auto-pause après ~7j d'inactivité — **passer en Pro (25$/mois) avant le launch public**

---

## 🆕 Session du 26 mai 2026 — premiers tests pré-launch + bugs P0

Objectif : préparer le terrain de tests, ajouter PostHog, attaquer la checklist de tests. **Tests interrompus en cours par découverte de 2 bugs P0** (signup coach cassé + emails de confirmation pointant vers localhost). Tous corrigés.

### ✅ Livré

**1. PostHog product analytics (`6fbbe61`)**
- Création `zevo/src/lib/posthog.js` : init EU Cloud (`eu.i.posthog.com`), RGPD-friendly (`autocapture: false`, `disable_session_recording: true`, `respect_dnt: true`), no-op si `VITE_POSTHOG_KEY` vide
- `main.jsx` : `initPostHog()` au boot, après Sentry
- `useAuth.jsx` : `phIdentify(user)` au login + restore session, `phReset()` au logout (parallèle Sentry)
- `App.jsx` : composant `<PostHogPageView />` qui émet `$pageview` manuellement à chaque changement de route React Router (autocapture off)
- `package.json` : `posthog-js@^1.240.6` ajouté
- `.env.example` : `VITE_POSTHOG_KEY` + `VITE_POSTHOG_HOST` documentés
- Clé prod en place sur Vercel (projet `Default project` org `Zevo app` sur eu.posthog.com), events vérifiés en live

**2. Cleanup + fix viewport mobile (`bc9363c`)**
- Retire 3 `console.log` de debug oubliés dans `ProtectedRoute.jsx` (les 3, pas juste celui ligne 10)
- `RootRedirect.jsx` + `main.jsx` : `100vh` → `100dvh` sur splash + fallback fatal error (fix barre vide sous Safari iOS / Chrome Android)

**3. Fix P0 inscription coach — bypass RLS via signup metadata (`e466dc2`)**
- **Symptôme** : signup coach → redirect sur `/app/dashboard` (client) au lieu de `/coach/dashboard`. La console montrait pourtant "rôle: coach → redirection".
- **Cause** : RLS sur `profiles` empêche un user d'updater son propre `role` (sécurité légitime). L'UPDATE `role='coach'` après signup échouait silencieusement → DB gardait `role='client'`. Le `setRoleCache` côté front cachait le bug en session 1 mais ProtectedRoute refetch et plantait sur la vraie valeur DB.
- **Fix** : passer `role: 'coach'` dans `options.data` de `supabase.auth.signUp` → le trigger `handle_new_user()` (en `SECURITY DEFINER`) bypass RLS et crée la row avec le bon rôle directement.
- **Migration SQL appliquée** :
  ```sql
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = public AS $$
  BEGIN
    INSERT INTO public.profiles (id, email, role, nom) VALUES (
      NEW.id, NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
      NEW.raw_user_meta_data->>'nom'
    );
    RETURN NEW;
  END; $$;
  ```
- Le code `LoginPage.handleRegister` ne fait plus l'UPDATE profiles (devenu inutile et impossible à cause de RLS) — la row est OK dès la création.

**4. Fix P0 Site URL Supabase pointait vers localhost:3000** (config Supabase, pas de commit)
- Symptôme : email de confirmation arrivait avec un lien `localhost:3000/auth/confirm?...` au lieu de prod
- Cause : Supabase → Auth → URL Configuration jamais migrée de dev à prod
- Fix : Site URL → `https://app.zevo-one.com` + Redirect URLs ajoutées (`https://app.zevo-one.com/**`, `http://localhost:5173/**` pour dev)
- "Confirm email" activé en parallèle dans Supabase Auth Providers Email

**5. Écran post-inscription premium (`75bfebd`)**
- Remplace le bloc vert générique par un design SaaS premium :
  - Icône Mail dans bulle gradient orange (`#FF6B2B → #FF9A6C`) avec halo pulsant
  - Badge check vert superposé en accent
  - Email affiché en pill avec dot orange pulsant
  - 3 étapes numérotées (Email envoyé / Cliquer / Accéder)
  - Bouton "Renvoyer l'email" avec spinner + cooldown 30s (utilise `supabase.auth.resend({ type: 'signup' })`)
  - Hint dossier spam, retour login en secondaire
- Animations `@keyframes confirm-fade-in` + `confirm-pulse` scopées au composant

**6. Erreurs Supabase traduites en français (`96b5376`)**
- Mapping exhaustif : `already registered`, `valid email`, `rate limit`, `password short`, `weak password`, `network error`, fallback générique
- Avant : "email rate limit exceeded" affiché en anglais brut

### 📄 Documents créés pour la suite

- `LAUNCH-CHECKLIST.md` (racine) — runbook complet ~3h45 de tests pré-launch organisé en 9 sections (Setup → Auth → Stripe → Coach → Client → Admin → Mobile → Monitoring → Légal → Techniques) + section "Bugs trouvés" pour noter au fil de l'eau + rollback plan
- `EMAIL-TEMPLATES.md` (racine) — 4 templates HTML branded Zevo (Confirm signup, Reset password, Magic link, Email change) avec dark theme + gradient orange + CTA premium, compatibles Gmail/Outlook/Apple Mail. Inclut pas-à-pas pour brancher **Resend en SMTP custom** dans Supabase (lève le rate limit 4 emails/h du free tier)

### ✅ Livré (suite de session — tests live + audit complet)

**7. Resend SMTP custom branché dans Supabase** (config, pas de commit)
- Supabase → Auth → Emails → SMTP Settings : `smtp.resend.com:465`, user `resend`, clé API dédiée "Supabase Auth SMTP", sender `noreply@zevo-one.com`
- Lève le rate limit 4 emails/h du free tier qui bloquait les tests

**8. Template email "Confirm signup" brandé installé dans Supabase** (config)
- HTML dark theme + gradient orange + logo (depuis `EMAIL-TEMPLATES.md`), sujet FR
- Reste à faire : les 3 autres templates (Reset password, Magic link, Email change)

**9. Fix P0 boucle onboarding coach (`5815354` + `866166d`)**
- Étape 3 "Lancer mon espace" → toast Bienvenue → retour étape 1 en boucle
- Cause 1 : replication lag — CoachGuard refetchait `onboarding_complete` avant propagation → fix `.select().single()` post-UPDATE + `navigate(state: { fromOnboarding: true })` que CoachGuard respecte
- Cause 2 : la row `coaches` n'existait pas (INSERT du signup échoue en anon avec Confirm email actif) → PGRST116 → fix `.upsert()` dans CoachOnboarding avec defaults Stripe/trial

**10. Fix P0 lien de confirmation → bounce vers marketing (`f739a4b`)**
- Le callback email (`#access_token=...`) arrivait sur `/` mais RootRedirect voyait user=null avant que `detectSessionInUrl` parse le token → hard redirect zevo-one.com
- Fix : `hasAuthCallbackInUrl()` détecte le callback et attend la session (+ filet 5s → /login si token invalide)

**11. Fix tutoriel coach déborde sur mobile (`0280391`)**
- Bulles `position:'right'` + largeurs fixes 460px hors écran mobile → bottom-sheet pleine largeur < 768px, safe-area iOS, maxHeight 85dvh

**12. Fix App Builder verrouillé pendant l'essai (`ba1df23`)**
- Badge "UNLIMITED" mais paywall affiché : la page lisait `coaches.plan` brut ('starter') au lieu d'appliquer l'élévation trial → unlimited de usePlanLimits

**13. AUDIT COMPLET (`be9ae43`) — 6 bugs dont 1 faille sécurité**
- `posthog-js` absent de node_modules locaux → build local cassé → npm install (Node v25 est installé sur la machine désormais)
- **sw.js** : `respondWith(undefined)` = l'erreur "Failed to convert value to 'Response'" des consoles + mise en cache de réponses Supabase authentifiées (fuite post-logout) → réécrit, network-only pour l'API, réponse 503 synthétique offline, cache v3→v4
- **DashboardPage client** : compteur messages non lus sur `destinataire_id` (colonne inexistante) = la HEAD 400 console → `client_id + expediteur='coach' + lu=false`
- **ClientLayout** : `.single()` → `.maybeSingle()` ×2 (406 quand row absente)
- **vite.config** : esbuild `pure` droppe réellement console.log/debug/info du bundle prod (31 occurrences, certaines loggaient des données clients) — le commentaire prétendait le faire, rien ne le faisait
- **InvitePage — invitation client 100% cassée** avec Confirm email actif : signup sans session → UPDATE profiles + INSERT clients en anon → bloqués RLS. Refait via metadata signup (`role`, `invitation_token`) + trigger SECURITY DEFINER qui lit le coach_id depuis l'invitation EN DB (anti-falsification). Écran "Vérifie tes emails" si pas de session.
- 🚨 **FAILLE : `profiles` lisible en anonyme** (emails, notes_coach, poids, données santé de tous les users) — vérifié en live avec la clé anon. Fix = REVOKE dans le SQL pack ci-dessous.

### ⚠️ SQL PACK — exécuté ? À VÉRIFIER en début de prochaine session

Donné à Noa en fin de session (26 mai au soir). **Si pas exécuté : invitation client cassée + faille sécurité ouverte.** Le bloc complet :
1. `handle_new_user()` v2 — gère coach (metadata role) ET client invité (lit coach_id depuis `invitations` par token, crée `clients`, marque `acceptee`)
2. `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tutorial_seen boolean DEFAULT false;` (sans ça le tutoriel client ne marche pas)
3. `REVOKE ALL ON public.profiles FROM anon;` (la faille)

Vérification rapide : `curl -s "https://pairqvridvjdktnuvwud.supabase.co/rest/v1/profiles?select=email&limit=1" -H "apikey: <ANON_KEY>"` → doit renvoyer une erreur de permission, PAS des données.

### 🎯 Commits pushés cette session

| SHA | Description |
|---|---|
| `6fbbe61` | feat(analytics): PostHog product analytics RGPD-friendly |
| `bc9363c` | chore: cleanup logs + fix viewport height mobile |
| `e466dc2` | fix(auth): pass role in signup metadata pour bypass RLS profiles |
| `75bfebd` | feat(auth): refresh ecran post-inscription en design premium |
| `96b5376` | fix(auth): traduire les erreurs Supabase en francais |
| `5815354` | fix(coach): boucle onboarding -> dashboard -> onboarding (race condition) |
| `866166d` | fix(coach): upsert coaches au lieu de update (gere INSERT manquant) |
| `f739a4b` | fix(auth): ne pas bounce vers marketing pendant un callback email |
| `0280391` | fix(coach-mobile): tutoriel coach deborde de l'ecran sur mobile |
| `ba1df23` | fix(coach): App Builder verrouille pendant l'essai gratuit |
| `be9ae43` | fix: audit complet — 5 bugs (SW, colonnes fantomes, invitation client cassee) |

### 📌 Fichiers principaux modifiés

- `zevo/src/lib/posthog.js` (nouveau)
- `zevo/src/main.jsx` — initPostHog + 100dvh
- `zevo/src/hooks/useAuth.jsx` — phIdentify/phReset wired
- `zevo/src/App.jsx` — PostHogPageView component
- `zevo/src/components/layout/ProtectedRoute.jsx` — 3 console.log retirés
- `zevo/src/components/RootRedirect.jsx` — 100dvh
- `zevo/src/pages/public/LoginPage.jsx` — signup metadata + handleResendEmail + écran premium + erreurs FR
- `zevo/package.json` — posthog-js
- `zevo/.env.example` — VITE_POSTHOG_KEY/HOST
- Supabase config (hors repo) : trigger `handle_new_user()` updated + URL Configuration + Confirm email activé

### ⏳ TODO restants — à reprendre à la prochaine session

**🔴 PRIORITÉ 1 — vérifier le SQL pack** (voir section "SQL PACK" ci-dessus)
- [ ] Confirmer que le trigger v2 + `tutorial_seen` + `REVOKE anon profiles` sont passés
- [ ] **Re-tester l'invitation client de bout en bout** (flow cœur du produit, il était cassé)

**Tests — état section 1 Auth de `LAUNCH-CHECKLIST.md`**
- [x] Inscription coach (signup → email FR brandé → confirmation → onboarding → dashboard) ✅
- [x] Tutoriel coach mobile ✅
- [ ] Login (reconnexion + mauvais mdp)
- [ ] Sécurité routes (coach tape /admin, logout + URL protégée)
- [ ] Reset password (⚠️ template encore en anglais — HTML FR dispo dans `EMAIL-TEMPLATES.md`)
- [ ] Invitation client
- [ ] Puis sections 2-9 de la checklist (Stripe, métier coach/client, admin, mobile, monitoring, légal)

**Config Supabase restante**
- [ ] Coller les 3 templates email restants (Reset password, Magic link, Email change) — HTML dans `EMAIL-TEMPLATES.md`

**Backlog technique (non bloquant launch)**
- [ ] Colonnes mortes table `messages` (`sender_id`/`receiver_id`/`content`/`is_read`) — jamais utilisées par le code, à dropper un jour
- [ ] InvitePage : le nom d'app du coach ne s'affiche jamais (lecture `coaches.nom_app` en anon → 401, fallback 'Zevo') — passer par la RPC `get_invitation_by_token`
- [ ] ~65 `.single()` en lecture dans le code — les critiques (layouts/guards/dashboard) sont fixés, audit complet à faire au calme
- [ ] Supabase free tier : projet auto-pause après ~7j d'inactivité — **passer en Pro (25$/mois) avant le launch public**

**Features à ajouter après le launch**
- [ ] **Sélection spécialité coach à l'inscription** — coach sportif / nutrition / hybride lors du signup. Colonne `coaches.specialite` + cards de sélection. Conditionner les features selon la spécialité. Pas bloquant.
- [ ] **BIMI** (logo Zevo dans l'avatar expéditeur Gmail) — DMARC strict + SVG Tiny PS + DNS. VMC ~1000$/an optionnel, à éviter early-stage.

---

## 🆕 Session du 24 avril 2026 — UX mobile messagerie coach

Objectif : aligner la messagerie mobile coach sur le comportement nickel de l'app client, corriger plusieurs bugs de layout mobile.

### ✅ Livré

**1. Alignement style messagerie coach sur app client mobile** (`1d0389e`)
- Header chat coach : ajout `paddingTop: calc(12px + env(safe-area-inset-top, 0px))` (évitait la collision avec Dynamic Island / status bar iOS)
- Suppression des chips de réponses rapides (`'Bravo cette semaine'`, etc.) qui débordaient horizontalement et n'existent pas côté client

**2. Blocage du swipe horizontal — calendrier client + messages coach** (`20ac5f6`)
- Cause client : `ClientLayout.jsx` wrapper principal sans `overflow-hidden` → tout le contenu pouvait être glissé. Le coach layout avait déjà cette règle.
- Cause coach messages : `overflow-y-auto` seul → `overflow-x` restait `visible`, un message avec image/URL large créait un déplacement horizontal
- Fix : `overflow-hidden` sur wrapper `ClientLayout` + `overflow-x-hidden` sur zones scrollables de `CoachMessagesPage`

**3. Barre d'écriture coach qui bougeait + bottom nav qui remontait au menu hamburger** (`346544d`)
- Cause input bar : root en `flex h-dvh overflow-hidden` → le `main` parent pouvait encore scroller sous la page
- Cause bottom nav : menu hamburger coach applique `body { position: fixed; top: -${scrollY}px }` (scroll lock iOS), ce qui fait sauter visuellement les enfants `fixed` du body
- Fix 1 : root `CoachMessagesPage` en `fixed inset-0 md:left-64 z-50` (comme pattern client)
- Fix 2 : masquer le bottom nav quand `menuOpen === true`

**4. Mode immersif sur conversation — bottom nav caché en conv, visible en liste** (`2a8601e` → `d524d5a` → `47deae6`)
- `CoachLayout` : nouveau `hideBottomNav` conditionné à la présence de `?client=XXX` dans l'URL (pas juste la route)
- `CoachMessagesPage.ouvrirConversation()` : pousse `setSearchParams({ client: client.id })` pour activer le mode
- Bouton retour : retire le param via `setSearchParams({})`
- Root de la page : positionnement conditionnel — `fixed inset-0 z-50` seulement quand conversation ouverte, sinon `h-full` normal (pour que le bottom nav du layout reste visible sur la liste)
- Bonus : URL partageable, historique navigateur cohérent, les notifications qui pointent vers `?client=XXX` continuent de fonctionner

**5. Sidebar messages coach — safe-area + fallback** (`fbf0335`)
- Ajout `paddingTop: calc(16px + env(safe-area-inset-top, 0px))` sur header liste clients (avant : "Messages" collait au status bar iOS)
- Fallback sous-ligne "*Nouvelle conversation*" en italique pour les clients sans `dernierMsg` (avant : ligne vide incohérente)

**6. Optimisation modale "nouvelle conversation" + affichage nom complet** (`db48d64`)
- **Modale mobile** : hauteur `h-[90dvh]` (au lieu de `max-h-85vh` trop court), handle indicator en haut (pattern bottom-sheet), `animate-slide-up` sur mobile / fade desktop, `safe-area-inset-bottom` sur bouton action (iOS home indicator), bouton X agrandi à 36×36, `active:` states sur items (hover inutile mobile), padding items `py-3.5`
- **Affichage nom client** : le helper `displayName(c)` (prénom + nom) existait déjà dans le fichier mais n'était utilisé que dans la modale. Étendu à la sidebar liste, header conversation et initiales avatar. Le coach voit maintenant "Noa Santos" (au lieu de "santos") et "NS" (au lieu de "S")

### 🎯 Commits pushés cette session

| SHA | Description |
|---|---|
| `1d0389e` | ux(coach): messagerie mobile alignee sur app client |
| `20ac5f6` | fix(mobile): bloque swipe horizontal (calendrier client + messages coach) |
| `346544d` | fix(coach-mobile): barre input messages + bottom nav hamburger |
| `2a8601e` | feat(coach-mobile): masque bottom nav sur /coach/messages |
| `fbf0335` | fix(coach-mobile): sidebar messages safe-area + fallback sous-ligne |
| `d524d5a` | fix(coach-mobile): bottom nav visible sur liste messages |
| `47deae6` | fix(coach-mobile): positionnement page messages conditionnel |
| `db48d64` | ux(coach): optimise modale 'nouvelle conversation' + affichage nom complet |

### 📌 Fichiers principaux modifiés

- `zevo/src/components/layout/ClientLayout.jsx` — overflow-hidden wrapper
- `zevo/src/components/layout/CoachLayout.jsx` — hideBottomNav dynamique (query param) + masque nav quand hamburger
- `zevo/src/pages/coach/CoachMessagesPage.jsx` — safe-area, positionnement conditionnel, ?client= query, displayName, modale polish
- `zevo/src/pages/client/ClientCalendarPage.jsx` — (pas modifié directement, fix via ClientLayout)

---

## 🆕 Session du 23 avril 2026 (après-midi) — audit sécurité & fixes

### ✅ Livré

**1. Fix delete + stats programmes PRO nutrition** (`ea4f657`)
- `CoachNutritionPage.jsx` : les programmes PRO n'étaient pas comptés dans les stats (totalAssigned / activeAssigned / progressPct / completedCount)
- Unification : stats = `assignedPlans` legacy + `programmes.filter(p => p.client_id)` PRO

**2. Fix dropdown statut clipé — pages paiement** (`c1daa15`, `ef3d77f`)
- `TransactionsPage.jsx` + `AbonnementsListPage.jsx` : le menu déroulant statut s'ouvrait vers le haut et était coupé par le header
- Fix : `bottom-full mb-1` → `top-full mt-1` (ouverture vers le bas)

**3. Audit général sécurité + 10 fixes critiques/high** (`06ad1bb`)
Lancé via 3 sub-agents en parallèle (sécurité / erreurs / UX). Résultats appliqués :
- **`create-portal-session.js`** : ne plus accepter `customerId` depuis le body — lookup depuis `coaches.stripe_customer_id` via JWT (fix IDOR)
- **`exercise-gif.js`** : endpoint était totalement public → ajout `verifyAuth`
- **`sync-exercises.js`** : ajout auth + check rôle `coach`/`admin` (action coûteuse : quotas RapidAPI + OpenAI)
- **CORS whitelist** sur 9 endpoints API (`client-checkout`, `connect-onboarding`, `create-coupon`, `create-payment-link`, `create-portal-session`, `deactivate-payment-link`, `delete-coupon`, `exercise-gif`, `sync-exercises`) : ajout `zevo-one.com`, `app.zevo-one.com`, `www.zevo-one.com`
- **`.env.example`** : suppression du prefix `VITE_` sur `RAPIDAPI_KEY` (serveur uniquement)
- **JSON.parse** wrappés dans try/catch (`SeancesPage.jsx`, `WorkoutTrackerPage.jsx` ×3, `CoachClientHub.jsx`)
- **`useCoachTheme.js`** : `.single()` → `.maybeSingle()` + flag `cancelled` contre les race conditions useEffect
- **`InvitePage.jsx`** : checks d'erreur sur les 3 opérations UPDATE/INSERT + `.single()` → `.maybeSingle()` + `min-h-screen` → `min-h-dvh` (iOS)
- **`CoachDisponibilites.jsx`** : null guard avant `.slice()` sur `heure_debut` / `heure_fin`
- **`CoachMessagesPage.jsx`** : `h-screen` → `h-dvh` pour iOS safe-area

**4. Hardening signup — guard contre "obfuscated signup" Supabase** (`34be696`)
- Quand "Confirm email" + "Prevent user enumeration" sont activés, `supabase.auth.signUp` sur un email existant renvoie `{ user: {..., identities: []}, session: null }` sans erreur
- Sans garde, `InvitePage` enchaînait UPDATE/INSERT sur l'ID d'un autre utilisateur
- Fix dans `useAuth.jsx` : throw explicite `'Un compte existe déjà avec cet email'` si `user && !session && identities.length === 0`

**5. SQL security-hardening exécuté en prod** (confirmé par utilisateur)

### ⏳ TODO restants (polish + backlog audit)

- [ ] **RGPD : export données + suppression compte** — ⏸️ **REPORTÉ APRÈS LE LANCEMENT** (décision Noa 23/04 PM)
- [ ] Bing Webmaster Tools (2 min)
- [ ] Analytics PostHog dans zevo-app (déjà dans marketing)
- [ ] Modal.jsx : focus trap + `role="dialog"` pour accessibilité
- [ ] Remplacer `window.confirm()` par modales custom dark-theme
- [ ] `console.log` résiduel dans `ProtectedRoute.jsx:10`
- [ ] Boutons sans état `disabled` pendant actions async (risque double-submit)
- [ ] `RootRedirect` + `main.jsx` : `100vh` → `100dvh`
- [ ] Backlog perf : backfill `exercises.gif_url`, lazy-load jspdf, compress og-image, `loading="lazy"` sur 21 images, self-host fonts

### 🎯 Commits pushés cette session

| SHA | Description |
|---|---|
| `ea4f657` | fix(coach): bouton supprimer + stats pour programmes Pro sport/nutrition |
| `c1daa15` | fix(transactions): dropdown statut ouvre vers le bas |
| `ef3d77f` | fix(abonnements): dropdown statut ouvre vers le bas |
| `06ad1bb` | security+fix: audit general app (10 issues) |
| `34be696` | security(auth): guard contre obfuscated signup Supabase |

---

## 🆕 Session du 23 avril 2026 (matin) — ce qui a été fait

### ✅ Livré aujourd'hui

**1. PostHog analytics sur zevo-marketing (RGPD-compliant)**
- Provider EU Cloud (`https://eu.i.posthog.com`) avec `opt_out_capturing_by_default: true`
- Consent sync via `loaded` callback dans `posthog.init()` — évite race condition React (children `useEffect` avant parent)
- `CONSENT_UPDATED_EVENT = 'zevo:consent-updated'` dispatché dans `writeConsent()` pour les changements en live
- `PostHogPageView` dans `Suspense` trackant les changements de route Next.js App Router
- `.env.local` créé avec les clés PostHog + Sentry

**2. Fix bug coach → app client après déconnexion/reconnexion**
- Cause : le trigger Supabase `handle_new_user()` crée `profiles.role='client'`, puis l'UPDATE `role='coach'` échoue silencieusement (RLS lag). Le cache `useRole` cachait le bug en session 1, exposé au re-login.
- Fix : auto-heal dans `useRole.detecterRole()` — si `profiles.role='client'` mais qu'une row `coaches` existe → on corrige le rôle en mémoire ET on heal la DB en arrière-plan
- Fichier : `zevo/src/hooks/useRole.js`

**3. Sentry — fix chunk lazy loading errors**
- Deux couches de protection :
  1. `unhandledrejection` listener dans `main.jsx` (protection anti-loop via `sessionStorage`, max 1 reload / 10s)
  2. `Sentry.ErrorBoundary` avec `fallback` en fonction recevant `{ error }` prop — détecte les erreurs de chunk et auto-reload
- Erreurs concernées : "Failed to fetch dynamically imported module", "Importing a module script failed", "Unable to preload CSS"

**4. App client mobile — réactivité tactile**
- `touch-action: manipulation` sur tous les éléments interactifs → supprime le délai 300ms iOS Safari
- `active:scale-[0.92/0.95/0.97]` selon le type de bouton → feedback visuel immédiat au tap
- Fichier : `zevo/src/components/layout/ClientLayout.jsx`

**5. App client — version desktop avec sidebar**
- Sidebar fixe (`hidden md:flex fixed left-0 w-64`) avec :
  - Logo Zevo + section de navigation groupée (NAV_SECTIONS)
  - Profil client (avatar + nom + email) + ThemeToggle en bas de sidebar
  - Bouton déconnexion
- Layout passé de `flex-col` à `flex` (row) avec `md:ml-64` sur le main

**6. Pages client — layout 2 colonnes desktop**
- `DashboardPage.jsx` : grille `md:grid md:grid-cols-2 md:gap-6` — colonne gauche actions/sport, colonne droite bien-être/nutrition
- Toutes les autres pages client : `max-w-lg/2xl/3xl` → `max-w-4xl mx-auto`
- Conteneurs : `p-5 pb-28 max-w-lg` → `px-5 md:px-8 pb-28 md:pb-10 max-w-6xl mx-auto`

**7. Dashboard client — chargement parallèle (optimisation perf)**
- Avant : ~12-15 requêtes Supabase séquentielles → ~800ms-1s de latence
- Après : 2 vagues `Promise.all` :
  - **Vague 1** (20 requêtes en parallèle) : profil, habitudes, logs today, séance du jour, formulaires, comparatif 14j, streak 120j, programmes sport (pro + legacy), nutrition (pro + legacy), séance demain, messages non lus
  - **Vague 2** (8 requêtes en parallèle) : exercices (dépend de seance.id), compteurs programme sport (dépend de proSport.id), phases + séances legacy (dépend de assignData), repas nutrition legacy (dépend de nutPlan.id)
- Gain estimé : ~300ms au lieu de ~1s
- Fix bonus : suppression bug `if (!programme)` (state pas encore update en async) — la décision pro vs legacy se fait maintenant sur la valeur directe
- Fichier : `zevo/src/pages/client/DashboardPage.jsx`

### ⏳ TODO restants (session 23 avril)

- [ ] **Bing Webmaster Tools** (2 min — import depuis Google Search Console)
- [ ] **RGPD** : boutons export données + suppression compte dans les profils client/coach

---

## 🆕 Session du 21 avril 2026 (soir) — ce qui a été fait

### 🎯 Résultat global
Tout est opérationnel pour le launch email + paiements Stripe Connect. Il reste 3 chantiers optionnels (Bing, RGPD, analytics).

### ✅ Livré aujourd'hui

**1. Fix Stripe Connect — 2 bugs réglés en cascade**
- **Bug principal découvert** : la page `/coach/abonnements/parametres` (ParametresPaiementPage.jsx) avait un `<a href="https://dashboard.stripe.com/register">` au lieu d'appeler `/api/connect-onboarding`. Tous les tests précédents ne déclenchaient donc **jamais** l'API Connect. Aucune trace dans les logs Vercel, aucun event webhook → on croyait que le vrai problème était la session Stripe persistante (hypothèse SESSION-README section 8). **Faux diagnostic.**
- **Fix** : commit `50d22c2` — remplace le `<a>` par `<button onClick={handleConnectStripe}>` qui appelle l'API comme le fait déjà `/coach/parametres` (CoachParametresPage.jsx:183).
- **Validation** : Laurent a fait le flow fresh, `acct_1TOhki7eO2hSV126` créé côté Stripe, `stripe_account_id` + `stripe_onboarding_complete=true` en DB, webhook `account.updated` passé 200 avec le nouveau secret resync. **Tout le pipeline Connect est validé.**
- **Conséquence** : le point "Connect webhook signature" de l'ancien SESSION-README est **résolu** (le resync du secret avait été fait, on pouvait juste pas le tester avant d'avoir fixé le bouton).

**2. Google Search Console**
- Propriété "Domaine" `zevo-one.com` vérifiée via TXT record (Vercel DNS)
- Sitemap `https://zevo-one.com/sitemap.xml` soumis avec **19 URLs découvertes** (7 static + 12 features)
- Indexation en cours (24-72h pour les premières impressions)

**3. Email pro complet (sending + receiving)**
- **Google Workspace Business Starter** créé (6.80€/mois, 14j gratuits) avec user `contact@zevo-one.com`
- **MX** `SMTP.GOOGLE.COM` ajouté dans Vercel DNS → reception OK
- **Resend** : domaine `zevo-one.com` verified avec :
  - DKIM : `resend._domainkey` TXT (clé p=MIGfMA...)
  - SPF : `send` TXT `v=spf1 include:amazonses.com ~all` (sous-domaine pour pas conflit avec Google)
  - MX bounces : `send` MX `feedback-smtp.eu-west-1.amazonses.com` priority 10
  - DMARC : `_dmarc` TXT `v=DMARC1; p=none;`
- **SPF Google racine** : déjà présent (Auto configure Resend l'avait ajouté) `v=spf1 include:_spf.google.com ~all`
- **Edge Function `send-invitation`** : commit `9d07ff0` — `from: 'Zevo <invites@zevo-one.com>'` au lieu de `onboarding@resend.dev`
- Déployée via `supabase functions deploy send-invitation --no-verify-jwt` (la fonction gère l'auth elle-même, la Gateway double-check retournait 401 après le redeploy initial)

**4. Find-replace emails docs légaux**
- Commit `4089a28` (repo zevo-marketing)
- 11 occurrences `zevo.one1@gmail.com` → `contact@zevo-one.com` dans :
  - `app/privacy/page.tsx` (4)
  - `app/cgv/page.tsx` (4)
  - `app/cgu/page.tsx` (1)
  - `app/mentions-legales/page.tsx` (2)

**5. Redesign template email invitation — commit `2771601`**
- Template full dark premium avec vrai logo Zevo (icon-192.png hébergé sur zevo-one.com)
- Avatar coach avec initiale + gradient orange
- CTA avec fallback MSO/Outlook (VML roundrect)
- Preheader pour prévisualisation inbox
- Media queries mobile
- Protections dark-mode Gmail ([data-ogsc], meta color-scheme)
- Échappement HTML des valeurs dynamiques (sécurité XSS)

**6. Redesign page d'invitation `/invite/:token` — commit `f437316`**
- Composant `<ZevoLogo>` au lieu du Z texte
- Glow orange ambiant + grain subtil
- Badge "Invitation active" animé (ping orange)
- Titre "Bienvenue sur [coach_nom_app]" avec accent brand
- Trust signal "Données chiffrées et privées"
- Preview features 2×2 (sport, nutrition, progression, messagerie) avec icônes Lucide
- Footer "Propulsé par Zevo"
- AutoFocus sur champ prénom
- Page d'erreur harmonisée

### ⏳ TODO restants

**Court terme (avant launch public)**
- [ ] **Cookie banner + RGPD user data** (export + droit à l'oubli) — ~1-2h
- [ ] **Bing Webmaster Tools** (import depuis GSC, 2 min)
- [ ] **PostHog ou Plausible** (analytics signups/activations) — 30 min

**Polish email (plus tard)**
- [ ] DKIM Google (Admin Console → Apps → Gmail → Authentifier le mail) — pour que les emails envoyés manuellement depuis Gmail soient aussi DKIM-aligned. Pas bloquant avec DMARC en `p=none`.
- [ ] Templates react-email au lieu de strings HTML
- [ ] Tracking open/click via Resend webhook
- [ ] Relance auto J+3 pour invitations non acceptées (pg_cron)

### 🎯 Commits pushés aujourd'hui

| SHA | Repo | Description |
|---|---|---|
| `50d22c2` | zevo | Fix bouton Stripe Connect (appelle /api/connect-onboarding) |
| `9d07ff0` | zevo | Email from invites@zevo-one.com |
| `2771601` | zevo | Redesign template email premium dark avec logo |
| `f437316` | zevo | Redesign page invitation (logo + features + animations) |
| `4089a28` | zevo-marketing | Find-replace emails 4 docs légaux |

### 💡 Nouvelles infos à retenir

1. **Template email template** : `zevo/supabase/functions/send-invitation/index.ts` — fonction `buildEmailHtml()`. Si tu changes le template, n'oublie pas de redéployer via `supabase functions deploy send-invitation --no-verify-jwt`
2. **Le flag `--no-verify-jwt`** est important : sans ça la Gateway Supabase retourne 401 avant que la fonction puisse gérer l'auth elle-même via `verifyAuth()`
3. **Logo Zevo pour emails** : utilise `https://zevo-one.com/icon-192.png` (PNG 192×192, `cache-control: immutable`, CDN Vercel)
4. **2 pages Stripe Connect** dans l'app qui peuvent afficher le bouton "Connecter Stripe" :
   - `/coach/parametres` → `CoachParametresPage.jsx` ✅ historiquement correct
   - `/coach/abonnements/parametres` → `ParametresPaiementPage.jsx` ✅ fixé aujourd'hui
5. **Supabase CLI v2.75.0** installée via brew, fonctionnelle. Update dispo en v2.90.0.

---

## 🗺️ Architecture rapide

| Nom | Type | Dossier | Déployé sur | Domaine prod |
|---|---|---|---|---|
| **zevo** | App React/Vite (coach + client + admin) | `/zevo/` | Vercel | `app.zevo-one.com` |
| **zevo-marketing** | Landing Next.js 16 App Router | `/zevo-marketing/` | Vercel | `zevo-one.com` |
| **zevo-video** | (dossier isolé, non utilisé en prod) | `/zevo-video/` | — | — |

**2 repos GitHub séparés** :
- `santosnoa179-alt/zevo` (l'app)
- `santosnoa179-alt/zevo-marketing` (la landing)

**Stack** :
- Frontend : React 18 + Vite 6 + Tailwind 4 (app) / Next.js 16 + Tailwind (marketing)
- Backend : Supabase (EU Francfort) + Vercel Serverless Functions (**12 max** plan Hobby — actuellement on est à 12/12)
- Paiement : Stripe **LIVE** avec Connect type `standard`
- Monitoring : Sentry (org `zevo-ju`) — chunk errors + auto-reload configurés
- Analytics : PostHog EU Cloud (RGPD, opt-out par défaut) sur zevo-marketing
- Email : Resend + domaine `zevo-one.com` (SPF/DKIM/DMARC ✅) → `invites@zevo-one.com`

---

## ✅ Ce qui a été fait dans cette session

### Commits repo `zevo` (app) — les plus récents d'abord

| Commit | Description |
|---|---|
| `7c2d1e6` | **Fix v2 race condition signup** : remplace `invalidateRoleCache` par `setRoleCache(userId, 'coach')` pour contourner Supabase replication lag |
| `2b95ab7` | Fusionne `connect-sync` dans `connect-onboarding` (limite 12 Serverless Functions Vercel Hobby) |
| `a2821e4` | Fix Stripe Connect : sync fiable statut + URL retour dynamique + upsert au lieu d'update |
| `f0a9f41` | Nouvelle page `/coach/pricing` (route 404 après cleanup) + fix URL checkout hardcodée |
| `fc3589c` | **Fix v1 race condition signup** (remplacé par v2 plus fiable) |
| `6f5daee` | Sentry dans l'app React (`@sentry/react`) |
| `5875b7f` | Suppression de la landing dupliquée dans l'app (~20 fichiers supprimés, RootRedirect vers zevo-one.com) |
| `3a01afc` | Onboarding coach aligné charte marketing (500+ / 12h) |
| `72996f5` / `7db8fdb` / `461c407` / `6e92158` / `29013b1` / `53c2b83` | Fix seeds démo SQL |
| `d2ac84e` | Seed SQL complet compte coach démo (40 clients fictifs) |
| `1658aae` | Fix alignement cartes Pricing desktop |
| `f3f5009` | Fix zoom pinch-zoom mobile |

### Commits repo `zevo-marketing` (landing)

| Commit | Description |
|---|---|
| `6896987` | **4 docs légales rédigés** : mentions légales, CGU, CGV, RGPD conformes droit FR 2026 |
| `0ab43ba` | Sentry dans Next.js (`@sentry/nextjs`) avec sourcemaps upload |
| `732bd65` | 12 nouvelles captures marketing depuis compte démo (resize 1600px) |
| `c6b48f6` | Fix copy : espace JSX + cohérence Compare/HowItWorks + JSON-LD SEO |
| `9188d00` / `7a1b726` / `6677847` / `1e230b1` | Optimisations perf mobile (images -74%, padding, Hero server component, backdrop-blur) |

---

## 🎯 Status de chaque tâche

### ✅ Totalement terminé

- [x] **Colonnes `exercises` en DB** — toutes présentes (description, difficulty, category, name_fr, etc.)
- [x] **Sentry sur zevo-marketing** (DSN configurée, events reçus)
- [x] **Doc légale complète** : 4 pages rédigées avec identité :
  - Noa Santos, micro-entrepreneur
  - SIRET : `89395225900016`
  - Adresse : 125 allée du 601e RCR, 62000 Arras
  - Email : `zevo.one1@gmail.com` (temporaire en attendant Google Workspace)
- [x] **Stripe prod setup complet** :
  - Compte Stripe activé en Live mode (`Zevo-one`, acct `1THmwd7UKptircKw`)
  - 3 produits créés (Starter 29€, Pro 49€, Unlimited 79€) + 6 Price IDs (monthly + yearly)
  - Webhook principal `zevo-webhook-main` → URL `https://app.zevo-one.com/api/stripe-webhook` → 7 événements
  - Branding Zevo configuré (orange #FF5C1A)
  - Env vars Vercel mises à jour (pk_live_, sk_live_, 6 price IDs, STRIPE_WEBHOOK_SECRET)
- [x] **Stripe Connect activé en plateforme** :
  - Type `standard` (décision volontaire, branding limité mais le coach a son Stripe complet)
  - Webhook Connect `zevo-connect-webhook` → URL `https://app.zevo-one.com/api/connect-webhook` → 6 événements
  - Secret webhook ID : `we_1TOcfn7UKptircKwv7s0DSWU`
  - Configuration `/connect/overview` : "La configuration de Connect est terminée" ✅
  - Branding Connect configuré (3 onglets : inscription utilisateurs + Dashboard Stripe + Dashboard Express)
  - ⚠️ Le bouton "Créer un compte connecté en mode production" reste **grisé en permanence** — c'est normal en France (réglementation : obligation de passer par account links)
- [x] **Test paiement réel validé** : paiement 29€ Starter effectué sur compte `laurent@test.com`, webhook reçu, remboursement OK, annulation propagée (essai 14 jours restauré)
- [x] **Page `/coach/pricing`** recréée avec toggle mensuel/annuel, appelle `/api/create-checkout`
- [x] **Fix race condition signup coach v2** : `setRoleCache(userId, 'coach')` dans `useRole.js` pousse direct dans le cache React — contourne totalement Supabase replication lag

### 🟡 En cours / Bloqué côté externe

- [ ] **Sentry sur zevo-app** : code OK + DSN dans Vercel, Network tab montre 200 OK sur envelope requests. Chunk errors maintenant catchées par `ErrorBoundary` + `unhandledrejection`. Dashboard Sentry peut afficher events désormais (vérifier).

- [ ] **Stripe Connect — bug signature webhook** :
  - Symptôme : logs Vercel montrent `[connect-webhook] Signature invalide: No signatures found matching the expected signature for payload`
  - Cause probable : `STRIPE_CONNECT_WEBHOOK_SECRET` dans Vercel ne matche plus le secret du webhook actif chez Stripe
  - **Fix à appliquer au prochain retour** :
    1. Aller sur https://dashboard.stripe.com/webhooks → cliquer `zevo-connect-webhook`
    2. Révéler le Signing secret (icône œil)
    3. Copier la valeur `whsec_...`
    4. Vercel → env vars → `STRIPE_CONNECT_WEBHOOK_SECRET` → Edit → coller → Save
    5. Redeploy sans cache
    6. Tester : déclencher un event (bouton "Envoyer un événement test" dans le menu `⋯` de la page webhook Stripe)
  - **Alternative si le secret ne semble plus disponible** : cliquer "Regénérer le secret" → copier la nouvelle valeur → mettre dans Vercel

- [ ] **Stripe Connect — flow onboarding test avec mon compte** : quand on clique "Connecter Stripe" dans Zevo, `stripe_account_id` reste NULL en DB. La cause probable : session Stripe persistante dans mon navigateur qui court-circuite la création d'un nouveau compte. **Pour tes vrais coachs ça marchera** car ils n'auront pas de session Stripe préexistante.

### ❌ Pas encore attaqué

Priorité décroissante :

- [ ] **Google Search Console** (10 min, quick win SEO) — voir instructions détaillées plus bas
- [ ] **Resend domaine pro + SPF/DKIM/DMARC**
  - Actuellement `from: onboarding@resend.dev` → à changer pour `invites@zevo-one.com`
  - Nécessite Google Workspace ou équivalent (Noa veut `contact@zevo-one.com`)
  - Options suggérées : Google Workspace (6.80€/mois), Infomaniak (1.50€/mois), Zoho Free
- [ ] **Cookie banner + RGPD user data**
  - Cookie banner minimal (uniquement cookies techniques actuellement → pas besoin de banner obligatoire)
  - Page d'export des données utilisateur (droit RGPD)
  - Suppression définitive de compte (droit à l'oubli)
- [x] **PostHog** ✅ — installé sur zevo-marketing, EU Cloud, RGPD-compliant, pageviews trackés
- [ ] **Tracking emails** (open/click via Resend webhook)
- [ ] **Relance automatique J+3** pour invitations non acceptées (pg_cron Supabase)
- [ ] **Templates react-email** (remplacer strings HTML)
- [ ] **Capture `app-builder.png`** (la seule non refaite depuis compte démo)
- [ ] **Pré-lancement checks** : smoke tests + monitoring + backup strategy
- [ ] **Blog SEO long-terme** (3-6 mois après lancement)
- [ ] **Backlinks** Capterra, Appvizer, écoles STAPS

---

## 🔑 Identifiants importants

### Comptes de service

| Service | Compte / Identifiant |
|---|---|
| GitHub | `santosnoa179-alt` |
| Vercel | Hobby plan (**12 functions max, on est AU MAX**) — 2 projets : `zevo` + `zevo-marketing` |
| Supabase | Projet `pairqvridvjdktnuvwud` |
| Sentry | Org : `zevo-ju` — 2 projets : `zevo-app` + `zevo-marketing` |
| Stripe | Compte principal `Zevo-one` (`acct_1THmwd7UKptircKw`) en Live mode |

### Variables d'environnement critiques

**Projet Vercel `zevo` (app)** — toutes en Production + Preview :
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_STRIPE_PUBLIC_KEY` (pk_live_...), `STRIPE_SECRET_KEY` (sk_live_...)
- `STRIPE_WEBHOOK_SECRET`, **`STRIPE_CONNECT_WEBHOOK_SECRET`** ⚠️ à resync
- `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_STARTER_YEARLY`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PRO_YEARLY`, `STRIPE_PRICE_UNLIMITED`, `STRIPE_PRICE_UNLIMITED_YEARLY`
- `VITE_SENTRY_DSN`
- `VITE_RAPIDAPI_KEY`, `VITE_RAPIDAPI_HOST` (ExerciseDB)
- `DEEPL_API_KEY`, `OPENAI_API_KEY` (traduction exercices)

**Projet Vercel `zevo-marketing` (landing)** :
- `NEXT_PUBLIC_SITE_URL` = `https://zevo-one.com`
- `NEXT_PUBLIC_APP_URL` = `https://app.zevo-one.com`
- `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG` (zevo-ju), `SENTRY_PROJECT` (zevo-marketing), `SENTRY_AUTH_TOKEN`

### URLs de webhook Stripe (live)

- **Principal** : `https://app.zevo-one.com/api/stripe-webhook` → events : `checkout.session.completed`, `customer.subscription.{created,updated,deleted}`, `invoice.{paid,payment_failed}`, `customer.subscription.trial_will_end`
- **Connect** : `https://app.zevo-one.com/api/connect-webhook` → events : `account.updated`, `checkout.session.completed`, `invoice.payment_succeeded`, `payment_intent.payment_failed`, `customer.subscription.{updated,deleted}`

---

## ⚠️ Points d'attention / pièges connus

### 1. Limite Vercel Hobby = 12 Serverless Functions
On est actuellement **à 12/12**. Si besoin d'en ajouter une, soit :
- Fusionner avec une existante (comme on a fait avec `connect-sync` → `connect-onboarding` avec param `action`)
- Upgrader Vercel Pro (20$/mois, limite 100 fn)

### 2. Endpoint `api/connect-onboarding.js` a 2 actions
Pour rester sous la limite, l'endpoint gère 2 cas via `body.action` :
- `action: 'link'` (défaut) → crée un Stripe account + génère account_link pour onboarding
- `action: 'sync'` → vérifie l'état Stripe + update `coaches.stripe_onboarding_complete`

### 3. Flow signup coach — race condition
Trigger Supabase `handle_new_user()` crée auto un profil `role='client'`. Le code `LoginPage.jsx` fait ensuite UPDATE vers `role='coach'` + INSERT dans `coaches`. **Bug historique** : `useRole` peut cacher `client` entre le trigger et l'UPDATE → redirection sur `/app`.
**Fix actuel v2 (commit `7c2d1e6`)** : `setRoleCache(userId, 'coach')` pousse directement dans le cache React local, aucun round-trip Supabase, plus de race possible.

### 4. Stripe Connect type `standard`
Décision volontaire. Conséquences :
- Le branding Zevo **n'est pas** appliqué pendant l'onboarding Stripe (c'est voulu — comptes Standard ont leur propre dashboard Stripe indépendant)
- Le bouton "Créer un compte connecté en mode production" reste **grisé en permanence** pour les plateformes FR (réglementation exige account links uniquement). **Ce n'est pas un bug à fixer**.
- Si besoin de branding complet → migrer en `express` (refactor ligne `stripe.accounts.create({ type: 'standard' })` dans `api/connect-onboarding.js`)

### 5. Emails `zevo.one1@gmail.com` temporaire
Les 4 docs légaux contiennent cet email. **À remplacer** quand Google Workspace sera configuré :
- `zevo-marketing/app/mentions-legales/page.tsx`
- `zevo-marketing/app/cgu/page.tsx`
- `zevo-marketing/app/cgv/page.tsx`
- `zevo-marketing/app/privacy/page.tsx`
Find-replace global : `zevo.one1@gmail.com` → `contact@zevo-one.com`.

### 6. Sentry zevo-app events pas visibles dans dashboard
Network tab côté browser = envelope requests 200 OK, mais dashboard Sentry affiche encore l'onboarding / "0 events". Cause externe (Sentry propagation DE region). À revérifier dans 24h. Support Sentry si persiste.

### 7. Compte démo Supabase (pour captures marketing)
Le seed `supabase/seed-demo-coach.sql` + cleanup existent. Le compte démo a été utilisé pour capturer 12 screenshots. UUIDs stables `d0000000-0000-0000-0000-000000000XXX` (001 à 040).

### 8. Connect webhook signature ⚠️
**TODO critique** : la signature vérification du webhook Connect échoue actuellement (`[connect-webhook] Signature invalide`). Il faut resync `STRIPE_CONNECT_WEBHOOK_SECRET` côté Vercel. Procédure dans la section "Status".

---

## 🛠️ Comment reprendre dans un nouveau chat

### Dans un nouveau chat Claude Code :

1. **Ouvrir le projet** : `cd /Users/noasantos/Desktop/Zevo\ app/`
2. **Lire cette mémoire** (le système devrait l'auto-charger) :
   - `MEMORY.md`
   - `project_todo_exercices.md`
   - `todo_finalisation_brand_mkt.md`
   - `SESSION-README.md` (ce fichier)
3. **Consulter l'état git** :
   ```bash
   cd zevo && git log --oneline -10
   cd ../zevo-marketing && git log --oneline -10
   ```
4. **Poser le contexte à Claude** :
   > "Je reprends le travail sur Zevo. Lis `SESSION-README.md` pour le contexte, puis attaque la prochaine tâche de la TODO. Commence par fixer le webhook Connect signature avant de continuer."

### Prochaine tâche recommandée (ordre)

#### 🚨 1. Résoudre le bug signature webhook Connect (5 min)

Procédure :
1. Aller sur https://dashboard.stripe.com/webhooks
2. Cliquer `zevo-connect-webhook` (URL : `https://app.zevo-one.com/api/connect-webhook`)
3. Révéler le Signing secret (icône œil dans la section "Clé secrète de signature")
4. Copier la valeur `whsec_...`
5. Vercel → `zevo` → Settings → Environment Variables → `STRIPE_CONNECT_WEBHOOK_SECRET` → Edit → coller → Save
6. Deployments → dernier → `⋯` → Redeploy → **décoche** "Use existing Build Cache" → Redeploy
7. Attendre Ready (~1 min)
8. Déclencher un test via bouton "Envoyer un événement test" (menu `⋯` de la page webhook) → type `account.updated`
9. Vérifier les logs Vercel : plus d'erreur "Signature invalide" + message `[connect-webhook] Event: account.updated (evt_...)` apparaît

#### 🔍 2. Google Search Console (10 min)

- Aller sur https://search.google.com/search-console
- Ajouter propriété `zevo-one.com` (type "Domaine")
- Vérification DNS TXT (auto via Vercel si le domaine est géré chez eux)
- Soumettre `https://zevo-one.com/sitemap.xml`
- Indexation en 24-48h au lieu de 2-4 semaines
- Répéter sur Bing Webmaster Tools

#### 📧 3. Resend domaine pro

- Acheter/configurer Google Workspace sur `zevo-one.com` (6.80€/mois)
- Créer `contact@zevo-one.com`
- Config DNS chez registrar : SPF + DKIM + DMARC
- Vérifier domaine dans Resend dashboard
- Changer `from:` dans Edge Function `send-invitation` : `'Zevo <invites@zevo-one.com>'`
- Find-replace `zevo.one1@gmail.com` → `contact@zevo-one.com` dans les 4 docs légaux

---

## 📦 Fichiers de référence dans le repo

| Fichier | Description |
|---|---|
| `/SESSION-README.md` | **Ce fichier** — résumé complet de la session |
| `/SENTRY-SETUP.md` | Guide de setup Sentry (DSN, sourcemaps, env vars) |
| `/zevo/supabase/SEED-DEMO-COACH-README.md` | Comment utiliser le seed démo coach |
| `/zevo/supabase/seed-demo-coach.sql` | Script de seed (40 clients fictifs) |
| `/zevo/supabase/seed-demo-coach-cleanup.sql` | Script cleanup |
| `/zevo/CLAUDE_CODE_INSTRUCTIONS.md` | Règles absolues projet |
| `/zevo/CONTEXT.md` | Stack, identité visuelle, rôles |
| `/zevo/ROADMAP.md` | Phases de développement |

---

## 🎨 Identité visuelle rapide

- Orange principal : `#FF6B2B` / `#FF5C1A` (selon contexte)
- Orange clair : `#FF9A6C` / `#FF7A42`
- Fond base : `#0D0D0D` (app) / `#060606` (marketing)
- Fond cards : `#1E1E1E`
- Fond surface : `#2A2A2A`
- Texte primaire : `#F5F5F3`
- Texte secondaire : `rgba(245,245,243,0.6)`
- Bordures : `rgba(255,255,255,0.08)`

---

## 🎯 Roadmap lancement public (ordre suggéré)

1. ✅ Stripe prod (fait)
2. ✅ Docs légales (fait)
3. ✅ Fix webhook Connect signature + bouton (fait)
4. ✅ Google Search Console (fait)
5. ✅ Resend domaine pro + email `invites@zevo-one.com` (fait)
6. ✅ Cookie banner + RGPD (landing) (fait)
7. ✅ Sentry — chunk errors fix + auto-reload (fait)
8. ✅ Analytics PostHog EU (zevo-marketing) (fait)
9. ✅ App client — desktop sidebar + mobile perf (fait)
10. ⏳ Bing Webmaster Tools (2 min)
11. ⏳ RGPD — export données + suppression compte (profils client/coach)
12. ⏳ Smoke tests complets
13. 🚀 **Launch (soft en mode privé — amis, early adopters)**

Puis post-launch (3-6 mois) :
- Blog SEO longue traîne
- Backlinks qualifiés (Capterra, Appvizer, écoles STAPS)
- Stripe Connect Express (si besoin de branding)

---

## 💡 Notes pour l'agent suivant

- **Connect n'est PAS bloquant pour le launch**. Le flow principal (paiement abo) marche. Connect = feature bonus qu'on peaufinera quand un vrai coach s'inscrira.
- Le bug race condition v2 (setRoleCache) devrait tenir. Si nouveau problème → regarder les logs Vercel `/api/connect-onboarding`.
- Beaucoup de temps a été perdu sur Stripe Connect à cause d'une **session Stripe persistante** qui redirigeait toujours sur le compte existant. Pour tester Connect avec un flow 100% fresh, utiliser un compte email différent + navigation privée + vider session Stripe (clear cookies *.stripe.com).
- Les webhooks Stripe actuels :
  - `zevo-webhook-main` — principal (abo coach → Zevo)
  - `zevo-connect-webhook` — Connect (client coach → coach via la plateforme)

**Bon courage pour la suite 💪**
