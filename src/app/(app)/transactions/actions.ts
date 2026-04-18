'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ParsedTransaction } from './csvParsers'

export async function addTransaction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('transactions').insert({
    user_id: user.id,
    type: formData.get('type') as string,
    amount: parseFloat(formData.get('amount') as string),
    category: formData.get('category') as string,
    description: formData.get('description') as string || null,
    date: formData.get('date') as string,
  })

  if (error) return { error: error.message }
  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  revalidatePath('/reports')
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  revalidatePath('/reports')
}

export async function importTransactions(rows: ParsedTransaction[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const records = rows.map(r => ({
    user_id: user.id,
    type: r.type,
    amount: r.amount,
    category: r.category,
    description: r.description,
    date: r.date,
  }))

  const { error } = await supabase.from('transactions').insert(records)
  if (error) return { error: error.message }

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  revalidatePath('/reports')
}
