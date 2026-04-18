export type ParsedTransaction = {
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else { current += ch }
  }
  result.push(current.trim())
  return result
}

export function toISO(raw: string): string {
  raw = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
    const [m, d, y] = raw.split('/')
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  // Jan 15, 2024  or  Jan 15 2024
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  }
  const m2 = raw.match(/^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})$/)
  if (m2) {
    const mo = months[m2[1].toLowerCase()] ?? '01'
    return `${m2[3]}-${mo}-${m2[2].padStart(2, '0')}`
  }
  return raw
}

export function autoCategory(description: string, type: 'income' | 'expense'): string {
  const d = description.toUpperCase()
  if (type === 'income') {
    if (/PAYROLL|DIRECT DEP|SALARY|EMPLOYER/.test(d)) return 'Salary'
    if (/FREELANCE|INVOICE|VENMO|ZELLE|CASHAPP/.test(d)) return 'Freelance'
    if (/DIVIDEND|INTEREST|ROBINHOOD|FIDELITY|SCHWAB/.test(d)) return 'Investment'
    return 'Other'
  }
  if (/AMAZON|WALMART|TARGET|EBAY|ETSY|COSTCO|BESTBUY/.test(d)) return 'Shopping'
  if (/UBER|LYFT|GAS|SHELL|BP|CHEVRON|EXXON|SUNOCO|PARKING|TRANSIT|METRO/.test(d)) return 'Transport'
  if (/RESTAURANT|MCDONALD|STARBUCKS|COFFEE|PIZZA|BURGER|TACO|DOORDASH|GRUBHUB|INSTACART|CHIPOTLE|SUBWAY|WENDY|CHICK.FIL/.test(d)) return 'Food & Dining'
  if (/NETFLIX|SPOTIFY|HULU|DISNEY|APPLE\.COM|GOOGLE|YOUTUBE|AMAZON PRIME|PEACOCK|HBO/.test(d)) return 'Subscriptions'
  if (/CVS|WALGREEN|PHARMACY|DOCTOR|HOSPITAL|MEDICAL|DENTAL|CLINIC|HEALTH/.test(d)) return 'Health'
  if (/RENT|MORTGAGE|HOA|ELECTRIC|WATER BILL|UTILITY|COMCAST|AT&T|VERIZON|SPECTRUM|INSURANCE/.test(d)) return 'Housing'
  if (/MOVIE|THEATER|TICKETMASTER|CONCERT|STEAM|GAMING|SPORT|AMC|REGAL/.test(d)) return 'Entertainment'
  if (/TUITION|SCHOOL|UNIVERSITY|UDEMY|COURSERA|LINKEDIN LEARN|BOOK/.test(d)) return 'Education'
  return 'Other'
}

// ── Bank of America — CSV ─────────────────────────────────────────────────────

export function parseBofA(text: string): ParsedTransaction[] {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim())
  const headerIdx = lines.findIndex(l => /date/i.test(l) && /description/i.test(l))
  if (headerIdx === -1) throw new Error('Could not find header row. Make sure this is a Bank of America CSV file.')
  const results: ParsedTransaction[] = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.length < 3) continue
    const date = toISO(cols[0])
    const description = cols[1]
    const rawAmount = parseFloat(cols[2].replace(/[$,]/g, ''))
    if (isNaN(rawAmount) || !date || !description) continue
    const type: 'income' | 'expense' = rawAmount >= 0 ? 'income' : 'expense'
    results.push({ date, description, amount: Math.abs(rawAmount), type, category: autoCategory(description, type) })
  }
  return results
}

// ── Bank of America — Excel (.xls / .xlsx) ───────────────────────────────────

export async function parseBofAExcel(buffer: ArrayBuffer): Promise<ParsedTransaction[]> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' })

  const headerIdx = rows.findIndex(r =>
    r.some(c => /^date$/i.test(String(c ?? ''))) &&
    r.some(c => /description/i.test(String(c ?? '')))
  )
  if (headerIdx === -1) throw new Error('Could not find header row in Excel file.')

  const header = (rows[headerIdx] as string[]).map(h => String(h ?? '').toLowerCase())
  const dateCol = header.findIndex(h => /^date$/.test(h))
  const descCol = header.findIndex(h => /description/.test(h))
  const amtCol  = header.findIndex(h => /amount/.test(h))

  const results: ParsedTransaction[] = []
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] as string[]
    const rawDate = String(row[dateCol] ?? '').trim()
    const description = String(row[descCol] ?? '').trim()
    const rawAmt = parseFloat(String(row[amtCol] ?? '').replace(/[$,]/g, ''))
    if (!rawDate || !description || isNaN(rawAmt)) continue
    const date = toISO(rawDate)
    const type: 'income' | 'expense' = rawAmt >= 0 ? 'income' : 'expense'
    results.push({ date, description, amount: Math.abs(rawAmt), type, category: autoCategory(description, type) })
  }
  return results
}

