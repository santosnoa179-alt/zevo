import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Loader2, Scale, Moon, Smile, Activity } from 'lucide-react'

const PERIODES = [
  { id: 30, label: '30 j' },
  { id: 90, label: '90 j' },
]

function fmtDateCourt(iso) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

function ChartCard({ icon: Icon, title, data, dataKey, unite, color = '#FF6B2B', domain }) {
  const last = data.length > 0 ? data[data.length - 1][dataKey] : null
  return (
    <div className="bg-[var(--bg-card)] border border-[rgba(255,255,255,0.08)] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[var(--text-primary)] font-semibold text-sm flex items-center gap-2">
          <Icon size={15} className="text-[#FF6B2B]" /> {title}
        </h3>
        <span className="text-[var(--text-primary)] text-sm font-bold tabular-nums">
          {last != null ? `${last} ${unite}` : '—'}
        </span>
      </div>
      {data.length === 0 ? (
        <p className="text-[var(--text-muted)] text-xs py-8 text-center">Aucune donnée sur la période.</p>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                   axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                   axisLine={false} tickLine={false} domain={domain || ['auto', 'auto']} />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, fontSize: 12,
              }}
              labelStyle={{ color: 'var(--text-muted)' }}
              formatter={(v) => [`${v} ${unite}`, title]} />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2}
                  dot={data.length <= 31} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export default function SanteTab({ clientId }) {
  const [loading, setLoading] = useState(true)
  const [periode, setPeriode] = useState(30)
  const [poids, setPoids] = useState([])
  const [sommeil, setSommeil] = useState([])
  const [humeur, setHumeur] = useState([])
  const [sport, setSport] = useState([])

  useEffect(() => {
    if (!clientId) return
    const load = async () => {
      setLoading(true)
      const dateMin = new Date(Date.now() - periode * 86400000).toISOString().slice(0, 10)
      const [poidsRes, sommeilRes, humeurRes, sportRes] = await Promise.all([
        supabase.from('suivi_poids').select('date_pesee, poids')
          .eq('client_id', clientId).gte('date_pesee', dateMin).order('date_pesee'),
        supabase.from('sommeil_log').select('date, heures, qualite')
          .eq('client_id', clientId).gte('date', dateMin).order('date'),
        supabase.from('humeur_log').select('date, score')
          .eq('client_id', clientId).gte('date', dateMin).order('date'),
        supabase.from('sport_log').select('date, duree_minutes, intensite, type_activite')
          .eq('client_id', clientId).gte('date', dateMin).order('date'),
      ])
      setPoids((poidsRes.data || []).map(r => ({ label: fmtDateCourt(r.date_pesee), poids: r.poids })))
      setSommeil((sommeilRes.data || []).map(r => ({ label: fmtDateCourt(r.date), heures: r.heures })))
      setHumeur((humeurRes.data || []).map(r => ({ label: fmtDateCourt(r.date), score: r.score })))
      setSport((sportRes.data || []).map(r => ({ label: fmtDateCourt(r.date), minutes: r.duree_minutes || 0 })))
      setLoading(false)
    }
    load()
  }, [clientId, periode])

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#FF6B2B]" size={24} /></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        {PERIODES.map(p => (
          <button key={p.id} onClick={() => setPeriode(p.id)}
            className={`text-[11px] px-2.5 py-1 rounded-full font-semibold transition-colors ${
              periode === p.id
                ? 'bg-[#FF6B2B]/10 text-[#FF6B2B]'
                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard icon={Scale} title="Poids" data={poids} dataKey="poids" unite="kg" />
        <ChartCard icon={Moon} title="Sommeil" data={sommeil} dataKey="heures" unite="h" color="#818cf8" domain={[0, 12]} />
        <ChartCard icon={Smile} title="Humeur" data={humeur} dataKey="score" unite="/10" color="#34d399" domain={[0, 10]} />
        <ChartCard icon={Activity} title="Activité" data={sport} dataKey="minutes" unite="min" color="#f472b6" />
      </div>
    </div>
  )
}
