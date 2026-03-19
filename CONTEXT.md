# ZEVO — Contexte projet (feuille blanche)

## C'est quoi Zevo ?
Zevo est une plateforme SaaS de coaching en ligne, construite from scratch.
Cible : coachs fitness, nutrition, remise en forme, bien-être, développement perso.
Positionnement : transformation globale de la personne — pas que sport/nutrition.

## Stack technique
- Frontend : React + Vite
- Styling : Tailwind CSS
- Backend / DB : Supabase (PostgreSQL + Auth + Realtime + Storage)
- Paiements : Stripe
- IA : API Anthropic (Claude) — Coach IA connecté aux vraies données
- Déploiement : Netlify
- Emails : Resend (invitations clients, notifications)

## Identité visuelle
- Couleur primaire : #FF6B2B (orange)
- Couleur fond : #0D0D0D (noir profond)
- Surface cards : #1E1E1E
- Surface secondaire : #2A2A2A
- Texte principal : #F5F5F3
- Texte secondaire : rgba(245,245,243,0.6)
- Bordures : rgba(255,255,255,0.08)
- Style : premium, sombre, épuré, adulte — zéro mascotte

## Architecture des rôles

Super Admin (Noa) → Coach (client payant Zevo) → Client du coach

### Super Admin
- Voit tous les coachs et leurs abonnements
- Active/suspend des comptes
- Stats globales (MRR, nb coachs, nb clients, churn)

### Coach — Onglets disponibles
1. **Dashboard** — KPI cards, alertes décrochage intelligentes, score bien-être moyen clients, agenda du jour, raccourcis rapides
2. **Clients** — CRM complet, fiche client détaillée (infos, bien-être, objectifs, abonnement, historique)
3. **Messages** — messagerie temps réel, modèles, messages groupés, suggestions IA
4. **Calendrier** — RDV, séances, bilans, glisser-déposer, rappels automatiques
5. **Abonnements** — offres, paiements, MRR, renouvellements, Stripe intégré
6. **Programmes** — programmes multi-semaines réutilisables, phases, assignables en 1 clic
7. **Bibliothèque** — ressources (PDF, vidéos, guides), partage client en 1 clic
8. **Formulaires** — bilan initial, check-in hebdo, questionnaire santé, réponses centralisées fiche client
9. **Rapports** — PDF auto hebdo/mensuel par client, rapport financier, envoi email
10. **Statistiques** — CA par période, rétention, clients gagnés/perdus, revenus prévisionnels
11. **Objectifs coach** — KPIs business personnels (nb clients cible, CA cible, taux rétention)
12. **Paramètres** — branding, modules on/off, abonnement Zevo, notifications

### Client du coach
- Reçoit invitation par email → crée son compte en 1 clic
- Voit l'app aux couleurs de son coach
- Utilise tous les modules (habitudes, objectifs, sommeil, humeur, sport, routines)
- Coach IA connecté à ses données réelles
- Messagerie avec son coach

## Modules côté client

1. Dashboard — score bien-être, habitudes du jour, tâches urgentes, comparatif semaine
2. Habitudes — suivi quotidien, streaks, taux complétion mensuel
3. Objectifs — assignables par coach, progression, date cible
4. Tâches — to-do avec priorités et échéances
5. Sommeil — heures quotidiennes, graphique 7j
6. Humeur — score 1-10 quotidien + note
7. Sport — activité, durée, intensité
8. Routines — routines matin/soir avec étapes cochables
9. Coach IA — chat connecté aux vraies données du client

## Nouveaux modules coach (ajoutés)

### Programmes
Programmes de coaching structurés sur plusieurs semaines.
- Phases avec durée (ex : Phase 1 — Mise en route — 4 semaines)
- Chaque phase contient : habitudes assignées, objectifs, tâches, ressources
- Réutilisable entre clients — assigner en 1 clic
- Table Supabase : `programmes`, `programme_phases`, `programme_assignations`

### Bibliothèque
Stockage et partage de ressources coach.
- Types : PDF, vidéo, lien, image, guide
- Organisation par catégories (nutrition, sport, mindset, admin)
- Partage à un client ou un groupe de clients
- Stockage : Supabase Storage
- Table Supabase : `ressources`, `ressources_partages`

