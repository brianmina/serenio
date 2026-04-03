import { createClient } from '@/lib/supabase/server'
import FoodClient from './FoodClient'

export default async function FoodPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: logs } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', user!.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  return <FoodClient logs={logs ?? []} />
}
