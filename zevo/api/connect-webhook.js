// Vercel Serverless Function — Webhook Stripe Connect
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Désactiver le body parser de Vercel pour les webhooks Stripe
export const config = {
  api: {
    bodyParser: false,
  },
}

// Helper : lire le raw body (remplace le package `micro`)
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sig = req.headers['stripe-signature']
  if (!sig) {
    return res.status(400).json({ error: 'Header stripe-signature manquant' })
  }

  let stripeEvent

  try {
    const rawBody = await getRawBody(req)
    console.log(`[connect-webhook] Raw body reçu: ${rawBody.length} bytes`)
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET
    )
    console.log(`[connect-webhook] Event: ${stripeEvent.type} (${stripeEvent.id})`)
  } catch (err) {
    console.error('[connect-webhook] Signature invalide:', err.message)
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  try {
    switch (stripeEvent.type) {
      // Paiement réussi (checkout)
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object
        const { client_id, coach_id } = session.metadata || {}

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

      // Paiement d'abonnement récurrent réussi
      case 'invoice.payment_succeeded': {
        const invoice = stripeEvent.data.object
        if (invoice.subscription && invoice.payment_intent) {
          // Idempotence : vérifier si ce paiement existe déjà
          const { data: existing } = await supabase
            .from('paiements_clients')
            .select('id')
            .eq('stripe_payment_intent_id', invoice.payment_intent)
            .maybeSingle()

          if (existing) {
            console.log(`Paiement déjà enregistré: ${invoice.payment_intent}`)
            break
          }

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

      // Paiement échoué
      case 'payment_intent.payment_failed': {
        const pi = stripeEvent.data.object
        await supabase
          .from('paiements_clients')
          .update({ statut: 'echoue' })
          .eq('stripe_payment_intent_id', pi.id)
        break
      }

      // Compte Connect activé
      case 'account.updated': {
        const account = stripeEvent.data.object
        if (account.charges_enabled && account.details_submitted) {
          await supabase
            .from('coaches')
            .update({ stripe_onboarding_complete: true })
            .eq('stripe_account_id', account.id)
        }
        break
      }
    }

    return res.status(200).json({ received: true })
  } catch (error) {
    console.error('Erreur traitement webhook Connect:', error)
    return res.status(500).json({ error: error.message })
  }
}
