# Seed démo coach — captures marketing

Deux scripts SQL pour peupler un compte coach isolé avec **40 clients fictifs + toutes les données satellites** (paiements 12 mois, programmes, calendrier, prospects, formulaires, messages) sans toucher à ton compte coach actuel.

- **Seed** : `seed-demo-coach.sql` (558 lignes)
- **Cleanup** : `seed-demo-coach-cleanup.sql` (90 lignes)

## Procédure complète (≈ 5 min)

### 1. Créer le compte coach démo
Dans **Supabase Studio → Authentication → Users → Add user** :
- Email : `demo@zevo-one.com` (ou ce que tu veux)
- Password : au choix
- Cocher "Auto-confirm user"

Copie l'UUID généré (colonne **User UID**).

### 2. Marquer ce user comme coach
Dans **SQL Editor**, remplace `<UUID>` et run :
```sql
UPDATE profiles SET role = 'coach' WHERE id = '<UUID>';
INSERT INTO coaches (id, nom_app, plan, abonnement_actif)
VALUES ('<UUID>', 'Zevo Démo', 'pro', true)
ON CONFLICT (id) DO NOTHING;
```

### 3. Lancer le seed
- Ouvre `seed-demo-coach.sql`
- Remplace `REMPLACE_MOI_PAR_COACH_UUID_DEMO` par l'UUID copié à l'étape 1 (ligne 26)
- Copie tout le fichier dans **SQL Editor** → **Run**
- Tu dois voir ~10 lignes `✓` dans les notices (1 par section)

### 4. Te connecter et prendre les captures
- Va sur l'app (`/login`) et connecte-toi avec `demo@zevo-one.com` + password
- Tu arrives sur le dashboard coach peuplé avec tout
- Prends tes screenshots tranquille : **dashboard, clients, calendrier, programmes, paiements, prospects, statistiques**

### 5. Cleanup (quand tu veux)
- Ouvre `seed-demo-coach-cleanup.sql`
- Remplace `REMPLACE_MOI_PAR_COACH_UUID_DEMO` par le même UUID
- Run → tout est supprimé (les 40 clients fictifs cascadent via `auth.users`)

## Contenu du seed

| Table | Volume | Note |
|---|---|---|
| `auth.users` + `profiles` + `clients` | 40 clients | UUIDs stables `d0000000-…-000000000001` à `040`, faciles à retrouver |
| `offres_coaching` | 4 offres | Mensuel 89€, 12 sem 149€, Pack 49€, Premium 149€ |
| `paiements_clients` | 36 payés + 3 en attente + 1 remboursé | Courbe croissante 12 mois (~1500€ → 4470€/mois) |
| `abonnements_clients` | 25 actifs + 2 (pause/annulé) | |
| `factures` | 15 | 10 payées, 2 en attente, 1 annulée, 2 impayées anciennes |
| `virements_coach` | 4 | 3 effectués + 1 en cours |
| `coaches.solde_*` | 1284€ dispo / 342€ en attente | |
| `habitudes` + `habitudes_log` | 105 + ~4410 | |
| `objectifs` | 70 | |
| `taches` | 105 | |
| `sommeil_log` / `humeur_log` | 14 jours × 35 clients | |
| `sport_log` | 7 jours × 35 clients | |
| `coach_events` | 20 sur 2 semaines | Calendrier peuplé |
| `sport_programmes` | 3 templates + 15 assignations | |
| `nutrition_programmes` | 3 templates + 10 assignations | |
| `prospects` | 8 leads | Funnel contact → closing |
| `formulaires` | bilan (10 réponses) + check-in (5) | |
| `messages` | 5 threads × 5 msg | |

## Zéro impact sur ton compte

- Tout est créé sous l'UUID du coach démo → **RLS** filtre, rien ne leak aux autres coachs
- Les emails sont `@zevo-demo.local` (pas de vrais envois)
- Supabase Auth ne spamera aucun utilisateur fictif
- Cleanup = 1 run SQL, tout disparaît

## Dépannage

**"Coach introuvable"** → tu as oublié l'étape 2 (créer la ligne dans `coaches`).

**"duplicate key value violates unique constraint"** → le seed a déjà été lancé. Run le cleanup d'abord, puis relance le seed.

**"relation X does not exist"** → tu as un schéma manquant. Vérifie que tous les `schema-*.sql` pertinents ont été appliqués sur ta DB (paiements-complet, sport-programmes, nutrition, formulaires, coach-events, etc.).

**Le password des clients fictifs** : `DemoPassword2026!` — pas besoin de s'y connecter en général, sauf si tu veux prendre des captures côté client aussi.
