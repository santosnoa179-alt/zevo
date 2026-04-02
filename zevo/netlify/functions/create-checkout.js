// Netlify Function — Crée une session Stripe Checkout (abonnement mensuel)

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  unlimited: process.env.STRIPE_PRICE_UNLIMITED,
}

const VALID_PLANS = ['starter', 'pro', 'unlimited']

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
    const { plan, email } = JSON.parse(event.body)

    if (!VALID_PLANS.includes(plan)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Plan invalide' }) }
    }

    const subscriptionPriceId = PRICE_IDS[plan]

    if (!subscriptionPriceId) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Prix Stripe non configuré. Vérifiez les variables d\'environnement.' }),
      }
    }

    const siteUrl = process.env.URL || 'http://localhost:5173'

    const sessionParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        { price: subscriptionPriceId, quantity: 1 },
      ],
      subscription_data: {
        metadata: { plan },
      },
      success_url: `${siteUrl}/login?checkout=success&plan=${plan}`,
      cancel_url: `${siteUrl}/pricing`,
      allow_promotion_codes: true,
    }

    // Pré-remplir l'email si disponible
    if (email) {
      sessionParams.customer_email = email
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ sessionId: session.id, url: session.url }),
    }
  } catch (err) {
    console.error('Erreur Stripe Checkout:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
