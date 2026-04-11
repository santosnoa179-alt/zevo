// Vercel Serverless Function — Webhook Stripe Connect
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
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

// ─────────────────────────────────────────────────────────────
// Helper : génère un numéro de facture unique par coach et par année
// Format : FAC-YYYY-NNNN (NNNN incrémenté par coach)
// ─────────────────────────────────────────────────────────────
async function generateNumeroFacture(coachId) {
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from('factures')
    .select('id', { count: 'exact', head: true })
    .eq('coach_id', coachId)
    .gte('date_emission', `${year}-01-01`)
    .lt('date_emission', `${year + 1}-01-01`)
  const nextNum = (count || 0) + 1
  return `FAC-${year}-${String(nextNum).padStart(4, '0')}`
}

// ─────────────────────────────────────────────────────────────
// Helper : crée une facture si elle n'existe pas déjà (idempotent)
// ─────────────────────────────────────────────────────────────
async function createFactureIfMissing({ coachId, clientId, paiementId, offreId, montant, stripeInvoiceId }) {
  if (!coachId) return null

  // Idempotence : si déjà créée pour ce paiement ou stripe_invoice, on skip
  if (paiementId) {
    const { data: existing } = await supabase
      .from('factures')
      .select('id')
      .eq('paiement_id', paiementId)
      .maybeSingle()
    if (existing) return existing.id
  }
  if (stripeInvoiceId) {
    const { data: existing } = await supabase
      .from('factures')
      .select('id')
      .eq('stripe_invoice_id', stripeInvoiceId)
      .maybeSingle()
    if (existing) return existing.id
  }

  const numero = await generateNumeroFacture(coachId)
  const { data, error } = await supabase
    .from('factures')
    .insert({
      numero,
      coach_id: coachId,
      client_id: clientId || null,
      paiement_id: paiementId || null,
      offre_id: offreId || null,
      montant,
      statut: 'payee',
      stripe_invoice_id: stripeInvoiceId || null,
      date_emission: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('[connect-webhook] Erreur création facture:', error.message)
    return null
  }
  console.log(`[connect-webhook] Facture ${numero} créée (${data.id})`)
  return data.id
}

// ─────────────────────────────────────────────────────────────
// Helper : upsert d'un abonnement client depuis une subscription Stripe
// ─────────────────────────────────────────────────────────────
async function upsertAbonnement({ subscription, coachId, clientId, offreId, stripeAccount }) {
  if (!coachId || !clientId || !subscription?.id) return

  // Montant : récupéré depuis le premier item
  const item = subscription.items?.data?.[0]
  const montant = item?.price?.unit_amount || 0
  const interval = item?.price?.recurring?.interval
  const intervalCount = item?.price?.recurring?.interval_count || 1

  let frequence = 'mensuel'
  if (interval === 'year') frequence = 'annuel'
  else if (interval === 'month' && intervalCount === 3) frequence = 'trimestriel'
  else if (interval === 'month') frequence = 'mensuel'

  let statut = 'actif'
  if (subscription.status === 'canceled') statut = 'annule'
  else if (subscription.status === 'paused') statut = 'en_pause'
  else if (subscription.status === 'unpaid' || subscription.status === 'past_due') statut = 'expire'

  // Check si existant
  const { data: existing } = await supabase
    .from('abonnements_clients')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle()

  const row = {
    client_id: clientId,
    coach_id: coachId,
    offre_id: offreId || null,
    montant,
    frequence,
    statut,
    stripe_subscription_id: subscription.id,
    date_prochaine_echeance: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    date_fin: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  }

  if (existing) {
    await supabase
      .from('abonnements_clients')
      .update(row)
      .eq('id', existing.id)
    console.log(`[connect-webhook] Abonnement ${subscription.id} mis à jour`)
  } else {
    await supabase
      .from('abonnements_clients')
      .insert({ ...row, date_debut: new Date(subscription.start_date * 1000).toISOString() })
    console.log(`[connect-webhook] Abonnement ${subscription.id} créé`)
  }
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
      // ─────────────────────────────────────────
      // Paiement réussi (checkout one-shot OU premier paiement d'abonnement)
      // ─────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object
        const { client_id, coach_id, offre_id } = session.metadata || {}

        // 1) Mettre à jour le paiement existant (créé par client-checkout.js)
        const { data: paiementExistant } = await supabase
          .from('paiements_clients')
          .select('id, client_id, coach_id, offre_id, montant')
          .eq('stripe_payment_intent_id', session.id)
          .maybeSingle()

        let paiementId = paiementExistant?.id || null
        const effectiveClientId = client_id || paiementExistant?.client_id
        const effectiveCoachId = coach_id || paiementExistant?.coach_id
        const effectiveOffreId = offre_id || paiementExistant?.offre_id
        const montant = session.amount_total || paiementExistant?.montant || 0

        if (paiementExistant) {
          await supabase
            .from('paiements_clients')
            .update({
              statut: 'paye',
              date_paiement: new Date().toISOString(),
              stripe_payment_intent_id: session.payment_intent || session.id,
              montant: session.amount_total || paiementExistant.montant,
            })
            .eq('id', paiementExistant.id)
        } else if (effectiveClientId && effectiveCoachId) {
          // Paiement via payment link : aucune ligne pré-créée, on en crée une
          const { data: nouveau } = await supabase
            .from('paiements_clients')
            .insert({
              client_id: effectiveClientId,
              coach_id: effectiveCoachId,
              offre_id: effectiveOffreId || null,
              montant,
              statut: 'paye',
              stripe_payment_intent_id: session.payment_intent || session.id,
              date_paiement: new Date().toISOString(),
            })
            .select('id')
            .single()
          paiementId = nouveau?.id || null
        }

        // 2) Activer le client
        if (effectiveClientId && effectiveCoachId) {
          await supabase
            .from('clients')
            .update({ actif: true })
            .eq('id', effectiveClientId)
            .eq('coach_id', effectiveCoachId)
        }

        // 3) Créer la facture automatiquement
        if (effectiveCoachId && montant > 0) {
          await createFactureIfMissing({
            coachId: effectiveCoachId,
            clientId: effectiveClientId,
            paiementId,
            offreId: effectiveOffreId,
            montant,
            stripeInvoiceId: session.invoice || null,
          })
        }

        // 4) Si c'est un abonnement : upsert dans abonnements_clients
        if (session.mode === 'subscription' && session.subscription && effectiveCoachId && effectiveClientId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(
              session.subscription,
              { stripeAccount: stripeEvent.account }
            )
            // Enrichir la metadata de la subscription si vide (utile pour events futurs)
            if (!subscription.metadata?.client_id) {
              await stripe.subscriptions.update(
                subscription.id,
                {
                  metadata: {
                    client_id: effectiveClientId,
                    coach_id: effectiveCoachId,
                    offre_id: effectiveOffreId || '',
                  },
                },
                { stripeAccount: stripeEvent.account }
              )
            }
            await upsertAbonnement({
              subscription,
              coachId: effectiveCoachId,
              clientId: effectiveClientId,
              offreId: effectiveOffreId,
              stripeAccount: stripeEvent.account,
            })
          } catch (e) {
            console.error('[connect-webhook] Erreur upsert abonnement:', e.message)
          }
        }

        console.log(`[connect-webhook] Checkout complete pour client ${effectiveClientId}`)
        break
      }

      // ─────────────────────────────────────────
      // Paiement d'abonnement récurrent réussi
      // ─────────────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = stripeEvent.data.object
        if (!invoice.subscription) break

        // Idempotence sur le payment_intent
        const { data: existing } = await supabase
          .from('paiements_clients')
          .select('id')
          .eq('stripe_payment_intent_id', invoice.payment_intent || invoice.id)
          .maybeSingle()

        if (existing) {
          console.log(`[connect-webhook] Invoice ${invoice.id} déjà traitée`)
          break
        }

        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription,
          { stripeAccount: stripeEvent.account }
        )
        const { client_id, coach_id, offre_id } = subscription.metadata || {}

        if (!client_id || !coach_id) {
          console.log('[connect-webhook] Invoice sans metadata client/coach — skip')
          break
        }

        // Créer le paiement
        const { data: paiement } = await supabase
          .from('paiements_clients')
          .insert({
            client_id,
            coach_id,
            offre_id: offre_id || null,
            montant: invoice.amount_paid,
            statut: 'paye',
            stripe_payment_intent_id: invoice.payment_intent || invoice.id,
            date_paiement: new Date().toISOString(),
          })
          .select('id')
          .single()

        // Facture auto
        if (invoice.amount_paid > 0) {
          await createFactureIfMissing({
            coachId: coach_id,
            clientId: client_id,
            paiementId: paiement?.id || null,
            offreId: offre_id,
            montant: invoice.amount_paid,
            stripeInvoiceId: invoice.id,
          })
        }

        // Sync l'abonnement (date_prochaine_echeance à jour)
        await upsertAbonnement({
          subscription,
          coachId: coach_id,
          clientId: client_id,
          offreId: offre_id,
          stripeAccount: stripeEvent.account,
        })

        // Réactiver le client si besoin
        await supabase
          .from('clients')
          .update({ actif: true })
          .eq('id', client_id)
          .eq('coach_id', coach_id)

        break
      }

      // ─────────────────────────────────────────
      // Paiement échoué → désactiver le client
      // ─────────────────────────────────────────
      case 'payment_intent.payment_failed': {
        const pi = stripeEvent.data.object
        const { client_id, coach_id } = pi.metadata || {}

        await supabase
          .from('paiements_clients')
          .update({ statut: 'echoue' })
          .eq('stripe_payment_intent_id', pi.id)

        if (client_id && coach_id) {
          await supabase
            .from('clients')
            .update({ actif: false })
            .eq('id', client_id)
            .eq('coach_id', coach_id)
          console.log(`[connect-webhook] Client ${client_id} désactivé après paiement échoué`)
        }
        break
      }

      // ─────────────────────────────────────────
      // Abonnement mis à jour (upgrade, pause, etc.)
      // ─────────────────────────────────────────
      case 'customer.subscription.updated': {
        const subscription = stripeEvent.data.object
        const { client_id, coach_id, offre_id } = subscription.metadata || {}

        if (client_id && coach_id) {
          await upsertAbonnement({
            subscription,
            coachId: coach_id,
            clientId: client_id,
            offreId: offre_id,
            stripeAccount: stripeEvent.account,
          })
        }
        break
      }

      // ─────────────────────────────────────────
      // Abonnement client annulé
      // ─────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = stripeEvent.data.object
        const { client_id, coach_id } = subscription.metadata || {}

        // Mettre à jour le statut de l'abonnement en DB
        await supabase
          .from('abonnements_clients')
          .update({
            statut: 'annule',
            date_fin: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        if (client_id && coach_id) {
          await supabase
            .from('clients')
            .update({ actif: false })
            .eq('id', client_id)
            .eq('coach_id', coach_id)
          console.log(`[connect-webhook] Client ${client_id} désactivé (annulation abonnement)`)
        }
        break
      }

      // ─────────────────────────────────────────
      // Compte Connect activé
      // ─────────────────────────────────────────
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
    return res.status(500).json({ error: 'Erreur interne du serveur' })
  }
}
