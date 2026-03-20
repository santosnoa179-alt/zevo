// Netlify Function — Webhook Stripe Connect
// Gère les événements liés aux paiements sur les comptes Connect des coachs

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const sig = event.headers['stripe-signature']
  let stripeEvent

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Erreur signature webhook Connect:', err.message)
    return { statusCode: 400, body: `Webhook Error: ${err.message}` }
  }

  try {
    switch (stripeEvent.type) {
      // ── Paiement unique réussi ──
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object
        const { client_id, coach_id, offre_id } = session.metadata || {}

        if (client_id && coach_id) {
          await supabase
            .from('paiements_clients')
            .update({
              statut: 'paye',
              date_paiement: new Date().toISOString(),
              stripe_payment_intent_id: session.payment_intent || session.id,
            })
            .eq('stripe_payment_intent_id', session.id)
        }
        break
      }

      // ── Paiement d'abonnement réussi ──
      case 'invoice.payment_succeeded': {
        const invoice = stripeEvent.data.object
        // Les métadonnées sont dans la subscription
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription,
            { stripeAccount: stripeEvent.account }
          )
          const { client_id, coach_id, offre_id } = subscription.metadata || {}

          if (client_id && coach_id) {
            await supabase
              .from('paiements_clients')
              .insert({
                client_id,
                coach_id,
                offre_id: offre_id || null,
                montant: invoice.amount_paid,
                statut: 'paye',
                stripe_payment_intent_id: invoice.payment_intent,
                date_paiement: new Date().toISOString(),
              })
          }
        }
        break
      }

      // ── Paiement échoué ──
      case 'payment_intent.payment_failed': {
        const pi = stripeEvent.data.object
        await supabase
          .from('paiements_clients')
          .update({ statut: 'echoue' })
          .eq('stripe_payment_intent_id', pi.id)
        break
      }

      // ── Compte Connect activé ──
      case 'account.updated': {
        const account = stripeEvent.data.object
        if (account.charges_enabled && account.details_submitted) {
          // Trouver le coach par stripe_account_id et marquer onboarding complete
          await supabase
            .from('coaches')
            .update({ stripe_onboarding_complete: true })
            .eq('stripe_account_id', account.id)
        }
        break
      }
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) }
  } catch (error) {
    console.error('Erreur traitement webhook Connect:', error)
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
}
