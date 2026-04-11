// Vercel Serverless Function — Création d'un lien de paiement Stripe (Connect Standard)
// Le lien est créé directement sur le compte Stripe du coach, donc le paiement arrive chez lui.
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
    const user = await verifyAuth(req)
    if (!user) return res.status(401).json({ error: 'Non autorisé' })

    const { titre, description, montant } = req.body

    if (!titre || typeof titre !== 'string' || !titre.trim()) {
      return res.status(400).json({ error: 'Titre requis' })
    }

    const montantCents = Math.round(Number(montant) || 0)
    if (!Number.isFinite(montantCents) || montantCents < 50) {
      return res.status(400).json({ error: 'Montant minimum 0.50 €' })
    }

    // Vérifier que le coach est bien connecté à Stripe
    const { data: coach, error: coachError } = await supabase
      .from('coaches')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', user.id)
      .single()

    if (coachError || !coach) return res.status(404).json({ error: 'Coach introuvable' })

    const stripeAccountId = coach.stripe_account_id
    if (!stripeAccountId || !coach.stripe_onboarding_complete) {
      return res.status(400).json({ error: 'Compte Stripe non configuré. Finalisez l\'onboarding dans Paramètres.' })
    }

    // 1) Créer le Product sur le compte du coach
    const product = await stripe.products.create(
      {
        name: titre.trim().slice(0, 250),
        description: description ? String(description).slice(0, 500) : undefined,
      },
      { stripeAccount: stripeAccountId }
    )

    // 2) Créer le Price
    const price = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: montantCents,
        currency: 'eur',
      },
      { stripeAccount: stripeAccountId }
    )

    // 3) Créer le Payment Link (Stripe hosted : buy.stripe.com/xxx)
    const paymentLink = await stripe.paymentLinks.create(
      {
        line_items: [{ price: price.id, quantity: 1 }],
        allow_promotion_codes: true,
        metadata: {
          coach_id: user.id,
          titre: titre.trim().slice(0, 100),
        },
      },
      { stripeAccount: stripeAccountId }
    )

    // 4) Insertion DB — slug local conservé pour compat
    const slug = titre.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30) + '_' + Date.now().toString(36)

    const { data: lien, error: insertError } = await supabase
      .from('liens_paiement')
      .insert({
        coach_id: user.id,
        titre: titre.trim(),
        description: description || null,
        montant: montantCents,
        slug,
        stripe_payment_link_id: paymentLink.id,
        stripe_url: paymentLink.url,
        actif: true,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Erreur insertion lien:', insertError)
      return res.status(500).json({ error: 'Erreur lors de l\'enregistrement' })
    }

    return res.status(200).json({ lien })
  } catch (error) {
    console.error('Erreur create-payment-link:', error)
    return res.status(500).json({ error: error.message || 'Erreur interne' })
  }
}
