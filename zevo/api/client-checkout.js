// Vercel Serverless Function — Checkout client via Stripe Connect
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { offreId, clientId } = req.body

    if (!offreId || !clientId) {
      return res.status(400).json({ error: 'offreId et clientId requis' })
    }

    // Charger l'offre et le coach
    const { data: offre } = await supabase
      .from('offres_coaching')
      .select('*, coaches(stripe_account_id, stripe_onboarding_complete)')
      .eq('id', offreId)
      .single()

    if (!offre) {
      return res.status(404).json({ error: 'Offre introuvable' })
    }

    const stripeAccountId = offre.coaches?.stripe_account_id
    if (!stripeAccountId || !offre.coaches?.stripe_onboarding_complete) {
      return res.status(400).json({ error: 'Coach non connecté à Stripe' })
    }

    const siteUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.URL || 'http://localhost:5173'

    const sessionParams = {
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: offre.prix,
          product_data: {
            name: offre.titre,
            description: offre.description || undefined,
          },
          ...(offre.frequence !== 'unique' ? {
            recurring: {
              interval: offre.frequence === 'mensuel' ? 'month'
                : offre.frequence === 'trimestriel' ? 'month'
                : 'year',
              ...(offre.frequence === 'trimestriel' ? { interval_count: 3 } : {}),
            }
          } : {}),
        },
        quantity: 1,
      }],
      mode: offre.frequence === 'unique' ? 'payment' : 'subscription',
      success_url: `${siteUrl}/app/abonnement?paiement=success`,
      cancel_url: `${siteUrl}/app/abonnement`,
      metadata: {
        offre_id: offreId,
        client_id: clientId,
        coach_id: offre.coach_id,
      },
    }

    const session = await stripe.checkout.sessions.create(
      sessionParams,
      { stripeAccount: stripeAccountId }
    )

    // Créer un paiement en attente
    await supabase
      .from('paiements_clients')
      .insert({
        client_id: clientId,
        coach_id: offre.coach_id,
        offre_id: offreId,
        montant: offre.prix,
        statut: 'en_attente',
        stripe_payment_intent_id: session.id,
      })

    return res.status(200).json({ url: session.url })
  } catch (error) {
    console.error('Erreur client-checkout:', error)
    return res.status(500).json({ error: error.message })
  }
}
