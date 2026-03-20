// Vercel Serverless Function — Webhook Stripe
// Gère : checkout.session.completed, customer.subscription.deleted, invoice.payment_failed
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { buffer } from 'micro'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Désactiver le body parser pour les webhooks Stripe
export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed')
  }

  const sig = req.headers['stripe-signature']
  let stripeEvent

  try {
    const rawBody = await buffer(req)
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Signature webhook invalide:', err.message)
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  switch (stripeEvent.type) {
    case 'checkout.session.completed': {
      const session = stripeEvent.data.object
      const customerId = session.customer
      const subscriptionId = session.subscription

      let plan = 'starter'
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        plan = subscription.metadata?.plan || 'starter'
      }

      const email = session.customer_details?.email
      if (!email) {
        console.error('Pas d\'email dans la session checkout')
        break
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()

      if (profile) {
        await supabase
          .from('coaches')
          .upsert({
            id: profile.id,
            plan,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            abonnement_actif: true,
          }, { onConflict: 'id' })

        await supabase
          .from('profiles')
          .update({ role: 'coach' })
          .eq('id', profile.id)

        console.log(`Coach activé: ${email} — plan ${plan}`)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = stripeEvent.data.object
      await supabase
        .from('coaches')
        .update({ abonnement_actif: false })
        .eq('stripe_customer_id', subscription.customer)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = stripeEvent.data.object
      console.log(`Paiement échoué pour customer: ${invoice.customer}`)
      break
    }
  }

  return res.status(200).json({ received: true })
}
