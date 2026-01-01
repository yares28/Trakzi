import type { LanguageRuleSet } from "./types"

export const PT_RULES: LanguageRuleSet = {
  locale: "pt",
  minScore: 4,
  minMatches: 2,
  patterns: [
    { pattern: /\bextrato\b/, weight: 3 },
    { pattern: /\bsaldo\b/, weight: 2 },
    { pattern: /\bconta\b/, weight: 2 },
    { pattern: /\bcartao\b/, weight: 2 },
    { pattern: /\btransferencia\b/, weight: 2 },
    { pattern: /\bmovimento\b/, weight: 2 },
    { pattern: /\bdebito\b/, weight: 2 },
    { pattern: /\bcredito\b/, weight: 2 },
    { pattern: /\bpagamento\b/, weight: 2 },
    { pattern: /\bdescricao\b/, weight: 2 },
    { pattern: /\bcompra\b/, weight: 2 },
    { pattern: /\bbeneficiario\b/, weight: 2 },
  ],
}
