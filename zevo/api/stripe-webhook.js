// Vercel Serverless Function — Webhook Stripe
// Gère : checkout.session.completed, customer.subscription.updated,
//        customer.subscription.deleted, invoice.payment_failed
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

// ── Helper : trouver le profil coach par client_reference_id ou email ──
async function findCoachProfile(session) {
  // 1. Lookup fiable par client_reference_id (= user.id Supabase)
  if (session.client_reference_id) {
    const { data } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', session.client_reference_id)
      .single()
    if (data) return data
    console.warn(`[webhook] client_reference_id ${session.client_reference_id} non trouvé dans profiles`)
  }

  // 2. Fallback par email Stripe
  const email = session.customer_details?.email
  if (!email) {
    console.error('[webhook] Pas d\'email ni de client_reference_id dans la session')
    return null
  }

  const { data } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .single()

  if (!data) {
    console.error(`[webhook] Profil non trouvé pour email: ${email}`)
  }
  return data
}

// ── Helper : mettre à jour ou créer le coach dans Supabase ──
async function upsertCoachSafe(profileId, updates) {
  const { data: existing } = await supabase
    .from('coaches')
    .select('id')
    .eq('id', profileId)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('coaches')
      .update(updates)
      .eq('id', profileId)
    if (error) console.error('[webhook] Erreur update coach:', error)
  } else {
    const { error } = await supabase
      .from('coaches')
      .insert({ id: profileId, ...updates })
    if (error) console.error('[webhook] Erreur insert coach:', error)
  }
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

  try {
    switch (stripeEvent.type) {
      // ── Checkout terminé : activer le coach ──
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object
        const customerId = session.customer
        const subscriptionId = session.subscription

        // Récupérer le plan depuis les metadata de la subscription
        let plan = 'starter'
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          plan = subscription.metadata?.plan || 'starter'
        }

        const profile = await findCoachProfile(session)
        if (!profile) break

        await upsertCoachSafe(profile.id, {
          plan,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          abonnement_actif: true,
        })

        // S'assurer que le rôle est bien "coach"
        await supabase
          .from('profiles')
          .update({ role: 'coach' })
          .eq('id', profile.id)

        console.log(`[webhook] Coach activé: ${profile.email} — plan ${plan}`)
        break
      }

      // ── Subscription mise à jour (changement de plan, upgrade/downgrade) ──
      case 'customer.subscription.updated': {
        const subscription = stripeEvent.data.object
        const newPlan = subscription.metadata?.plan

        if (!newPlan) {
          console.log('[webhook] subscription.updated sans metadata.plan — ignoré')
          break
        }

        const isActive = ['active', 'trialing'].includes(subscription.status)

        const { error } = await supabase
          .from('coaches')
          .update({
            plan: newPlan,
            abonnement_actif: isActive,
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('[webhook] Erreur update subscription:', error)
        } else {
          console.log(`[webhook] Plan mis à jour: ${subscription.id} → ${newPlan} (actif: ${isActive})`)
        }
        break
      }

      // ── Subscription annulée ──
      case 'customer.subscription.deleted': {
        const subscription = stripeEvent.data.object

        const { error } = await supabase
          .from('coaches')
          .update({ abonnement_actif: false, plan: 'starter' })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('[webhook] Erreur delete subscription:', error)
        } else {
          console.log(`[webhook] Subscription annulée: ${subscription.id}`)
        }
        break
      }

      // ── Paiement échoué ──
      case 'invoice.payment_failed': {
        const invoice = stripeEvent.data.object
        console.log(`[webhook] Paiement échoué pour customer: ${invoice.customer}`)

        // Optionnel : marquer le coach comme en retard de paiement
        if (invoice.subscription) {
          await supabase
            .from('coaches')
            .update({ abonnement_actif: false })
            .eq('stripe_subscription_id', invoice.subscription)
        }
        break
      }
    }
  } catch (err) {
    console.error('[webhook] Erreur traitement:', err)
    // Retourner 200 pour éviter que Stripe retry en boucle sur les erreurs de logique
    return res.status(200).json({ received: true, error: err.message })
  }

  return res.status(200).json({ received: true })
}
