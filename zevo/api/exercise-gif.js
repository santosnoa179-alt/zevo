// Vercel Serverless Function — Proxy GIF ExerciseDB avec cache Supabase Storage
// Flow:
// 1. HEAD sur l'URL publique Supabase Storage pour verifier si cache
// 2. Si 200 -> retourne l'URL publique
// 3. Si 404 -> fetch depuis ExerciseDB /image, upload dans Storage, update exercises.gif_url
import { createClient } from '@supabase/supabase-js'

const ALLOWED_ORIGINS = [
  'https://zevo-one.com',
  'https://app.zevo-one.com',
  'https://www.zevo-one.com',
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

async function verifyAuth(req, sbUrl, sbKey) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.replace('Bearer ', '')
  const authClient = createClient(sbUrl, sbKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: { user }, error } = await authClient.auth.getUser(token)
  if (error || !user) return null
  return user
}

export default async function handler(req, res) {
  setCors(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const sbUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const rapidApiKey = process.env.RAPIDAPI_KEY || process.env.VITE_RAPIDAPI_KEY
  const rapidApiHost = process.env.RAPIDAPI_HOST || process.env.VITE_RAPIDAPI_HOST || 'exercisedb.p.rapidapi.com'

  // SECURITY : restreindre aux users authentifies (evite les abus de quota RapidAPI)
  if (sbUrl && sbKey) {
    const user = await verifyAuth(req, sbUrl, sbKey)
    if (!user) return res.status(401).json({ error: 'Non autorise' })
  }

  console.log('[exercise-gif] ENV check', {
    hasSbUrl: !!sbUrl,
    hasSbKey: !!sbKey,
    hasRapidKey: !!rapidApiKey,
    rapidHost: rapidApiHost,
  })

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
  const publicUrl = `${sbUrl}/storage/v1/object/public/${BUCKET}/${fileName}`

  try {
    // 1. HEAD pour verifier si le GIF est deja en cache
    console.log(`[exercise-gif] HEAD ${publicUrl}`)
    try {
      const headRes = await fetch(publicUrl, { method: 'HEAD' })
      if (headRes.ok) {
        console.log(`[exercise-gif] Cache HIT ${exerciseId}`)
        return res.status(200).json({ url: publicUrl, cached: true })
      }
    } catch (headErr) {
      // ignore, on continue vers fetch
      console.log(`[exercise-gif] HEAD failed: ${headErr.message}`)
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
      return res.status(502).json({ error: `ExerciseDB API error: ${apiRes.status}`, details: text.substring(0, 200) })
    }

    const arrayBuffer = await apiRes.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log(`[exercise-gif] Fetched ${buffer.length} bytes from ExerciseDB`)

    // 3. Upload dans Supabase Storage
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buffer, {
        contentType: 'image/gif',
        upsert: true,
      })

    if (uploadErr) {
      console.error('[exercise-gif] Upload error:', JSON.stringify(uploadErr))
      return res.status(500).json({ error: `Erreur upload Storage: ${uploadErr.message || JSON.stringify(uploadErr)}` })
    }

    console.log(`[exercise-gif] Uploaded ${fileName}`)

    // 4. Update exercises.gif_url pour les prochaines fois
    const { error: updateErr } = await supabase
      .from('exercises')
      .update({ gif_url: publicUrl })
      .eq('id', String(exerciseId))

    if (updateErr) {
      console.warn('[exercise-gif] Update exercises.gif_url warning:', updateErr.message)
      // On continue quand meme
    }

    console.log(`[exercise-gif] Cached ${exerciseId} -> ${publicUrl}`)
    return res.status(200).json({ url: publicUrl, cached: false })
  } catch (error) {
    console.error('[exercise-gif] Error:', error, error.stack)
    return res.status(500).json({ error: error.message || 'Erreur interne', stack: error.stack?.substring(0, 500) })
  }
}
