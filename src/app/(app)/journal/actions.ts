'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addEntry(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('journal_entries').insert({
    user_id: user.id,
    title: formData.get('title') as string || null,
    content: formData.get('content') as string,
    mood: formData.get('mood') as string || null,
    date: formData.get('date') as string,
  })

  if (error) return { error: error.message }
  revalidatePath('/journal')
}

export async function deleteEntry(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('journal_entries').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/journal')
}

export async function updateEntry(id: string, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.from('journal_entries').update({
    title: formData.get('title') as string || null,
    content: formData.get('content') as string,
    mood: formData.get('mood') as string || null,
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/journal')
}
