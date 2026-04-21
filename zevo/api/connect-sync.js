// Vercel Serverless Function — Sync du statut Stripe Connect
// Appelée au retour d'onboarding (return_url) pour vérifier en temps réel
// que le compte Stripe est bien prêt à recevoir des paiements, puis mettre
// à jour coaches.stripe_onboarding_complete en DB.
//
// Sans ça, le webhook account.updated peut mettre plusieurs secondes à
// arriver, le coach clique "rafraichir" et l'app dit encore "non connecté".

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

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
    const user = await verifyAuth(req)
    if (!user) return res.status(401).json({ error: 'Non autorisé' })

    // Récupère l'account_id du coach
    const { data: coach } = await supabase
      .from('coaches')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', user.id)
      .maybeSingle()

    if (!coach?.stripe_account_id) {
      return res.status(400).json({
        error: 'Aucun compte Stripe Connect associé',
        connected: false,
      })
    }

    // Récupère l'état actuel du compte chez Stripe
    const account = await stripe.accounts.retrieve(coach.stripe_account_id)

    // Un compte est "pret" quand il a soumis les infos requises et peut
    // recevoir des charges + faire des payouts.
    const isReady = account.details_submitted && account.charges_enabled

    // Synchronise le flag en DB si change
    if (isReady !== coach.stripe_onboarding_complete) {
      await supabase
        .from('coaches')
        .update({ stripe_onboarding_complete: isReady })
        .eq('id', user.id)
    }

    return res.status(200).json({
      connected: isReady,
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      requirements: account.requirements?.currently_due || [],
    })
  } catch (error) {
    console.error('[connect-sync] error:', error)
    return res.status(500).json({ error: 'Erreur interne' })
  }
}
