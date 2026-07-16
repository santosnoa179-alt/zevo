# Refonte fiche client coach — structure Gymkee

**Date** : 16 juillet 2026
**Statut** : validé section par section avec Noa (structure, Fitness, Nutrition, Santé, Bilans, Facturation, architecture)
**Référence visuelle** : captures Gymkee (fiche client Dwayne Le Roc) + pages fonctionnalités gymkee.com/fr

## Objectif

Donner au coach, dans la fiche client (`CoachClientHub`), le même niveau de suivi que Gymkee :
historique des séances avec détail objectif/résultat, historique nutrition journalier,
données santé, bilans complets (photos + mensurations + planification récurrente),
et facturation par client.

## 1. Structure des onglets

Nouvelle barre d'onglets de la fiche client (ordre Gymkee + spécificités Zevo conservées) :

| # | Onglet | Contenu | Origine |
|---|--------|---------|---------|
| 1 | Activité | Vue d'ensemble actuelle (score bien-être, programmes, dernières actions) | Renommage de « Vue d'ensemble » |
| 2 | Fitness | Contenu Sport actuel (programme, semaine) + **historique des séances** | Fusion Sport + nouveau |
| 3 | Nutrition | Plan actuel + **historique journalier** | Fusion Nutrition + nouveau |
| 4 | Santé | Poids, sommeil, humeur, activité (graphiques) | Nouveau (données existantes) |
| 5 | Bilans | Système complet bilans | Nouveau |
| 6 | Habitudes | Inchangé | Existant |
| 7 | Objectifs | Inchangé (différenciateur Zevo, objectifs chiffrés créés par le coach) | Existant |
| 8 | Calendrier | Inchangé (drag & drop séances) | Existant |
| 9 | Infos personnelles | Onglet Infos actuellement caché, redevient visible | Existant |
| 10 | Facturation | Facturation du client | Nouveau |

L'onglet caché `suivi` reste fusionné dans Activité. L'onglet caché `partage` reste accessible via l'icône header.

## 2. Onglet Fitness — historique des séances

### Liste
- Colonnes : Date (+ heure début → fin), Durée, Nom, Programme lié (cliquable → ouvre le programme), Nb exercices, Statut.
- Statuts calculés : `Complétée` (vert, `is_completed = true`) / `Manquée` (rouge, `date_prevue < aujourd'hui` et non complétée) / `À venir` (neutre).
- Filtre par statut + recherche par nom. Tri date décroissante. Pagination 20/page.
- Sources : `seances` (+ `sport_programmes`/`programmes` pour le nom du programme), count `seance_exercices`.

### Détail (modal au clic)
- En-tête : nom, programme, date, durée, nb exercices, calories estimées.
- Formulaire de fin de séance : réponses du formulaire post-séance existant (`formulaire_reponses.seance_id`) — intensité, satisfaction, commentaire client. Section absente si pas de réponse.
- Exercices : pour chaque exercice, chaque set affiche **Objectif** (charge/reps prévus, `seance_exercices`) vs **Résultat** (réel, `seance_exercice_logs` : `charge_kg_reel`, `reps_reel`, `rpe_percu`). Coche verte par set si résultat ≥ objectif. Notes client si présentes.

### Nouveau tracking côté client (WorkoutTrackerPage)
- `seances.started_at` : enregistré au lancement de la séance.
- Durée = `completed_at − started_at`, calculée à la complétion.
- Calories estimées : formule MET simple (durée × intensité), stockée dans `seances.metadata.calories_estimees`.

### Migration DB
```sql
ALTER TABLE seances ADD COLUMN IF NOT EXISTS started_at timestamptz;
```

## 3. Onglet Nutrition — historique journalier

### Liste
- Colonnes : Date, Nom du plan actif ce jour-là, Calories / Glucides / Protéines / Lipides en barres de progression (réel vs objectif du plan), nb repas enregistrés (points verts).
- Filtre Passé / Aujourd'hui / Tout. Tri par date. Pagination.
- Sources : `nutrition_client_logs` (réels + `repas_detail` JSONB) croisé avec les cibles du plan actif (`nutrition_programmes`/phases, fallback plans legacy).

### Détail (modal au clic)
- En-tête : date, plan, badge « Fait », X repas enregistrés.
- Résumé : objectif kcal vs consommé (+ écart), barres macros avec cibles.
- Détail des repas depuis `repas_detail` : type, statut Enregistré, aliments, macros.
- Ressenti + notes client si présents.
- **Pas de bilan énergétique brûlé/net en v1** (pas de wearables).

### Migration DB : aucune.

## 4. Onglet Santé

- 4 cartes graphiques (Recharts, déjà dans le projet) sur 30/90 jours : Poids (`suivi_poids`), Sommeil (module client existant), Humeur (module client existant), Activité (sport libre loggé).
- Stat cards « dernière valeur » en haut.
- Pas de sync wearable en v1.
- Migration DB : aucune.

## 5. Onglet Bilans — version complète Gymkee

### 5.1 Modèles de bilan (coach)
- Config d'un modèle : mensurations cochées dans la liste standard (poids, % masse grasse, tour de bras, poitrine, taille, hanches, cuisses, mollets), photos on/off (face/dos/profil), questions personnalisées (texte libre ou note 1-10).
- Modèles réutilisables entre clients.

