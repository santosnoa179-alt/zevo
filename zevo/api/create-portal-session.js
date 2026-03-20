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

    const siteUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.URL || 'http://localhost:5173'

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
