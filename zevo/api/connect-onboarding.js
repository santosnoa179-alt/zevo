// Vercel Serverless Function — Onboarding Stripe Connect pour les coachs
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { coachId } = req.body

    if (!coachId) {
      return res.status(400).json({ error: 'coachId requis' })
    }

    // Vérifier si le coach a déjà un compte Stripe Connect
    const { data: coach } = await supabase
      .from('coaches')
      .select('stripe_account_id')
      .eq('id', coachId)
      .single()

    let accountId = coach?.stripe_account_id

    // Créer un compte Connect si pas encore fait
    if (!accountId) {
      const account = await stripe.accounts.create({ type: 'standard' })
      accountId = account.id

      await supabase
        .from('coaches')
        .update({ stripe_account_id: accountId })
        .eq('id', coachId)
    }

    // Générer le lien d'onboarding
    const siteUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.URL || 'http://localhost:5173'

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${siteUrl}/coach/parametres`,
      return_url: `${siteUrl}/coach/parametres?stripe_connect=success`,
      type: 'account_onboarding',
    })

    return res.status(200).json({ url: accountLink.url })
  } catch (error) {
    console.error('Erreur connect-onboarding:', error)
    return res.status(500).json({ error: error.message })
  }
}
