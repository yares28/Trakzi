import type { CsvDiagnostics } from "./parseCsvToRows"

export type ParseQualityLevel = "high" | "medium" | "low"

export type ParseQualitySummary = {
    level: ParseQualityLevel
    score: number
    reasons: string[]
    parseMode?: "auto" | "ai"
}

export type ParseQualityRow = {
    date?: string | null
    description?: string | null
    amount?: number | string | null
    category?: string | null
}

type BuildParseQualityParams = {
    rows: ParseQualityRow[]
    diagnostics?: CsvDiagnostics | null
    parseMode?: "auto" | "ai" | null
}

function clampScore(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)))
}

function isBlank(value: string | null | undefined) {
    return !value || value.trim().length === 0
}

function isCategorized(value: string | null | undefined) {
    if (!value) return false
    const trimmed = value.trim()
    if (!trimmed) return false
    const normalized = trimmed.toLowerCase()
    return normalized !== "other" && normalized !== "uncategorized"
}

export function buildStatementParseQuality(params: BuildParseQualityParams): ParseQualitySummary {
    const totalRows = params.rows.length
    if (totalRows === 0) {
        return {
            level: "low",
            score: 0,
            reasons: ["No rows parsed"],
            parseMode: params.parseMode ?? undefined,
        }
    }

    const missingDates = params.rows.filter((row) => isBlank(row.date)).length
    const missingDescriptions = params.rows.filter((row) => isBlank(row.description)).length
    const categorizedCount = params.rows.filter((row) => isCategorized(row.category)).length

    const missingDateRatio = missingDates / totalRows
    const missingDescriptionRatio = missingDescriptions / totalRows
    const categoryCoverage = categorizedCount / totalRows
    const coverageRatio = params.diagnostics?.totalRowsInFile
        ? params.diagnostics.rowsAfterFiltering / params.diagnostics.totalRowsInFile
        : 1

    let score = 100
    score -= missingDateRatio * 45
    score -= missingDescriptionRatio * 30
    if (coverageRatio < 0.9) {
        score -= (0.9 - coverageRatio) * 60
    }
    if (categoryCoverage < 0.5) {
        score -= (0.5 - categoryCoverage) * 20
    }
    if (params.diagnostics?.softValidatedCount) {
        score -= Math.min(15, params.diagnostics.softValidatedCount)
    }
    if (params.diagnostics?.duplicatesDetected) {
        score -= Math.min(10, params.diagnostics.duplicatesDetected)
    }
    if (params.diagnostics?.warnings?.length) {
        score -= Math.min(10, params.diagnostics.warnings.length * 2)
    }
    if (params.parseMode === "ai") {
        score -= 5
    }

    score = clampScore(score)

    let level: ParseQualityLevel = score >= 80 ? "high" : score >= 55 ? "medium" : "low"
    if (missingDateRatio > 0.4 || missingDescriptionRatio > 0.4 || coverageRatio < 0.5) {
        level = "low"
    } else if (missingDateRatio > 0.2 || missingDescriptionRatio > 0.2 || coverageRatio < 0.75) {
        if (level === "high") level = "medium"
    }

    const reasons: string[] = []
    if (missingDateRatio > 0.1) reasons.push("Missing dates in some rows")
    if (missingDescriptionRatio > 0.1) reasons.push("Missing descriptions in some rows")
    if (coverageRatio < 0.8) reasons.push("Rows filtered during parsing")
    if (params.diagnostics?.softValidatedCount) reasons.push("Rows kept with invalid dates")
    if (params.diagnostics?.duplicatesDetected) reasons.push("Possible duplicates detected")
    if (categoryCoverage < 0.4) reasons.push("Low auto-categorization coverage")
    if (params.diagnostics?.warnings?.length) reasons.push("Parser warnings reported")
    if (params.parseMode === "ai") reasons.push("AI parse used")

    if (reasons.length === 0) {
        reasons.push("Complete data")
        if (categoryCoverage >= 0.6) {
            reasons.push("Auto-categorized")
        }
    }

    return {
        level,
        score,
        reasons: reasons.slice(0, 4),
        parseMode: params.parseMode ?? undefined,
    }
}
