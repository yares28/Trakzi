import { GLOBAL_BRAND_TOKENS } from "./global"
import { CA_RULES } from "./ca"
import { DE_RULES } from "./de"
import { EN_RULES } from "./en"
import { ES_RULES } from "./es"
import { FR_RULES } from "./fr"
import { IT_RULES } from "./it"
import { NL_RULES } from "./nl"
import { PT_RULES } from "./pt"
import type { LanguageRuleSet, RuleDetection } from "./types"

const LANGUAGE_RULE_SETS: LanguageRuleSet[] = [
  EN_RULES,
  ES_RULES,
  PT_RULES,
  FR_RULES,
  IT_RULES,
  DE_RULES,
  NL_RULES,
  CA_RULES,
]

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function stripGlobalBrands(text: string): string {
  if (!text) return text
  let cleaned = text
  for (const token of GLOBAL_BRAND_TOKENS) {
    const escaped = escapeRegex(token)
    cleaned = cleaned.replace(new RegExp(`\\b${escaped}\\b`, "g"), " ")
  }
  return cleaned.replace(/\s+/g, " ").trim()
}

export function detectLanguageByRules(text: string): RuleDetection {
  if (!text) {
    return { locale: "unknown", score: 0, confidence: 0, matches: 0 }
  }

  const cleaned = stripGlobalBrands(text)
  if (!cleaned) {
    return { locale: "unknown", score: 0, confidence: 0, matches: 0 }
  }

  const scored = LANGUAGE_RULE_SETS.map((rules) => {
    let score = 0
    let matches = 0
    for (const entry of rules.patterns) {
      if (entry.pattern.test(cleaned)) {
        score += entry.weight
        matches += 1
      }
    }
    return {
      locale: rules.locale,
      score,
      matches,
      minScore: rules.minScore ?? 3,
      minMatches: rules.minMatches ?? 2,
    }
  }).filter((entry) => entry.score >= entry.minScore && entry.matches >= entry.minMatches)

  if (scored.length === 0) {
    return { locale: "unknown", score: 0, confidence: 0, matches: 0 }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return b.matches - a.matches
  })

  const top = scored[0]
  const second = scored[1]
  const confidence = second ? top.score - second.score : top.score

  return {
    locale: top.locale,
    score: top.score,
    confidence,
    matches: top.matches,
  }
}