// ── Capital One — CSV ─────────────────────────────────────────────────────────

export function parseCapitalOneCSV(text: string): ParsedTransaction[] {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim())
  const headerIdx = lines.findIndex(l => /transaction.?date/i.test(l))
  if (headerIdx === -1) throw new Error('Could not find header row. Make sure this is a Capital One CSV file.')
  const header = parseCSVLine(lines[headerIdx]).map(h => h.toLowerCase().trim())
  const dateCol   = header.findIndex(h => h.includes('transaction') && h.includes('date'))
  const descCol   = header.findIndex(h => h.includes('description'))
  const debitCol  = header.findIndex(h => h === 'debit')
  const creditCol = header.findIndex(h => h === 'credit')
  const results: ParsedTransaction[] = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.length < 4) continue
    const date = toISO(cols[dateCol])
    const description = cols[descCol]
    const debit  = parseFloat((cols[debitCol]  || '').replace(/[$,]/g, ''))
    const credit = parseFloat((cols[creditCol] || '').replace(/[$,]/g, ''))
    if (!date || !description) continue
    if (!isNaN(debit) && debit > 0) {
      results.push({ date, description, amount: debit, type: 'expense', category: autoCategory(description, 'expense') })
    } else if (!isNaN(credit) && credit > 0) {
      results.push({ date, description, amount: credit, type: 'income', category: autoCategory(description, 'income') })
    }
  }
  return results
}

// ── Chime — PDF ───────────────────────────────────────────────────────────────
// Columns: TRANSACTION DATE | DESCRIPTION | TYPE | AMOUNT | ACCOUNT | SETTLEMENT DATE

export async function parseChimePDF(buffer: ArrayBuffer): Promise<ParsedTransaction[]> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const results: ParsedTransaction[] = []

  type TItem = { str: string; transform: number[]; dir: string; width: number; height: number; fontName: string; hasEOL: boolean }

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    const items = content.items.filter((i): i is TItem => 'str' in i && (i as TItem).str.trim() !== '')

    // Group into rows by y-position (tolerance 4)
    const rows: { y: number; parts: { x: number; str: string }[] }[] = []
    for (const item of items) {
      const y = item.transform[5]
      const x = item.transform[4]
      const row = rows.find(r => Math.abs(r.y - y) <= 4)
      if (row) row.parts.push({ x, str: item.str })
      else rows.push({ y, parts: [{ x, str: item.str }] })
    }
    rows.sort((a, b) => b.y - a.y)
    for (const row of rows) row.parts.sort((a, b) => a.x - b.x)

    // Find header row to get column x-positions
    const headerRow = rows.find(r =>
      r.parts.some(p => /TRANSACTION.?DATE/i.test(p.str)) &&
      r.parts.some(p => /DESCRIPTION/i.test(p.str))
    )
    if (!headerRow) continue

    const colX = {
      date:   headerRow.parts.find(p => /TRANSACTION.?DATE/i.test(p.str))?.x ?? 0,
      desc:   headerRow.parts.find(p => /DESCRIPTION/i.test(p.str))?.x ?? 150,
      type:   headerRow.parts.find(p => /^TYPE$/i.test(p.str.trim()))?.x ?? 350,
      amount: headerRow.parts.find(p => /^AMOUNT$/i.test(p.str.trim()))?.x ?? 450,
    }

    const headerY = headerRow.y
    const dataRows = rows.filter(r => r.y < headerY - 5)

    for (const row of dataRows) {
      // Assign each text part to nearest column
      const get = (targetX: number, nextX: number) =>
        row.parts
          .filter(p => p.x >= targetX - 20 && p.x < nextX - 10)
          .map(p => p.str).join(' ').trim()

      const dateStr  = get(colX.date,   colX.desc)
      const descStr  = get(colX.desc,   colX.type)
      const typeStr  = get(colX.type,   colX.amount)
      const amtStr   = row.parts.filter(p => p.x >= colX.amount - 10).map(p => p.str).join('').trim()

      if (!dateStr || !descStr || !amtStr) continue

      const date = toISO(dateStr)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue

      const rawAmt = parseFloat(amtStr.replace(/[$,+]/g, ''))
      if (isNaN(rawAmt)) continue

      // TYPE column: "Credit"/"Direct Deposit" = income, everything else = expense
      const isIncome = /credit|deposit|refund|cashback/i.test(typeStr)
      const type: 'income' | 'expense' = isIncome ? 'income' : 'expense'

      results.push({
        date,
        description: descStr,
        amount: Math.abs(rawAmt),
        type,
        category: autoCategory(descStr, type),
      })
    }
  }

  return results
}

