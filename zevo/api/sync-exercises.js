// Vercel Serverless Function — Gestion batch des exercices (sync + traduction)
// Actions:
//   - action: 'sync'      -> ExerciseDB -> Supabase (paginated)
//   - action: 'translate' -> DeepL EN -> FR sur les rows non traduites
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

// ── DeepL helpers ──
function getDeepLEndpoint(apiKey) {
  return apiKey.endsWith(':fx')
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate'
}

async function translateBatch(apiKey, texts) {
  if (!texts.length) return []
  const endpoint = getDeepLEndpoint(apiKey)

  const body = new URLSearchParams()
  for (const t of texts) body.append('text', t)
  body.append('source_lang', 'EN')
  body.append('target_lang', 'FR')
  body.append('formality', 'prefer_less')

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`DeepL ${res.status}: ${text.substring(0, 200)}`)
  }

  const json = await res.json()
  return (json.translations || []).map(t => t.text)
}

// ────────────────────────────────────────────────
// HANDLER
// ────────────────────────────────────────────────
export default async function handler(req, res) {
  setCors(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const sbUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!sbUrl || !sbKey) {
    return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' })
  }

  const supabase = createClient(sbUrl, sbKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { action = 'sync' } = req.body || {}

  // ═══════════════════════════════════════════════
  // ACTION: TRANSLATE
  // ═══════════════════════════════════════════════
  if (action === 'translate') {
    const deeplKey = process.env.DEEPL_API_KEY
    if (!deeplKey) {
      return res.status(500).json({ error: 'DEEPL_API_KEY non configuree' })
    }

    const { limit = 20 } = req.body || {}

    try {
      // 1. Recuperer rows non traduites
      const { data: rows, error: selectErr } = await supabase
        .from('exercises')
        .select('id, name, description, instructions, secondary_muscles, name_fr')
        .or('name_fr.is.null,name_fr.eq.')
        .limit(limit)

      if (selectErr) {
        console.error('[translate] select error:', selectErr)
        return res.status(500).json({ error: `Erreur select: ${selectErr.message}` })
      }

      if (!rows || rows.length === 0) {
        const { count } = await supabase.from('exercises').select('*', { count: 'exact', head: true })
        return res.status(200).json({ translated: 0, hasMore: false, totalRemaining: 0, total: count || 0 })
      }

      console.log(`[translate] Processing ${rows.length} exercises`)

      // 2. Preparer textes + mapping
      const texts = []
      const mapping = []

      rows.forEach((row, rowIdx) => {
        if (row.name) { texts.push(row.name); mapping.push({ rowIdx, field: 'name_fr' }) }
        if (row.description) { texts.push(row.description); mapping.push({ rowIdx, field: 'description_fr' }) }
        if (Array.isArray(row.instructions)) {
          row.instructions.forEach((step, subIdx) => {
            texts.push(step)
            mapping.push({ rowIdx, field: 'instructions_fr', subIdx })
          })
        }
        if (Array.isArray(row.secondary_muscles)) {
          row.secondary_muscles.forEach((m, subIdx) => {
            texts.push(m)
            mapping.push({ rowIdx, field: 'secondary_muscles_fr', subIdx })
          })
        }
      })

      console.log(`[translate] Total texts: ${texts.length}`)

      // 3. Batches de 50 (limite DeepL)
      const BATCH_SIZE = 50
      const translations = []
      for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const chunk = texts.slice(i, i + BATCH_SIZE)
        const translated = await translateBatch(deeplKey, chunk)
        translations.push(...translated)
      }

      // 4. Reconstruire par row
      const updates = rows.map(row => ({
        id: row.id,
        name_fr: '',
        description_fr: '',
        instructions_fr: Array.isArray(row.instructions) ? new Array(row.instructions.length).fill('') : [],
        secondary_muscles_fr: Array.isArray(row.secondary_muscles) ? new Array(row.secondary_muscles.length).fill('') : [],
      }))

      mapping.forEach((m, i) => {
        const update = updates[m.rowIdx]
        const translatedText = translations[i] || ''
        if (m.field === 'instructions_fr' || m.field === 'secondary_muscles_fr') {
          update[m.field][m.subIdx] = translatedText
        } else {
          update[m.field] = translatedText
        }
      })

      // 5. Update en DB
      for (const u of updates) {
        const { error: updateErr } = await supabase
          .from('exercises')
          .update({
            name_fr: u.name_fr,
            description_fr: u.description_fr,
            instructions_fr: u.instructions_fr,
            secondary_muscles_fr: u.secondary_muscles_fr,
          })
          .eq('id', u.id)
        if (updateErr) console.error(`[translate] Update error for ${u.id}:`, updateErr.message)
      }

      // 6. Count remaining
      const { count: totalRemaining } = await supabase
        .from('exercises')
        .select('*', { count: 'exact', head: true })
        .or('name_fr.is.null,name_fr.eq.')

      const { count: total } = await supabase
        .from('exercises')
        .select('*', { count: 'exact', head: true })

      return res.status(200).json({
        translated: rows.length,
        hasMore: (totalRemaining || 0) > 0,
        totalRemaining: totalRemaining || 0,
        total: total || 0,
      })
    } catch (error) {
      console.error('[translate] Error:', error)
      return res.status(500).json({ error: error.message || 'Erreur interne' })
    }
  }

  // ═══════════════════════════════════════════════
  // ACTION: SYNC (default)
  // ═══════════════════════════════════════════════
  const rapidApiKey = process.env.VITE_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY
  const rapidApiHost = process.env.VITE_RAPIDAPI_HOST || process.env.RAPIDAPI_HOST || 'exercisedb.p.rapidapi.com'

  if (!rapidApiKey) {
    return res.status(500).json({ error: 'RAPIDAPI_KEY non configuree' })
  }

  const { offset = 0, limit = 10 } = req.body || {}

  try {
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

    if (offset === 0 && exercises.length > 0) {
      console.log('[sync-exercises] Sample exercise keys:', Object.keys(exercises[0]))
    }

    if (exercises.length === 0) {
      return res.status(200).json({ inserted: 0, offset, hasMore: false, total: offset })
    }

    const rows = exercises.map(ex => ({
      id: String(ex.id),
      name: ex.name || '',
      target_muscle: ex.target || '',
      equipment: ex.equipment || 'body weight',
      gif_url: ex.gifUrl || null,
      body_part: ex.bodyPart || '',
      secondary_muscles: Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles : [],
      instructions: Array.isArray(ex.instructions) ? ex.instructions : [],
      description: ex.description || '',
      difficulty: ex.difficulty || '',
      category: ex.category || '',
    }))

    const { error: insertErr } = await supabase
      .from('exercises')
      .upsert(rows, { onConflict: 'id' })

    if (insertErr) {
      console.error('[sync-exercises] Upsert error:', JSON.stringify(insertErr))
      return res.status(500).json({ error: `Erreur insertion: ${insertErr.message}` })
    }

    const hasMore = exercises.length === limit
    console.log(`[sync-exercises] Inserted ${rows.length}. hasMore=${hasMore}`)

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
