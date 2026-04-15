// Vercel Serverless Function — Proxy GIF ExerciseDB avec cache Supabase Storage
// Flow:
// 1. Check si le GIF existe deja dans Storage (exercise-gifs/{id}.gif)
// 2. Si oui -> retourne l'URL publique
// 3. Si non -> fetch depuis ExerciseDB /image, upload dans Storage, update exercises.gif_url, retourne URL
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

const BUCKET = 'exercise-gifs'

export default async function handler(req, res) {
  setCors(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const sbUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const rapidApiKey = process.env.VITE_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY
  const rapidApiHost = process.env.VITE_RAPIDAPI_HOST || process.env.RAPIDAPI_HOST || 'exercisedb.p.rapidapi.com'

  if (!sbUrl || !sbKey) {
    return res.status(500).json({ error: 'Missing SUPABASE config' })
  }
  if (!rapidApiKey) {
    return res.status(500).json({ error: 'RAPIDAPI_KEY non configuree' })
  }

  const { exerciseId, resolution = 180 } = req.body || {}

  if (!exerciseId) {
    return res.status(400).json({ error: 'exerciseId requis' })
  }

  const supabase = createClient(sbUrl, sbKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const fileName = `${exerciseId}.gif`

  try {
    // 1. Check si le fichier existe deja dans Storage
    const { data: existingFile } = await supabase.storage
      .from(BUCKET)
      .list('', { search: fileName, limit: 1 })

    if (existingFile && existingFile.length > 0 && existingFile.some(f => f.name === fileName)) {
      // Deja en cache -> retourne URL publique
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName)
      console.log(`[exercise-gif] Cache HIT ${exerciseId}`)
      return res.status(200).json({ url: urlData.publicUrl, cached: true })
    }

    // 2. Cache miss -> fetch depuis ExerciseDB
    console.log(`[exercise-gif] Cache MISS ${exerciseId} -> fetching from ExerciseDB`)
    const apiUrl = `https://exercisedb.p.rapidapi.com/image?exerciseId=${encodeURIComponent(exerciseId)}&resolution=${resolution}`

    const apiRes = await fetch(apiUrl, {
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': rapidApiHost,
      },
    })

    if (!apiRes.ok) {
      const text = await apiRes.text()
      console.error(`[exercise-gif] ExerciseDB error ${apiRes.status}:`, text.substring(0, 200))
      return res.status(502).json({ error: `ExerciseDB API error: ${apiRes.status}` })
    }

    const buffer = Buffer.from(await apiRes.arrayBuffer())

    // 3. Upload dans Supabase Storage
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buffer, {
        contentType: 'image/gif',
        upsert: true,
      })

    if (uploadErr) {
      console.error('[exercise-gif] Upload error:', uploadErr)
      return res.status(500).json({ error: `Erreur upload Storage: ${uploadErr.message}` })
    }

    // 4. Recuperer URL publique
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName)
    const publicUrl = urlData.publicUrl

    // 5. Update exercises.gif_url pour les prochaines fois (skip si table n'a pas le champ)
    await supabase
      .from('exercises')
      .update({ gif_url: publicUrl })
      .eq('id', String(exerciseId))

    console.log(`[exercise-gif] Cached ${exerciseId} -> ${publicUrl}`)
    return res.status(200).json({ url: publicUrl, cached: false })
  } catch (error) {
    console.error('[exercise-gif] Error:', error)
    return res.status(500).json({ error: error.message || 'Erreur interne' })
  }
}
