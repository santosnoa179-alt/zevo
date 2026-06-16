# 🚀 Zevo — Launch Checklist

> **Comment utiliser** : coche au fur et à mesure, note les bugs en bas dans la section "Bugs trouvés" pour les fixer en batch après. Ne fix PAS pendant le test, sinon tu perds le fil.
>
> **Ordre recommandé** : sections 1 → 9 dans l'ordre. Estimation totale : ~3h45.

---

## 🛠 Setup avant de commencer (10 min)

- [ ] Créer 3 comptes test :
  - Coach : `coach+test@tonmail.com`
  - Client : `client+test@tonmail.com`
  - Admin : (compte existant ou créer)
- [ ] Ouvrir 4 onglets utiles :
  - [ ] Vercel logs (dashboard → projet zevo → Logs)
  - [ ] Stripe Dashboard (mode TEST)
  - [ ] PostHog Activity (eu.posthog.com → Activity)
  - [ ] Sentry Issues (sentry.io → projet → Issues)
- [ ] iPhone à côté pour tests mobile en parallèle
- [ ] Vérifier dernier commit sur main = bien déployé sur prod (Vercel → Deployments)

---

## 1️⃣ AUTH — Le socle (30 min)

### Inscription coach
- [ ] Landing marketing → CTA "Commencer" → arrive sur signup app
- [ ] Inscription nouveau coach avec email valide → email de confirmation reçu
- [ ] Vérifier inbox **ET** spam
- [ ] Cliquer le lien de confirmation → arrive sur `/coach/onboarding`
- [ ] Compléter onboarding → redirect sur `/coach/pricing` (pas encore d'abo)

### Login
- [ ] Logout → login coach existant → redirect direct sur `/coach/dashboard`
- [ ] Logout → login client existant → redirect direct sur `/app/dashboard`
- [ ] Logout → login admin → redirect sur `/admin/dashboard`
- [ ] Mauvais mot de passe → message d'erreur clair (pas de stack trace)
- [ ] Email inexistant → message générique (pas de "user not found" qui leak)

### Reset password
- [ ] "Mot de passe oublié" → email reçu
- [ ] Cliquer le lien → page de reset
- [ ] Nouveau mdp accepté → redirect login → connexion ok

### Sécurité des routes
- [ ] Client connecté qui tape `/coach` → redirect `/app`
- [ ] Coach connecté qui tape `/admin` → redirect `/coach`
- [ ] Non-connecté qui tape `/app/dashboard` → redirect `/login`
- [ ] Logout → l'URL `/coach/dashboard` ne marche plus (pas en cache)

### Lien d'invitation client
- [ ] Coach invite un client → email reçu côté client
- [ ] Cliquer le lien `/invite/:token` → page de création compte
- [ ] Créer compte → redirect `/app/dashboard` → bien rattaché au coach
- [ ] Réutiliser le même lien → message "déjà utilisé"

---

## 2️⃣ STRIPE — Le plus risqué (45 min)

> CB de test : `4242 4242 4242 4242` — date future quelconque, CVC `123`

### Souscription coach
- [ ] Coach sans abo → bloqué par CoachGuard → redirect `/coach/pricing`
- [ ] Choisir Starter mensuel → Stripe Checkout → CB test
- [ ] Retour sur app → toast succès → accès `/coach/dashboard` débloqué
- [ ] Vérifier en DB : `coachs.plan = 'starter'`, `current_period_end` correct
- [ ] Refaire avec Pro mensuel
- [ ] Refaire avec Unlimited annuel
- [ ] Avec code promo → discount visible → DB enregistre la réduction

### Webhooks Stripe
- [ ] `checkout.session.completed` → reçu et traité (200 OK dans Stripe → Events)
- [ ] Upgrade Starter → Pro → `customer.subscription.updated` → DB synced
- [ ] Cancel abo depuis customer portal → `customer.subscription.deleted` → CoachGuard redirige `/coach/pricing`
- [ ] Resub après cancel → fonctionne

### Stripe Connect (paiements clients)
- [ ] Coach va dans Paiements → Paramètres → "Connecter Stripe"
- [ ] Onboarding Stripe Connect → retour app → `stripe_account_id` posté
- [ ] Créer un produit + lien de paiement
- [ ] Client paye via le lien → coach reçoit le montant - commission Zevo
- [ ] Vérifier la commission arrive sur ton compte plateforme

### Échec paiement
- [ ] CB qui refuse `4000 0000 0000 0002` → erreur claire, pas de DB pollué
- [ ] CB qui demande 3DS `4000 0027 6000 3184` → flow 3DS fonctionne

---

## 3️⃣ COACH — Flow métier (45 min)

### Dashboard
- [ ] Charge sans erreur, stats cohérentes (clients actifs, séances cette semaine, etc.)
- [ ] Pas d'erreur en console DevTools

### Clients
- [ ] Liste des clients → recherche fonctionne → filtres marchent
- [ ] Inviter nouveau client → email envoyé → token correct
- [ ] Cliquer un client → fiche client complète charge
- [ ] Modifier infos client → sauvegarde
- [ ] Désactiver un client → il perd l'accès à l'app

### Programmes Sport
- [ ] Bibliothèque exercices : recherche, filtres groupe musculaire
- [ ] Créer nouveau programme → 4 semaines → 3 séances/semaine
- [ ] Drag & drop d'exercices → sauvegarde auto
- [ ] Assigner programme à un client → notif côté client
- [ ] Dupliquer un programme existant

### Nutrition
- [ ] Créer plan nutrition → macros calculés
- [ ] Assigner à un client → client le voit
- [ ] Programme nutrition multi-semaines

### Messages
- [ ] Liste conversations → recherche fonctionne
- [ ] Cliquer une conversation → messages chargent
- [ ] Envoyer message texte → arrive instantanément côté client
- [ ] Envoyer image / fichier → preview correct
- [ ] Marquage "lu" fonctionne dans les deux sens

### Calendrier global
- [ ] Vue semaine/mois → toutes les séances visibles
- [ ] Créer une séance ad-hoc pour un client → client la voit dans `/app/seances`

### Bibliothèque
- [ ] Upload fichier (PDF, image, vidéo) → stocké correctement
- [ ] Partager avec un client → client peut télécharger
- [ ] Supprimer un fichier → confirmation → bien supprimé

### Formulaires
- [ ] Créer un formulaire (texte, choix multiple, échelle)
- [ ] Envoyer à un client → client le reçoit
- [ ] Client répond → coach voit les réponses
- [ ] Export CSV des réponses

### Paiements & Business
- [ ] Vue Business → CA correct, transactions listées
- [ ] Créer un produit → prix → catégorie
- [ ] Créer un lien de paiement → URL fonctionne
- [ ] Créer un code promo → applicable au checkout
- [ ] Liste des factures → téléchargement PDF

### Stats & Rapports (PlanGate)
- [ ] Si Starter : message "feature Pro" + CTA upgrade
- [ ] Si Pro/Unlimited : accès complet, graphiques chargent

### Paramètres coach
- [ ] Modifier nom/photo/bio → sauvegarde
- [ ] Couleur primaire (theme) → change l'app du client
- [ ] Logo personnalisé → visible chez le client

---

## 4️⃣ CLIENT — Flow métier (30 min)

### Dashboard client
- [ ] Score bien-être affiché et calculé correctement
- [ ] Prochaine séance visible
- [ ] Habitudes du jour listées
- [ ] Theme couleur du coach appliqué

### Habitudes
- [ ] Valider une habitude → streak +1 → animation
- [ ] Voir l'historique sur 30 jours
- [ ] Manquer un jour → streak reset (selon règle)

### Objectifs
- [ ] Créer un objectif avec étapes
- [ ] Cocher une étape → progression visible
- [ ] Compléter tous les sous-objectifs → célébration confetti

### Programme sport
- [ ] Voir le programme assigné par le coach
- [ ] Naviguer entre semaines
- [ ] Cliquer une séance → ouverture détails

### Workout tracker
- [ ] Lancer une séance → mode immersif plein écran
- [ ] Logger séries/reps/poids → sauvegarde temps réel
- [ ] Timer entre séries → fonctionne
- [ ] Finir séance → résumé → données remontent côté coach
- [ ] Quitter en cours → reprise possible

### Nutrition
- [ ] Plan nutrition affiché avec macros
- [ ] Repas du jour visibles
- [ ] Substitutions proposées si configurées

### Calendrier client
- [ ] Vue mois → séances visibles
- [ ] Vue jour → détails
- [ ] **Pas de swipe horizontal parasite** sur mobile (le fix qu'on a fait)
- [ ] Marquer une séance comme faite

### Messages client
- [ ] Conversation avec coach → messages chargent
- [ ] Envoyer message → arrive instantanément côté coach
- [ ] Notifications de nouveau message

### Ressources & Formulaires
- [ ] Voir les fichiers partagés par le coach
- [ ] Télécharger un PDF → ouvre correctement
- [ ] Répondre à un formulaire → soumission ok

### Profil
- [ ] Modifier nom/photo
- [ ] Changer email → email de confirmation
- [ ] Changer mot de passe

### Abonnement
- [ ] Voir détails de son abo
- [ ] Modifier moyen de paiement (Stripe portal)
- [ ] Annuler son abo → confirmation → DB updated

---

## 5️⃣ ADMIN — Quick check (10 min)

- [ ] Liste des coachs → filtres (plan, statut) marchent
- [ ] Cliquer un coach → détails complets
- [ ] Désactiver un coach → il perd l'accès et ses clients aussi
- [ ] Liste des abonnements → stats globales cohérentes
- [ ] Aucune action destructive sans confirmation

---

## 6️⃣ MOBILE — Sur iPhone réel (30 min)

### iPhone Safari
- [ ] Ouvrir `app.zevo-one.com` → splash de chargement **sans barre vide en bas**
- [ ] Ajouter à l'écran d'accueil → ouvrir en PWA → fonctionne
- [ ] Login → dashboard charge correctement

### Coach mobile
- [ ] **Sidebar** : padding-top correct (pas overlap avec barre iOS)
- [ ] Hamburger ouvre menu → bottom nav **ne saute pas**
- [ ] **Messages** : pas de swipe parasite, input bar fixe en bas
- [ ] Cliquer une conversation → bottom nav **disparaît** ✅
- [ ] Bouton retour ramène à la liste → bottom nav **revient** ✅
- [ ] Modal nouvelle conversation : handle drag, slide-up, bouton submit visible
- [ ] Tap sur input message → pas de zoom intempestif
- [ ] Toutes les autres pages (clients, programmes, calendar) : pas de swipe horizontal

### Client mobile
- [ ] **Calendrier** : pas de glissement de droite à gauche ✅
- [ ] Workout tracker : plein écran, exit propre
- [ ] Bottom nav reste fixe partout
- [ ] Messages : même comportement que côté coach

### Android Chrome (si tu peux)
- [ ] Mêmes tests que iPhone, surtout safe-area et `100dvh`

---

## 7️⃣ MONITORING — Vérif post-traffic (15 min)

### PostHog (1h après le 1er test live)
- [ ] eu.posthog.com → Activity → events `$pageview` arrivent
- [ ] Ton `user.id` Supabase visible sur les events
- [ ] Email visible dans les properties
- [ ] `$pageleave` capturés
- [ ] Activer DNT dans navigateur → tester → **aucun event** ne remonte

### Sentry
- [ ] Forcer une erreur de test (ex: dans un click handler `throw new Error('test sentry')`)
- [ ] Apparaît dans Sentry Issues sous 1 min
- [ ] User ID attaché à l'erreur
- [ ] Source maps : la stack pointe vers du code lisible (pas du bundle minifié)
- [ ] Mettre un rate limit pour éviter de péter le quota free (5k err/mois)

### Resend (emails)
- [ ] mail-tester.com : envoyer un email d'invit → score > 9/10
- [ ] SPF, DKIM, DMARC tous verts
- [ ] Email d'invit arrive en **inbox** sur Gmail, Outlook, iCloud
- [ ] Lien dans l'email pointe vers prod (pas localhost)

### Vercel logs
- [ ] Aucun warning critique au dernier build
- [ ] Pas de 500 sur les Functions `/api/*` sur les 24h
- [ ] Pas d'env var manquante en runtime

---

## 8️⃣ LÉGAL — Compliance (10 min)

- [ ] **CGU** accessibles depuis footer + accept obligatoire à l'inscription
- [ ] **Politique de confidentialité** mentionne PostHog, Sentry, Stripe, Resend, Supabase
- [ ] **Mentions légales** complètes (raison sociale, SIRET, hébergeur Vercel)
- [ ] **Cookies** : si banner, opt-out fonctionnel ; sinon expliqué dans la PC
- [ ] **Process delete account** documenté (même manuel) pour droit à l'oubli RGPD

---

## 9️⃣ TECHNIQUES — Quick checks finaux (10 min)

```bash
cd "/Users/noasantos/Desktop/Zevo app/zevo"

# Build sans erreur ni warning bloquant
npm run build

# Pas de console.error/warn oubliés
grep -rn "console\." src --include="*.jsx" --include="*.js" | grep -v "// "

# Pas de TODO/FIXME bloquants
grep -rn "TODO\|FIXME\|XXX" src --include="*.jsx" --include="*.js"

# Pas de secret hardcodé
grep -rn "phc_\|sk_\|whsec_\|eyJhbGc" src --include="*.jsx" --include="*.js"
```

- [ ] Build prod réussi (`npm run build`)
- [ ] Bundle size raisonnable (`dist/assets/*.js` < 500kb gzippé pour main chunk)
- [ ] Lighthouse mobile sur login : score > 80
- [ ] Aucun secret hardcodé

---

## 🔟 ROLLBACK PLAN — Au cas où (5 min de prep)

Avant de pousser le bouton :
- [ ] Connaître la commande de rollback Vercel : `Deployments` → ancien deploy → `Promote to production`
- [ ] Avoir un backup DB Supabase récent (Settings → Backups)
- [ ] Avoir Stripe Dashboard prêt à pause les webhooks si besoin
- [ ] Avoir un canal de comm prêt si bug visible (Twitter, email coachs beta)

---

## 🐛 Bugs trouvés (à fixer en batch après les tests)

> Note les bugs ici au fil de l'eau, avec section + ce qui n'a pas marché. Tu fix tout d'un coup à la fin.

### 🔴 Critiques (bloque le launch)
- [ ]
- [ ]

### 🟠 Important (à fixer avant launch ou en hotfix J+1)
- [ ]
- [ ]

### 🟡 Cosmétique / nice to have (post-launch)
- [ ]
- [ ]

---

## 📊 État final

- [ ] **P0 + P1 passent** → tu peux lancer
- [ ] Backup DB fait avant le go-live
- [ ] Annonce prête à publier
- [ ] Date de launch confirmée : __________

---

## 📝 Notes / observations

> Tout ce que tu veux noter en dehors des bugs (idées d'amélioration, points UX à creuser, etc.)



---

**Bon courage pour les tests ! 💪**
