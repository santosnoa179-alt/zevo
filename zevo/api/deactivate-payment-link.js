// Vercel Serverless Function — Désactive un lien de paiement Stripe (Connect Standard)
// Note : Stripe ne permet pas de supprimer un Payment Link, seulement de le désactiver.
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

    const { lienId } = req.body
    if (!lienId) return res.status(400).json({ error: 'lienId requis' })

    const { data: lien, error: lienError } = await supabase
      .from('liens_paiement')
      .select('id, coach_id, stripe_payment_link_id')
      .eq('id', lienId)
      .eq('coach_id', user.id)
      .single()

    if (lienError || !lien) return res.status(404).json({ error: 'Lien introuvable' })

    const { data: coach } = await supabase
      .from('coaches')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single()

    // Désactiver sur Stripe (best-effort)
    if (lien.stripe_payment_link_id && coach?.stripe_account_id) {
      try {
        await stripe.paymentLinks.update(
          lien.stripe_payment_link_id,
          { active: false },
          { stripeAccount: coach.stripe_account_id }
        )
      } catch (e) {
        console.error('Stripe update failed:', e.message)
      }
    }

    // Suppression côté DB (on garde l'historique Stripe mais on nettoie la liste)
    await supabase
      .from('liens_paiement')
      .delete()
      .eq('id', lienId)
      .eq('coach_id', user.id)

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Erreur deactivate-payment-link:', error)
    return res.status(500).json({ error: error.message || 'Erreur interne' })
  }
}
