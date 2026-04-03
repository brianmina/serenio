'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addFoodLog(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const calories = formData.get('calories') as string
  const { error } = await supabase.from('food_logs').insert({
    user_id: user.id,
    meal_type: formData.get('meal_type') as string,
    description: formData.get('description') as string,
    calories: calories ? parseInt(calories) : null,
    date: formData.get('date') as string,
  })

  if (error) return { error: error.message }
  revalidatePath('/food')
}

export async function deleteFoodLog(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('food_logs').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/food')
}
