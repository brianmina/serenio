import { createClient } from '@/lib/supabase/server'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // Last 6 months of data
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const rangeStart = sixMonthsAgo.toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]

  const { data: txns } = await supabase
    .from('transactions')
    .select('type, amount, category, date')
    .eq('user_id', user!.id)
    .gte('date', rangeStart)
    .lte('date', today)
    .order('date', { ascending: true })

  const transactions = txns ?? []

  // Monthly summary
  const monthlySummary: Record<string, { income: number; expenses: number }> = {}
  for (const t of transactions) {
    const key = t.date.slice(0, 7) // YYYY-MM
    if (!monthlySummary[key]) monthlySummary[key] = { income: 0, expenses: 0 }
    if (t.type === 'income') monthlySummary[key].income += Number(t.amount)
    else monthlySummary[key].expenses += Number(t.amount)
  }

  // Current month spending by category
  const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
  const currentMonthTxns = transactions.filter(t => t.date >= monthStart)

  const expenseByCategory = currentMonthTxns
    .filter(t => t.type === 'expense')
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + Number(t.amount)
      return acc
    }, {})

  const incomeByCategory = currentMonthTxns
    .filter(t => t.type === 'income')
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + Number(t.amount)
      return acc
    }, {})

  const totalExpenses = Object.values(expenseByCategory).reduce((s, v) => s + v, 0)
  const totalIncome = Object.values(incomeByCategory).reduce((s, v) => s + v, 0)

  const sortedMonths = Object.keys(monthlySummary).sort()
  const maxBar = Math.max(...sortedMonths.map(k => Math.max(monthlySummary[k].income, monthlySummary[k].expenses)), 1)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Reports</h2>
        <p className="text-gray-500 text-sm mt-1">Last 6 months financial summary</p>
      </div>

      {/* Monthly bar chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-700 mb-5">Income vs Expenses</h3>
        {sortedMonths.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No data yet</p>
        ) : (
          <div className="space-y-4">
            {sortedMonths.map(key => {
              const [y, m] = key.split('-')
              const label = `${MONTHS[parseInt(m) - 1].slice(0, 3)} ${y}`
              const { income, expenses } = monthlySummary[key]
              const incPct = (income / maxBar) * 100
              const expPct = (expenses / maxBar) * 100
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span className="font-medium">{label}</span>
                    <span>
                      <span className="text-blue-600 mr-2">+${income.toFixed(0)}</span>
                      <span className="text-orange-600">-${expenses.toFixed(0)}</span>
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full" style={{ width: `${incPct}%` }} />
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-400 rounded-full" style={{ width: `${expPct}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div className="flex gap-4 mt-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-400 rounded inline-block" /> Income</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 bg-orange-400 rounded inline-block" /> Expenses</span>
        </div>
      </div>

      {/* Current month breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-700 mb-4">
            Expenses — {MONTHS[currentMonth - 1]} {currentYear}
          </h3>
          {Object.keys(expenseByCategory).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No expenses this month</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(expenseByCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, amount]) => {
                  const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{cat}</span>
                        <span className="font-medium text-gray-800">
                          ${amount.toFixed(2)} <span className="text-gray-400 text-xs">({pct.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              <div className="pt-3 border-t border-gray-100 flex justify-between text-sm font-semibold text-gray-700">
                <span>Total</span>
                <span>${totalExpenses.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Income breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-700 mb-4">
            Income — {MONTHS[currentMonth - 1]} {currentYear}
          </h3>
          {Object.keys(incomeByCategory).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No income recorded this month</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(incomeByCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, amount]) => {
                  const pct = totalIncome > 0 ? (amount / totalIncome) * 100 : 0
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{cat}</span>
                        <span className="font-medium text-gray-800">
                          ${amount.toFixed(2)} <span className="text-gray-400 text-xs">({pct.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              <div className="pt-3 border-t border-gray-100 flex justify-between text-sm font-semibold text-gray-700">
                <span>Total</span>
                <span>${totalIncome.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
