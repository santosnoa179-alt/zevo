// Vercel Serverless Function — Crée une session Stripe Checkout
// Abonnement mensuel selon le plan choisi (starter / pro / unlimited)
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
    const { plan, email, userId } = req.body

    if (!['starter', 'pro', 'unlimited'].includes(plan)) {
      return res.status(400).json({ error: 'Plan invalide' })
    }

    if (!userId) {
      return res.status(400).json({ error: 'userId requis pour associer l\'abonnement' })
    }

    const subscriptionPriceId = PRICE_IDS[plan]

    if (!subscriptionPriceId) {
      return res.status(500).json({ error: 'Prix Stripe non configuré. Vérifiez les variables d\'environnement.' })
    }

    // Utiliser l'origin de la requête (domaine exact du navigateur)
    // Évite le bug VERCEL_URL qui retourne la preview URL au lieu du domaine principal
    const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '')
    const siteUrl = origin || process.env.NEXT_PUBLIC_SITE_URL || 'https://zevo-one.vercel.app'

    console.log(`[create-checkout] userId: ${userId}, plan: ${plan}, email: ${email || 'N/A'}`)

    const sessionParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        { price: subscriptionPriceId, quantity: 1 },
      ],
      // Metadata sur la subscription (pour subscription.updated / deleted)
      subscription_data: {
        metadata: { plan, supabase_user_id: userId },
      },
      // Metadata sur la session elle-même (pour checkout.session.completed)
      metadata: { plan, supabase_user_id: userId },
      // ID de référence client (lisible directement sur l'objet session)
      client_reference_id: userId,
      success_url: `${siteUrl}/coach/parametres?checkout=success&plan=${plan}`,
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
