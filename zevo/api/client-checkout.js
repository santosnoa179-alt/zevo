// Vercel Serverless Function — Checkout client via Stripe Connect
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ALLOWED_ORIGINS = [
  'https://zevo-one.com',
  'https://app.zevo-one.com',
  'https://www.zevo-one.com',
  'https://zevo-one.vercel.app',
  'https://www.zevo-one.vercel.app',
  process.env.NEXT_PUBLIC_SITE_URL,
].filter(Boolean)

function setCors(req, res) {
  const origin = req.headers.origin
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

// Vérifie le JWT Supabase et retourne l'utilisateur
async function verifyAuth(req) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper : reset le compte Stripe d'un coach quand il est invalide côté Stripe
// (cas typique : acct_ créé en test mode alors que l'app tourne en live, ou
// coach qui a révoqué Zevo depuis son dashboard Stripe).
// Idempotent : safe à appeler plusieurs fois.
// ─────────────────────────────────────────────────────────────────────────────
async function resetCoachStripeAccount(coachId, reason) {
  console.warn('[client-checkout] reset stripe account for coach', { coachId, reason })
  await supabase
    .from('coaches')
    .update({ stripe_account_id: null, stripe_onboarding_complete: false })
    .eq('id', coachId)
}

export default async function handler(req, res) {
  setCors(req, res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Variables déclarées en dehors du try pour être lisibles depuis le catch
  let offre = null
  let stripeAccountId = null

  try {
    // ─── 1. Authentification ────────────────────────────────────────────────
    const user = await verifyAuth(req)
    if (!user) {
      return res.status(401).json({ error: 'Non autorisé' })
    }

    const { offreId, clientId } = req.body

    if (!offreId || !clientId) {
      return res.status(400).json({ error: 'offreId et clientId requis' })
    }

    // Le clientId DOIT correspondre au JWT (évite qu'un user paye pour un autre)
    if (user.id !== clientId) {
      return res.status(403).json({ error: 'Accès interdit' })
    }

    // ─── 2. Chargement de l'offre ───────────────────────────────────────────
    const { data: offreData, error: offreError } = await supabase
      .from('offres_coaching')
      .select('id, coach_id, titre, description, prix, frequence')
      .eq('id', offreId)
      .single()

    if (offreError || !offreData) {
      return res.status(404).json({ error: 'Offre introuvable' })
    }
    offre = offreData

    // ─── 3. Sécurité : client ↔ coach doivent être liés ─────────────────────
    // Un client ne peut payer que les offres d'un coach auquel il est associé.
    // La relation vit dans `clients.coach_id` (settée au moment de l'invitation).
    //
    // Politique d'échec : on NE BLOQUE PAS le paiement si la requête plante
    // pour une raison transitoire (timeout, glitch PostgREST, etc.). La vraie
    // sécurité est déjà assurée par `user.id === clientId` (ligne ci-dessus)
    // et le fait que l'offre provient d'un `coach_id` réel. On bloque
    // uniquement sur un mismatch explicite (client lié à un AUTRE coach).
    const { data: clientLink, error: clientLinkError } = await supabase
      .from('clients')
      .select('coach_id')
      .eq('id', clientId)
      .maybeSingle()

    if (clientLinkError) {
      // Requête en erreur → on log en détail mais on ne bloque pas
      console.error('[client-checkout] client link query error (non-blocking):', {
        message: clientLinkError.message,
        code: clientLinkError.code,
        details: clientLinkError.details,
        hint: clientLinkError.hint,
        clientId,
      })
    } else if (clientLink && clientLink.coach_id !== offre.coach_id) {
      // Cas clair : le client est bien enregistré mais avec un AUTRE coach
      return res.status(403).json({
        error: 'Cette offre n\'est pas disponible pour ton coach.',
      })
    }
    // Si !clientLink : le client n'a pas encore de row dans `clients`
    // (cas rare : onboarding incomplet, user créé autrement). On laisse passer
    // et le webhook Stripe créera le lien au premier paiement confirmé.

    // ─── 4. Chargement du coach ─────────────────────────────────────────────
    const { data: coach, error: coachError } = await supabase
      .from('coaches')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', offre.coach_id)
      .single()

    if (coachError || !coach) {
      return res.status(404).json({ error: 'Coach introuvable' })
    }

    stripeAccountId = coach.stripe_account_id
    if (!stripeAccountId || !coach.stripe_onboarding_complete) {
      return res.status(400).json({
        error: 'Le coach n\'a pas encore configuré ses paiements. Contacte-le pour finaliser.',
      })
    }

    // ─── 5. Self-healing : vérifier le compte Stripe côté live ──────────────
    // Le flag `stripe_onboarding_complete` en DB peut mentir (ex: compte créé
    // en test mode mais app basculée en live, ou coach qui a révoqué Zevo
    // depuis son dashboard Stripe). On re-interroge Stripe pour la source de
    // vérité et on auto-reset la DB si incohérence.
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId)

      if (!account.charges_enabled) {
        // Compte existe mais pas prêt à encaisser (KYC incomplet, docs manquants...)
        await supabase
          .from('coaches')
          .update({ stripe_onboarding_complete: false })
          .eq('id', offre.coach_id)

        return res.status(400).json({
          error: 'Le coach n\'a pas terminé la configuration de son compte Stripe.',
        })
      }
    } catch (stripeErr) {
      // Le compte Stripe n'existe pas / n'est plus lié à la plateforme
      // → on reset complètement, le coach devra refaire l'onboarding
      const code = stripeErr?.code
      const type = stripeErr?.type
      if (
        code === 'account_invalid' ||
        code === 'resource_missing' ||
        type === 'StripePermissionError' ||
        /no such account/i.test(stripeErr?.message || '')
      ) {
        await resetCoachStripeAccount(
          offre.coach_id,
          `${type || 'unknown'}:${code || 'unknown'} on account.retrieve`,
        )
        return res.status(400).json({
          error: 'Le compte Stripe du coach n\'est plus valide. Le coach doit le reconnecter depuis ses paramètres.',
        })
      }
      // Autre type d'erreur Stripe : on laisse remonter au catch global
      throw stripeErr
    }

    // ─── 6. Création de la Checkout Session ─────────────────────────────────
    const siteUrl = ALLOWED_ORIGINS[0] || 'https://zevo-one.vercel.app'

    const sessionParams = {
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: offre.prix,
          product_data: {
            name: offre.titre,
            description: offre.description || undefined,
          },
          ...(offre.frequence !== 'unique' ? {
            recurring: {
              interval: offre.frequence === 'mensuel' ? 'month'
                : offre.frequence === 'trimestriel' ? 'month'
                : 'year',
              ...(offre.frequence === 'trimestriel' ? { interval_count: 3 } : {}),
            }
          } : {}),
        },
        quantity: 1,
      }],
      mode: offre.frequence === 'unique' ? 'payment' : 'subscription',
      success_url: `${siteUrl}/app/abonnement?paiement=success`,
      cancel_url: `${siteUrl}/app/abonnement`,
      allow_promotion_codes: true,
      metadata: {
        offre_id: offreId,
        client_id: clientId,
        coach_id: offre.coach_id,
      },
    }

    const session = await stripe.checkout.sessions.create(
      sessionParams,
      { stripeAccount: stripeAccountId }
    )

    // ─── 7. Paiement en attente en DB ───────────────────────────────────────
    const { error: insertError } = await supabase
      .from('paiements_clients')
      .insert({
        client_id: clientId,
        coach_id: offre.coach_id,
        offre_id: offreId,
        montant: offre.prix,
        statut: 'en_attente',
        stripe_payment_intent_id: session.payment_intent || session.id,
      })

    if (insertError) {
      // La session Stripe est créée, on log mais on retourne quand même l'URL
      // pour ne pas bloquer le paiement. Le webhook reconstituera la ligne.
      console.error('[client-checkout] paiements_clients insert error:', insertError)
    }

    return res.status(200).json({ url: session.url })

  } catch (error) {
    // ─── 8. Catch granulaire : différencie Stripe vs bugs internes ──────────
    const isStripeError = typeof error?.type === 'string' && error.type.startsWith('Stripe')

    console.error('[client-checkout]', {
      message: error?.message,
      type: error?.type,
      code: error?.code,
      statusCode: error?.statusCode,
      stripeAccountId,
      offreId: offre?.id,
      coachId: offre?.coach_id,
    })

    if (isStripeError) {
      // Erreur claire côté Stripe : on remonte le message à l'utilisateur
      // (les messages Stripe sont conçus pour être montrés, pas sensibles)
      const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 400
      return res.status(statusCode >= 400 && statusCode < 500 ? statusCode : 400).json({
        error: error.message || 'Le paiement a été refusé par Stripe.',
      })
    }

    return res.status(500).json({ error: 'Erreur interne du serveur' })
  }
}
