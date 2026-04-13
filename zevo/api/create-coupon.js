// Vercel Serverless Function — Création d'un code promo Stripe (Connect Standard)
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Forcer une version API récente pour garantir la compatibilité des paramètres
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
})
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

function translateStripeError(msg) {
  if (!msg) return 'Erreur interne'
  if (msg.includes('already exists')) return 'Ce code existe déjà sur votre compte Stripe'
  if (msg.includes('not allowed')) return 'Action non autorisée sur votre compte Stripe'
  if (msg.includes('No such')) return 'Ressource introuvable sur votre compte Stripe'
  // On retourne le message brut pour les autres erreurs (utile pour debug)
  return msg
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

    const { data: coach } = await supabase
      .from('coaches')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', user.id)
      .single()

    if (!coach?.stripe_account_id || !coach.stripe_onboarding_complete) {
      return res.status(400).json({ error: 'Compte Stripe non configuré. Finalisez l\'onboarding dans Paramètres.' })
    }

    const stripeAccountId = coach.stripe_account_id
    const codeUpper = code.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '')
    if (!codeUpper) return res.status(400).json({ error: 'Code invalide (lettres, chiffres, tirets uniquement)' })

    // ── 1) Créer le Coupon — paramètres MINIMAUX pour compatibilité max ──
    const couponParams = { duration: 'once' }
    if (type === 'pourcentage') {
      couponParams.percent_off = Math.round(valeurNum)
    } else {
      couponParams.amount_off = Math.round(valeurNum)
      couponParams.currency = 'eur'
    }
    // max_redemptions et redeem_by sur le coupon (pas sur le promo code)
    if (limite) couponParams.max_redemptions = Number(limite)
    if (expiration) {
      const ts = Math.floor(new Date(expiration).getTime() / 1000)
      if (Number.isFinite(ts) && ts > 0) couponParams.redeem_by = ts
    }

    let coupon
    try {
      coupon = await stripe.coupons.create(couponParams, { stripeAccount: stripeAccountId })
      console.log('[create-coupon] Coupon créé:', coupon.id)
    } catch (e) {
      console.error('[create-coupon] Erreur coupon:', e.message, '| params:', JSON.stringify(couponParams))
      return res.status(400).json({ error: translateStripeError(e.message) })
    }

    // ── 2) Créer le Promotion Code — paramètres MINIMAUX ──
    // Seuls 'coupon' et 'code' sont envoyés — le reste est géré par le coupon
    let promotionCode = null
    try {
      promotionCode = await stripe.promotionCodes.create(
        { coupon: coupon.id, code: codeUpper },
        { stripeAccount: stripeAccountId }
      )
      console.log('[create-coupon] Promotion Code créé:', promotionCode.id, '| code:', promotionCode.code)
    } catch (e) {
      console.error('[create-coupon] Erreur promotion code:', e.message)
      // Nettoyer le coupon orphelin
      try { await stripe.coupons.del(coupon.id, { stripeAccount: stripeAccountId }) } catch {}
      return res.status(400).json({ error: translateStripeError(e.message) })
    }

    // ── 3) Insertion DB ──
    const { data: row, error: insertError } = await supabase
      .from('codes_reduction')
      .insert({
        coach_id: user.id,
        code: codeUpper,
        type,
        valeur: Math.round(valeurNum),
        limite_utilisations: limite ? Number(limite) : null,
        date_expiration: expiration || null,
        stripe_coupon_id: coupon.id,
        stripe_promotion_code_id: promotionCode.id,
        actif: true,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[create-coupon] Erreur DB:', insertError)
      try { await stripe.coupons.del(coupon.id, { stripeAccount: stripeAccountId }) } catch {}
      return res.status(500).json({ error: 'Erreur lors de l\'enregistrement en base' })
    }

    return res.status(200).json({ code: row })
  } catch (error) {
    console.error('[create-coupon] Erreur globale:', error)
    return res.status(500).json({ error: translateStripeError(error.message) })
  }
}
