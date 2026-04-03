'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addSleepLog, deleteSleepLog } from './actions'

const QUALITY_LABELS: Record<number, { label: string; emoji: string }> = {
  1: { label: 'Terrible', emoji: '😫' },
  2: { label: 'Poor', emoji: '😞' },
  3: { label: 'Fair', emoji: '😐' },
  4: { label: 'Good', emoji: '😊' },
  5: { label: 'Excellent', emoji: '😴' },
}

type SleepLog = {
  id: string
  bedtime: string
  wake_time: string
  quality: number
  notes: string | null
  date: string
}

function getDuration(bedtime: string, wakeTime: string): string {
  const diff = new Date(wakeTime).getTime() - new Date(bedtime).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function SleepClient({ logs }: { logs: SleepLog[] }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const avgQuality = logs.length
    ? (logs.reduce((sum, l) => sum + l.quality, 0) / logs.length).toFixed(1)
    : null

  async function handleAdd(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await addSleepLog(formData)
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    setShowForm(false)
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Sleep</h2>
          {avgQuality && (
            <p className="text-gray-500 text-sm mt-1">
              Avg quality: <span className="font-semibold text-gray-700">{avgQuality} / 5</span>
            </p>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          {showForm ? 'Cancel' : '+ Log Sleep'}
        </button>
      </div>

      {showForm && (
        <form action={handleAdd} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
          <h3 className="font-semibold text-gray-700">Log Sleep</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Bedtime date</label>
              <input
                name="date"
                type="date"
                defaultValue={yesterday}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Bedtime</label>
              <input
                name="bedtime"
                type="time"
                defaultValue="22:00"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Wake date</label>
              <input
                name="wake_date"
                type="date"
                defaultValue={today}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Wake time</label>
              <input
                name="wake_time"
                type="time"
                defaultValue="07:00"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-2">Sleep Quality</label>
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map(q => (
                  <label key={q} className="flex flex-col items-center gap-1 cursor-pointer">
                    <input type="radio" name="quality" value={q} required className="sr-only peer" defaultChecked={q === 3} />
                    <span className="text-2xl peer-checked:scale-125 transition-transform">{QUALITY_LABELS[q].emoji}</span>
                    <span className="text-xs text-gray-500">{q}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">Notes (optional)</label>
              <input
                name="notes"
                type="text"
                placeholder="e.g. Woke up twice, had vivid dreams..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Sleep Log'}
          </button>
        </form>
      )}

      {logs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">😴</div>
          <p>No sleep logs yet. Start tracking your rest!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <div key={log.id} className="bg-white rounded-xl border border-gray-200 px-4 py-4 flex items-start justify-between gap-3 hover:bg-gray-50 transition">
              <div className="flex items-start gap-3">
                <span className="text-3xl mt-0.5">{QUALITY_LABELS[log.quality]?.emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{log.date}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatTime(log.bedtime)} → {formatTime(log.wake_time)}
                    <span className="ml-2 font-medium text-purple-600">{getDuration(log.bedtime, log.wake_time)}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{QUALITY_LABELS[log.quality]?.label} ({log.quality}/5)</p>
                  {log.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{log.notes}</p>}
                </div>
              </div>
              <button
                onClick={async () => { await deleteSleepLog(log.id); router.refresh() }}
                className="text-gray-400 hover:text-red-500 transition text-xs shrink-0 mt-1"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
