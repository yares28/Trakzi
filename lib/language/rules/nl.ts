import type { LanguageRuleSet } from "./types"

export const NL_RULES: LanguageRuleSet = {
  locale: "nl",
  minScore: 4,
  minMatches: 2,
  patterns: [
    { pattern: /\brekening\b/, weight: 3 },
    { pattern: /\bsaldo\b/, weight: 2 },
    { pattern: /\bpas\b/, weight: 2 },
    { pattern: /\boverboeking\b/, weight: 3 },
    { pattern: /\bomschrijving\b/, weight: 2 },
    { pattern: /\bbetaling\b/, weight: 2 },
    { pattern: /\bafschrijving\b/, weight: 2 },
    { pattern: /\bbijschrijving\b/, weight: 2 },
    { pattern: /\bincasso\b/, weight: 2 },
    { pattern: /\brente\b/, weight: 2 },
  ],
}
