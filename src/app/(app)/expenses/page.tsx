import { createClient } from '@/lib/supabase/server'
import ExpensesClient from './ExpensesClient'

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', user!.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  return <ExpensesClient expenses={expenses ?? []} />
}
