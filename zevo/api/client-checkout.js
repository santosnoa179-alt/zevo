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

export default async function handler(req, res) {
  setCors(req, res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Vérifier l'authentification
    const user = await verifyAuth(req)
    if (!user) {
      return res.status(401).json({ error: 'Non autorisé' })
    }

    const { offreId, clientId } = req.body

    if (!offreId || !clientId) {
      return res.status(400).json({ error: 'offreId et clientId requis' })
    }

    // Vérifier que le client est bien l'utilisateur authentifié
    if (user.id !== clientId) {
      return res.status(403).json({ error: 'Accès interdit' })
    }

    // Charger l'offre
    const { data: offre, error: offreError } = await supabase
      .from('offres_coaching')
      .select('id, coach_id, titre, description, prix, frequence')
      .eq('id', offreId)
      .single()

    if (offreError || !offre) {
      return res.status(404).json({ error: 'Offre introuvable' })
    }

    // Charger le coach
    const { data: coach, error: coachError } = await supabase
      .from('coaches')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', offre.coach_id)
      .single()

    if (coachError || !coach) {
      return res.status(404).json({ error: 'Coach introuvable' })
    }

    const stripeAccountId = coach.stripe_account_id
    if (!stripeAccountId || !coach.stripe_onboarding_complete) {
      return res.status(400).json({ error: 'Coach non connecté à Stripe' })
    }

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

    // Créer un paiement en attente
    await supabase
      .from('paiements_clients')
      .insert({
        client_id: clientId,
        coach_id: offre.coach_id,
        offre_id: offreId,
        montant: offre.prix,
        statut: 'en_attente',
        stripe_payment_intent_id: session.payment_intent || session.id,
      })

    return res.status(200).json({ url: session.url })
  } catch (error) {
    console.error('Erreur client-checkout:', error)
    return res.status(500).json({ error: 'Erreur interne du serveur' })
  }
}
