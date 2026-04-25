'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

declare global {
  interface Window {
    TellerConnect: {
      setup(config: {
        applicationId: string
        onSuccess: (auth: TellerAuth) => void
        onExit?: () => void
        onFailure?: (err: unknown) => void
      }): { open(): void }
    }
  }
}

type TellerAuth = {
  accessToken: string
  enrollment: {
    id: string
    accounts: Array<{
      id: string
      name: string
      type: string
      institution: { name: string }
    }>
  }
}

type Connection = {
  id: string
  institution_name: string
  account_name: string | null
  last_synced_at: string | null
}

export default function BankConnectButton({ connections }: { connections: Connection[] }) {
  const router = useRouter()
  const [scriptReady, setScriptReady] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  useEffect(() => {
    if (document.querySelector('script[src*="teller.io"]')) {
      setScriptReady(true)
      return
    }
    const s = document.createElement('script')
    s.src = 'https://cdn.teller.io/connect/connect.js'
    s.onload = () => setScriptReady(true)
    document.head.appendChild(s)
  }, [])

  function handleConnect() {
    if (!scriptReady || !window.TellerConnect) return
    const connect = window.TellerConnect.setup({
      applicationId: process.env.NEXT_PUBLIC_TELLER_APP_ID!,
      onSuccess: async (auth) => {
        for (const account of auth.enrollment.accounts) {
          await fetch('/api/teller/enroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accessToken: auth.accessToken,
              enrollmentId: auth.enrollment.id,
              institutionName: account.institution.name,
              account,
            }),
          })
        }
        router.refresh()
      },
    })
    connect.open()
  }

  async function handleSync(connectionId: string) {
    setSyncing(connectionId)
    setSyncMsg(null)
    const res = await fetch('/api/teller/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionId }),
    })
    const data = await res.json()
    setSyncing(null)
    if (data.error) {
      setSyncMsg(`Error: ${data.error}`)
    } else {
      setSyncMsg(`${data.imported} new transaction${data.imported !== 1 ? 's' : ''} imported`)
      router.refresh()
    }
    setTimeout(() => setSyncMsg(null), 4000)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-700">Connected Banks</h3>
          <p className="text-xs text-gray-400 mt-0.5">Live sync via Teller</p>
        </div>
        <button
          onClick={handleConnect}
          disabled={!scriptReady}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
        >
          + Connect Bank
        </button>
      </div>

      {syncMsg && (
        <p className="text-xs text-emerald-600 mb-3">{syncMsg}</p>
      )}

      {connections.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          No banks connected. Click &quot;Connect Bank&quot; to link Bank of America or Capital One.
        </p>
      ) : (
        <div className="space-y-2">
          {connections.map(c => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-700">{c.institution_name}</p>
                <p className="text-xs text-gray-400">
                  {c.account_name ?? 'Account'} ·{' '}
                  {c.last_synced_at
                    ? `Synced ${new Date(c.last_synced_at).toLocaleDateString()}`
                    : 'Never synced'}
                </p>
              </div>
              <button
                onClick={() => handleSync(c.id)}
                disabled={syncing === c.id}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50 transition"
              >
                {syncing === c.id ? 'Syncing…' : 'Sync Now'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
