// Vercel Serverless Function — Sync ExerciseDB → Supabase (paginated)
// Called repeatedly by the client with increasing offset.
// Each call fetches one page from ExerciseDB and upserts into Supabase.
import { createClient } from '@supabase/supabase-js'

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

export default async function handler(req, res) {
  setCors(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const sbUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const rapidApiKey = process.env.VITE_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY
  const rapidApiHost = process.env.VITE_RAPIDAPI_HOST || process.env.RAPIDAPI_HOST || 'exercisedb.p.rapidapi.com'

  if (!sbUrl || !sbKey) {
    return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' })
  }
  if (!rapidApiKey) {
    return res.status(500).json({ error: 'RAPIDAPI_KEY non configuree' })
  }

  const supabase = createClient(sbUrl, sbKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Parse pagination params from body
  const { offset = 0, limit = 10 } = req.body || {}

  try {
    // Fetch one page from ExerciseDB
    const url = `https://exercisedb.p.rapidapi.com/exercises?limit=${limit}&offset=${offset}`
    console.log(`[sync-exercises] Fetching offset=${offset} limit=${limit}`)

    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': rapidApiHost,
      },
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('[sync-exercises] ExerciseDB error:', response.status, text)
      return res.status(502).json({ error: `ExerciseDB API error: ${response.status}`, details: text.substring(0, 200) })
    }

    const exercises = await response.json()

    if (!Array.isArray(exercises)) {
      return res.status(502).json({ error: 'ExerciseDB returned invalid data' })
    }

    console.log(`[sync-exercises] Received ${exercises.length} exercises at offset=${offset}`)

    // Log first exercise fields for debugging
    if (offset === 0 && exercises.length > 0) {
      console.log('[sync-exercises] Sample exercise keys:', Object.keys(exercises[0]))
      console.log('[sync-exercises] Sample exercise:', JSON.stringify(exercises[0]).substring(0, 500))
    }

    if (exercises.length === 0) {
      return res.status(200).json({ inserted: 0, offset, hasMore: false, total: offset })
    }

    // Map to our schema — try multiple field names for GIF URL
    const rows = exercises.map(ex => ({
      id: String(ex.id),
      name: ex.name || '',
      target_muscle: ex.target || '',
      equipment: ex.equipment || 'body weight',
      gif_url: ex.gifUrl || ex.gif_url || ex.gifURL || ex.image || null,
      body_part: ex.bodyPart || '',
      secondary_muscles: Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles : [],
      instructions: Array.isArray(ex.instructions) ? ex.instructions : [],
    }))

    // Upsert this batch
    const { error: insertErr } = await supabase
      .from('exercises')
      .upsert(rows, { onConflict: 'id' })

    if (insertErr) {
      console.error('[sync-exercises] Upsert error:', JSON.stringify(insertErr))
      return res.status(500).json({ error: `Erreur insertion: ${insertErr.message}` })
    }

    const hasMore = exercises.length === limit
    console.log(`[sync-exercises] Inserted ${rows.length} exercises. hasMore=${hasMore}`)

    return res.status(200).json({
      inserted: rows.length,
      offset,
      hasMore,
      total: offset + rows.length,
    })
  } catch (error) {
    console.error('[sync-exercises] Error:', error)
    return res.status(500).json({ error: error.message || 'Erreur interne' })
  }
}
