# ZEVO — Roadmap de développement

Travaille phase par phase dans l'ordre. Coche [x] chaque tâche terminée.
Ne passe pas à la phase suivante avant d'avoir testé.

---

## PHASE 1 — Init projet (Jour 1)

- [ ] Créer le projet React + Vite
```bash
npm create vite@latest zevo -- --template react
cd zevo
npm install
```

- [ ] Installer les dépendances
```bash
npm install @supabase/supabase-js @stripe/stripe-js tailwindcss
npm install react-router-dom recharts lucide-react
npm install -D @tailwindcss/vite
```

- [ ] Configurer Tailwind avec les couleurs Zevo dans tailwind.config.js
```js
colors: {
  zevo: {
    orange: '#FF6B2B',
    'orange-light': '#FF9A6C',
    black: '#0D0D0D',
    card: '#1E1E1E',
    surface: '#2A2A2A',
    text: '#F5F5F3',
  }
}
```

- [ ] Créer le fichier .env
```
VITE_SUPABASE_URL=https://vkbtjeitjkycofybnbyh.supabase.co
VITE_SUPABASE_ANON_KEY=ta_clé_anon
VITE_STRIPE_PUBLIC_KEY=pk_live_...
VITE_ANTHROPIC_KEY=sk-ant-...
```

- [ ] Configurer Supabase client (src/lib/supabase.js)
- [ ] Configurer React Router avec les routes principales
- [ ] Déployer sur Netlify (site vide) pour valider le pipeline CI/CD

---

## PHASE 2 — Base de données Supabase (Jour 1-2)

### Tables à créer dans Supabase Studio

