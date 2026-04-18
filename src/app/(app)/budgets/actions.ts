'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function upsertBudget(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('budgets').upsert({
    user_id: user.id,
    category: formData.get('category') as string,
    limit_amount: parseFloat(formData.get('limit_amount') as string),
    month: parseInt(formData.get('month') as string),
    year: parseInt(formData.get('year') as string),
  }, { onConflict: 'user_id,category,month,year' })

  if (error) return { error: error.message }
  revalidatePath('/budgets')
}

export async function deleteBudget(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('budgets').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/budgets')
}
