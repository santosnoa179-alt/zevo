// Endpoint de diagnostic temporaire — À SUPPRIMER après résolution
// Appeler : https://ton-domaine.vercel.app/api/debug-env
import { createClient } from '@supabase/supabase-js'

function detectKeyRole(key) {
  if (!key) return 'MISSING'
  try {
    const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString())
    return payload.role || 'unknown'
  } catch {
    return 'invalid_jwt'
  }
}

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const keyRole = detectKeyRole(serviceKey)

  // Test réel : essayer de lire la table profiles avec cette clé
  let testResult = null
  let testError = null

  if (supabaseUrl && serviceKey) {
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1)

    testResult = data ? `OK — ${data.length} row(s) returned` : 'NO DATA'
    testError = error ? { message: error.message, code: error.code, hint: error.hint } : null
  }

  return res.status(200).json({
    diagnostic: 'Zevo Stripe Webhook Debug',
    timestamp: new Date().toISOString(),
    env: {
      SUPABASE_URL: supabaseUrl ? supabaseUrl.substring(0, 40) + '...' : 'MISSING',
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY_role: keyRole,
      SUPABASE_SERVICE_ROLE_KEY_prefix: serviceKey ? serviceKey.substring(0, 20) + '...' : 'MISSING',
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'SET' : 'MISSING',
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? 'SET' : 'MISSING',
    },
    database_test: {
      query: 'SELECT id FROM profiles LIMIT 1',
      result: testResult,
      error: testError,
    },
    verdict: keyRole === 'service_role'
      ? (testError ? '⚠️ Clé service_role OK mais erreur DB — vérifier RLS' : '✅ Tout est OK')
      : `❌ PROBLÈME: La clé a le rôle "${keyRole}" au lieu de "service_role". Allez dans Supabase > Settings > API > service_role (secret) et copiez cette clé dans Vercel > Settings > Environment Variables > SUPABASE_SERVICE_ROLE_KEY`,
  })
}
