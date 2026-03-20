// Netlify Function — Checkout client via Stripe Connect
// Le paiement va directement sur le compte du coach

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { offreId, clientId } = JSON.parse(event.body)

    if (!offreId || !clientId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'offreId et clientId requis' }) }
    }

    // Charger l'offre et le coach
    const { data: offre } = await supabase
      .from('offres_coaching')
      .select('*, coaches(stripe_account_id, stripe_onboarding_complete)')
      .eq('id', offreId)
      .single()

    if (!offre) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Offre introuvable' }) }
    }

    const stripeAccountId = offre.coaches?.stripe_account_id
    if (!stripeAccountId || !offre.coaches?.stripe_onboarding_complete) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Coach non connecté à Stripe' }) }
    }

    const siteUrl = process.env.URL || 'http://localhost:5173'

    // Créer la session Checkout sur le compte Connect du coach
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

    // Créer la session sur le compte Connect du coach
    const session = await stripe.checkout.sessions.create(
      sessionParams,
      { stripeAccount: stripeAccountId }
    )

    // Créer un paiement en attente dans Supabase
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: session.url }),
    }
  } catch (error) {
    console.error('Erreur client-checkout:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    }
  }
}