### 5.2 Planification récurrente
- Assignation modèle → client avec fréquence : ponctuel / hebdo / bimensuel / mensuel + date de début.
- Génération **à l'ouverture de l'app client** : les planifications dont `prochaine_date <= aujourd'hui` créent un bilan « En attente », notification au client (système de notifs existant), puis avancement de `prochaine_date` selon la fréquence. Pas de cron externe en v1.
- Bilan « En attente » visible côté client ET coach.

### 5.3 Remplissage
- Client : depuis son app (`BilansPage`) — upload 3 photos + mesures + réponses questions.
- Coach : peut remplir à la place du client depuis la fiche (même formulaire), `rempli_par = 'coach'`.
- Photos : bucket Storage privé `bilans`, RLS — visibles uniquement par le client et son coach.

### 5.4 Consultation (fiche client coach)
- Vue chronologique (« Bilan Mois 3 — 06/03/2026 ») : photos + tableau mensurations + réponses.
- Comparaison avant/après : sélection de 2 bilans → photos côte à côte par type + delta des mesures (+2 cm bras, −3 kg…).
- Mini-courbes d'évolution par mesure.

### 5.5 Migrations DB
```sql
-- Modèles
CREATE TABLE bilan_modeles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  nom text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}',  -- {mesures: [...], photos: bool, questions: [{id, label, type}]}
  created_at timestamptz DEFAULT now()
);

-- Planifications
CREATE TABLE bilan_planifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  modele_id uuid NOT NULL REFERENCES bilan_modeles(id) ON DELETE CASCADE,
  frequence text NOT NULL CHECK (frequence IN ('ponctuel','hebdo','bimensuel','mensuel')),
  prochaine_date date,
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Bilans
CREATE TABLE bilans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  modele_id uuid REFERENCES bilan_modeles(id) ON DELETE SET NULL,
  planification_id uuid REFERENCES bilan_planifications(id) ON DELETE SET NULL,
  date_bilan date NOT NULL DEFAULT current_date,
  statut text NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente','complete')),
  rempli_par text CHECK (rempli_par IN ('client','coach')),
  mesures jsonb DEFAULT '{}',    -- {poids: 84, tour_bras: 40, ...}
  reponses jsonb DEFAULT '{}',   -- {question_id: valeur}
  notes text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Photos
CREATE TABLE bilan_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bilan_id uuid NOT NULL REFERENCES bilans(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('face','dos','profil')),
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```
+ RLS sur les 4 tables (coach : ses lignes via `coach_id` ; client : ses lignes via `client_id`, lecture seule sur modèles/planifications) + bucket Storage `bilans` privé avec policies équivalentes.

## 6. Onglet Facturation

Consultation + raccourcis (pas de duplication de la logique de `CoachAbonnementsPage`) :
- 3 cartes : Total dépensé (somme `paiements_clients` réussis), Abonnement actif (offre + montant + prochaine facturation), Prochain paiement.
- Tableau Abonnements : produit / statut / montant / prochaine facturation / démarré le (`abonnements_clients` + `offres_coaching`).
- Tableau Transactions : montant / statut / description / date (`paiements_clients`).
- Tableau Factures : montant / statut / date / téléchargement (`factures`).
- Boutons « Créer un paiement / une facture / un abonnement » → deep-link vers l'onglet Abonnements global pré-rempli avec le client.
- Moyen de paiement (carte ••••) : affiché uniquement si récupérable via l'API Stripe, sinon omis en v1.
- Gestion des accès par module : **hors scope v1** (rejoint la feature App Builder du plan Unlimited).
- Migration DB : aucune.

## 7. Architecture fichiers

`CoachClientHub.jsx` fait 7 722 lignes : tout nouveau code va dans des fichiers séparés.

```
src/pages/coach/client-hub/
  FitnessHistorySection.jsx     # liste historique + SeanceDetailModal
  NutritionHistorySection.jsx   # liste historique + NutritionDayModal
  SanteTab.jsx
  BilansTab.jsx                 # + BilanDetailModal, BilanCompareModal, BilanModeleEditor
  FacturationTab.jsx
src/pages/client/
  BilansPage.jsx                # liste bilans en attente/historique + formulaire de remplissage
```

Le hub importe ces composants ; il ne grossit que de quelques lignes (rendu des onglets).
Thème : composants coach en orange Zevo ; `BilansPage` client suit le white-label (`--color-primary`).

## 8. Ordre de livraison

Chaque étape est testable et commitable indépendamment :

1. **Restructuration des onglets** — renommages, ordre Gymkee, Infos visible (petit commit).
2. **Fitness** — historique + détail + tracking durée/`started_at` côté WorkoutTracker.
3. **Nutrition** — historique + détail.
4. **Facturation**.
5. **Santé**.
6. **Bilans** — DB + modèles + planification + remplissage client/coach + comparaison.

## Gestion des erreurs

- Tables potentiellement absentes en prod (`seance_exercice_logs`, `nutrition_client_logs`) : requêtes en try/catch avec section vide + message discret, comme le pattern existant du hub (`console.warn` + fallback).
- Séances sans logs de sets : le détail affiche l'objectif seul avec mention « non renseigné ».
- Jours nutrition sans plan actif : barres sans cible (valeur brute seule).
- Upload photos : limite 10 Mo/photo, formats jpg/png/webp, compression côté client avant upload.

## Tests

- Vérification en preview via les sessions coach/client magiclink (méthode habituelle documentée dans SESSION-README).
- Scénario complet : client lance une séance → complète → coach voit l'historique avec durée et objectif/résultat ; client logge nutrition → coach voit le jour ; coach crée modèle bilan + planification → client reçoit, remplit avec photos → coach consulte + compare.
