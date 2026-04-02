// Vercel Serverless Function — Crée un lien vers le Stripe Customer Portal
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { customerId } = req.body

    if (!customerId) {
      return res.status(400).json({ error: 'customerId requis' })
    }

    const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '')
    const siteUrl = origin || process.env.NEXT_PUBLIC_SITE_URL || 'https://zevo-one.vercel.app'

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl}/coach/parametres`,
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Erreur Customer Portal:', err)
    return res.status(500).json({ error: err.message })
  }
}
