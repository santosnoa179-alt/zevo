// Vercel Serverless Function — Crée une session Stripe Checkout
// Abonnement mensuel ou annuel selon le plan choisi (starter / pro / unlimited)
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const PRICE_IDS = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER,
    yearly: process.env.STRIPE_PRICE_STARTER_YEARLY,
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO,
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY,
  },
  unlimited: {
    monthly: process.env.STRIPE_PRICE_UNLIMITED,
    yearly: process.env.STRIPE_PRICE_UNLIMITED_YEARLY,
  },
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Vérifier l'authentification
    const user = await verifyAuth(req)
    if (!user) {
      return res.status(401).json({ error: 'Non autorisé' })
    }

    const { plan, billing = 'monthly', email, userId } = req.body

    if (!['starter', 'pro', 'unlimited'].includes(plan)) {
      return res.status(400).json({ error: 'Plan invalide' })
    }

    if (!['monthly', 'yearly'].includes(billing)) {
      return res.status(400).json({ error: 'Fréquence invalide (monthly ou yearly)' })
    }

    if (!userId) {
      return res.status(400).json({ error: 'userId requis' })
    }

    // Vérifier que userId correspond à l'utilisateur authentifié
    if (user.id !== userId) {
      return res.status(403).json({ error: 'Accès interdit' })
    }

    const subscriptionPriceId = PRICE_IDS[plan]?.[billing]

    if (!subscriptionPriceId) {
      return res.status(500).json({ error: 'Configuration prix manquante' })
    }

    const siteUrl = 'https://zevo-one.vercel.app'

    const sessionParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        { price: subscriptionPriceId, quantity: 1 },
      ],
      subscription_data: {
        metadata: { plan, billing, supabase_user_id: userId },
      },
      metadata: { plan, billing, supabase_user_id: userId },
      client_reference_id: userId,
      success_url: `${siteUrl}/coach/parametres?checkout=success&plan=${plan}`,
      cancel_url: `${siteUrl}/pricing`,
      allow_promotion_codes: true,
    }

    if (email) {
      sessionParams.customer_email = email
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return res.status(200).json({ sessionId: session.id, url: session.url })
  } catch (err) {
    console.error('Erreur Stripe Checkout:', err)
    return res.status(500).json({ error: 'Erreur interne du serveur' })
  }
}
