'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addSleepLog(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const date = formData.get('date') as string
  const bedtime = `${date}T${formData.get('bedtime') as string}:00`
  const wakeDate = formData.get('wake_date') as string
  const wakeTime = `${wakeDate}T${formData.get('wake_time') as string}:00`

  const { error } = await supabase.from('sleep_logs').insert({
    user_id: user.id,
    bedtime,
    wake_time: wakeTime,
    quality: parseInt(formData.get('quality') as string),
    notes: formData.get('notes') as string || null,
    date,
  })

  if (error) return { error: error.message }
  revalidatePath('/sleep')
}

export async function deleteSleepLog(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('sleep_logs').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/sleep')
}
