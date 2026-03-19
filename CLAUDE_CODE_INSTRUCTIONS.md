# INSTRUCTIONS POUR CLAUDE CODE — Zevo (feuille blanche)

## Lis ce fichier EN PREMIER

Tu construis **Zevo** from scratch — une plateforme SaaS de coaching.
Lis CONTEXT.md et ROADMAP.md avant de toucher quoi que ce soit.

## Règles absolues

### Ne jamais faire sans demander
- Déployer en production sans validation
- Modifier le schéma Supabase sur une branche active
- Utiliser des bibliothèques non listées dans CONTEXT.md

### Toujours faire
- Travailler phase par phase (ordre ROADMAP.md)
- Tester chaque phase avant de continuer
- Couleurs Zevo partout : #FF6B2B orange · #0D0D0D noir · #1E1E1E cards
- Commenter le code en français
- Mobile-first sur toutes les interfaces client
- Composants réutilisables dès le départ

## Démarrage rapide

```bash
# 1. Créer le projet
npm create vite@latest zevo -- --template react
cd zevo

# 2. Installer les dépendances
npm install @supabase/supabase-js tailwindcss react-router-dom recharts lucide-react
npm install @stripe/stripe-js
npm install -D @tailwindcss/vite

# 3. Lancer
npm run dev
```

---

## PROMPTS PRÊTS À COPIER — un par phase

### 🚀 DÉMARRAGE
```
Lis CONTEXT.md et ROADMAP.md.

Initialise le projet Zevo :
1. Crée la structure de fichiers React + Vite
2. Configure Tailwind avec les couleurs Zevo (#FF6B2B, #0D0D0D, #1E1E1E)
3. Configure React Router avec les routes : /login, /invite/:token, /app/*, /coach/*, /admin/*
4. Crée le client Supabase (src/lib/supabase.js)
5. Crée un fichier .env.example avec toutes les variables nécessaires

Design : fond noir #0D0D0D, accent orange #FF6B2B, cards #1E1E1E, texte #F5F5F3
```

### 📦 PHASE 2 — Base de données
```
Génère le SQL complet pour créer toutes les tables Supabase de Zevo :
profiles, coaches, clients, invitations, habitudes, habitudes_log,
objectifs, taches, sommeil_log, humeur_log, sport_log, routines, budget,
messages, admin

Inclus :
- Toutes les contraintes (types, checks, foreign keys)
- Le trigger auto-création profil au signup
- Les politiques RLS pour chaque table
- Les indexes pour les requêtes fréquentes (client_id, date, coach_id)

Référence : ROADMAP.md Phase 2
```

### 🔐 PHASE 3 — Auth
```
Crée le système d'authentification Zevo :
1. Page /login : email + password, design Zevo noir/orange, lien mot de passe oublié
2. Page /invite/:token : onboarding nouveau client (vérif token → formulaire → création compte → redirection)
3. Hook useAuth() : état connexion, login, logout, user
4. Hook useRole() : détecte admin/coach/client depuis la table profiles
5. Composant ProtectedRoute : redirige si non connecté ou mauvais rôle
6. Redirection automatique après login selon le rôle

Design : fond #0D0D0D, bouton primary #FF6B2B, inputs border rgba(255,255,255,0.1)
```

### 📱 PHASE 4 — App client
```
Crée l'app client Zevo (ce que voit le client du coach) :

Layout :
- Sidebar mobile-first avec icons : Dashboard, Habitudes, Objectifs, Messages, Profil
- Header dynamique : logo/nom du coach chargé depuis Supabase
- Thème dynamique : CSS variables injectées depuis les settings du coach

Commence par le Dashboard client :
- Score bien-être du jour (jauge circulaire, calcul : 30% habitudes + 25% sommeil + 25% humeur + 20% sport)
- Habitudes du jour (checkboxes)
- Tâches urgentes
- Comparatif semaine (cette semaine vs semaine dernière)

Utilise Recharts pour les graphiques.
Design mobile-first, fond #0D0D0D, cards #1E1E1E, accent #FF6B2B.
```

