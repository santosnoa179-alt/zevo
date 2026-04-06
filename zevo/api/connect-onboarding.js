// Vercel Serverless Function — Onboarding Stripe Connect pour les coachs
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
    // Vérifier l'authentification
    const user = await verifyAuth(req)
    if (!user) {
      return res.status(401).json({ error: 'Non autorisé' })
    }

    const { coachId } = req.body

    if (!coachId) {
      return res.status(400).json({ error: 'coachId requis' })
    }

    // Vérifier que le coach est bien l'utilisateur authentifié
    if (user.id !== coachId) {
      return res.status(403).json({ error: 'Accès interdit' })
    }

    // Vérifier si le coach a déjà un compte Stripe Connect
    const { data: coach } = await supabase
      .from('coaches')
      .select('stripe_account_id')
      .eq('id', coachId)
      .single()

    let accountId = coach?.stripe_account_id

    // Créer un compte Connect si pas encore fait
    if (!accountId) {
      const account = await stripe.accounts.create({ type: 'standard' })
      accountId = account.id

      await supabase
        .from('coaches')
        .update({ stripe_account_id: accountId })
        .eq('id', coachId)
    }

    const siteUrl = ALLOWED_ORIGINS[0] || 'https://zevo-one.vercel.app'

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${siteUrl}/coach/parametres`,
      return_url: `${siteUrl}/coach/parametres?stripe_connect=success`,
      type: 'account_onboarding',
    })

    return res.status(200).json({ url: accountLink.url })
  } catch (error) {
    console.error('Erreur connect-onboarding:', error)
    return res.status(500).json({ error: 'Erreur interne du serveur' })
  }
}
