// Vercel Serverless Function — Batch translate exercices EN -> FR via DeepL
// Appelee repetitivement par le client avec pagination.
// Chaque call traduit un batch et update la DB.
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

// DeepL endpoint : free = api-free.deepl.com, pro = api.deepl.com
// Detecte automatiquement selon la cle (se termine par :fx en free)
function getDeepLEndpoint(apiKey) {
  return apiKey.endsWith(':fx')
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate'
}

async function translateBatch(apiKey, texts) {
  if (!texts.length) return []
  const endpoint = getDeepLEndpoint(apiKey)

  // DeepL accepte jusqu'a 50 textes par requete
  // On utilise application/x-www-form-urlencoded avec text multiple
  const body = new URLSearchParams()
  for (const t of texts) body.append('text', t)
  body.append('source_lang', 'EN')
  body.append('target_lang', 'FR')
  body.append('formality', 'prefer_less') // utilise le tutoiement

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

export default async function handler(req, res) {
  setCors(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const sbUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const deeplKey = process.env.DEEPL_API_KEY

  if (!sbUrl || !sbKey) {
    return res.status(500).json({ error: 'Missing SUPABASE config' })
  }
  if (!deeplKey) {
    return res.status(500).json({ error: 'DEEPL_API_KEY non configuree' })
  }

  const { limit = 20 } = req.body || {}

  const supabase = createClient(sbUrl, sbKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    // 1. Recuperer les exercices non traduits
    const { data: rows, error: selectErr } = await supabase
      .from('exercises')
      .select('id, name, description, instructions, secondary_muscles, name_fr, description_fr, instructions_fr, secondary_muscles_fr')
      .or('name_fr.is.null,name_fr.eq.')
      .limit(limit)

    if (selectErr) {
      console.error('[translate] select error:', selectErr)
      return res.status(500).json({ error: `Erreur select: ${selectErr.message}` })
    }

    if (!rows || rows.length === 0) {
      // Aucun reste -> calcul total
      const { count } = await supabase.from('exercises').select('*', { count: 'exact', head: true })
      return res.status(200).json({ translated: 0, hasMore: false, totalRemaining: 0, total: count || 0 })
    }

    console.log(`[translate] Processing ${rows.length} exercises`)

    // 2. Preparer tous les textes a traduire en un seul batch
    // Structure: on note pour chaque row quels sont les textes et leurs positions
    const texts = []
    const mapping = [] // [{ rowIdx, field, subIdx? }]

    rows.forEach((row, rowIdx) => {
      // name
      if (row.name) {
        texts.push(row.name)
        mapping.push({ rowIdx, field: 'name_fr' })
      }
      // description
      if (row.description) {
        texts.push(row.description)
        mapping.push({ rowIdx, field: 'description_fr' })
      }
      // instructions (array)
      if (Array.isArray(row.instructions)) {
        row.instructions.forEach((step, subIdx) => {
          texts.push(step)
          mapping.push({ rowIdx, field: 'instructions_fr', subIdx })
        })
      }
      // secondary_muscles (array)
      if (Array.isArray(row.secondary_muscles)) {
        row.secondary_muscles.forEach((m, subIdx) => {
          texts.push(m)
          mapping.push({ rowIdx, field: 'secondary_muscles_fr', subIdx })
        })
      }
    })

    console.log(`[translate] Total texts to translate: ${texts.length}`)

    // 3. Traduire en batches de 50 (limite DeepL)
    const BATCH_SIZE = 50
    const translations = []
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const chunk = texts.slice(i, i + BATCH_SIZE)
      const translated = await translateBatch(deeplKey, chunk)
      translations.push(...translated)
    }

    // 4. Reconstruire les structures par row
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

    // 5. Update en DB (une par une, simple et safe)
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

      if (updateErr) {
        console.error(`[translate] Update error for ${u.id}:`, updateErr.message)
      }
    }

    // 6. Calcul combien reste
    const { count: totalRemaining } = await supabase
      .from('exercises')
      .select('*', { count: 'exact', head: true })
      .or('name_fr.is.null,name_fr.eq.')

    const { count: total } = await supabase
      .from('exercises')
      .select('*', { count: 'exact', head: true })

    const hasMore = (totalRemaining || 0) > 0

    console.log(`[translate] Done ${rows.length} | remaining: ${totalRemaining}`)

    return res.status(200).json({
      translated: rows.length,
      hasMore,
      totalRemaining: totalRemaining || 0,
      total: total || 0,
    })
  } catch (error) {
    console.error('[translate] Error:', error)
    return res.status(500).json({ error: error.message || 'Erreur interne' })
  }
}
