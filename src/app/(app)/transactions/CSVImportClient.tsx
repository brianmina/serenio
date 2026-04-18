'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  parseBofA, parseBofAExcel,
  parseCapitalOneCSV, parseChimePDF,
  type ParsedTransaction,
} from './csvParsers'
import { importTransactions } from './actions'

const BANKS = [
  {
    id: 'bofa',
    label: 'Bank of America',
    accept: '.xls,.xlsx,.csv',
    hint: 'Download: Account → Download → Microsoft Excel or CSV',
    fileLabel: 'Upload Excel or CSV file',
  },
  {
    id: 'capitalone',
    label: 'Capital One',
    accept: '.csv',
    hint: 'Download: capitalone.com → Account → Download Transactions → CSV',
    fileLabel: 'Upload CSV file',
  },
  {
    id: 'chime',
    label: 'Chime',
    accept: '.pdf',
    hint: 'Chime only exports PDF — App → Settings → Documents → Download monthly statement',
    fileLabel: 'Upload PDF statement',
  },
] as const

type BankId = typeof BANKS[number]['id']

const EXPENSE_CATEGORIES = ['Food & Dining', 'Transport', 'Housing', 'Health', 'Entertainment', 'Shopping', 'Subscriptions', 'Education', 'Other']
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investment', 'Business', 'Gift', 'Other']

export default function CSVImportClient({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [bank, setBank] = useState<BankId>('bofa')
  const [rows, setRows] = useState<ParsedTransaction[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)

  const selectedBank = BANKS.find(b => b.id === bank)!

  function resetFile() {
    setRows([])
    setParseError(null)
    setImported(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    resetFile()
    setParsing(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase()
      let parsed: ParsedTransaction[] = []

      if (bank === 'bofa') {
        if (ext === 'csv') {
          const text = await file.text()
          parsed = parseBofA(text)
        } else {
          const buf = await file.arrayBuffer()
          parsed = await parseBofAExcel(buf)
        }
      } else if (bank === 'capitalone') {
        const text = await file.text()
        parsed = parseCapitalOneCSV(text)
      } else {
        const buf = await file.arrayBuffer()
        parsed = await parseChimePDF(buf)
      }

      if (parsed.length === 0) {
        setParseError('No transactions found. Make sure you selected the correct bank and file.')
        return
      }
      setRows(parsed)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse file.')
    } finally {
      setParsing(false)
    }
  }

  function updateCategory(idx: number, category: string) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, category } : r))
  }

  function updateType(idx: number, type: 'income' | 'expense') {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, type, category: 'Other' } : r))
  }

  function removeRow(idx: number) {
    setRows(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleImport() {
    setImporting(true)
    const result = await importTransactions(rows)
    setImporting(false)
    if (result?.error) { setParseError(result.error); return }
    setImported(true)
    router.refresh()
    setTimeout(() => onClose(), 1500)
  }

  const totalIncome = rows.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0)
  const totalExpense = rows.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700 text-lg">Import from Bank Statement</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
      </div>

      {/* Bank selector */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">Select your bank</label>
        <div className="flex flex-wrap gap-2">
          {BANKS.map(b => (
            <button
              key={b.id}
              type="button"
              onClick={() => { setBank(b.id); resetFile() }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                bank === b.id
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">{selectedBank.hint}</p>
      </div>

      {/* File upload */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">{selectedBank.fileLabel}</label>
        <input
          ref={fileRef}
          type="file"
          accept={selectedBank.accept}
          onChange={handleFile}
          className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
        />
      </div>

      {parsing && (
        <div className="text-sm text-gray-500 animate-pulse">Reading file...</div>
      )}

      {parseError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
          {parseError}
        </div>
      )}

      {imported && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-700 font-medium">
          ✓ {rows.length} transactions imported successfully!
        </div>
      )}

      {/* Preview table */}
      {rows.length > 0 && !imported && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">
              Preview — <span className="text-emerald-600">{rows.length} transactions found</span>
            </p>
            <p className="text-xs text-gray-400">Adjust type or category before importing</p>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-500 font-medium">Date</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-medium">Description</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-medium">Type</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-medium">Category</th>
                    <th className="px-3 py-2 text-right text-gray-500 font-medium">Amount</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{row.date}</td>
                      <td className="px-3 py-2 text-gray-700 max-w-[180px] truncate" title={row.description}>{row.description}</td>
                      <td className="px-3 py-2">
                        <select
                          value={row.type}
                          onChange={e => updateType(idx, e.target.value as 'income' | 'expense')}
                          className={`text-xs rounded-full px-2 py-0.5 font-medium border-0 cursor-pointer ${
                            row.type === 'income' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          <option value="income">income</option>
                          <option value="expense">expense</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={row.category}
                          onChange={e => updateCategory(idx, e.target.value)}
                          className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-700"
                        >
                          {(row.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${row.type === 'income' ? 'text-blue-600' : 'text-orange-600'}`}>
                        {row.type === 'income' ? '+' : '-'}${row.amount.toFixed(2)}
                      </td>
                      <td className="px-3 py-2">
                        <button onClick={() => removeRow(idx)} className="text-gray-300 hover:text-red-400 transition">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-gray-400">
              Income: <span className="text-blue-600 font-medium">${totalIncome.toFixed(2)}</span>
              {' · '}
              Expenses: <span className="text-orange-600 font-medium">${totalExpense.toFixed(2)}</span>
            </p>
            <button
              onClick={handleImport}
              disabled={importing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition disabled:opacity-50"
            >
              {importing ? 'Importing...' : `Import ${rows.length} transactions`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
