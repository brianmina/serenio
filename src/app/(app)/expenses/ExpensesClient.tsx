'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addExpense, deleteExpense } from './actions'

const CATEGORIES = ['Food', 'Transport', 'Health', 'Entertainment', 'Shopping', 'Bills', 'Other']

type Expense = {
  id: string
  amount: number
  category: string
  description: string | null
  date: string
}

export default function ExpensesClient({ expenses }: { expenses: Expense[] }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  async function handleAdd(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await addExpense(formData)
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    setShowForm(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    await deleteExpense(id)
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Expenses</h2>
          <p className="text-gray-500 text-sm mt-1">Total: <span className="font-semibold text-gray-700">${total.toFixed(2)}</span></p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          {showForm ? 'Cancel' : '+ Add Expense'}
        </button>
      </div>

      {showForm && (
        <form action={handleAdd} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
          <h3 className="font-semibold text-gray-700">New Expense</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Amount ($)</label>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Category</label>
              <select
                name="category"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
              <input
                name="description"
                type="text"
                placeholder="What was this for?"
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
            {loading ? 'Saving...' : 'Save Expense'}
          </button>
        </form>
      )}

      {expenses.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">💰</div>
          <p>No expenses yet. Add your first one!</p>
        </div>
      ) : (
        <>
          {/* Card list — mobile */}
          <div className="sm:hidden space-y-3">
            {expenses.map(expense => (
              <div key={expense.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">{expense.category}</span>
                    <span className="text-xs text-gray-400">{expense.date}</span>
                  </div>
                  <p className="text-sm text-gray-700 truncate">{expense.description || '—'}</p>
                </div>
                <div className="flex items-center gap-3 ml-3 shrink-0">
                  <span className="font-semibold text-gray-800">${Number(expense.amount).toFixed(2)}</span>
                  <button onClick={() => handleDelete(expense.id)} className="text-gray-400 hover:text-red-500 transition text-xs">Delete</button>
                </div>
              </div>
            ))}
          </div>

          {/* Table — tablet and up */}
          <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Date</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Category</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Description</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">Amount</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.map(expense => (
                  <tr key={expense.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 text-gray-500">{expense.date}</td>
                    <td className="px-5 py-3">
                      <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-700">{expense.description || '—'}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-800">
                      ${Number(expense.amount).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="text-gray-400 hover:text-red-500 transition text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
