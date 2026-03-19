// Netlify Function — Webhook Stripe
// Gère les événements : checkout.session.completed, customer.subscription.deleted

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { createClient } = require('@supabase/supabase-js')

// Client Supabase côté serveur (service_role pour bypass RLS)
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
    // Vérifie la signature du webhook pour sécurité
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Signature webhook invalide:', err.message)
    return { statusCode: 400, body: `Webhook Error: ${err.message}` }
  }

  // ── Traitement des événements ──

  switch (stripeEvent.type) {
    // Paiement checkout réussi → activer le compte coach
    case 'checkout.session.completed': {
      const session = stripeEvent.data.object
      const customerId = session.customer
      const subscriptionId = session.subscription

      // Récupère les métadonnées du plan depuis la subscription
      let plan = 'starter'
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        plan = subscription.metadata?.plan || 'starter'
      }

      // Cherche le coach par stripe_customer_id ou par l'email de la session
      const email = session.customer_details?.email
      if (!email) {
        console.error('Pas d\'email dans la session checkout')
        break
      }

      // Cherche le profil correspondant
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()

      if (profile) {
        // Met à jour ou crée l'entrée coach
        const { error } = await supabase
          .from('coaches')
          .upsert({
            id: profile.id,
            plan,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            abonnement_actif: true,
          }, { onConflict: 'id' })

        if (error) console.error('Erreur mise à jour coach:', error)

        // Met à jour le rôle en "coach" si besoin
        await supabase
          .from('profiles')
          .update({ role: 'coach' })
          .eq('id', profile.id)

        console.log(`Coach activé: ${email} — plan ${plan}`)
      } else {
        console.error('Profil introuvable pour email:', email)
      }
      break
    }

    // Abonnement supprimé → désactiver le coach
    case 'customer.subscription.deleted': {
      const subscription = stripeEvent.data.object
      const customerId = subscription.customer

      // Désactive le coach associé à ce customer Stripe
      const { error } = await supabase
        .from('coaches')
        .update({ abonnement_actif: false })
        .eq('stripe_customer_id', customerId)

      if (error) {
        console.error('Erreur désactivation coach:', error)
      } else {
        console.log(`Abonnement supprimé pour customer: ${customerId}`)
      }
      break
    }

    // Paiement de renouvellement échoué
    case 'invoice.payment_failed': {
      const invoice = stripeEvent.data.object
      const customerId = invoice.customer
      console.log(`Paiement échoué pour customer: ${customerId}`)
      // Optionnel : envoyer un email de relance via Resend
      break
    }

    default:
      console.log(`Événement non géré: ${stripeEvent.type}`)
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) }
}