### 👨‍💼 PHASE 5 — Dashboard coach
```
Crée le dashboard coach Zevo :

Layout :
- Sidebar : Dashboard · Clients · Messages · Paramètres (5 entrées max)
- Design sombre premium, accent orange

Dashboard principal :
- 4 cards : Clients actifs / En décrochage / Nouveaux cette semaine / MRR
- Liste clients : initiales, nom, score bien-être (barre colorée), streak, dernière activité
- Alertes intelligentes décrochage : "Lucas n'a pas coché ses habitudes depuis 3 jours · Score -12pts" + bouton "Envoyer un message"

Fiche client (clic sur un client) :
- Onglets : Aperçu · Habitudes · Objectifs · Messages
- Boutons : "Assigner une habitude" et "Assigner un objectif" (modals)
- Toutes les données du client en lecture

Invitation client :
- Formulaire email + prénom
- Génération token
- Envoi via Resend (ou console.log en dev)
```

### 🎨 PHASE 6 — Personnalisation
```
Crée le système de personnalisation par coach :

Page /coach/parametres :
- Nom de l'app (input texte)
- Upload logo (Supabase Storage)
- Color picker couleur primaire
- Textarea message de bienvenue
- Toggles modules : sport, sommeil, humeur, routines

Système thème côté client :
- Au login client : fetch des settings du coach (couleur_primaire, nom_app, logo_url, modules)
- Injecter dans document.documentElement.style.setProperty('--color-primary', couleur)
- Masquer les modules désactivés par le coach

Onboarding (1er login, onboarding_complete = false) :
- Step 1 : Message de bienvenue du coach + bouton Continuer
- Step 2 : Liste des habitudes pré-assignées
- Step 3 : Définir un premier objectif personnel
- Mettre onboarding_complete = true
```

### 💳 PHASE 5g — Paiement en ligne client (Stripe Connect)
```
Intègre Stripe Connect dans Zevo pour que les clients paient leur coaching directement dans l'app.
L'argent va directement sur le compte Stripe du coach — Zevo ne touche pas l'argent.

Étapes :
1. Ajouter stripe_account_id et stripe_onboarding_complete à la table coaches
2. Créer la table offres_coaching et paiements_clients (voir ROADMAP.md Phase 5g)
3. Netlify Function /api/stripe/connect-onboarding : génère le lien d'onboarding Stripe Connect
4. Dans Paramètres coach : bouton "Connecter mon compte Stripe" + badge "Paiements activés ✓"
5. Dans Abonnements coach : formulaire "Créer une offre" → crée un stripe.prices sur le compte Connect
6. Côté client : onglet "Mon abonnement" avec les offres du coach + bouton "Payer"
7. Netlify Function /api/stripe/client-checkout : session Stripe sur le compte Connect du coach
8. Webhook payment_intent.succeeded → update table paiements_clients
9. Dans Abonnements coach : liste tous les paiements reçus avec filtres

Important : utiliser { stripeAccount: coach.stripe_account_id } sur toutes les opérations Stripe.
Tester en mode Stripe TEST avec un compte Connect de test.
```

### 🎨 PHASE 5h — App Builder Premium (plan Unlimited)
```
Crée l'onglet "App Builder" dans le dashboard coach Zevo.
Réservé au plan Unlimited (79€/mois) — les autres plans voient l'onglet verrouillé.

Layout 2 colonnes :
- Gauche : panneau de contrôles (nom app, logo, couleur primaire, modules on/off, message bienvenue)
- Droite : prévisualisation temps réel dans un mockup smartphone

Panneau de contrôles :
- Nom de l'app (input texte)
- Logo (upload Supabase Storage)
- Couleur primaire (color picker natif HTML)
- 7 toggles modules : Habitudes, Objectifs, Sommeil, Humeur, Sport, Routines, Coach IA
- Textarea message de bienvenue

Prévisualisation temps réel :
- Mockup smartphone (frame CSS simple)
- Montre le header avec logo + couleur du coach
- Montre le menu avec seulement les modules activés
- Se met à jour instantanément à chaque changement (useState React)

Actions :
- Bouton "Appliquer à tous mes clients" → update coaches SET settings
- Bouton "Sauvegarder"

Guard plan :
- Si plan !== 'unlimited' → onglet visible dans la sidebar mais avec icône cadenas
- Clic → modal "Cette fonctionnalité est disponible sur le plan Unlimited"
- Bouton "Passer à Unlimited" dans le modal → lien Stripe upgrade

Design : panneau gauche fond #1E1E1E, mockup smartphone fond #0D0D0D avec bordure orange #FF6B2B.
```