### Formulaires
Formulaires personnalisés créés par le coach.
- Types prédéfinis : bilan initial, check-in hebdo, questionnaire santé, satisfaction
- Builder drag-and-drop de champs (texte, nombre, choix multiple, note 1-10)
- Envoi automatique ou manuel à un client
- Réponses centralisées dans la fiche client
- Table Supabase : `formulaires`, `formulaire_champs`, `formulaire_reponses`

### Rapports
Génération automatique de rapports PDF.
- Rapport client hebdomadaire : habitudes, score bien-être, objectifs, sommeil
- Rapport client mensuel : progression complète + commentaire coach
- Rapport financier : CA, paiements, abonnements
- Envoi automatique par email (Resend) ou téléchargement manuel
- Génération : jsPDF ou Puppeteer via Netlify Function

### Statistiques
Analytics business du coach.
- CA par semaine / mois / trimestre / année
- Taux de rétention clients (%)
- Clients gagnés vs perdus par période
- Performance par type d'offre
- Revenus prévisionnels basés sur les abonnements actifs
- Graphiques : Recharts (LineChart, BarChart, PieChart)

### Objectifs coach
Le coach fixe ses propres objectifs business.
- Nb de clients cible (ex : 20 clients d'ici juin)
- CA mensuel cible
- Taux de rétention cible
- Barre de progression vs réalité
- Stocké dans la table `coaches` (champ `objectifs_business jsonb`)
Indice quotidien 0-100 calculé automatiquement :
- Habitudes du jour cochées : 30%
- Qualité sommeil : 25%
- Humeur : 25%
- Activité physique : 20%

Visible par le client sur son dashboard.
Visible par le coach pour chaque client — c'est ce qui déclenche les alertes décrochage.

## Alertes décrochage (différenciateur clé vs Ekklo)
Ekklo affiche juste "1 client à risque".
Zevo affiche : "Lucas n'a pas coché ses habitudes depuis 3 jours · Sommeil en chute · Score -12pts"
+ bouton "Envoyer un message" directement depuis l'alerte.

## Tarification
- Installation unique : 249€ (setup + formation 1h)
- Starter : 39€/mois — 5 clients, branding inclus
- Pro : 59€/mois — 20 clients, rapports auto, programmes 30j
- Unlimited : 79€/mois — illimité, API, domaine perso, App Builder

## Paiement en ligne client (Stripe Connect)
Le client paie son abonnement coaching directement dans l'app Zevo.
L'argent va directement sur le compte Stripe du coach (Stripe Connect).
Zevo ne touche pas l'argent — c'est du coach à son client.

Fonctionnement :
- Le coach crée ses offres dans l'onglet Abonnements (prix, durée, description)
- Le coach envoie un lien de paiement à son client ou le client voit les offres dans son app
- Le client paie par carte → argent versé sur le compte Stripe du coach
- Stripe prélève ses frais standards (1.5% + 0.25€ en Europe)
- Le coach voit tous ses paiements dans l'onglet Abonnements

Tables Supabase supplémentaires :
- Ajouter `stripe_account_id` dans la table `coaches` (compte Stripe Connect du coach)
- Table `paiements_clients` : client_id, coach_id, montant, statut, stripe_payment_intent_id, date

## App Builder Premium (plan Unlimited uniquement)
Onglet dédié dans le dashboard coach pour personnaliser l'app client.
Disponible uniquement sur le plan Unlimited (79€/mois) — argument de vente pour l'upsell.

Ce que le coach peut personnaliser :
- Couleur primaire (color picker)
- Logo (upload)
- Nom de l'app
- Modules on/off par client ou globalement (sport, sommeil, humeur, routines, Coach IA)
- Message de bienvenue

Ce qui est différent du plan Pro :
- Sur Pro : paramètres basiques dans Paramètres (déjà prévu)
- Sur Unlimited : onglet App Builder dédié avec prévisualisation en temps réel de l'app client
- La prévisualisation montre exactement ce que le client verra sur son écran
