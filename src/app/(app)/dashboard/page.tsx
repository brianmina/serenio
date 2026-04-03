import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split('T')[0]

  const [
    { count: expenseCount },
    { count: foodCount },
    { count: sleepCount },
    { count: journalCount },
  ] = await Promise.all([
    supabase.from('expenses').select('*', { count: 'exact', head: true }).eq('date', today),
    supabase.from('food_logs').select('*', { count: 'exact', head: true }).eq('date', today),
    supabase.from('sleep_logs').select('*', { count: 'exact', head: true }).eq('date', today),
    supabase.from('journal_entries').select('*', { count: 'exact', head: true }).eq('date', today),
  ])

  const cards = [
    { label: 'Expenses', icon: '💰', count: expenseCount ?? 0, unit: 'entries today', href: '/expenses', color: 'bg-blue-50 text-blue-700' },
    { label: 'Food', icon: '🥗', count: foodCount ?? 0, unit: 'meals today', href: '/food', color: 'bg-green-50 text-green-700' },
    { label: 'Sleep', icon: '😴', count: sleepCount ?? 0, unit: 'logs today', href: '/sleep', color: 'bg-purple-50 text-purple-700' },
    { label: 'Journal', icon: '📓', count: journalCount ?? 0, unit: 'entries today', href: '/journal', color: 'bg-yellow-50 text-yellow-700' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Good day{user?.email ? `, ${user.email.split('@')[0]}` : ''}!</h2>
        <p className="text-gray-500 mt-1">Here&apos;s your overview for today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <Link key={card.href} href={card.href}>
            <div className={`rounded-xl p-6 ${card.color} hover:scale-105 transition-transform cursor-pointer`}>
              <div className="text-3xl mb-3">{card.icon}</div>
              <div className="text-2xl font-bold">{card.count}</div>
              <div className="text-sm font-medium mt-1">{card.unit}</div>
              <div className="text-sm font-semibold mt-2">{card.label} →</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
