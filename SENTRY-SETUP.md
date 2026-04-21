# Sentry — Setup guide

Tu as 2 projets Sentry à créer (un pour chaque app). Ils ont des DSN différentes.

## 1. Créer ton compte Sentry (2 min)

1. Va sur [sentry.io](https://sentry.io/signup/)
2. Inscription gratuite — choisis "Team Plan" (free jusqu'à 5000 erreurs/mois)
3. Saute les étapes d'onboarding initial (tu vas créer les projets manuellement)

## 2. Créer le projet pour l'app (zevo)

1. Dans Sentry → **Projects** → **Create Project**
2. Platform : **React**
3. Alert frequency : "On every new issue"
4. Project name : `zevo-app`
5. Team : `#zevo` (défaut)
6. **Create project**
7. Sentry te montre une page "Configure SDK" → **copie la DSN** (format : `https://abc123@o456789.ingest.sentry.io/1234567`)

### Ajouter la DSN à ton env

Sur **Vercel** (zevo app — si déployé via Vercel) ou **Netlify** (selon ton déploiement actuel) :

```
VITE_SENTRY_DSN=https://abc123@o456789.ingest.sentry.io/1234567
```

En local aussi (optionnel, pour tester) :
```bash
cd zevo
echo "VITE_SENTRY_DSN=https://abc123@o456789.ingest.sentry.io/1234567" >> .env.local
```

## 3. Créer le projet pour la landing (zevo-marketing)

1. Dans Sentry → **Projects** → **Create Project**
2. Platform : **Next.js**
3. Project name : `zevo-marketing`
4. **Create project**
5. Copie la DSN

### Variables à ajouter sur Vercel (projet `zevo-marketing`)

```
NEXT_PUBLIC_SENTRY_DSN=https://xyz789@o456789.ingest.sentry.io/9876543
SENTRY_ORG=<ton-org-slug-sentry>        # visible dans l'URL sentry.io : /organizations/<org-slug>/
SENTRY_PROJECT=zevo-marketing
SENTRY_AUTH_TOKEN=<token>               # voir étape suivante
```

### Générer un SENTRY_AUTH_TOKEN (pour upload automatique des sourcemaps)

1. Dans Sentry → **Settings** (icône engrenage haut droit) → **Developer Settings** → **Auth Tokens**
2. **Create New Token**
3. Nom : "vercel-sourcemaps"
4. Scopes : `project:releases` + `org:read`
5. **Create**
6. Copie le token → ajoute-le dans Vercel comme `SENTRY_AUTH_TOKEN`

**Pourquoi les sourcemaps ?** Sans elles, Sentry te montre des stack traces minifiées (`t.ii` au lieu de `handleSubmit`). Avec elles, tu vois le vrai code source avec noms de fonctions et numéros de ligne exacts.

## 4. Redeploy

Push un commit vide ou juste redéploie depuis Vercel. Une fois en ligne, teste :

### Tester que Sentry capte bien

**App zevo** : ouvre la DevTools console sur l'app en prod et tape :
```js
throw new Error('Test Sentry depuis zevo')
```
Dans 30 sec max, tu dois voir l'erreur dans Sentry → Issues.

**Landing zevo-marketing** : pareil :
```js
throw new Error('Test Sentry depuis zevo-marketing')
```

## 5. Notifications

Dans Sentry → **Alerts** → configure pour recevoir :
- Email sur **nouvelle erreur** (first seen)
- Email sur **pic de fréquence** (regression)
- Optionnel : Slack webhook pour ton serveur privé

## Ce que Sentry capte automatiquement

### Dans `zevo` (app React — Vite)
- ✅ Toutes les erreurs JavaScript non catchées
- ✅ Erreurs dans les ErrorBoundary React (fallback UI propre)
- ✅ Performance transactions (10% sample en prod)
- ✅ Session Replay (10% des sessions, 100% des sessions avec erreur)
- ✅ User context attaché automatiquement après login (via `useAuth`)

### Dans `zevo-marketing` (Next.js App Router)
- ✅ Erreurs client-side
- ✅ Erreurs Server Components / Server Actions / Route Handlers
- ✅ Erreurs edge runtime (middleware)
- ✅ Performance transactions
- ✅ Session Replay
- ✅ Sourcemaps uploadées à chaque build (si `SENTRY_AUTH_TOKEN` configuré)

## Ce qui est désactivé si `DSN` n'est pas configurée

Tout. Si `VITE_SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` sont vides (dev local par ex), Sentry ne charge rien, ne fait aucun réseau, ne ralentit rien. **Zéro impact perf**.

## Coût

- Plan **Developer** (free) : 5 000 erreurs + 10 000 transactions + 50 session replays par mois. Suffisant pour toi tant que t'as moins de quelques centaines d'utilisateurs actifs.
- Plan **Team** (29$/mois) : 50k erreurs + 100k transactions + 500 replays. À upgrade quand tu passes les 5k erreurs/mois.
