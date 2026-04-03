'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addFoodLog, deleteFoodLog } from './actions'

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

const MEAL_ICONS: Record<string, string> = {
  Breakfast: '🌅',
  Lunch: '☀️',
  Dinner: '🌙',
  Snack: '🍎',
}

type FoodLog = {
  id: string
  meal_type: string
  description: string
  calories: number | null
  date: string
}

export default function FoodClient({ logs }: { logs: FoodLog[] }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  const totalCaloriesToday = logs
    .filter(l => l.date === today)
    .reduce((sum, l) => sum + (l.calories ?? 0), 0)

  // Group logs by date
  const grouped = logs.reduce<Record<string, FoodLog[]>>((acc, log) => {
    if (!acc[log.date]) acc[log.date] = []
    acc[log.date].push(log)
    return acc
  }, {})

  async function handleAdd(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await addFoodLog(formData)
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    setShowForm(false)
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Food Intake</h2>
          <p className="text-gray-500 text-sm mt-1">
            Today: <span className="font-semibold text-gray-700">{totalCaloriesToday} kcal logged</span>
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          {showForm ? 'Cancel' : '+ Log Meal'}
        </button>
      </div>

      {showForm && (
        <form action={handleAdd} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
          <h3 className="font-semibold text-gray-700">Log a Meal</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Meal Type</label>
              <select
                name="meal_type"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {MEAL_TYPES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Calories (optional)</label>
              <input
                name="calories"
                type="number"
                min="0"
                placeholder="e.g. 450"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">What did you eat?</label>
              <input
                name="description"
                type="text"
                required
                placeholder="e.g. Oatmeal with banana and honey"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Date</label>
              <input
                name="date"
                type="date"
                defaultValue={today}
                required
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
            {loading ? 'Saving...' : 'Save Meal'}
          </button>
        </form>
      )}

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🥗</div>
          <p>No meals logged yet. Start tracking your food!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, entries]) => {
            const dayCalories = entries.reduce((sum, e) => sum + (e.calories ?? 0), 0)
            return (
              <div key={date} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
                  <span className="text-sm font-semibold text-gray-700">{date}</span>
                  {dayCalories > 0 && (
                    <span className="text-xs text-gray-500">{dayCalories} kcal total</span>
                  )}
                </div>
                <div className="divide-y divide-gray-100">
                  {entries.map(log => (
                    <div key={log.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{MEAL_ICONS[log.meal_type] ?? '🍽️'}</span>
                        <div>
                          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {log.meal_type}
                          </span>
                          <p className="text-sm text-gray-700 mt-0.5">{log.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {log.calories && (
                          <span className="text-sm font-medium text-gray-500">{log.calories} kcal</span>
                        )}
                        <button
                          onClick={async () => { await deleteFoodLog(log.id); router.refresh() }}
                          className="text-gray-400 hover:text-red-500 transition text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
