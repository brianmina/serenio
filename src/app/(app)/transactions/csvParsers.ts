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

// ── Capital One — PDF ─────────────────────────────────────────────────────────

export async function parseCapitalOnePDF(buffer: ArrayBuffer): Promise<ParsedTransaction[]> {
  const text = await extractPDFText(buffer)
  return parseCapitalOneText(text)
}

function parseCapitalOneText(text: string): ParsedTransaction[] {
  const results: ParsedTransaction[] = []
  // Capital One statement lines: "01/15/2024  AMAZON.COM  Shopping  -$25.99"
  // Try multiple amount patterns
  const lines = text.split('\n')
  for (const line of lines) {
    // Date at start: MM/DD/YYYY or MM/DD
    const m = line.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})\s*$/)
    if (!m) continue
    let rawDate = m[1]
    // Add current year if missing
    if (!/\d{4}/.test(rawDate)) rawDate += `/${new Date().getFullYear()}`
    const date = toISO(rawDate.replace(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, (_, mo, d, y) =>
      `${mo}/${d}/${y.length === 2 ? '20' + y : y}`
    ))
    const description = m[2].replace(/\s{2,}/g, ' ').trim()
    const rawAmt = parseFloat(m[3].replace(/[$,]/g, ''))
    if (isNaN(rawAmt) || !description) continue
    const type: 'income' | 'expense' = rawAmt < 0 ? 'income' : 'expense'
    results.push({ date, description, amount: Math.abs(rawAmt), type, category: autoCategory(description, type) })
  }
  return results
}

// ── Chime — PDF ───────────────────────────────────────────────────────────────

export async function parseChimePDF(buffer: ArrayBuffer): Promise<ParsedTransaction[]> {
  const text = await extractPDFText(buffer)
  return parseChimeText(text)
}

function parseChimeText(text: string): ParsedTransaction[] {
  const results: ParsedTransaction[] = []
  const lines = text.split('\n')
  for (const line of lines) {
    // Chime: "Jan 15, 2024  Amazon  -$25.99  $1,234.56"
    const m = line.match(/^([A-Za-z]{3}\s+\d{1,2},?\s+\d{4})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})/)
    if (!m) continue
    const date = toISO(m[1])
    const description = m[2].trim()
    const rawAmt = parseFloat(m[3].replace(/[$,]/g, ''))
    if (isNaN(rawAmt) || !description) continue
    const type: 'income' | 'expense' = rawAmt >= 0 ? 'income' : 'expense'
    results.push({ date, description, amount: Math.abs(rawAmt), type, category: autoCategory(description, type) })
  }
  return results
}

// ── PDF text extraction (browser only) ───────────────────────────────────────

async function extractPDFText(buffer: ArrayBuffer): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const pageTexts: string[] = []

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    // Group text items by approximate y-position to reconstruct lines
    const byY: Record<number, string[]> = {}
    for (const item of content.items) {
      if (!('str' in item)) continue
      const y = Math.round((item as { transform: number[] }).transform[5])
      if (!byY[y]) byY[y] = []
      byY[y].push(item.str)
    }
    const lines = Object.keys(byY)
      .map(Number)
      .sort((a, b) => b - a)
      .map(y => byY[y].join(' '))
    pageTexts.push(lines.join('\n'))
  }

  return pageTexts.join('\n')
}