### 💳 PHASE 7 — Stripe
```
Intègre Stripe pour la facturation des coachs :

1. Page publique /pricing :
- 3 plans affichés : Starter 39€, Pro 59€, Unlimited 79€
- + Installation unique 249€ obligatoire
- Bouton "Commencer" → Stripe Checkout

2. Netlify Function /api/stripe/create-checkout :
- Crée une session avec line_items : installation (one-shot) + subscription
- Retourne l'URL de checkout

3. Netlify Function /api/stripe/webhook :
- checkout.session.completed → SET abonnement_actif = true sur le coach
- customer.subscription.deleted → SET abonnement_actif = false

4. Dans les paramètres coach : lien "Gérer mon abonnement" → Stripe Customer Portal

5. Guard coach : si abonnement_actif = false → page de renouvellement (pas d'accès au dashboard)

Utiliser Stripe en mode TEST d'abord.
```

### 📋 PHASE 5b — Programmes
```
Crée l'onglet Programmes dans le dashboard coach Zevo.

Tables Supabase : programmes, programme_phases, programme_assignations (voir ROADMAP.md Phase 5b)

Interface coach :
- Liste des programmes en cards (titre, durée, nb phases, nb clients assignés)
- Créer/éditer un programme avec ses phases (éditeur séquentiel)
- Chaque phase : titre, durée, habitudes à créer, objectifs à créer
- Bouton "Assigner à un client" → les habitudes/objectifs de la phase 1 sont créés automatiquement

Interface client :
- Section "Mon programme" sur le dashboard client
- Barre de progression : phase actuelle / nb phases total
- Habitudes et objectifs de la phase actuelle bien identifiés visuellement

Design : cards #1E1E1E, phases reliées par une timeline orange #FF6B2B
```

### 📚 PHASE 5c — Bibliothèque
```
Crée l'onglet Bibliothèque dans le dashboard coach Zevo.

Tables Supabase : ressources, ressources_partages (voir ROADMAP.md Phase 5c)

Interface coach :
- Grille de ressources avec filtres par type (PDF, vidéo, lien, image) et catégorie
- Upload fichier vers Supabase Storage
- Ajout lien externe
- Modal "Partager" : sélectionner 1 ou plusieurs clients

Interface client :
- Onglet "Ressources" avec les fichiers partagés par le coach
- Téléchargement direct pour les PDF, ouverture lien pour les vidéos/liens

Design sombre cohérent avec le reste de l'app.
```

### 📝 PHASE 5d — Formulaires
```
Crée l'onglet Formulaires dans le dashboard coach Zevo.

Tables Supabase : formulaires, formulaire_champs, formulaire_reponses (voir ROADMAP.md Phase 5d)

Interface coach :
- 4 templates prédéfinis : bilan initial, check-in hebdo, questionnaire santé, satisfaction
- Builder : ajouter des champs (texte, nombre, note 1-10, choix multiple, oui/non, date)
- Réordonner les champs
- Bouton "Envoyer à un client"
- Onglet "Réponses" dans la fiche client

Interface client :
- Onglet "Formulaires" avec formulaires en attente (badge rouge si nouveau)
- Formulaire interactif à remplir step by step
- Confirmation après envoi

Envoi auto : bilan initial déclenché au 1er login du client (onboarding).
```

