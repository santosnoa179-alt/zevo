// Vercel Serverless Function — Webhook Stripe
// Gère : checkout.session.completed, customer.subscription.updated,
//        customer.subscription.deleted, invoice.payment_failed
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// ── Vérification des variables d'environnement au démarrage ──
const REQUIRED_ENV = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'SUPABASE_SERVICE_ROLE_KEY']
const hasSupabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const missingEnv = REQUIRED_ENV.filter(key => !process.env[key])
if (!hasSupabaseUrl) missingEnv.push('SUPABASE_URL ou VITE_SUPABASE_URL')
if (missingEnv.length > 0) {
  console.error(`[stripe-webhook] FATAL: Variables d'environnement manquantes: ${missingEnv.join(', ')}`)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// ── Client Supabase ADMIN (service_role) — bypass RLS ──
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Décoder le JWT pour vérifier le rôle de la clé utilisée
function detectKeyRole(key) {
  if (!key) return 'MISSING'
  try {
    const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString())
    return payload.role || 'unknown'
  } catch {
    return 'invalid_jwt'
  }
}

const keyRole = detectKeyRole(supabaseServiceKey)
console.log(`[stripe-webhook] Supabase URL: ${supabaseUrl ? supabaseUrl.substring(0, 40) + '...' : 'MANQUANTE'}`)
console.log(`[stripe-webhook] Clé Supabase rôle détecté: "${keyRole}"`)

