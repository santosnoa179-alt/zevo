// Vercel Serverless Function — Suppression d'un code promo Stripe
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

    const { codeId } = req.body
    if (!codeId) return res.status(400).json({ error: 'codeId requis' })

    const { data: row } = await supabase
      .from('codes_reduction')
      .select('id, stripe_coupon_id, stripe_promotion_code_id')
      .eq('id', codeId)
      .eq('coach_id', user.id)
      .single()

    if (!row) return res.status(404).json({ error: 'Code introuvable' })

    const { data: coach } = await supabase
      .from('coaches')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single()

    // Best-effort : désactiver le promotion code + supprimer le coupon
    if (coach?.stripe_account_id) {
      if (row.stripe_promotion_code_id) {
        try {
          await stripe.promotionCodes.update(
            row.stripe_promotion_code_id,
            { active: false },
            { stripeAccount: coach.stripe_account_id }
          )
        } catch (e) {
          console.error('Stripe promo update failed:', e.message)
        }
      }
      if (row.stripe_coupon_id) {
        try {
          await stripe.coupons.del(row.stripe_coupon_id, {
            stripeAccount: coach.stripe_account_id,
          })
        } catch (e) {
          console.error('Stripe coupon delete failed:', e.message)
        }
      }
    }

    await supabase
      .from('codes_reduction')
      .delete()
      .eq('id', codeId)
      .eq('coach_id', user.id)

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Erreur delete-coupon:', error)
    return res.status(500).json({ error: error.message || 'Erreur interne' })
  }
}
