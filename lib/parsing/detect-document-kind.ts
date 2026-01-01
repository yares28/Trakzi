export type DocumentKind = "receipt" | "statement" | "unknown"

type WeightedPattern = { pattern: RegExp; weight: number }

const STATEMENT_PATTERNS: WeightedPattern[] = [
  { pattern: /\baccount\s+statement\b/, weight: 4 },
  { pattern: /\bopening\s+balance\b/, weight: 3 },
  { pattern: /\bclosing\s+balance\b/, weight: 3 },
  { pattern: /\bavailable\s+balance\b/, weight: 2 },
  { pattern: /\baccount\s+number\b/, weight: 2 },
  { pattern: /\bvalue\s+date\b|\bbooking\s+date\b/, weight: 2 },
  { pattern: /\btransaction(s)?\b/, weight: 2 },
  { pattern: /\bdebit\b|\bcredit\b/, weight: 2 },
  { pattern: /\biban\b/, weight: 4 },
  { pattern: /\bbic\b|\bswift\b/, weight: 3 },
  { pattern: /\bextracto\b|\bextract\b/, weight: 2 },
  { pattern: /\bsaldo\b/, weight: 2 },
  { pattern: /\bmovimiento(s)?\b/, weight: 2 },
  { pattern: /\bbalance\b/, weight: 1 },
  { pattern: /\bstatement\b/, weight: 2 },
]

const RECEIPT_PATTERNS: WeightedPattern[] = [
  { pattern: /\breceipt\b|\brecibo\b|\bfactura\b/, weight: 4 },
  { pattern: /\bticket\b/, weight: 3 },
  { pattern: /\bsubtotal\b/, weight: 2 },
  { pattern: /\bvat\b|\biva\b/, weight: 2 },
  { pattern: /\btax\b/, weight: 2 },
  { pattern: /\bthank\s+you\b|\bthanks\b|\bgracias\b|\bmerci\b/, weight: 3 },
  { pattern: /\bcashier\b|\bcash\b|\bchange\b/, weight: 2 },
  { pattern: /\bcard\b|\bvisa\b|\bmastercard\b|\bamex\b/, weight: 1 },
  { pattern: /\bcaja\b/, weight: 2 },
  { pattern: /\bnif\b|\bcif\b/, weight: 2 },
  { pattern: /\bitem\b|\barticulo\b|\bproducto\b/, weight: 1 },
  { pattern: /\bqty\b|\bcant\b|\bquantity\b/, weight: 1 },
  { pattern: /\bimporte\b|\bprecio\b/, weight: 1 },
  { pattern: /\btotal\b/, weight: 1 },
]

function normalizeText(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function scorePatterns(text: string, patterns: WeightedPattern[]): number {
  return patterns.reduce((score, entry) => {
    if (entry.pattern.test(text)) {
      return score + entry.weight
    }
    return score
  }, 0)
}

function countLineItemSignals(text: string): number {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  let count = 0
  for (const line of lines) {
    const amounts = line.match(/\d+[.,]\d{2}/g)
    if (!amounts || amounts.length < 2) continue
    if (!/[a-z]/i.test(line)) continue
    count += 1
  }
  return count
}

function countDateAmountLines(text: string): number {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const datePattern = /\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/
  const amountPattern = /\d+[.,]\d{2}/

  let count = 0
  for (const line of lines) {
    if (datePattern.test(line) && amountPattern.test(line)) {
      count += 1
    }
  }
  return count
}

export function detectDocumentKindFromText(rawText: string): {
  kind: DocumentKind
  scores: { receipt: number; statement: number }
} {
  if (!rawText || rawText.trim().length < 20) {
    return { kind: "unknown", scores: { receipt: 0, statement: 0 } }
  }

  const normalized = normalizeText(rawText)
  let receiptScore = scorePatterns(normalized, RECEIPT_PATTERNS)
  let statementScore = scorePatterns(normalized, STATEMENT_PATTERNS)

  const lineItemSignals = countLineItemSignals(rawText)
  if (lineItemSignals >= 3) {
    receiptScore += Math.min(3, Math.floor(lineItemSignals / 3))
  }

  const dateAmountLines = countDateAmountLines(rawText)
  if (dateAmountLines >= 6) {
    statementScore += 2
  } else if (dateAmountLines >= 3) {
    statementScore += 1
  }

  let kind: DocumentKind = "unknown"
  if (statementScore >= 4 && statementScore >= receiptScore + 2) {
    kind = "statement"
  } else if (receiptScore >= 4 && receiptScore >= statementScore + 1) {
    kind = "receipt"
  }

  return { kind, scores: { receipt: receiptScore, statement: statementScore } }
}
