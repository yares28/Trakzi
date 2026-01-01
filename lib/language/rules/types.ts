export type LanguageRule = {
  pattern: RegExp
  weight: number
}

export type LanguageRuleSet = {
  locale: string
  patterns: LanguageRule[]
  minScore?: number
  minMatches?: number
}

export type RuleDetection = {
  locale: string
  score: number
  confidence: number
  matches: number
}
