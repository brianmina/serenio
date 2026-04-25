import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user!.id)
    .single()

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const today = now.toISOString().split('T')[0]

  const { data: monthTransactions } = await supabase
    .from('transactions')
    .select('type, amount, category, description, date')
    .gte('date', monthStart)
    .lte('date', today)
    .order('date', { ascending: false })

  const transactions = monthTransactions ?? []

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const netBalance = totalIncome - totalExpenses

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysElapsed = now.getDate()
  const projectedIncome = daysElapsed > 0 ? (totalIncome / daysElapsed) * daysInMonth : 0
  const projectedExpenses = daysElapsed > 0 ? (totalExpenses / daysElapsed) * daysInMonth : 0
  const projectedNet = projectedIncome - projectedExpenses
  const daysRemaining = daysInMonth - daysElapsed

  // Spending by category this month
  const byCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + Number(t.amount)
      return acc
    }, {})

  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const recent = transactions.slice(0, 5)

  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">
          Good day{profile?.username ? `, ${profile.username}` : ''}!
        </h2>
        <p className="text-gray-500 mt-1 text-sm">{monthName} overview</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`rounded-xl p-6 ${netBalance >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
          <p className="text-sm font-medium text-gray-500">Net Balance</p>
          <p className={`text-3xl font-bold mt-1 ${netBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {netBalance < 0 ? '-' : ''}${Math.abs(netBalance).toFixed(2)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Income minus expenses</p>
        </div>
        <div className="rounded-xl p-6 bg-blue-50">
          <p className="text-sm font-medium text-gray-500">Total Income</p>
          <p className="text-3xl font-bold mt-1 text-blue-700">${totalIncome.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">This month</p>
        </div>
        <div className="rounded-xl p-6 bg-orange-50">
          <p className="text-sm font-medium text-gray-500">Total Expenses</p>
          <p className="text-3xl font-bold mt-1 text-orange-600">${totalExpenses.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">This month</p>
        </div>
      </div>

      {/* End-of-month projections */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-700">End-of-Month Projections</h3>
            <p className="text-xs text-gray-400 mt-0.5">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining · based on current pace</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Projected Income</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">${projectedIncome.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">${(projectedIncome - totalIncome).toFixed(2)} still expected</p>
          </div>
          <div className="rounded-lg bg-orange-50 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Projected Expenses</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">${projectedExpenses.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">${(projectedExpenses - totalExpenses).toFixed(2)} still expected</p>
          </div>
          <div className={`rounded-lg p-4 ${projectedNet >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Projected Net</p>
            <p className={`text-2xl font-bold mt-1 ${projectedNet >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {projectedNet < 0 ? '-' : ''}${Math.abs(projectedNet).toFixed(2)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Forecast by month end</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top spending categories */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Top Spending Categories</h3>
            <Link href="/reports" className="text-xs text-emerald-600 hover:underline">View all →</Link>
          </div>
          {topCategories.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No expenses this month</p>
          ) : (
            <div className="space-y-3">
              {topCategories.map(([category, amount]) => {
                const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
                return (
                  <div key={category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 font-medium">{category}</span>
                      <span className="text-gray-800 font-semibold">${amount.toFixed(2)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Recent Transactions</h3>
            <Link href="/transactions" className="text-xs text-emerald-600 hover:underline">View all →</Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No transactions this month</p>
          ) : (
            <div className="space-y-3">
              {recent.map((t, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{t.description || t.category}</p>
                    <p className="text-xs text-gray-400">{t.date} · {t.category}</p>
                  </div>
                  <span className={`text-sm font-semibold ml-3 shrink-0 ${t.type === 'income' ? 'text-blue-600' : 'text-orange-600'}`}>
                    {t.type === 'income' ? '+' : '-'}${Number(t.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 flex-wrap">
        <Link
          href="/transactions"
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
        >
          + Add Transaction
        </Link>
        <Link
          href="/budgets"
          className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-lg transition"
        >
          Manage Budgets
        </Link>
      </div>
    </div>
  )
}
