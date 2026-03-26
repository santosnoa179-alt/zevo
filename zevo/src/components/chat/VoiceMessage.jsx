import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, Square, X, Play, Pause } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ══════════════════════════════════════════════════════════
// VOICE RECORDER — Bandeau d'enregistrement + upload
// ══════════════════════════════════════════════════════════

export function VoiceRecorder({ onSend, disabled }) {
  const [recording, setRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [uploading, setUploading] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const streamRef = useRef(null)

  // Lance l'enregistrement automatiquement au montage
  useEffect(() => {
    startRecording()
    return () => {
      clearInterval(timerRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Préférence : webm opus → mp4 → wav
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/webm'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.start(100) // chunk toutes les 100ms pour fluidité
      setRecording(true)
      setDuration(0)

      timerRef.current = setInterval(() => {
        setDuration(d => d + 1)
      }, 1000)
    } catch (err) {
      console.error('Microphone non autorisé:', err)
    }
  }

  const stopAndSend = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return

    clearInterval(timerRef.current)
    const finalDuration = duration

    return new Promise((resolve) => {
      mediaRecorderRef.current.onstop = async () => {
        // Arrête le micro
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop())
          streamRef.current = null
        }

        const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current.mimeType })
        chunksRef.current = []

        if (blob.size < 1000) {
          // Trop court, ignore
          setRecording(false)
          setDuration(0)
          resolve()
          return
        }

        setUploading(true)

        // Upload vers Supabase Storage
        const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
        const fileName = `vocal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
        const filePath = `vocaux/${fileName}`

        const { error: uploadErr } = await supabase.storage
          .from('messages_vocaux')
          .upload(filePath, blob, { contentType: blob.type, upsert: false })

        if (uploadErr) {
          console.error('Upload erreur:', uploadErr)
          setUploading(false)
          setRecording(false)
          setDuration(0)
          resolve()
          return
        }

        // URL publique
        const { data: urlData } = supabase.storage
          .from('messages_vocaux')
          .getPublicUrl(filePath)

        const audioUrl = urlData?.publicUrl

        if (audioUrl && onSend) {
          await onSend(audioUrl, finalDuration)
        }

        setUploading(false)
        setRecording(false)
        setDuration(0)
        resolve()
      }

      mediaRecorderRef.current.stop()
    })
  }, [duration, onSend])

  const cancelRecording = () => {
    clearInterval(timerRef.current)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {} // empêche l'envoi
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    chunksRef.current = []
    setRecording(false)
    setDuration(0)
  }

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  // Tick d'animation pour les barres waveform (re-render toutes les 120ms)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!recording) return
    const id = setInterval(() => setTick(t => t + 1), 120)
    return () => clearInterval(id)
  }, [recording])

  // ── Mode enregistrement actif ──
  if (recording || uploading) {
    return (
      <div className="flex items-center gap-2 flex-1">
        {/* Annuler */}
        <button
          type="button"
          onClick={cancelRecording}
          disabled={uploading}
          className="w-9 h-9 rounded-xl bg-[#2A2A2A] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white/70 transition-colors disabled:opacity-40"
        >
          <X size={16} />
        </button>

        {/* Bandeau animé */}
        <div className="flex-1 bg-[#2A2A2A] border border-white/[0.08] rounded-xl px-4 py-2.5 flex items-center gap-3">
          {/* Dot pulsant */}
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />

          {/* Waveform animée */}
          <div className="flex items-center gap-[3px] flex-1 h-6">
            {Array.from({ length: 24 }, (_, i) => {
              const h = 4 + Math.abs(Math.sin((tick * 0.3) + i * 0.7)) * 16 + Math.abs(Math.cos((tick * 0.2) + i * 1.1)) * 4
              return (
                <div
                  key={i}
                  className="w-[3px] rounded-full bg-[#FF6B2B]/60 transition-[height] duration-100"
                  style={{ height: `${h}px` }}
                />
              )
            })}
          </div>

          {/* Timer */}
          <span className="text-white/60 text-xs font-mono tabular-nums min-w-[36px] text-right">
            {uploading ? 'Envoi…' : formatTime(duration)}
          </span>
        </div>

        {/* Stop + envoyer */}
        <button
          type="button"
          onClick={stopAndSend}
          disabled={uploading || duration < 1}
          className="w-10 h-10 rounded-xl bg-[#FF6B2B] flex items-center justify-center hover:bg-[#FF9A6C] transition-colors disabled:opacity-40"
        >
          {uploading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Square size={14} className="text-white" fill="white" />
          )}
        </button>
      </div>
    )
  }

  // ── Bouton micro (état normal) ──
  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled}
      className="w-10 h-10 rounded-xl bg-[#2A2A2A] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-[#FF6B2B] hover:border-[#FF6B2B]/30 transition-all disabled:opacity-40 flex-shrink-0"
      title="Note vocale"
    >
      <Mic size={16} />
    </button>
  )
}


// ══════════════════════════════════════════════════════════
// AUDIO BUBBLE — Lecteur audio dans une bulle de message
// ══════════════════════════════════════════════════════════

// Waveform statique pré-générée (déterministe par URL)
function generateWaveform(seed, count = 32) {
  const bars = []
  let h = 0.5
  for (let i = 0; i < count; i++) {
    // Simple pseudo-random basé sur le seed
    h = ((h * 9301 + 49297) % 233280) / 233280
    bars.push(0.15 + h * 0.85)
  }
  return bars
}

function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function AudioBubble({ audioUrl, audioDuration, estMoi, createdAt }) {
  const audioRef = useRef(null)
  const animRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(audioDuration || 0)
  const [speed, setSpeed] = useState(1)

  const waveform = useRef(generateWaveform(hashString(audioUrl || ''), 36)).current

  // Met à jour la durée quand les metadata sont chargées
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoaded = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setTotalDuration(audio.duration)
      }
    }
    const onEnded = () => {
      setPlaying(false)
      setProgress(0)
      setCurrentTime(0)
      cancelAnimationFrame(animRef.current)
    }

    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('ended', onEnded)
      cancelAnimationFrame(animRef.current)
    }
  }, [audioUrl])

  // Animation frame pour la barre de progression
  const updateProgress = useCallback(() => {
    const audio = audioRef.current
    if (!audio || audio.paused) return
    const dur = audio.duration || totalDuration || 1
    setProgress(audio.currentTime / dur)
    setCurrentTime(audio.currentTime)
    animRef.current = requestAnimationFrame(updateProgress)
  }, [totalDuration])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (playing) {
      audio.pause()
      cancelAnimationFrame(animRef.current)
      setPlaying(false)
    } else {
      audio.playbackRate = speed
      audio.play().then(() => {
        setPlaying(true)
        animRef.current = requestAnimationFrame(updateProgress)
      }).catch(() => {})
    }
  }

  const cycleSpeed = (e) => {
    e.stopPropagation()
    const speeds = [1, 1.5, 2]
    const idx = speeds.indexOf(speed)
    const next = speeds[(idx + 1) % speeds.length]
    setSpeed(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }

  // Clic sur la waveform pour seek
  const handleWaveClick = (e) => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audio.currentTime = pct * audio.duration
    setProgress(pct)
    setCurrentTime(audio.currentTime)
  }

  const formatTime = (s) => {
    const sec = Math.round(s)
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
  }

  const displayTime = playing ? currentTime : totalDuration
  const timeStr = displayTime > 0 ? formatTime(displayTime) : '0:00'

  return (
    <div className={`flex ${estMoi ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-[80%] min-w-[240px] sm:min-w-[280px] rounded-2xl overflow-hidden ${
        estMoi
          ? 'bg-[#FF6B2B] rounded-br-sm'
          : 'bg-[#2A2A2A] rounded-bl-sm'
      }`}>
        <audio ref={audioRef} src={audioUrl} preload="metadata" />

        <div className="px-3.5 py-3 flex items-center gap-2.5">
          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
              estMoi
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-white/[0.08] hover:bg-white/[0.14] text-[#F5F5F3]'
            }`}
          >
            {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="ml-0.5" />}
          </button>

          {/* Waveform + progress */}
          <div className="flex-1 min-w-0">
            <div
              className="flex items-center gap-[2px] h-8 cursor-pointer"
              onClick={handleWaveClick}
            >
              {waveform.map((h, i) => {
                const barProgress = i / waveform.length
                const isPlayed = barProgress <= progress
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-full transition-colors duration-100"
                    style={{
                      height: `${h * 100}%`,
                      minWidth: '2px',
                      backgroundColor: estMoi
                        ? isPlayed ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)'
                        : isPlayed ? '#FF6B2B' : 'rgba(255,255,255,0.12)',
                    }}
                  />
                )
              })}
            </div>

            {/* Durée + vitesse */}
            <div className="flex items-center justify-between mt-1">
              <span className={`text-[10px] font-mono tabular-nums ${
                estMoi ? 'text-white/60' : 'text-white/30'
              }`}>
                {timeStr}
              </span>

              <div className="flex items-center gap-2">
                {/* Vitesse */}
                <button
                  onClick={cycleSpeed}
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md transition-colors ${
                    estMoi
                      ? speed === 1 ? 'text-white/50' : 'bg-white/20 text-white'
                      : speed === 1 ? 'text-white/30' : 'bg-white/[0.08] text-white/60'
                  }`}
                >
                  x{speed}
                </button>

                {/* Heure */}
                <span className={`text-[10px] ${estMoi ? 'text-white/50' : 'text-white/25'}`}>
                  {createdAt ? new Date(createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
