// Vercel Serverless Function — Crée une session Stripe Checkout
// Installation unique 249€ + abonnement mensuel selon le plan choisi
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  unlimited: process.env.STRIPE_PRICE_UNLIMITED,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { plan, email } = req.body

    if (!['starter', 'pro', 'unlimited'].includes(plan)) {
      return res.status(400).json({ error: 'Plan invalide' })
    }

    const subscriptionPriceId = PRICE_IDS[plan]

    if (!subscriptionPriceId) {
      return res.status(500).json({ error: 'Prix Stripe non configuré. Vérifiez les variables d\'environnement.' })
    }

    const siteUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.URL || 'http://localhost:5173'

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

    return res.status(200).json({ sessionId: session.id, url: session.url })
  } catch (err) {
    console.error('Erreur Stripe Checkout:', err)
    return res.status(500).json({ error: err.message })
  }
}
