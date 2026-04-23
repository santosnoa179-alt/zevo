// Vercel Serverless Function — Crée un lien vers le Stripe Customer Portal
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function verifyAuth(req) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Vérifier l'authentification
    const user = await verifyAuth(req)
    if (!user) {
      return res.status(401).json({ error: 'Non autorisé' })
    }

    // SECURITY : ne JAMAIS accepter customerId depuis le body.
    // On le charge depuis `coaches` via auth.uid() pour garantir que
    // le coach accède uniquement à SON portail Stripe.
    const { data: coach, error: coachErr } = await supabase
      .from('coaches')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle()

    if (coachErr) {
      console.error('[create-portal-session] Erreur fetch coach:', coachErr)
      return res.status(500).json({ error: 'Erreur base de données' })
    }

    const customerId = coach?.stripe_customer_id
    if (!customerId) {
      return res.status(404).json({ error: 'Aucun compte Stripe associé' })
    }

    const origin = req.headers.origin || ''
    const allowedOrigins = [
      'https://zevo-one.com',
      'https://app.zevo-one.com',
      'https://www.zevo-one.com',
      'https://zevo-one.vercel.app',
    ]
    const siteUrl = allowedOrigins.includes(origin) ? origin : 'https://zevo-one.vercel.app'

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl}/coach/parametres`,
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Erreur Customer Portal:', err)
    return res.status(500).json({ error: 'Erreur interne du serveur' })
  }
}