### 📄 PHASE 5e — Rapports
```
Crée l'onglet Rapports dans le dashboard coach Zevo.

Dépendance : npm install jspdf jspdf-autotable

3 types de rapports à générer en PDF :

1. Rapport client hebdomadaire :
- Score bien-être de la semaine (graphique)
- Habitudes : taux de complétion
- Objectifs : progression
- Sommeil + humeur moyens
- Champ commentaire coach (texte libre)

2. Rapport client mensuel :
- Toutes les métriques sur 30 jours
- Comparaison mois précédent (+/- en couleur)
- Recommandations coach

3. Rapport financier :
- CA du mois, paiements reçus/en attente, MRR

Interface :
- Sélectionner client + type de rapport + période
- Prévisualisation avant génération
- Boutons : "Télécharger PDF" et "Envoyer par email"
- Historique des rapports générés

Le PDF doit intégrer le logo et la couleur primaire du coach.
```

### 📊 PHASE 5f — Statistiques & Objectifs coach
```
Crée l'onglet Statistiques dans le dashboard coach Zevo.

Interface Statistiques :
- Filtres période : semaine / mois / trimestre / année
- KPI cards : CA, nouveaux clients, churn, taux rétention %, revenu moyen/client, MRR projeté
- Graphiques Recharts :
  - LineChart : évolution CA sur 12 mois
  - BarChart : nouveaux clients par mois  
  - PieChart : répartition CA par type d'offre
  - LineChart : score bien-être moyen de tous les clients sur 30j
- Tableau : client le plus engagé, programme le plus efficace, meilleur mois

Interface Objectifs coach (section dans la même page) :
- Formulaire : nb clients cible, CA mensuel cible, taux rétention cible
- Barres de progression temps réel : "15/20 clients (75%)"
- Message projection : "À ce rythme, objectif atteint en mars 2026"

Modifier la table coaches : ajouter colonne objectifs_business jsonb.
Design : graphiques avec couleur #FF6B2B, fond cards #1E1E1E.
```


```
Optimise l'app Zevo :

1. PWA : crée public/manifest.json (icône Zevo orange, theme_color #FF6B2B) + service worker basique

2. Performance :
- Skeleton loaders sur toutes les cards en chargement (fond #2A2A2A animé)
- Lazy loading des modules non actifs avec React.lazy()
- Pré-fetch des données au login

3. Animations :
- Confettis (canvas-confetti) quand un objectif atteint 100%
- Animation pulse sur le score bien-être si record personnel
- Milestone streak : modal de célébration à 7j, 30j, 100j

4. Responsive : tester et corriger sur mobile 375px, tablet 768px, desktop 1280px

5. Export : bouton "Exporter mes données" → CSV habitudes + objectifs sur période choisie
```

### 🔑 PHASE 9 — Super Admin
```
Crée le dashboard Super Admin /admin (accès uniquement si email dans la table admin) :

1. Stats globales (cards) :
- MRR total (somme des abonnements actifs)
- Nb coachs actifs
- Nb clients total
- Nouveaux coachs ce mois

2. Table des coachs :
- Colonnes : nom, email, plan, abonnement actif, nb clients, date création
- Actions : activer/suspendre, changer le plan

3. Graphique évolution MRR sur 12 mois (Recharts LineChart)

Protéger cette route : vérifier table admin, sinon redirection 404.
```

---

## Architecture des fichiers recommandée

```
src/
├── lib/
│   ├── supabase.js          # Client Supabase
│   └── stripe.js            # Client Stripe
├── hooks/
│   ├── useAuth.js           # Authentification
│   ├── useRole.js           # Détection rôle
│   └── useCoachTheme.js     # Thème dynamique coach
├── components/
│   ├── ui/                  # Composants réutilisables (Button, Card, Badge, Modal)
│   └── layout/              # Layouts (ClientLayout, CoachLayout, AdminLayout)
├── pages/
│   ├── public/              # Login, Pricing, Invite
│   ├── client/              # Dashboard, Habitudes, Objectifs, etc.
│   ├── coach/               # Dashboard coach, Clients, Messages, Paramètres
│   └── admin/               # Super admin
├── utils/
│   └── wellbeing.js         # Calcul score bien-être
└── App.jsx                  # Router principal
```

---

## Si Claude Code part dans la mauvaise direction

Dis-lui :
> "Stop. Relis CONTEXT.md et ROADMAP.md. On travaille phase par phase.
> On est à la Phase X. Recommence uniquement cette phase."
