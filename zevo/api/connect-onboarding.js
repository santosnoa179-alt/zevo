// Vercel Serverless Function — Onboarding Stripe Connect pour les coachs
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ALLOWED_ORIGINS = [
  'https://zevo-one.vercel.app',
  'https://www.zevo-one.vercel.app',
  process.env.NEXT_PUBLIC_SITE_URL,
].filter(Boolean)

function setCors(req, res) {
  const origin = req.headers.origin
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

async function verifyAuth(req) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

export default async function handler(req, res) {
  setCors(req, res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Vérifier l'authentification
    const user = await verifyAuth(req)
    if (!user) {
      return res.status(401).json({ error: 'Non autorisé' })
    }

    // action: 'link' (défaut) = crée un account link pour l'onboarding
    // action: 'sync'           = vérifie l'état du compte Stripe, met à jour la DB
    // (fusionné ici au lieu d'un endpoint séparé pour rester sous la limite
    //  de 12 Serverless Functions du plan Vercel Hobby.)
    const { coachId, action = 'link' } = req.body

    if (!coachId) {
      return res.status(400).json({ error: 'coachId requis' })
    }

    // Vérifier que le coach est bien l'utilisateur authentifié
    if (user.id !== coachId) {
      return res.status(403).json({ error: 'Accès interdit' })
    }

    // ─────────────────────────────────────────────────────────────
    // ACTION: sync
    // Vérifie en temps réel l'état du compte Stripe et sync la DB.
    // Utilisé au retour d'onboarding (return_url) pour éviter d'attendre
    // le webhook account.updated.
    // ─────────────────────────────────────────────────────────────
    if (action === 'sync') {
      const { data: coachSync } = await supabase
        .from('coaches')
        .select('stripe_account_id, stripe_onboarding_complete')
        .eq('id', coachId)
        .maybeSingle()

      if (!coachSync?.stripe_account_id) {
        return res.status(400).json({
          connected: false,
          error: 'Aucun compte Stripe Connect associé',
        })
      }

      const account = await stripe.accounts.retrieve(coachSync.stripe_account_id)
      const isReady = account.details_submitted && account.charges_enabled

      if (isReady !== coachSync.stripe_onboarding_complete) {
        await supabase
          .from('coaches')
          .update({ stripe_onboarding_complete: isReady })
          .eq('id', coachId)
      }

      return res.status(200).json({
        connected: isReady,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        requirements: account.requirements?.currently_due || [],
      })
    }

    // ─────────────────────────────────────────────────────────────
    // ACTION: link (défaut)
    // Crée un compte Stripe Connect si besoin, puis génère un
    // account link pour l'onboarding Stripe.
    // ─────────────────────────────────────────────────────────────

    // Vérifier si le coach a déjà un compte Stripe Connect
    // maybeSingle() évite de crash si la row coach n'existe pas encore
    const { data: coach, error: coachFetchError } = await supabase
      .from('coaches')
      .select('stripe_account_id')
      .eq('id', coachId)
      .maybeSingle()

    if (coachFetchError) {
      console.error('[connect-onboarding] fetch coach error:', coachFetchError)
      return res.status(500).json({ error: 'Impossible de lire la fiche coach' })
    }

    let accountId = coach?.stripe_account_id

    // Créer un compte Connect si pas encore fait
    if (!accountId) {
      const account = await stripe.accounts.create({ type: 'standard' })
      accountId = account.id

      // upsert au lieu d'update : si la row coaches n'existe pas encore
      // (cas rare où le signup n'a pas fini de l'insérer), on la crée.
      const { error: upsertError } = await supabase
        .from('coaches')
        .upsert(
          { id: coachId, stripe_account_id: accountId },
          { onConflict: 'id' }
        )

      if (upsertError) {
        console.error('[connect-onboarding] upsert coach error:', upsertError)
        // Critical : si on ne peut pas sauver l'account_id, on annule l'account
        // Stripe pour pas laisser un account orphelin en prod.
        try { await stripe.accounts.del(accountId) } catch {}
        return res.status(500).json({ error: 'Impossible de sauvegarder le compte Stripe' })
      }
    }

    // URL de retour : utilise l'origin de la requête (app.zevo-one.com en prod,
    // localhost:5173 en dev, etc.) au lieu d'une valeur hardcodée qui pointait
    // sur l'ancien domaine zevo-one.vercel.app.
    const origin = req.headers.origin
    const siteUrl = origin && /^https?:\/\/(.*\.)?(zevo-one\.com|zevo-one\.vercel\.app|localhost(:\d+)?)$/.test(origin)
      ? origin
      : 'https://app.zevo-one.com'

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${siteUrl}/coach/parametres`,
      return_url: `${siteUrl}/coach/parametres?stripe_connect=success`,
      type: 'account_onboarding',
    })

    return res.status(200).json({ url: accountLink.url })
  } catch (error) {
    console.error('Erreur connect-onboarding:', error)
    return res.status(500).json({ error: 'Erreur interne du serveur' })
  }
}
