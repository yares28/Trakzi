import { francAll } from "franc-min"

export type SupportedLocale = "es" | "en" | "pt" | "fr" | "it" | "de" | "nl" | "ca" | "unknown"

const ISO_TO_LOCALE: Record<string, SupportedLocale> = {
  spa: "es",
  eng: "en",
  por: "pt",
  fra: "fr",
  ita: "it",
  deu: "de",
  nld: "nl",
  cat: "ca",
}

const SUPPORTED_ISO = Object.keys(ISO_TO_LOCALE)

type DetectOptions = {
  minLength?: number
  minScore?: number
  minDelta?: number
  maxSampleLength?: number
}

export type LanguageDetection = {
  locale: SupportedLocale
  score: number
  confidence: number
  iso: string | null
}

const DEFAULT_OPTIONS: Required<DetectOptions> = {
  minLength: 18,
  minScore: 0.35,
  minDelta: 0.12,
  maxSampleLength: 1200,
}

function normalizeSample(text: string): string {
  return text
    .replace(/\d+/g, " ")
    .replace(/[^\p{L}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function pickDetection(
  results: Array<[string, number]>,
  options: Required<DetectOptions>
): LanguageDetection {
  if (!results.length) {
    return { locale: "unknown", score: 0, confidence: 0, iso: null }
  }

  const [top, second] = results
  const iso = top?.[0]
  const score = Number(top?.[1] ?? 0)
  const secondScore = Number(second?.[1] ?? 0)
  const confidence = score - secondScore

  if (!iso || iso === "und") {
    return { locale: "unknown", score, confidence, iso: null }
  }

  const locale = ISO_TO_LOCALE[iso] ?? "unknown"

  if (locale === "unknown") {
    return { locale, score, confidence, iso }
  }

  if (score < options.minScore || confidence < options.minDelta) {
    return { locale: "unknown", score, confidence, iso }
  }

  return { locale, score, confidence, iso }
}

export function detectLanguage(text: string, options?: DetectOptions): LanguageDetection {
  const resolved = { ...DEFAULT_OPTIONS, ...options }
  if (!text) {
    return { locale: "unknown", score: 0, confidence: 0, iso: null }
  }

  const normalized = normalizeSample(text)
  if (normalized.length < resolved.minLength) {
    return { locale: "unknown", score: 0, confidence: 0, iso: null }
  }

  const sample = normalized.slice(0, resolved.maxSampleLength)
  const results = francAll(sample, {
    only: SUPPORTED_ISO,
    minLength: resolved.minLength,
  })

  return pickDetection(results, resolved)
}

export function detectLanguageFromSamples(
  samples: string[],
  options?: DetectOptions
): LanguageDetection {
  const resolved = { ...DEFAULT_OPTIONS, ...options }
  const chunks = samples
    .map((sample) => (typeof sample === "string" ? sample.trim() : ""))
    .filter((sample) => sample.length > 0)

  if (chunks.length === 0) {
    return { locale: "unknown", score: 0, confidence: 0, iso: null }
  }

  let combined = ""
  for (const chunk of chunks) {
    if (combined.length >= resolved.maxSampleLength) break
    combined += `${chunk} `
  }

  return detectLanguage(combined, resolved)
}
