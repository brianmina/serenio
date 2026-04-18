'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { upsertBudget, deleteBudget } from './actions'

const EXPENSE_CATEGORIES = [
  'Food & Dining', 'Transport', 'Housing', 'Health', 'Entertainment',
  'Shopping', 'Subscriptions', 'Education', 'Other',
]

type Budget = {
  id: string
  category: string
  limit_amount: number
  month: number
  year: number
}

type SpendMap = Record<string, number>

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

export default function BudgetsClient({
  budgets,
  spending,
  currentMonth,
  currentYear,
}: {
  budgets: Budget[]
  spending: SpendMap
  currentMonth: number
  currentYear: number
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMonth, setViewMonth] = useState(currentMonth)
  const [viewYear, setViewYear] = useState(currentYear)

  const visibleBudgets = budgets.filter(b => b.month === viewMonth && b.year === viewYear)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await upsertBudget(formData)
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    setShowForm(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    await deleteBudget(id)
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Budgets</h2>
          <p className="text-gray-500 text-sm mt-1">Set monthly spending limits per category</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          {showForm ? 'Cancel' : '+ Set Budget'}
        </button>
      </div>

      {showForm && (
        <form action={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
          <h3 className="font-semibold text-gray-700">New Budget</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Category</label>
              <select
                name="category"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Monthly Limit ($)</label>
              <input
                name="limit_amount"
                type="number"
                step="0.01"
                min="1"
                required
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Month</label>
              <select
                name="month"
                defaultValue={currentMonth}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Year</label>
              <input
                name="year"
                type="number"
                defaultValue={currentYear}
                min="2020"
                max="2099"
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
            {loading ? 'Saving...' : 'Save Budget'}
          </button>
        </form>
      )}

      {/* Month picker */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[-1, 0, 1].map(offset => {
          const d = new Date(currentYear, currentMonth - 1 + offset)
          const m = d.getMonth() + 1
          const y = d.getFullYear()
          const active = m === viewMonth && y === viewYear
          return (
            <button
              key={offset}
              onClick={() => { setViewMonth(m); setViewYear(y) }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                active ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-emerald-300'
              }`}
            >
              {MONTHS[m - 1]} {y}
            </button>
          )
        })}
      </div>

      {visibleBudgets.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🎯</div>
          <p>No budgets for this month. Set one to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleBudgets.map(budget => {
            const spent = spending[budget.category] ?? 0
            const pct = Math.min((spent / Number(budget.limit_amount)) * 100, 100)
            const over = spent > Number(budget.limit_amount)
            return (
              <div key={budget.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-semibold text-gray-800">{budget.category}</span>
                    <span className="ml-2 text-xs text-gray-400">{MONTHS[budget.month - 1]} {budget.year}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${over ? 'text-red-600' : 'text-gray-600'}`}>
                      ${spent.toFixed(2)} / ${Number(budget.limit_amount).toFixed(2)}
                    </span>
                    <button onClick={() => handleDelete(budget.id)} className="text-gray-400 hover:text-red-500 text-xs transition">Delete</button>
                  </div>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : pct > 80 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {over && (
                  <p className="text-xs text-red-500 mt-1">
                    Over budget by ${(spent - Number(budget.limit_amount)).toFixed(2)}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
