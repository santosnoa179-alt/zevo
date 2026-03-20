// Netlify Function — Onboarding Stripe Connect pour les coachs
// Crée un compte Connect (si besoin) et retourne le lien d'onboarding

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { coachId } = JSON.parse(event.body)

    if (!coachId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'coachId requis' }) }
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
      const account = await stripe.accounts.create({
        type: 'standard',
      })
      accountId = account.id

      // Sauvegarder dans Supabase
      await supabase
        .from('coaches')
        .update({ stripe_account_id: accountId })
        .eq('id', coachId)
    }

    // Générer le lien d'onboarding
    const siteUrl = process.env.URL || 'http://localhost:5173'
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${siteUrl}/coach/parametres`,
      return_url: `${siteUrl}/coach/parametres?stripe_connect=success`,
      type: 'account_onboarding',
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: accountLink.url }),
    }
  } catch (error) {
    console.error('Erreur connect-onboarding:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    }
  }
}
