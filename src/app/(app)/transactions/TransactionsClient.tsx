'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addTransaction, deleteTransaction } from './actions'

const EXPENSE_CATEGORIES = [
  'Food & Dining', 'Transport', 'Housing', 'Health', 'Entertainment',
  'Shopping', 'Subscriptions', 'Education', 'Other',
]
const INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Investment', 'Business', 'Gift', 'Other',
]

type Transaction = {
  id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  description: string | null
  date: string
}

type Filter = 'all' | 'income' | 'expense'

export default function TransactionsClient({ transactions }: { transactions: Transaction[] }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [txType, setTxType] = useState<'expense' | 'income'>('expense')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  const today = new Date().toISOString().split('T')[0]

  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.type === filter)

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  const grouped = filtered.reduce<Record<string, Transaction[]>>((acc, t) => {
    if (!acc[t.date]) acc[t.date] = []
    acc[t.date].push(t)
    return acc
  }, {})

  const categories = txType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  async function handleAdd(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await addTransaction(formData)
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    setShowForm(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    await deleteTransaction(id)
    router.refresh()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Transactions</h2>
          <p className="text-gray-500 text-sm mt-1">
            <span className="text-blue-600 font-medium">+${totalIncome.toFixed(2)}</span>
            {' '}income · {' '}
            <span className="text-orange-600 font-medium">-${totalExpenses.toFixed(2)}</span>
            {' '}expenses
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form action={handleAdd} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
          <h3 className="font-semibold text-gray-700">New Transaction</h3>

          {/* Type toggle */}
          <div className="flex gap-2">
            {(['expense', 'income'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTxType(t)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                  txType === t
                    ? t === 'expense' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <input type="hidden" name="type" value={txType} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Amount ($)</label>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
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
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
              <input
                name="description"
                type="text"
                placeholder="Optional note"
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
            {loading ? 'Saving...' : 'Save Transaction'}
          </button>
        </form>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'income', 'expense'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              filter === f ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-emerald-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">💸</div>
          <p>No transactions yet. Add your first one!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([date, entries]) => {
              const dayIncome = entries.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0)
              const dayExpense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0)
              return (
                <div key={date} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
                    <span className="text-sm font-semibold text-gray-700">{date}</span>
                    <span className="text-xs text-gray-500 space-x-2">
                      {dayIncome > 0 && <span className="text-blue-600">+${dayIncome.toFixed(2)}</span>}
                      {dayExpense > 0 && <span className="text-orange-600">-${dayExpense.toFixed(2)}</span>}
                    </span>
                  </div>

                  {/* Mobile */}
                  <div className="sm:hidden divide-y divide-gray-100">
                    {entries.map(t => (
                      <div key={t.id} className="px-4 py-3 flex items-center justify-between">
                        <div className="min-w-0">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            t.type === 'income' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                          }`}>{t.category}</span>
                          <p className="text-sm text-gray-700 mt-0.5 truncate">{t.description || '—'}</p>
                        </div>
                        <div className="flex items-center gap-3 ml-3 shrink-0">
                          <span className={`font-semibold text-sm ${t.type === 'income' ? 'text-blue-600' : 'text-orange-600'}`}>
                            {t.type === 'income' ? '+' : '-'}${Number(t.amount).toFixed(2)}
                          </span>
                          <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-500 transition text-xs">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop */}
                  <table className="hidden sm:table w-full text-sm">
                    <tbody className="divide-y divide-gray-100">
                      {entries.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50 transition">
                          <td className="px-5 py-3">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                              t.type === 'income' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                            }`}>{t.category}</span>
                          </td>
                          <td className="px-5 py-3 text-gray-600">{t.description || '—'}</td>
                          <td className={`px-5 py-3 text-right font-semibold ${t.type === 'income' ? 'text-blue-600' : 'text-orange-600'}`}>
                            {t.type === 'income' ? '+' : '-'}${Number(t.amount).toFixed(2)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-500 transition text-xs">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}
