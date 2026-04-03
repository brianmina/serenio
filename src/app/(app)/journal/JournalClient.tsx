'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addEntry, deleteEntry, updateEntry } from './actions'

const MOODS = [
  { emoji: '😄', label: 'Happy' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '😐', label: 'Neutral' },
  { emoji: '😔', label: 'Sad' },
  { emoji: '😤', label: 'Stressed' },
  { emoji: '😴', label: 'Tired' },
  { emoji: '🤩', label: 'Excited' },
  { emoji: '😰', label: 'Anxious' },
]

type Entry = {
  id: string
  title: string | null
  content: string
  mood: string | null
  date: string
  created_at: string
}

function EntryCard({ entry, onDelete }: { entry: Entry; onDelete: (id: string) => void }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const mood = MOODS.find(m => m.label === entry.mood)

  async function handleUpdate(formData: FormData) {
    setLoading(true)
    await updateEntry(entry.id, formData)
    setLoading(false)
    setEditing(false)
    router.refresh()
  }

  if (editing) {
    return (
      <form action={handleUpdate} className="bg-white rounded-xl border-2 border-emerald-300 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{entry.date}</span>
          <button type="button" onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
        </div>
        <input
          name="title"
          type="text"
          defaultValue={entry.title ?? ''}
          placeholder="Title (optional)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
        <textarea
          name="content"
          required
          defaultValue={entry.content}
          rows={6}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
        />
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">Mood</p>
          <div className="flex flex-wrap gap-2">
            {MOODS.map(m => (
              <label key={m.label} className="cursor-pointer">
                <input type="radio" name="mood" value={m.label} defaultChecked={entry.mood === m.label} className="sr-only peer" />
                <span className="text-xl peer-checked:ring-2 peer-checked:ring-emerald-400 rounded-full p-1 block transition">{m.emoji}</span>
              </label>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-400">{entry.date}</span>
            {mood && <span title={mood.label} className="text-lg">{mood.emoji}</span>}
          </div>
          {entry.title && (
            <h3 className="font-semibold text-gray-800 mb-1">{entry.title}</h3>
          )}
          <p className={`text-sm text-gray-600 leading-relaxed whitespace-pre-wrap ${!expanded && 'line-clamp-3'}`}>
            {entry.content}
          </p>
          {entry.content.length > 200 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-emerald-600 hover:underline mt-1"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-gray-400 hover:text-emerald-600 transition"
          >
            Edit
          </button>
          <button
            onClick={async () => { await onDelete(entry.id); router.refresh() }}
            className="text-xs text-gray-400 hover:text-red-500 transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default function JournalClient({ entries }: { entries: Entry[] }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  async function handleAdd(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await addEntry(formData)
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    setShowForm(false)
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Journal</h2>
          <p className="text-gray-500 text-sm mt-1">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          {showForm ? 'Cancel' : '+ New Entry'}
        </button>
      </div>

      {showForm && (
        <form action={handleAdd} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
          <h3 className="font-semibold text-gray-700">New Journal Entry</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Title (optional)</label>
              <input
                name="title"
                type="text"
                placeholder="Give this entry a title..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Date</label>
              <input
                name="date"
                type="date"
                defaultValue={today}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">What&apos;s on your mind?</label>
            <textarea
              name="content"
              required
              rows={6}
              placeholder="Write freely — this is your space..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">How are you feeling?</p>
            <div className="flex flex-wrap gap-3">
              {MOODS.map(m => (
                <label key={m.label} className="cursor-pointer flex flex-col items-center gap-1">
                  <input type="radio" name="mood" value={m.label} className="sr-only peer" />
                  <span className="text-2xl peer-checked:ring-2 peer-checked:ring-emerald-400 rounded-full p-1 block transition">{m.emoji}</span>
                  <span className="text-xs text-gray-400">{m.label}</span>
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Entry'}
          </button>
        </form>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📓</div>
          <p>No entries yet. Write your first one!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map(entry => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onDelete={deleteEntry}
            />
          ))}
        </div>
      )}
    </div>
  )
}
