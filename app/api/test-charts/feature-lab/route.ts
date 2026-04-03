import { readFile } from "node:fs/promises"
import path from "node:path"

import { NextResponse } from "next/server"

import type { FeatureLabBundleResponse, FeatureManifestEntry } from "@/components/test-charts/feature-lab-content"

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function extractSection(markdown: string, startMarker: string, endMarker?: string) {
  const startIndex = markdown.indexOf(startMarker)

  if (startIndex === -1) {
    throw new Error(`Could not locate section: ${startMarker}`)
  }

  const searchStart = startIndex + startMarker.length
  const endIndex = endMarker ? markdown.indexOf(endMarker, searchStart) : -1

  return markdown
    .slice(startIndex, endIndex === -1 ? undefined : endIndex)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseFeatureRows(lines: string[]): FeatureManifestEntry[] {
  const rows = lines.filter(
    (line) =>
      line.startsWith("|") &&
      !line.startsWith("|---") &&
      !line.startsWith("| Feature Name |") &&
      !line.startsWith("| Feature Name|"),
  )

  return rows.map((row) => {
    const parts = row
      .slice(1, -1)
      .split("|")
      .map((part) => part.trim())

    const [
      title,
      featureType,
      difficulty,
      primarySurface,
      existingSurfaces,
      userProblemSolved,
      whatItDoes,
      whyItMatters,
      mvpShape,
      newDataInfraNeeded,
      confidence,
    ] = parts

    return {
      id: slugify(title),
      title,
      featureType: (featureType as FeatureManifestEntry["featureType"]) ?? "Strengthen Existing",
      difficulty: (difficulty as FeatureManifestEntry["difficulty"]) ?? "Medium",
      primarySurface,
      existingSurfaces,
      userProblemSolved,
      whatItDoes,
      whyItMatters,
      mvpShape,
      newDataInfraNeeded,
      confidence: (confidence as FeatureManifestEntry["confidence"]) ?? "Medium",
    }
  })
}

async function readFeatureFile(relativePath: string) {
  const filePath = path.join(process.cwd(), "docs", "feature generation", relativePath)
  return readFile(filePath, "utf8")
}

async function getActiveManifest() {
  const markdown = await readFeatureFile("2026-04-02-feature-shortlist-round-1.md")
  return parseFeatureRows(extractSection(markdown, "## 1. Proposed Features", "## 2. Best of Batch"))
}

async function getApprovedManifest() {
  const markdown = await readFeatureFile("APPROVED_FEATURE_MEMORY.md")
  return parseFeatureRows(extractSection(markdown, "## Approved Features"))
}

export const GET = async () => {
  try {
    const [manifest, approvedManifest] = await Promise.all([getActiveManifest(), getApprovedManifest()])

    const payload: FeatureLabBundleResponse = {
      manifest,
      approvedManifest,
    }

    return NextResponse.json(payload, {
      headers: {
        "Content-Type": "application/json",
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load the test feature idea lab"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
