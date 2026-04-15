// Vercel Serverless Function — Gestion batch des exercices (sync + traduction)
// Actions:
//   - action: 'sync'      -> ExerciseDB -> Supabase (paginated)
//   - action: 'translate' -> OpenAI EN -> FR sur les rows non traduites
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

// ── OpenAI translate helper ──
// Traduit un exercice complet d'un coup (plus consistant qu'un batch de strings isolees)
async function translateExercise(apiKey, exercise) {
  const input = {
    name: exercise.name || '',
    description: exercise.description || '',
    instructions: Array.isArray(exercise.instructions) ? exercise.instructions : [],
    secondary_muscles: Array.isArray(exercise.secondary_muscles) ? exercise.secondary_muscles : [],
  }

  const systemPrompt = `Tu es un coach sportif francophone expert en musculation et fitness. Tu traduis des exercices de l'anglais vers le francais en utilisant le jargon correct du metier.

Regles STRICTES:
- Tutoiement systematique (tu, tes, toi)
- Casse francaise normale pour les titres: "Dip poitrine assiste (a genoux)" PAS "Dip De Poitrine Assiste (A Genoux)"
- Garde les termes anglais qui n'ont pas d'equivalent francais clair: Dip, Squat, Lunge, Push-Up, Pull-Up, Crunch, Plank, Burpee, Thruster, Clean, Snatch, Deadlift (ou "Soulever de terre"), Row (ou "Tirage"), Press (ou "Developpe"), Curl, Extension
- Vocabulaire correct:
  * Chest Dip = Dip poitrine (PAS "developpe couche")
  * Bench Press = Developpe couche
  * Shoulder Press = Developpe epaules
  * Lat Pulldown = Tirage vertical
  * Deadlift = Soulever de terre
  * Romanian Deadlift = Soulever de terre roumain
  * Good Morning = Good morning
  * Calf Raise = Extension des mollets
  * Leg Curl = Flexion des jambes
  * Leg Extension = Extension des jambes
- Muscles:
  * Chest = Pectoraux / Poitrine
  * Back / Lats = Dos / Dorsaux
  * Shoulders / Delts = Epaules
  * Biceps, Triceps, Forearms = Biceps, Triceps, Avant-bras
  * Quadriceps, Hamstrings, Glutes, Calves = Quadriceps, Ischio-jambiers, Fessiers, Mollets
  * Abs / Core = Abdominaux / Gainage
  * Traps = Trapezes
- Traduction naturelle et fluide, pas mot a mot
- Reponds UNIQUEMENT en JSON valide, sans markdown, sans commentaire`

  const userPrompt = `Traduis cet exercice en francais et retourne un JSON avec EXACTEMENT cette structure:
{
  "name": "titre en francais",
  "description": "description en francais",
  "instructions": ["etape 1", "etape 2", ...],
  "secondary_muscles": ["muscle 1", "muscle 2", ...]
}

Conserve le MEME nombre d'elements dans "instructions" et "secondary_muscles" que l'input.

Input:
${JSON.stringify(input, null, 2)}`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI ${res.status}: ${text.substring(0, 300)}`)
  }

  const json = await res.json()
  const content = json.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenAI: reponse vide')

  let parsed
  try {
    parsed = JSON.parse(content)
  } catch (err) {
    throw new Error(`OpenAI: JSON invalide: ${content.substring(0, 200)}`)
  }

  // Normaliser les tableaux pour qu'ils matchent la taille de l'input
  const instructionsFr = Array.isArray(parsed.instructions) ? parsed.instructions : []
  const secondaryMusclesFr = Array.isArray(parsed.secondary_muscles) ? parsed.secondary_muscles : []

  return {
    name_fr: parsed.name || '',
    description_fr: parsed.description || '',
    instructions_fr: instructionsFr.length === input.instructions.length
      ? instructionsFr
      : input.instructions.map((_, i) => instructionsFr[i] || ''),
    secondary_muscles_fr: secondaryMusclesFr.length === input.secondary_muscles.length
      ? secondaryMusclesFr
      : input.secondary_muscles.map((_, i) => secondaryMusclesFr[i] || ''),
  }
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
  // ACTION: TRANSLATE (via OpenAI)
  // ═══════════════════════════════════════════════
  if (action === 'translate') {
    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY non configuree' })
    }

    const { limit = 10 } = req.body || {}

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

      console.log(`[translate] Processing ${rows.length} exercises via OpenAI`)

      // 2. Traduire chaque exercice en parallele (limite Vercel: 10s/60s timeout)
      //    On traite en parallele par batch de 5 pour pas exploser le rate limit OpenAI
      const CONCURRENCY = 5
      let translatedCount = 0
      const errors = []

      for (let i = 0; i < rows.length; i += CONCURRENCY) {
        const chunk = rows.slice(i, i + CONCURRENCY)
        const results = await Promise.allSettled(
          chunk.map(row => translateExercise(openaiKey, row))
        )

        // 3. Update DB pour chaque traduction reussie
        for (let j = 0; j < chunk.length; j++) {
          const row = chunk[j]
          const result = results[j]

          if (result.status === 'rejected') {
            console.error(`[translate] Error ${row.id}:`, result.reason?.message)
            errors.push(`${row.id}: ${result.reason?.message || 'erreur inconnue'}`)
            continue
          }

          const { error: updateErr } = await supabase
            .from('exercises')
            .update(result.value)
            .eq('id', row.id)

          if (updateErr) {
            console.error(`[translate] Update error for ${row.id}:`, updateErr.message)
            errors.push(`${row.id}: ${updateErr.message}`)
          } else {
            translatedCount++
          }
        }
      }

      // 4. Count remaining
      const { count: totalRemaining } = await supabase
        .from('exercises')
        .select('*', { count: 'exact', head: true })
        .or('name_fr.is.null,name_fr.eq.')

      const { count: total } = await supabase
        .from('exercises')
        .select('*', { count: 'exact', head: true })

      return res.status(200).json({
        translated: translatedCount,
        hasMore: (totalRemaining || 0) > 0,
        totalRemaining: totalRemaining || 0,
        total: total || 0,
        errors: errors.length ? errors.slice(0, 5) : undefined,
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
