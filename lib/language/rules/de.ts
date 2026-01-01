import type { LanguageRuleSet } from "./types"

export const DE_RULES: LanguageRuleSet = {
  locale: "de",
  minScore: 4,
  minMatches: 2,
  patterns: [
    { pattern: /\bkonto\b/, weight: 3 },
    { pattern: /\bsaldo\b/, weight: 2 },
    { pattern: /\bkarte\b/, weight: 2 },
    { pattern: /\buberweisung\b/, weight: 3 },
    { pattern: /\blastschrift\b/, weight: 3 },
    { pattern: /\bgutschrift\b/, weight: 2 },
    { pattern: /\bverwendungszweck\b/, weight: 3 },
    { pattern: /\bzahlung\b/, weight: 2 },
    { pattern: /\babbuchung\b/, weight: 2 },
    { pattern: /\bgebuhr\b/, weight: 2 },
  ],
}