- [ ] Table `profiles` (extension de auth.users)
```sql
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  nom text,
  role text not null check (role in ('admin', 'coach', 'client')),
  created_at timestamptz default now()
);
-- Trigger auto-création profil au signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, role)
  values (new.id, new.email, 'client');
  return new;
end;
$$ language plpgsql security definer;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

- [ ] Table `coaches`
```sql
create table coaches (
  id uuid references profiles(id) on delete cascade primary key,
  nom_app text default 'Zevo',
  logo_url text,
  couleur_primaire text default '#FF6B2B',
  couleur_secondaire text default '#0D0D0D',
  message_bienvenue text,
  modules jsonb default '{"sport":true,"sommeil":true,"humeur":true,"routines":true}',
  plan text default 'starter' check (plan in ('starter','pro','unlimited')),
  stripe_customer_id text,
  stripe_subscription_id text,
  abonnement_actif boolean default false,
  created_at timestamptz default now()
);
```

- [ ] Table `clients`
```sql
create table clients (
  id uuid references profiles(id) on delete cascade primary key,
  coach_id uuid references coaches(id) on delete cascade not null,
  actif boolean default true,
  onboarding_complete boolean default false,
  created_at timestamptz default now()
);
```

- [ ] Table `invitations`
```sql
create table invitations (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references coaches(id) on delete cascade,
  email text not null,
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  acceptee boolean default false,
  expires_at timestamptz default now() + interval '7 days',
  created_at timestamptz default now()
);
```

- [ ] Table `habitudes`
```sql
create table habitudes (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  assigned_by uuid references coaches(id),
  nom text not null,
  objectif_mensuel int default 30,
  couleur text default '#FF6B2B',
  actif boolean default true,
  created_at timestamptz default now()
);
```

- [ ] Table `habitudes_log`
```sql
create table habitudes_log (
  id uuid default gen_random_uuid() primary key,
  habitude_id uuid references habitudes(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  date date not null,
  complete boolean default true,
  unique(habitude_id, date)
);
```

- [ ] Table `objectifs`
```sql
create table objectifs (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  assigned_by uuid references coaches(id),
  titre text not null,
  description text,
  score int default 0 check (score between 0 and 100),
  date_cible date,
  peut_supprimer boolean default true,
  archive boolean default false,
  created_at timestamptz default now()
);
```

- [ ] Table `taches`
```sql
create table taches (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  titre text not null,
  priorite text default 'normal' check (priorite in ('urgent','normal','faible')),
  statut text default 'en_cours' check (statut in ('en_cours','termine')),
  echeance date,
  created_at timestamptz default now()
);
```

- [ ] Table `sommeil_log`
```sql
create table sommeil_log (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  date date not null,
  heures float not null,
  qualite int check (qualite between 1 and 5),
  unique(client_id, date)
);
```

- [ ] Table `humeur_log`
```sql
create table humeur_log (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  date date not null,
  score int not null check (score between 1 and 10),
  note text,
  unique(client_id, date)
);
```

- [ ] Table `sport_log`
```sql
create table sport_log (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  date date not null,
  type_activite text,
  duree_minutes int,
  intensite int check (intensite between 1 and 5)
);
```

- [ ] Table `routines`
```sql
create table routines (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  type text check (type in ('matin','soir')),
  etapes jsonb default '[]',
  created_at timestamptz default now()
);
```

- [ ] Table `budget`
```sql
create table budget (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  mois text not null,
  revenus jsonb default '[]',
  depenses_fixes jsonb default '[]',
  depenses_variables jsonb default '[]',
  unique(client_id, mois)
);
```

- [ ] Table `messages`
```sql
create table messages (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references coaches(id),
  client_id uuid references clients(id),
  expediteur text not null check (expediteur in ('coach','client')),
  contenu text not null,
  lu boolean default false,
  created_at timestamptz default now()
);
```

- [ ] Table `admin`
```sql
create table admin (
  id uuid references profiles(id) primary key,
  email text unique not null
);
```

### RLS (Row Level Security)

- [ ] Activer RLS sur toutes les tables
- [ ] Policies profiles : chacun voit/modifie uniquement son propre profil
- [ ] Policies coaches : coach voit ses données + admin voit tout
- [ ] Policies clients : client voit ses données + son coach voit ses données + admin voit tout
- [ ] Policies habitudes/objectifs/taches : client + son coach + admin
- [ ] Policies messages : coach + client concerné + admin
- [ ] Policies admin : uniquement les admins

---

## PHASE 3 — Auth & Routing (Jour 2-3)

- [ ] Page `/login` — connexion email/password (design Zevo noir/orange)
- [ ] Page `/invite/:token` — onboarding nouveau client
  - Vérifie le token
  - Formulaire : prénom + mot de passe
  - Crée le compte Supabase Auth
  - Met à jour la table clients
  - Redirige vers le dashboard client

- [ ] Hook `useAuth()` — gère l'état de connexion
- [ ] Hook `useRole()` — détecte le rôle après login
- [ ] Composant `ProtectedRoute` — redirige si non connecté
- [ ] Redirection automatique par rôle après login :
  - admin → `/admin`
  - coach → `/coach`
  - client → `/app`

- [ ] Page `404` et page d'erreur générique

---

## PHASE 4 — App Client (Jours 3-6)

### Layout client
- [ ] Sidebar mobile-first avec 5 onglets : Dashboard, Habitudes, Objectifs, Messages, Profil
- [ ] Header : logo/nom du coach (chargé dynamiquement), bouton déconnexion
- [ ] Thème dynamique : CSS variables injectées depuis les settings du coach

### Dashboard client
- [ ] Score bien-être du jour (jauge circulaire 0-100)
- [ ] Habitudes du jour à cocher
- [ ] Tâches urgentes du jour
- [ ] Comparatif cette semaine vs semaine dernière
- [ ] Météo de la semaine (humeur + sommeil résumés)

### Module Habitudes
- [ ] Liste des habitudes avec checkbox quotidienne
- [ ] Streak actuel par habitude
- [ ] Graphique de progression mensuelle
- [ ] Ajouter/modifier/supprimer une habitude perso
- [ ] Les habitudes assignées par le coach sont identifiées visuellement

### Module Objectifs
- [ ] Liste des objectifs avec barre de progression
- [ ] Mise à jour du score (0-100)
- [ ] Objectifs assignés par le coach : peuvent_supprimer = false
- [ ] Ajouter un objectif personnel
- [ ] Archiver un objectif accompli

### Module Tâches
- [ ] To-do list avec priorités (urgent = rouge, normal = blanc, faible = gris)
- [ ] Checkbox pour marquer terminé
- [ ] Filtre : aujourd'hui / cette semaine / toutes
- [ ] Ajouter une tâche avec échéance

### Module Sommeil
- [ ] Saisie quotidienne : heures + qualité (1-5 étoiles)
- [ ] Graphique 7 jours
- [ ] Moyenne de la semaine

### Module Humeur
- [ ] Score 1-10 avec slider ou boutons emoji
- [ ] Note optionnelle
- [ ] Graphique 7 jours
- [ ] Corrélation humeur/sommeil

### Module Sport
- [ ] Saisie : type d'activité, durée, intensité
- [ ] Historique des séances
- [ ] Stats hebdomadaires

### Module Routines
- [ ] Routine matin et routine soir
- [ ] Étapes avec checkbox
- [ ] Timer par étape (optionnel)
- [ ] Taux de complétion

### Coach IA
- [ ] Panel flottant (bouton en bas à droite)
- [ ] Chat avec historique de la conversation
- [ ] Système prompt dynamique construit depuis les vraies données :
  - Habitudes du jour et streaks
  - Score bien-être
  - Objectifs et leur progression
  - Sommeil et humeur récents
  - Tâches urgentes
- [ ] Appel API Anthropic Claude Sonnet

### Module Messages (client)
- [ ] Interface chat avec son coach
- [ ] Messages en temps réel via Supabase Realtime
- [ ] Badge messages non lus

---

## PHASE 5 — Dashboard Coach (Jours 6-9)

### Layout coach
- [ ] Sidebar : Dashboard, Clients, Messages, Paramètres
- [ ] Header : Logo Zevo + nom du coach + déconnexion

### Dashboard principal coach
- [ ] Cards : Clients actifs / En décrochage / Nouveaux cette semaine / MRR
- [ ] Liste clients avec : photo initiales, nom, score bien-être, streak, dernière activité
- [ ] Tri par : score bien-être, décrochage, alphabétique
- [ ] Alertes intelligentes décrochage avec contexte et bouton message rapide

### Fiche client
- [ ] Onglets : Aperçu · Habitudes · Objectifs · Tâches · Sommeil · Humeur · Messages
- [ ] Aperçu : score bien-être, graphique 30j, résumé de la semaine
- [ ] Assignation d'habitudes : modal avec création ou sélection existante
- [ ] Assignation d'objectifs : modal avec titre, description, date cible
- [ ] Vue toutes les données du client (lecture seule)

### Inviter un client
- [ ] Formulaire : prénom + email
- [ ] Génération token unique
- [ ] Envoi email via Resend
- [ ] Suivi des invitations en attente

### Messagerie coach
- [ ] Vue toutes les conversations par client
- [ ] Chat avec chaque client
- [ ] Boutons encouragements rapides : "Bravo cette semaine 💪", "Continue comme ça !", etc.
- [ ] Badge messages non lus sur la liste clients

### Rapport hebdomadaire (optionnel Phase 5)
- [ ] Généré automatiquement chaque lundi
- [ ] PDF avec les stats de la semaine de chaque client
- [ ] Envoyé par email au coach

---

## PHASE 6 — Personnalisation Coach (Jour 9)

- [ ] Page Paramètres coach :
  - Nom de l'app
  - Upload logo (Supabase Storage)
  - Color picker couleur primaire
  - Message de bienvenue pour nouveaux clients
  - Toggle modules : sport, sommeil, humeur, routines

- [ ] Système thème dynamique côté client :
  - Au login : `SELECT couleur_primaire, nom_app, logo_url FROM coaches WHERE id = client.coach_id`
  - Injecter dans `:root { --color-primary: ...; --app-name: ...; }`
  - Le client ne voit jamais "Zevo" — il voit le nom de son coach

- [ ] Onboarding guidé (1er login client) :
  - Étape 1 : Message de bienvenue du coach
  - Étape 2 : Présentation des habitudes pré-assignées
  - Étape 3 : Définir son premier objectif

---

## PHASE 7 — Facturation Stripe (Jour 10)

- [ ] Installer Stripe
```bash
npm install stripe @stripe/stripe-js
```

- [ ] Créer dans Stripe Dashboard :
  - Produit "Installation Zevo" — paiement unique 249€
  - Plan Starter — 39€/mois récurrent
  - Plan Pro — 59€/mois récurrent
  - Plan Unlimited — 79€/mois récurrent

- [ ] Page pricing publique `/pricing`
  - 3 plans avec features détaillées
  - Bouton "Commencer" → Stripe Checkout

- [ ] Netlify Function `/api/stripe/create-checkout`
  - Crée une session Stripe Checkout
  - Installation one-shot + subscription

- [ ] Netlify Function `/api/stripe/webhook`
  - `checkout.session.completed` → activer le compte coach dans Supabase
  - `customer.subscription.deleted` → désactiver le compte coach

- [ ] Lien Customer Portal dans les paramètres coach
- [ ] Guard : `abonnement_actif = false` → bloquer dashboard coach + page de renouvellement

---

## PHASE 5b — Programmes (Jours 9-10)
> Objectif : Le coach crée des programmes réutilisables et les assigne en 1 clic

### Tables Supabase

- [ ] Table `programmes`
```sql
create table programmes (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references coaches(id) on delete cascade,
  titre text not null,
  description text,
  duree_semaines int default 4,
  categorie text,
  actif boolean default true,
  created_at timestamptz default now()
);
```

- [ ] Table `programme_phases`
```sql
create table programme_phases (
  id uuid default gen_random_uuid() primary key,
  programme_id uuid references programmes(id) on delete cascade,
  titre text not null,
  description text,
  ordre int not null,
  duree_semaines int default 1,
  habitudes jsonb default '[]',
  objectifs jsonb default '[]',
  ressources jsonb default '[]'
);
```

- [ ] Table `programme_assignations`
```sql
create table programme_assignations (
  id uuid default gen_random_uuid() primary key,
  programme_id uuid references programmes(id),
  client_id uuid references clients(id) on delete cascade,
  coach_id uuid references coaches(id),
  date_debut date default current_date,
  phase_actuelle int default 1,
  statut text default 'en_cours' check (statut in ('en_cours','pause','termine')),
  created_at timestamptz default now()
);
```

### Interface

- [ ] Liste des programmes (cards : titre, durée, nb clients assignés)
- [ ] Créer un programme : titre, description, catégorie, durée totale
- [ ] Éditeur de phases : ajouter/réordonner phases, définir habitudes et objectifs par phase
- [ ] Bouton "Assigner à un client" depuis la liste ou la fiche client
- [ ] À l'assignation : habitudes et objectifs de la phase 1 créés automatiquement pour le client
- [ ] Vue client : progression dans le programme (phase actuelle, % avancement)
- [ ] Coach : suivi avancement de chaque client dans son programme

---

## PHASE 5c — Bibliothèque (Jour 10)
> Objectif : Le coach stocke et partage ses ressources facilement

### Tables Supabase

- [ ] Table `ressources`
```sql
create table ressources (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references coaches(id) on delete cascade,
  titre text not null,
  type text check (type in ('pdf','video','lien','image','guide')),
  url text,
  categorie text,
  description text,
  created_at timestamptz default now()
);
```

- [ ] Table `ressources_partages`
```sql
create table ressources_partages (
  id uuid default gen_random_uuid() primary key,
  ressource_id uuid references ressources(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  partage_at timestamptz default now(),
  unique(ressource_id, client_id)
);
```

### Interface

- [ ] Vue grille avec filtres par type et catégorie
- [ ] Upload fichier → Supabase Storage (PDF, image)
- [ ] Ajout lien externe (vidéo YouTube, article)
- [ ] Partager une ressource à 1 ou plusieurs clients
- [ ] Côté client : onglet "Ressources" avec fichiers partagés, téléchargeables

---

## PHASE 5d — Formulaires (Jours 10-11)
> Objectif : Formulaires personnalisés avec réponses centralisées dans la fiche client

### Tables Supabase

- [ ] Table `formulaires`
```sql
create table formulaires (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references coaches(id) on delete cascade,
  titre text not null,
  type text default 'custom' check (type in ('bilan_initial','check_in','sante','satisfaction','custom')),
  description text,
  actif boolean default true,
  created_at timestamptz default now()
);
```

- [ ] Table `formulaire_champs`
```sql
create table formulaire_champs (
  id uuid default gen_random_uuid() primary key,
  formulaire_id uuid references formulaires(id) on delete cascade,
  label text not null,
  type_champ text check (type_champ in ('texte','nombre','note_1_10','choix_multiple','oui_non','date')),
  options jsonb,
  obligatoire boolean default false,
  ordre int not null
);
```

- [ ] Table `formulaire_reponses`
```sql
create table formulaire_reponses (
  id uuid default gen_random_uuid() primary key,
  formulaire_id uuid references formulaires(id),
  client_id uuid references clients(id) on delete cascade,
  reponses jsonb not null,
  complete boolean default false,
  created_at timestamptz default now()
);
```

### Interface

- [ ] 4 templates prédéfinis : bilan initial, check-in hebdo, questionnaire santé, satisfaction
- [ ] Builder : ajouter/réordonner des champs (texte, nombre, note 1-10, choix multiple, oui/non)
- [ ] Envoyer un formulaire à un client → notif + visible dans son app
- [ ] Côté client : onglet "Formulaires" avec formulaires en attente
- [ ] Réponses visibles dans la fiche client
- [ ] Envoi auto : bilan initial au 1er login, check-in chaque lundi

---

## PHASE 5e — Rapports PDF (Jour 11)
> Objectif : Rapports automatiques professionnels pour le coach et ses clients

### Dépendances

```bash
npm install jspdf jspdf-autotable
```

### Interface

- [ ] 3 types de rapports :
  - **Rapport client hebdo** : score bien-être, habitudes, objectifs, sommeil, humeur + commentaire coach
  - **Rapport client mensuel** : toutes métriques 30j + graphiques + comparaison mois précédent
  - **Rapport financier** : CA, paiements reçus/en attente, MRR, abonnements

- [ ] Génération PDF via jsPDF avec branding coach (couleurs, logo)
- [ ] Envoi par email via Resend (bouton "Envoyer au client")
- [ ] Téléchargement manuel
- [ ] Génération automatique chaque lundi (Netlify Scheduled Function)
- [ ] Historique des rapports : date, client, statut envoyé/non envoyé

---

## PHASE 5f — Statistiques & Objectifs coach (Jour 12)
> Objectif : Analytics business + suivi des KPIs personnels du coach

### Tables Supabase

- [ ] Ajouter champ à la table `coaches`
```sql
alter table coaches add column if not exists objectifs_business jsonb default '{
  "clients_cible": 20,
  "ca_mensuel_cible": 2000,
  "retention_cible": 85
}';
```

### Interface — Statistiques

- [ ] Filtres : semaine / mois / trimestre / année
- [ ] KPI cards : CA, nouveaux clients, churn, taux rétention, revenu moyen/client, MRR projeté
- [ ] Graphiques Recharts :
  - LineChart : évolution CA sur 12 mois
  - BarChart : nouveaux clients par mois
  - PieChart : répartition CA par type d'offre
  - LineChart : score bien-être moyen clients sur 30j
- [ ] Tableau performances : client le plus engagé, programme le plus efficace, meilleur mois

### Interface — Objectifs coach

- [ ] Formulaire : nb clients cible, CA mensuel cible, taux rétention cible
- [ ] Barres progression : objectif vs réalité en temps réel
- [ ] Projection IA : "À ce rythme, tu atteindras 20 clients en mars"

---

## PHASE 5g — Paiement en ligne client — Stripe Connect (Jour 12)
> Objectif : Le client paie son coaching directement dans Zevo, l'argent va sur le compte du coach

### Fonctionnement Stripe Connect
```
Client → paie dans Zevo → Stripe → compte bancaire du coach
Zevo ne touche pas l'argent (pas de marketplace fees pour l'instant)
```

### Tables Supabase

- [ ] Ajouter à la table `coaches`
```sql
alter table coaches add column if not exists stripe_account_id text;
alter table coaches add column if not exists stripe_onboarding_complete boolean default false;
```

- [ ] Table `offres_coaching`
```sql
create table offres_coaching (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references coaches(id) on delete cascade,
  titre text not null,
  description text,
  prix int not null,              -- en centimes (ex: 9900 = 99€)
  frequence text check (frequence in ('unique','mensuel','trimestriel','annuel')),
  actif boolean default true,
  stripe_price_id text,          -- ID du price dans Stripe
  created_at timestamptz default now()
);
```

- [ ] Table `paiements_clients`
```sql
create table paiements_clients (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id),
  coach_id uuid references coaches(id),
  offre_id uuid references offres_coaching(id),
  montant int not null,           -- en centimes
  statut text check (statut in ('en_attente','paye','echoue','rembourse')),
  stripe_payment_intent_id text,
  methode_paiement text,
  date_paiement timestamptz,
  created_at timestamptz default now()
);
```

### Onboarding Stripe Connect coach

- [ ] Dans les Paramètres coach : section "Activer les paiements en ligne"
- [ ] Bouton "Connecter mon compte Stripe" → redirige vers Stripe Connect Onboarding
- [ ] Netlify Function `/api/stripe/connect-onboarding` :
```javascript
const accountLink = await stripe.accountLinks.create({
  account: coach.stripe_account_id,
  refresh_url: `${process.env.URL}/coach/parametres`,
  return_url: `${process.env.URL}/coach/parametres?stripe=success`,
  type: 'account_onboarding',
});
```
- [ ] Après onboarding : `stripe_onboarding_complete = true` dans Supabase
- [ ] Badge "Paiements activés ✓" dans les paramètres

### Création d'offres par le coach

- [ ] Dans l'onglet Abonnements : bouton "Créer une offre"
- [ ] Formulaire : titre, description, prix (€), fréquence (unique/mensuel/trimestriel/annuel)
- [ ] À la création : créer un `stripe.prices.create()` sur le compte Connect du coach
- [ ] Sauvegarder le `stripe_price_id` dans la table `offres_coaching`

### Paiement côté client

- [ ] Côté client : onglet "Mon abonnement" avec les offres du coach
- [ ] Bouton "Payer" → Netlify Function `/api/stripe/client-checkout` :
```javascript
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{ price: offre.stripe_price_id, quantity: 1 }],
  mode: offre.frequence === 'unique' ? 'payment' : 'subscription',
  success_url: `${process.env.URL}/app?paiement=success`,
  cancel_url: `${process.env.URL}/app/abonnement`,
}, {
  stripeAccount: coach.stripe_account_id,  // Paiement sur le compte du coach
});
```
- [ ] Page de confirmation après paiement réussi
- [ ] Webhook : `payment_intent.succeeded` → mettre à jour `paiements_clients`

### Interface coach — suivi paiements

- [ ] Dans l'onglet Abonnements : liste de tous les paiements reçus
- [ ] Colonnes : client, offre, montant, date, statut
- [ ] Filtre par statut : payé / en attente / échoué
- [ ] Total encaissé du mois affiché en haut

---

## PHASE 5h — App Builder Premium (Jour 13)
> Objectif : Onglet dédié pour personnaliser l'app client — réservé au plan Unlimited

### Guard plan Unlimited

- [ ] Vérifier `coach.plan === 'unlimited'` avant d'afficher l'onglet
- [ ] Si plan inférieur : onglet visible mais verrouillé avec badge "Unlimited" + bouton upgrade

### Interface App Builder

- [ ] Onglet "App Builder" dans la sidebar coach (icône pinceau)
- [ ] Layout en 2 colonnes :
  - **Gauche** : panneau de contrôles (les réglages)
  - **Droite** : prévisualisation en temps réel (mockup de l'app client)

- [ ] Panneau de contrôles :
```
Section Identité
- Nom de l'app (input texte)
- Logo (upload → Supabase Storage)
- Couleur primaire (color picker avec preview)

