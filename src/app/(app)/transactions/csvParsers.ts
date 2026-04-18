export type ParsedTransaction = {
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
}

// Handles quoted fields and commas inside quotes
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function toISO(raw: string): string {
  raw = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
    const [m, d, y] = raw.split('/')
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return raw
}

function autoCategory(description: string, type: 'income' | 'expense'): string {
  const d = description.toUpperCase()
  if (type === 'income') {
    if (/PAYROLL|DIRECT DEP|SALARY|EMPLOYER/.test(d)) return 'Salary'
    if (/FREELANCE|INVOICE|VENMO|ZELLE|CASHAPP/.test(d)) return 'Freelance'
    if (/DIVIDEND|INTEREST|ROBINHOOD|FIDELITY|SCHWAB/.test(d)) return 'Investment'
    if (/REFUND|RETURN|CREDIT/.test(d)) return 'Other'
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

export function parseBofA(text: string): ParsedTransaction[] {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim())
  // Find the header row
  const headerIdx = lines.findIndex(l => l.toLowerCase().includes('date') && l.toLowerCase().includes('description'))
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
    const amount = Math.abs(rawAmount)
    results.push({ date, description, amount, type, category: autoCategory(description, type) })
  }
  return results
}

export function parseCapitalOne(text: string): ParsedTransaction[] {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim())
  const headerIdx = lines.findIndex(l => /transaction.?date/i.test(l))
  if (headerIdx === -1) throw new Error('Could not find header row. Make sure this is a Capital One CSV file.')
  const header = parseCSVLine(lines[headerIdx]).map(h => h.toLowerCase())
  const dateCol = header.findIndex(h => h.includes('transaction') && h.includes('date'))
  const descCol = header.findIndex(h => h.includes('description'))
  const debitCol = header.findIndex(h => h === 'debit')
  const creditCol = header.findIndex(h => h === 'credit')
  const results: ParsedTransaction[] = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.length < 4) continue
    const date = toISO(cols[dateCol])
    const description = cols[descCol]
    const debit = parseFloat((cols[debitCol] || '').replace(/[$,]/g, ''))
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

// Chime exports PDF — users convert via free tools; common output: Date, Description, Amount, Balance
export function parseChime(text: string): ParsedTransaction[] {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim())
  const headerIdx = lines.findIndex(l => l.toLowerCase().includes('date') && l.toLowerCase().includes('amount'))
  if (headerIdx === -1) throw new Error('Could not find header row. Make sure the CSV has Date, Description, Amount columns.')
  const header = parseCSVLine(lines[headerIdx]).map(h => h.toLowerCase())
  const dateCol = header.findIndex(h => h.includes('date'))
  const descCol = header.findIndex(h => h.includes('description') || h.includes('memo') || h.includes('name'))
  const amtCol = header.findIndex(h => h.includes('amount'))
  const results: ParsedTransaction[] = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.length < 3) continue
    const date = toISO(cols[dateCol])
    const description = cols[descCol]
    const rawAmount = parseFloat((cols[amtCol] || '').replace(/[$,]/g, ''))
    if (isNaN(rawAmount) || !date || !description) continue
    const type: 'income' | 'expense' = rawAmount >= 0 ? 'income' : 'expense'
    results.push({ date, description, amount: Math.abs(rawAmount), type, category: autoCategory(description, type) })
  }
  return results
}
