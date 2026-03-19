// Netlify Function — Crée un lien vers le Stripe Customer Portal
// Permet au coach de gérer son abonnement (changer de plan, annuler, voir les factures)

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { customerId } = JSON.parse(event.body)

    if (!customerId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'customerId requis' }) }
    }

    // Crée une session Customer Portal
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.URL}/coach/parametres`,
    })

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    }
  } catch (err) {
    console.error('Erreur Customer Portal:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