Section Modules
- Toggle : Habitudes (on/off)
- Toggle : Objectifs (on/off)
- Toggle : Sommeil (on/off)
- Toggle : Humeur (on/off)
- Toggle : Sport (on/off)
- Toggle : Routines (on/off)

- Toggle : Coach IA (on/off)

Section Message
- Textarea : Message de bienvenue (affiché au 1er login du client)
```

- [ ] Prévisualisation temps réel (colonne droite) :
  - Mockup de l'app client (smartphone frame)
  - Les changements s'appliquent instantanément dans le mockup
  - Montre : header avec logo + couleur, menu avec modules actifs, dashboard

- [ ] Bouton "Appliquer à tous mes clients" → met à jour tous les clients du coach
- [ ] Bouton "Appliquer à un client spécifique" → modal de sélection du client
- [ ] Bouton "Sauvegarder" → enregistre dans la table `coaches`
- [ ] Historique des modifications (optionnel)

### Upsell pour les plans inférieurs

- [ ] Sur plan Starter et Pro : onglet App Builder visible mais verrouillé
- [ ] Message : "Disponible sur le plan Unlimited"
- [ ] Bouton "Passer à Unlimited" → redirige vers Stripe pour upgrade
- [ ] Aperçu floutée de l'interface pour donner envie

---

## PHASE 8 — Optimisations (Jours 11-12)

- [ ] PWA : manifest.json + service worker + icône Zevo
- [ ] Mode hors ligne : cache habitudes du jour + sync au retour
- [ ] Performance : skeleton loaders, lazy loading des modules
- [ ] Animations : confettis objectif atteint, milestone streak (7j, 30j, 100j)
- [ ] Export CSV client (habitudes + objectifs sur une période)
- [ ] Thème clair/sombre auto (selon préférences système)
- [ ] Responsive mobile parfait

---

## PHASE 9 — Super Admin (Jour 13)

- [ ] Dashboard `/admin` (protégé par table admin)
- [ ] Liste tous les coachs : nom, plan, abonnement actif/inactif, nb clients, date création
- [ ] Stats : MRR total, nb coachs actifs, nb clients total, évolution mensuelle
- [ ] Actions : activer/suspendre un coach manuellement, changer le plan

---

## Variables d'environnement

### .env local
```
VITE_SUPABASE_URL=https://vkbtjeitjkycofybnbyh.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_STRIPE_PUBLIC_KEY=pk_test_...
VITE_ANTHROPIC_KEY=sk-ant-...
```

### Netlify (à configurer dans le dashboard)
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_STRIPE_PUBLIC_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
ANTHROPIC_API_KEY
RESEND_API_KEY
```

---

## Tests obligatoires avant chaque déploiement

- [ ] Login coach → dashboard coach ✓
- [ ] Login client → app client ✓
- [ ] Login admin → dashboard admin ✓
- [ ] Client ne voit pas les données d'un autre client ✓
- [ ] Coach ne voit que ses propres clients ✓
- [ ] Invitation → email reçu → création compte → redirection app ✓
- [ ] Assignation habitude coach → visible côté client ✓
- [ ] Score bien-être calculé correctement ✓
- [ ] Paiement Stripe test → compte activé ✓
