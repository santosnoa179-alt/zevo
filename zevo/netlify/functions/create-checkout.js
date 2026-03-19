// Netlify Function — Crée une session Stripe Checkout
// Installation unique 249€ + abonnement mensuel selon le plan choisi

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

// IDs des produits Stripe — à remplacer par les vrais IDs du Stripe Dashboard
// Pour l'instant : IDs de test (à configurer dans Stripe > Produits)
const PRICE_IDS = {
  // Prix one-shot : installation 249€
  installation: process.env.STRIPE_PRICE_INSTALLATION,
  // Abonnements mensuels récurrents
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  unlimited: process.env.STRIPE_PRICE_UNLIMITED,
}

exports.handler = async (event) => {
  // Seules les requêtes POST sont acceptées
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { plan } = JSON.parse(event.body)

    // Validation du plan
    if (!['starter', 'pro', 'unlimited'].includes(plan)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Plan invalide' }) }
    }

    const subscriptionPriceId = PRICE_IDS[plan]
    const installationPriceId = PRICE_IDS.installation

    if (!subscriptionPriceId || !installationPriceId) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Prix Stripe non configurés. Vérifiez les variables d\'environnement.' }),
      }
    }

    // Crée la session Checkout avec 2 line_items :
    // 1. Installation unique 249€ (one-shot)
    // 2. Abonnement mensuel (récurrent)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        // Installation unique — ajoutée comme frais one-shot à la première facture
        {
          price: installationPriceId,
          quantity: 1,
        },
        // Abonnement récurrent
        {
          price: subscriptionPriceId,
          quantity: 1,
        },
      ],
      // Métadonnées pour identifier le plan dans le webhook
      subscription_data: {
        metadata: { plan },
      },
      success_url: `${process.env.URL}/login?checkout=success&plan=${plan}`,
      cancel_url: `${process.env.URL}/pricing`,
      allow_promotion_codes: true,
    })

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id }),
    }
  } catch (err) {
    console.error('Erreur Stripe Checkout:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
