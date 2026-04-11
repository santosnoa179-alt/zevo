// Vercel Serverless Function — Création d'un code promo Stripe (Connect Standard)
// Crée un Coupon + Promotion Code sur le compte du coach pour qu'il soit
// utilisable sur le Payment Link et le Checkout (allow_promotion_codes=true).
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

    const { code, type, valeur, limite, expiration } = req.body

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'Code requis' })
    }
    if (!['pourcentage', 'fixe'].includes(type)) {
      return res.status(400).json({ error: 'Type invalide' })
    }
    const valeurNum = Number(valeur)
    if (!Number.isFinite(valeurNum) || valeurNum <= 0) {
      return res.status(400).json({ error: 'Valeur invalide' })
    }
    if (type === 'pourcentage' && (valeurNum < 1 || valeurNum > 100)) {
      return res.status(400).json({ error: 'Pourcentage entre 1 et 100' })
    }

    // Vérifier que le coach est bien connecté à Stripe
    const { data: coach } = await supabase
      .from('coaches')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', user.id)
      .single()

    if (!coach?.stripe_account_id || !coach.stripe_onboarding_complete) {
      return res.status(400).json({ error: 'Compte Stripe non configuré' })
    }

    const codeUpper = code.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '')
    if (!codeUpper) return res.status(400).json({ error: 'Code invalide' })

    // 1) Créer le Coupon Stripe sur le compte du coach
    const couponParams = {
      name: codeUpper,
      duration: 'once',
    }
    if (type === 'pourcentage') {
      couponParams.percent_off = Math.round(valeurNum)
    } else {
      couponParams.amount_off = Math.round(valeurNum) // en centimes, déjà envoyé tel quel par le front
      couponParams.currency = 'eur'
    }
    if (limite) {
      couponParams.max_redemptions = Number(limite)
    }
    if (expiration) {
      const ts = Math.floor(new Date(expiration).getTime() / 1000)
      if (Number.isFinite(ts) && ts > 0) couponParams.redeem_by = ts
    }

    const coupon = await stripe.coupons.create(couponParams, {
      stripeAccount: coach.stripe_account_id,
    })

    // 2) Créer le Promotion Code qui rend le coupon utilisable via le code
    const promotionCode = await stripe.promotionCodes.create(
      {
        coupon: coupon.id,
        code: codeUpper,
        max_redemptions: limite ? Number(limite) : undefined,
        expires_at: expiration
          ? Math.floor(new Date(expiration).getTime() / 1000)
          : undefined,
      },
      { stripeAccount: coach.stripe_account_id }
    )

    // 3) Insertion DB
    const { data: row, error: insertError } = await supabase
      .from('codes_reduction')
      .insert({
        coach_id: user.id,
        code: codeUpper,
        type,
        valeur: type === 'pourcentage' ? Math.round(valeurNum) : Math.round(valeurNum),
        limite_utilisations: limite ? Number(limite) : null,
        date_expiration: expiration || null,
        stripe_coupon_id: coupon.id,
        stripe_promotion_code_id: promotionCode.id,
        actif: true,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Erreur insertion code:', insertError)
      // Rollback côté Stripe (best-effort)
      try {
        await stripe.coupons.del(coupon.id, { stripeAccount: coach.stripe_account_id })
      } catch {}
      return res.status(500).json({ error: 'Erreur lors de l\'enregistrement' })
    }

    return res.status(200).json({ code: row })
  } catch (error) {
    console.error('Erreur create-coupon:', error)
    // Stripe renvoie un message clair si le code existe déjà
    return res.status(500).json({ error: error.message || 'Erreur interne' })
  }
}