if (keyRole !== 'service_role') {
  console.error(`[stripe-webhook] ⚠️  ERREUR CRITIQUE: La clé SUPABASE_SERVICE_ROLE_KEY a le rôle "${keyRole}" au lieu de "service_role"`)
  console.error(`[stripe-webhook] Vérifiez Vercel > Settings > Environment Variables > SUPABASE_SERVICE_ROLE_KEY`)
  console.error(`[stripe-webhook] La clé service_role se trouve dans Supabase > Settings > API > service_role (secret)`)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Désactiver le body parser de Vercel pour recevoir le raw body
export const config = {
  api: {
    bodyParser: false,
  },
}

// ── Helper : lire le raw body (remplace le package `micro`) ──
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

// ── Helper : trouver le profil coach — 3 stratégies de lookup ──
async function findCoachProfile(session) {
  // Extraire tous les IDs possibles
  const clientRefId = session.client_reference_id
  const metadataId = session.metadata?.supabase_user_id
  const email = session.customer_details?.email

  console.log(`[webhook] findCoachProfile — client_reference_id: ${clientRefId || 'ABSENT'}, metadata.supabase_user_id: ${metadataId || 'ABSENT'}, email: ${email || 'ABSENT'}`)

  // 1. Lookup par client_reference_id
  const supabaseId = clientRefId || metadataId
  if (supabaseId) {
    console.log(`[webhook] Lookup par ID Supabase: ${supabaseId}`)
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('id', supabaseId)
      .maybeSingle()

    if (error) {
      console.error(`[webhook] Erreur lookup ID:`, JSON.stringify(error))
    }
    if (data) {
      console.log(`[webhook] Profil trouvé par ID: ${data.id} (${data.email})`)
      return data
    }
    console.warn(`[webhook] ID ${supabaseId} non trouvé dans profiles`)
  }

  // 2. Fallback par email Stripe
  if (!email) {
    console.error('[webhook] AUCUN identifiant disponible (ni ID, ni email)')
    console.error('[webhook] Session complète:', JSON.stringify({
      id: session.id,
      client_reference_id: clientRefId,
      metadata: session.metadata,
      customer_details: session.customer_details,
      customer: session.customer,
    }))
    return null
  }

  console.log(`[webhook] Fallback lookup par email: ${email}`)
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .maybeSingle()

  if (error) {
    console.error(`[webhook] Erreur lookup email:`, JSON.stringify(error))
  }
  if (!data) {
    console.error(`[webhook] Profil non trouvé pour email: ${email}`)
  } else {
    console.log(`[webhook] Profil trouvé par email: ${data.id} (${data.email})`)
  }
  return data
}

// ── Helper : mettre à jour ou créer le coach dans Supabase ──
async function upsertCoachSafe(profileId, updates) {
  console.log(`[webhook] upsertCoachSafe pour ${profileId}:`, JSON.stringify(updates))

  const { data: existing, error: selectError } = await supabaseAdmin
    .from('coaches')
    .select('id')
    .eq('id', profileId)
    .maybeSingle()

  if (selectError) {
    console.error('[webhook] Erreur select coach:', selectError)
  }

  if (existing) {
    const { error } = await supabaseAdmin
      .from('coaches')
      .update(updates)
      .eq('id', profileId)
    if (error) {
      console.error('[webhook] Erreur UPDATE coach:', error)
      return false
    }
    console.log(`[webhook] Coach ${profileId} mis à jour avec succès`)
  } else {
    const { error } = await supabaseAdmin
      .from('coaches')
      .insert({ id: profileId, ...updates })
    if (error) {
      console.error('[webhook] Erreur INSERT coach:', error)
      return false
    }
    console.log(`[webhook] Coach ${profileId} créé avec succès`)
  }
  return true
}

export default async function handler(req, res) {
  // ── CORS pour les outils de debug ──
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  console.log('[webhook] ── Requête reçue ──')
  console.log(`[webhook] Supabase admin client: URL=${supabaseUrl ? 'OK' : 'MISSING'}, KEY=${supabaseServiceKey ? 'OK' : 'MISSING'}, role=${keyRole}`)

  // ── Vérification env vars ──
  if (missingEnv.length > 0) {
    console.error(`[webhook] Env vars manquantes: ${missingEnv.join(', ')}`)
    return res.status(500).json({ error: `Configuration serveur incomplète: ${missingEnv.join(', ')}` })
  }

  // ── Lecture du raw body ──
  let rawBody
  try {
    rawBody = await getRawBody(req)
    console.log(`[webhook] Raw body reçu: ${rawBody.length} bytes`)
  } catch (err) {
    console.error('[webhook] Erreur lecture raw body:', err.message)
    return res.status(400).json({ error: 'Impossible de lire le body de la requête' })
  }

  // ── Vérification de la signature Stripe ──
  const sig = req.headers['stripe-signature']
  if (!sig) {
    console.error('[webhook] Header stripe-signature absent')
    return res.status(400).json({ error: 'Header stripe-signature manquant' })
  }

  let stripeEvent
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
    console.log(`[webhook] Signature valide — Event: ${stripeEvent.type} (${stripeEvent.id})`)
  } catch (err) {
    console.error('[webhook] Signature invalide:', err.message)
    return res.status(400).json({ error: 'Signature invalide' })
  }

  // ── Traitement de l'événement ──
  try {
    switch (stripeEvent.type) {

      // ════════════════════════════════════════════════════════
      // CHECKOUT TERMINÉ — Activer le coach
      // ════════════════════════════════════════════════════════
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object
        const customerId = session.customer
        const subscriptionId = session.subscription

        console.log(`[webhook] checkout.session.completed — customer: ${customerId}, subscription: ${subscriptionId}`)
        console.log(`[webhook] client_reference_id: ${session.client_reference_id || 'ABSENT'}`)
        console.log(`[webhook] customer_email: ${session.customer_details?.email || 'ABSENT'}`)

        // Récupérer le plan : session.metadata > subscription.metadata > 'starter'
        let plan = session.metadata?.plan || 'starter'
        console.log(`[webhook] Plan depuis session metadata: ${session.metadata?.plan || 'ABSENT'}`)

        if (subscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId)
            const subPlan = subscription.metadata?.plan || subscription.metadata?.supabase_user_id ? subscription.metadata?.plan : null
            if (subPlan) {
              plan = subPlan
              console.log(`[webhook] Plan depuis subscription metadata: ${plan}`)
            }
          } catch (subErr) {
            console.error('[webhook] Erreur récupération subscription:', subErr.message)
          }
        }
        console.log(`[webhook] Plan final: ${plan}`)

        // Trouver le profil coach
        const profile = await findCoachProfile(session)
        if (!profile) {
          console.error('[webhook] ABANDON: profil coach introuvable pour cette session')
          break
        }

        console.log(`[webhook] Profil trouvé: ${profile.id} (${profile.email})`)

        // Mettre à jour / créer le coach
        const success = await upsertCoachSafe(profile.id, {
          plan,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          abonnement_actif: true,
          subscription_status: 'active',
        })

        if (success) {
          // S'assurer que le rôle est bien "coach"
          const { error: roleError } = await supabaseAdmin
            .from('profiles')
            .update({ role: 'coach' })
            .eq('id', profile.id)

          if (roleError) {
            console.error('[webhook] Erreur update role:', roleError)
          }

          console.log(`[webhook] Coach activé: ${profile.email} — plan ${plan}`)
        }
        break
      }

      // ════════════════════════════════════════════════════════
      // SUBSCRIPTION MISE À JOUR (upgrade / downgrade)
      // ════════════════════════════════════════════════════════
      case 'customer.subscription.updated': {
        const subscription = stripeEvent.data.object
        const newPlan = subscription.metadata?.plan

        console.log(`[webhook] subscription.updated — id: ${subscription.id}, plan: ${newPlan || 'ABSENT'}, status: ${subscription.status}`)

        if (!newPlan) {
          console.log('[webhook] subscription.updated sans metadata.plan — ignoré')
          break
        }

        const isActive = ['active', 'trialing'].includes(subscription.status)

        const { error } = await supabaseAdmin
          .from('coaches')
          .update({
            plan: newPlan,
            abonnement_actif: isActive,
            subscription_status: isActive ? 'active' : 'canceled',
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('[webhook] Erreur update subscription:', error)
        } else {
          console.log(`[webhook] Plan mis à jour: ${subscription.id} → ${newPlan} (actif: ${isActive})`)
        }
        break
      }

      // ════════════════════════════════════════════════════════
      // SUBSCRIPTION ANNULÉE
      // ════════════════════════════════════════════════════════
      case 'customer.subscription.deleted': {
        const subscription = stripeEvent.data.object
        console.log(`[webhook] subscription.deleted — id: ${subscription.id}`)

        const { error } = await supabaseAdmin
          .from('coaches')
          .update({ abonnement_actif: false, plan: 'starter', subscription_status: 'canceled' })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('[webhook] Erreur delete subscription:', error)
        } else {
          console.log(`[webhook] Subscription annulée: ${subscription.id}`)
        }
        break
      }

      // ════════════════════════════════════════════════════════
      // PAIEMENT ÉCHOUÉ
      // ════════════════════════════════════════════════════════
      case 'invoice.payment_failed': {
        const invoice = stripeEvent.data.object
        console.log(`[webhook] invoice.payment_failed — customer: ${invoice.customer}, subscription: ${invoice.subscription}`)

        if (invoice.subscription) {
          const { error } = await supabaseAdmin
            .from('coaches')
            .update({ abonnement_actif: false, subscription_status: 'past_due' })
            .eq('stripe_subscription_id', invoice.subscription)

          if (error) {
            console.error('[webhook] Erreur update paiement échoué:', error)
          }
        }
        break
      }

      default:
        console.log(`[webhook] Event non géré: ${stripeEvent.type}`)
    }
  } catch (err) {
    console.error('[webhook] ERREUR CRITIQUE traitement event:', err.message)
    console.error('[webhook] Stack:', err.stack)
    // Retourner 200 pour éviter les retries Stripe infinis sur erreurs de logique
    return res.status(200).json({ received: true })
  }

  console.log('[webhook] ── Traitement terminé avec succès ──')
  return res.status(200).json({ received: true })
}
