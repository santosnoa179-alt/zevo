// Vercel Serverless Function — Sync ExerciseDB → Supabase
// Fetches all exercises from RapidAPI ExerciseDB and upserts into Supabase.
// Called only when the exercises table is empty (first load).
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const RAPIDAPI_KEY = process.env.VITE_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY
const RAPIDAPI_HOST = process.env.VITE_RAPIDAPI_HOST || process.env.RAPIDAPI_HOST || 'exercisedb.p.rapidapi.com'

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

  // Debug env vars (safe — only logs presence, not values)
  const sbUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  console.log('[sync-exercises] ENV check:', {
    hasSupabaseUrl: !!sbUrl,
    urlPrefix: sbUrl ? sbUrl.substring(0, 20) : 'MISSING',
    hasServiceKey: !!sbKey,
    keyLength: sbKey ? sbKey.length : 0,
    hasRapidApiKey: !!RAPIDAPI_KEY,
  })

  try {
    // 1) Check if exercises table already has data
    const { count, error: countErr } = await supabase
      .from('exercises')
      .select('id', { count: 'exact', head: true })

    if (countErr) {
      console.error('[sync-exercises] Count error:', JSON.stringify(countErr))
      return res.status(500).json({ error: 'Erreur lecture table exercises', details: countErr.message || JSON.stringify(countErr) })
    }

    if (count > 0) {
      return res.status(200).json({ message: `Table deja remplie (${count} exercices)`, synced: false, count })
    }

    // 2) Fetch from ExerciseDB
    if (!RAPIDAPI_KEY) {
      return res.status(500).json({ error: 'RAPIDAPI_KEY non configuree' })
    }

    console.log('[sync-exercises] Fetching from ExerciseDB...')
    const response = await fetch('https://exercisedb.p.rapidapi.com/exercises?limit=1500&offset=0', {
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('[sync-exercises] ExerciseDB error:', response.status, text)
      return res.status(502).json({ error: `ExerciseDB API error: ${response.status}` })
    }

    const exercises = await response.json()
    console.log(`[sync-exercises] Received ${exercises.length} exercises from ExerciseDB`)

    if (!Array.isArray(exercises) || exercises.length === 0) {
      return res.status(502).json({ error: 'ExerciseDB returned empty data' })
    }

    // 3) Map to our schema
    const rows = exercises.map(ex => ({
      id: String(ex.id),
      name: ex.name || '',
      target_muscle: ex.target || '',
      equipment: ex.equipment || 'body weight',
      gif_url: ex.gifUrl || null,
      body_part: ex.bodyPart || '',
      secondary_muscles: Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles : [],
      instructions: Array.isArray(ex.instructions) ? ex.instructions : [],
    }))

    // 4) Batch upsert (Supabase max ~1000 rows per request)
    const BATCH_SIZE = 500
    let inserted = 0

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)
      const { error: insertErr } = await supabase
        .from('exercises')
        .upsert(batch, { onConflict: 'id' })

      if (insertErr) {
        console.error(`[sync-exercises] Batch ${i}-${i + batch.length} error:`, insertErr)
        return res.status(500).json({ error: `Erreur insertion batch: ${insertErr.message}`, inserted })
      }
      inserted += batch.length
      console.log(`[sync-exercises] Inserted batch ${i}-${i + batch.length}`)
    }

    return res.status(200).json({ message: `Sync terminee`, synced: true, count: inserted })
  } catch (error) {
    console.error('[sync-exercises] Error:', error)
    return res.status(500).json({ error: error.message || 'Erreur interne' })
  }
}
