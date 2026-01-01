import type { LanguageRuleSet } from "./types"

export const IT_RULES: LanguageRuleSet = {
  locale: "it",
  minScore: 4,
  minMatches: 2,
  patterns: [
    { pattern: /\bestratto\b/, weight: 3 },
    { pattern: /\bsaldo\b/, weight: 2 },
    { pattern: /\bconto\b/, weight: 2 },
    { pattern: /\bcarta\b/, weight: 2 },
    { pattern: /\bbonifico\b/, weight: 2 },
    { pattern: /\baddebito\b/, weight: 2 },
    { pattern: /\bcredito\b/, weight: 2 },
    { pattern: /\bpagamento\b/, weight: 2 },
    { pattern: /\bdescrizione\b/, weight: 2 },
    { pattern: /\boperazione\b/, weight: 2 },
  ],
}
