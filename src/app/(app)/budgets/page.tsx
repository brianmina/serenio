import { createClient } from '@/lib/supabase/server'
import BudgetsClient from './BudgetsClient'

export default async function BudgetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
  const today = now.toISOString().split('T')[0]

  const [{ data: budgets }, { data: txns }] = await Promise.all([
    supabase.from('budgets').select('*').eq('user_id', user!.id).order('category'),
    supabase
      .from('transactions')
      .select('category, amount')
      .eq('user_id', user!.id)
      .eq('type', 'expense')
      .gte('date', monthStart)
      .lte('date', today),
  ])

  const spending = (txns ?? []).reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + Number(t.amount)
    return acc
  }, {})

  return (
    <BudgetsClient
      budgets={budgets ?? []}
      spending={spending}
      currentMonth={currentMonth}
      currentYear={currentYear}
    />
  )
}
