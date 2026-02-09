"use client"

import { memo, useMemo, useState, useEffect } from "react"
import worldCountriesRaw from "@/lib/data/world-countries.json"

// Mapping from country name to SVG filename in /extraoutlines/
// These are countries too small for the GeoJSON world-countries.json
const EXTRA_OUTLINE_FILES: Record<string, string> = {
    "Andorra": "andorra.svg",
    "Antigua and Barbuda": "Antigua and Barbuda.svg",
    "Bahrain": "bahrain.svg",
    "Barbados": "Barbados.svg",
    "Cape Verde": "Cape Verde.svg",
    "Comoros": "Comoros.svg",
    "Dominica": "Dominica.svg",
    "Kiribati": "Kiribati.svg",
    "Liechtenstein": "Liechtenstein.svg",
    "Maldives": "Maldives.svg",
    "Malta": "malta.svg",
    "Marshall Islands": "Marshall Islands.svg",
    "Mauritius": "Mauritius.svg",
    "Nauru": "Nauru.svg",
    "North Korea": "northkorea.svg",
    "Palau": "Palau.svg",
    "Saint Kitts and Nevis": "Saint Kitts and Nevis.svg",
    "Saint Lucia": "Saint Lucia.svg",
    "Saint Vincent and the Grenadines": "Saint Vincent and the Grenadines.svg",
    "Samoa": "Samoa.svg",
    "San Marino": "San Marino.svg",
    "Sao Tome and Principe": "Sao Tome and Principe.svg",
    "Seychelles": "Seychelles.svg",
    "Singapore": "singapore.svg",
    "Tonga": "Tonga.svg",
    "Tuvalu": "Tuvalu.svg",
    "Vatican City": "Vatican City.svg",
    "Monaco": "Monaco.svg",
    "Grenada": "Grenada.svg",
    "Micronesia": "Micronesia.svg",
}

interface GeoFeature {
    type: string
    properties: { name: string }
    geometry: {
        type: "Polygon" | "MultiPolygon"
        coordinates: number[][][] | number[][][][]
    }
}

interface PolygonData {
    rings: number[][][]
    area: number
    bounds: { minX: number; maxX: number; minY: number; maxY: number }
    centerLat: number
}

interface CountryOutlineProps {
    countryName: string
    className?: string
    fillColor?: string
    strokeColor?: string
    maxSize?: number
    secondarySize?: number
}

// Get country feature by name
function getCountryFeature(name: string): GeoFeature | undefined {
    return (worldCountriesRaw.features as GeoFeature[]).find(
        (f) => f.properties.name === name
    )
}

// Calculate approximate area of a polygon using shoelace formula
function calculatePolygonArea(ring: number[][]): number {
    let area = 0
    const n = ring.length
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n
        area += ring[i][0] * ring[j][1]
        area -= ring[j][0] * ring[i][1]
    }
    return Math.abs(area / 2)
}

// Get bounds of a polygon
function getPolygonBounds(rings: number[][][]): { minX: number; maxX: number; minY: number; maxY: number; centerLat: number } {
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity

    for (const ring of rings) {
        for (const [x, y] of ring) {
            minX = Math.min(minX, x)
            maxX = Math.max(maxX, x)
            minY = Math.min(minY, y)
            maxY = Math.max(maxY, y)
        }
    }

    const centerLat = (minY + maxY) / 2

    return { minX, maxX, minY, maxY, centerLat }
}

// Extract polygons from geometry and sort by area
function extractPolygons(geometry: GeoFeature["geometry"]): PolygonData[] {
    const polygons: PolygonData[] = []

    if (geometry.type === "Polygon") {
        const rings = geometry.coordinates as number[][][]
        const area = calculatePolygonArea(rings[0])
        const bounds = getPolygonBounds(rings)
        polygons.push({ rings, area, bounds, centerLat: bounds.centerLat })
    } else if (geometry.type === "MultiPolygon") {
        for (const polygon of geometry.coordinates as number[][][][]) {
            const area = calculatePolygonArea(polygon[0])
            const bounds = getPolygonBounds(polygon)
            polygons.push({ rings: polygon, area, bounds, centerLat: bounds.centerLat })
        }
    }

    return polygons.sort((a, b) => b.area - a.area)
}

// Get combined bounds for multiple polygons with latitude correction
function getCombinedBounds(polygons: PolygonData[]): {
    minX: number; maxX: number; minY: number; maxY: number; centerLat: number
} {
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity

    for (const p of polygons) {
        minX = Math.min(minX, p.bounds.minX)
        maxX = Math.max(maxX, p.bounds.maxX)
        minY = Math.min(minY, p.bounds.minY)
        maxY = Math.max(maxY, p.bounds.maxY)
    }

    return { minX, maxX, minY, maxY, centerLat: (minY + maxY) / 2 }
}

// Apply latitude correction factor (Mercator-like adjustment)
// At the equator, 1° lat ≈ 1° lon in distance
// At latitude φ, 1° lon ≈ cos(φ) * 1° lat in distance
function getLatitudeCorrectionFactor(centerLat: number): number {
    const latRad = (Math.abs(centerLat) * Math.PI) / 180
    return Math.cos(latRad)
}

// Calculate SVG dimensions with latitude correction
function calculateSvgDimensions(
    bounds: { minX: number; maxX: number; minY: number; maxY: number; centerLat: number },
    maxSize: number,
    padding: number = 8
): { width: number; height: number; scale: number; offsetX: number; offsetY: number; latCorrection: number } {
    const latCorrection = getLatitudeCorrectionFactor(bounds.centerLat)

    // Apply latitude correction to longitude span
    const geoWidth = (bounds.maxX - bounds.minX) * latCorrection
    const geoHeight = bounds.maxY - bounds.minY

    if (geoWidth === 0 || geoHeight === 0) {
        return { width: maxSize, height: maxSize, scale: 1, offsetX: 0, offsetY: 0, latCorrection }
    }

    const aspectRatio = geoWidth / geoHeight
    let width: number
    let height: number

    if (aspectRatio > 1) {
        // Wider than tall
        width = maxSize
        height = Math.max(maxSize / aspectRatio, maxSize * 0.35)
    } else {
        // Taller than wide
        height = maxSize
        width = Math.max(maxSize * aspectRatio, maxSize * 0.35)
    }

    const availableWidth = width - padding * 2
    const availableHeight = height - padding * 2

    // Scale based on corrected dimensions
    const scaleX = availableWidth / geoWidth
    const scaleY = availableHeight / geoHeight
    const scale = Math.min(scaleX, scaleY)

    const offsetX = padding + (availableWidth - geoWidth * scale) / 2
    const offsetY = padding + (availableHeight - geoHeight * scale) / 2

    return { width, height, scale, offsetX, offsetY, latCorrection }
}

// Convert multiple polygons to a single SVG path
function polygonsToSvgPath(
    polygons: PolygonData[],
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    scale: number,
    offsetX: number,
    offsetY: number,
    latCorrection: number
): string {
    const transform = (lon: number, lat: number): [number, number] => {
        // Apply latitude correction to longitude
        const correctedX = (lon - bounds.minX) * latCorrection * scale + offsetX
        const y = (bounds.maxY - lat) * scale + offsetY // Flip Y
        return [correctedX, y]
    }

    let path = ""

    for (const polygon of polygons) {
        for (const ring of polygon.rings) {
            for (let i = 0; i < ring.length; i++) {
                const [x, y] = transform(ring[i][0], ring[i][1])
                path += i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : `L${x.toFixed(1)},${y.toFixed(1)}`
            }
            path += "Z"
        }
    }

    return path
}

// Convert a single polygon to SVG path for secondary polygons
function polygonToSvgPathSimple(
    polygon: PolygonData,
    size: number,
    padding: number = 4
): { path: string; width: number; height: number } {
    const { rings, bounds, centerLat } = polygon
    const { minX, maxX, minY, maxY } = bounds

    const latCorrection = getLatitudeCorrectionFactor(centerLat)
    const geoWidth = (maxX - minX) * latCorrection
    const geoHeight = maxY - minY

    if (geoWidth === 0 || geoHeight === 0) {
        return { path: "", width: size, height: size }
    }

    const aspectRatio = geoWidth / geoHeight
    let width: number
    let height: number

    if (aspectRatio > 1) {
        width = size
        height = Math.max(size / aspectRatio, size * 0.4)
    } else {
        height = size
        width = Math.max(size * aspectRatio, size * 0.4)
    }

    const availableWidth = width - padding * 2
    const availableHeight = height - padding * 2
    const scaleX = availableWidth / geoWidth
    const scaleY = availableHeight / geoHeight
    const scale = Math.min(scaleX, scaleY)

    const offsetX = padding + (availableWidth - geoWidth * scale) / 2
    const offsetY = padding + (availableHeight - geoHeight * scale) / 2

    const transform = (lon: number, lat: number): [number, number] => {
        const x = (lon - minX) * latCorrection * scale + offsetX
        const y = (maxY - lat) * scale + offsetY
        return [x, y]
    }

    let path = ""
    for (const ring of rings) {
        for (let i = 0; i < ring.length; i++) {
            const [x, y] = transform(ring[i][0], ring[i][1])
            path += i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : `L${x.toFixed(1)},${y.toFixed(1)}`
        }
        path += "Z"
    }

    return { path, width, height }
}

export const CountryOutline = memo(function CountryOutline({
    countryName,
    className = "",
    fillColor,
    strokeColor,
    maxSize = 140,
    secondarySize = 36,
}: CountryOutlineProps) {
    const { mainPolygons, secondaryPolygons } = useMemo(() => {
        const feature = getCountryFeature(countryName)
        if (!feature) return { mainPolygons: [], secondaryPolygons: [] }

        const allPolygons = extractPolygons(feature.geometry)
        if (allPolygons.length === 0) return { mainPolygons: [], secondaryPolygons: [] }

        // The largest polygon is always the main one
        const largest = allPolygons[0]
        const main: PolygonData[] = [largest]
        const secondary: PolygonData[] = []

        // Countries where we include ALL nearby islands/territories (even tiny ones)
        const INCLUDE_ALL_NEARBY = new Set([
            // Archipelagos & island nations
            "Indonesia", "Fiji", "Papua New Guinea", "Philippines", "Japan",
            "Greece", "Malaysia", "Croatia", "Estonia", "Solomon Islands",
            "Vanuatu", "New Zealand", "The Bahamas", "Trinidad and Tobago",
            // Countries with significant nearby islands/territories
            "Spain", "China", "Chile", "Canada", "Australia", "Argentina",
            "Oman", "Angola", "Italy", "India", "UK", "Denmark", "France",
            "Portugal", "Ecuador", "Turkey", "Finland", "Sweden",
            "Equatorial Guinea", "Azerbaijan"
        ])
        const includeAllNearby = INCLUDE_ALL_NEARBY.has(countryName)

        // Countries that should EXCLUDE distant territories (keep mainland only)
        const EXCLUDE_DISTANT = new Set(["USA", "Russia", "Norway"])

        // Countries with very distant but integral islands (need extra wide threshold)
        const EXTRA_WIDE_PROXIMITY = new Set(["Spain", "Portugal", "Ecuador"])

        // Group polygons based on significance AND proximity to largest
        const largestCenterLon = (largest.bounds.minX + largest.bounds.maxX) / 2
        const largestCenterLat = (largest.bounds.minY + largest.bounds.maxY) / 2

        // Proximity threshold based on country type
        let proximityThreshold = 15 // default
        if (EXCLUDE_DISTANT.has(countryName)) {
            proximityThreshold = 10 // tight for USA/Russia/Norway
        } else if (EXTRA_WIDE_PROXIMITY.has(countryName)) {
            proximityThreshold = 35 // extra wide for Spain (Canary Islands), Portugal (Azores), Ecuador (Galápagos)
        } else if (includeAllNearby) {
            proximityThreshold = 25 // wide for island nations
        }

        for (let i = 1; i < allPolygons.length; i++) {
            const p = allPolygons[i]
            const pCenterLon = (p.bounds.minX + p.bounds.maxX) / 2
            const pCenterLat = (p.bounds.minY + p.bounds.maxY) / 2

            // Check if close enough to largest polygon
            const lonDiff = Math.abs(pCenterLon - largestCenterLon)
            const latDiff = Math.abs(pCenterLat - largestCenterLat)
            const isClose = lonDiff < proximityThreshold && latDiff < proximityThreshold

            // Significance threshold: very low for island nations, normal for others
            const significanceThreshold = includeAllNearby ? 0.001 : 0.03 // 0.1% vs 3%
            const isSignificant = p.area >= largest.area * significanceThreshold

            // Include if significant AND close
            // For island nations: lower threshold + wider proximity = more islands included
            if (isSignificant && isClose) {
                main.push(p)
            } else {
                secondary.push(p)
            }
        }

        // Limit secondary to max 3
        return {
            mainPolygons: main,
            secondaryPolygons: secondary.slice(0, 3)
        }
    }, [countryName])

    const mainSvgData = useMemo(() => {
        if (mainPolygons.length === 0) return null

        const combinedBounds = getCombinedBounds(mainPolygons)
        const dims = calculateSvgDimensions(combinedBounds, maxSize)
        const path = polygonsToSvgPath(
            mainPolygons,
            combinedBounds,
            dims.scale,
            dims.offsetX,
            dims.offsetY,
            dims.latCorrection
        )

        return { ...dims, path }
    }, [mainPolygons, maxSize])

    // Check if this country has an extra outline SVG file
    const extraSvgFile = EXTRA_OUTLINE_FILES[countryName]

    if (mainPolygons.length === 0 || !mainSvgData) {
        // Fallback to extra outline SVG if available
        if (extraSvgFile) {
            return (
                <ExtraOutlineSvg
                    countryName={countryName}
                    filename={extraSvgFile}
                    maxSize={maxSize}
                    className={className}
                />
            )
        }

        return (
            <div
                className={`flex items-center justify-center ${className}`}
                style={{ width: maxSize, height: maxSize }}
            >
                <span className="text-muted-foreground text-xs">No outline</span>
            </div>
        )
    }

    return (
        <div className={`flex items-center justify-center gap-2 ${className}`} style={{ maxWidth: '100%' }}>
            {/* Main polygon(s) - includes all significant landmasses */}
            <svg
                viewBox={`0 0 ${mainSvgData.width} ${mainSvgData.height}`}
                aria-label={`Outline of ${countryName}`}
                preserveAspectRatio="xMidYMid meet"
                style={{
                    width: mainSvgData.width,
                    height: mainSvgData.height,
                    maxWidth: '100%',
                    maxHeight: '100%',
                }}
            >
                <path
                    d={mainSvgData.path}
                    fill={fillColor || "currentColor"}
                    stroke={strokeColor || "currentColor"}
                    strokeWidth={1.5}
                    fillOpacity={0.2}
                    strokeOpacity={0.7}
                />
            </svg>

            {/* Secondary polygons (tiny islands, overseas territories) */}
            {secondaryPolygons.length > 0 && (
                <div className="flex flex-col gap-1 shrink-0">
                    {secondaryPolygons.map((polygon, index) => {
                        const { path, width, height } = polygonToSvgPathSimple(polygon, secondarySize)
                        if (!path) return null
                        return (
                            <svg
                                key={index}
                                viewBox={`0 0 ${width} ${height}`}
                                className="opacity-60"
                                preserveAspectRatio="xMidYMid meet"
                                style={{ width, height, maxWidth: '100%' }}
                            >
                                <path
                                    d={path}
                                    fill={fillColor || "currentColor"}
                                    stroke={strokeColor || "currentColor"}
                                    strokeWidth={1}
                                    fillOpacity={0.15}
                                    strokeOpacity={0.5}
                                />
                            </svg>
                        )
                    })}
                </div>
            )}
        </div>
    )
})

CountryOutline.displayName = "CountryOutline"

/**
 * Extract the outer boundary from a border-ribbon SVG path.
 * Uses the browser's SVG path API (getPointAtLength) to detect the
 * ribbon structure and extract only the outer edges for a filled polygon.
 *
 * Handles TWO structures:
 * 1. Single ribbon: start → outer → far tip → inner → start
 *    → Extract 0 → peak as the outer boundary
 * 2. Two ribbons (e.g., Bahrain): left coast ribbon (0→~40%) + right coast
 *    ribbon (~40%→100%), each with outer+inner edges. Detected by a
 *    "near-start return" where distance drops below 10% of max.
 *    → Combine left outer (0→peak1) + right outer reversed (peak2→dip)
 */
function extractOuterBoundaryFromRibbon(d: string): string {
    const svgNS = "http://www.w3.org/2000/svg"
    const svg = document.createElementNS(svgNS, "svg")
    svg.style.position = "absolute"
    svg.style.width = "0"
    svg.style.height = "0"
    svg.style.overflow = "hidden"
    const pathEl = document.createElementNS(svgNS, "path") as SVGPathElement
    pathEl.setAttribute("d", d)
    svg.appendChild(pathEl)
    document.body.appendChild(svg)

    try {
        const totalLength = pathEl.getTotalLength()
        const start = pathEl.getPointAtLength(0)

        // Dense sampling to detect ribbon structure
        const numSamples = 400
        const samples: { frac: number; dist: number }[] = []
        let maxDist = 0

        for (let i = 0; i <= numSamples; i++) {
            const frac = i / numSamples
            const pt = pathEl.getPointAtLength(frac * totalLength)
            const dist = Math.hypot(pt.x - start.x, pt.y - start.y)
            if (dist > maxDist) maxDist = dist
            samples.push({ frac, dist })
        }

        // Look for a "near-start return" — a dip where dist drops below 10%
        // of max distance, in the 15%-85% range. This signals two ribbon bands.
        const threshold = maxDist * 0.10
        let dipFrac = -1
        const searchStart = Math.floor(numSamples * 0.15)
        const searchEnd = Math.floor(numSamples * 0.85)

        for (let i = searchStart; i <= searchEnd; i++) {
            if (samples[i].dist < threshold) {
                // Found a near-start dip — find its minimum
                let minDist = samples[i].dist
                let minIdx = i
                while (i <= searchEnd && samples[i].dist < threshold) {
                    if (samples[i].dist < minDist) {
                        minDist = samples[i].dist
                        minIdx = i
                    }
                    i++
                }
                dipFrac = samples[minIdx].frac
                break
            }
        }

        const numPoints = 60

        if (dipFrac > 0) {
            // TWO-RIBBON structure: left ribbon (0→dip) + right ribbon (dip→1.0)
            // Find peak (max dist) in each ribbon
            let peak1Frac = 0, peak1Dist = 0
            let peak2Frac = dipFrac, peak2Dist = 0

            for (const s of samples) {
                if (s.frac <= dipFrac && s.dist > peak1Dist) {
                    peak1Dist = s.dist
                    peak1Frac = s.frac
                }
                if (s.frac >= dipFrac && s.dist > peak2Dist) {
                    peak2Dist = s.dist
                    peak2Frac = s.frac
                }
            }

            // Build polygon: left outer forward + right outer reversed
            // Left outer (0 → peak1): top → bottom on left coast
            // Right outer reversed (peak2 → dip): bottom → top on right coast
            // Z closes from dip (near start/top) back to 0 (start)
            const parts: string[] = []

            for (let i = 0; i <= numPoints; i++) {
                const f = (i / numPoints) * peak1Frac
                const pt = pathEl.getPointAtLength(f * totalLength)
                parts.push(`${parts.length === 0 ? "M" : "L"}${pt.x.toFixed(0)},${pt.y.toFixed(0)}`)
            }

            for (let i = 0; i <= numPoints; i++) {
                const f = peak2Frac - (i / numPoints) * (peak2Frac - dipFrac)
                const pt = pathEl.getPointAtLength(f * totalLength)
                parts.push(`L${pt.x.toFixed(0)},${pt.y.toFixed(0)}`)
            }

            return parts.join(" ") + " Z"
        } else {
            // SINGLE-RIBBON: simple turnaround at max distance from start
            let turnaroundFrac = 0.5
            for (const s of samples) {
                if (s.dist > maxDist * 0.999) {
                    turnaroundFrac = s.frac
                    break
                }
            }

            const parts: string[] = []
            for (let i = 0; i <= numPoints; i++) {
                const f = (i / numPoints) * turnaroundFrac
                const pt = pathEl.getPointAtLength(f * totalLength)
                parts.push(`${i === 0 ? "M" : "L"}${pt.x.toFixed(0)},${pt.y.toFixed(0)}`)
            }

            return parts.join(" ") + " Z"
        }
    } finally {
        document.body.removeChild(svg)
    }
}

// Sub-component for rendering extra outline SVGs (countries not in GeoJSON)
// Fetches the SVG, extracts path data, and renders inline with matching styles
const ExtraOutlineSvg = memo(function ExtraOutlineSvg({
    countryName,
    filename,
    maxSize,
    className = "",
}: {
    countryName: string
    filename: string
    maxSize: number
    className?: string
}) {
    const [pathData, setPathData] = useState<{ paths: string[]; viewBox: string } | null>(null)

    useEffect(() => {
        let cancelled = false
        const url = `/extraoutlines/${encodeURIComponent(filename)}`

        fetch(url)
            .then(res => res.text())
            .then(svgText => {
                if (cancelled) return

                // Parse the SVG to extract path d attributes and viewBox
                const parser = new DOMParser()
                const doc = parser.parseFromString(svgText, "image/svg+xml")
                const svgEl = doc.querySelector("svg")
                if (!svgEl) return

                const viewBox = svgEl.getAttribute("viewBox") || "0 0 600 450"

                // Extract outer boundary paths from each <path> element
                // These SVGs are bitmap-traced: each path has 2 sub-paths
                // (outer boundary + inner boundary = border ribbon).
                // We extract only the first sub-path to get a filled polygon shape.
                const pathEls = doc.querySelectorAll("path")
                const paths: string[] = []
                pathEls.forEach(p => {
                    const d = p.getAttribute("d")
                    if (!d) return

                    // Count sub-paths by finding M/m commands
                    const mMatches = [...d.matchAll(/[Mm]/g)]
                    if (mMatches.length >= 2) {
                        // Has outer + inner sub-paths — take only the outer (first)
                        const secondMIndex = mMatches[1].index!
                        paths.push(d.substring(0, secondMIndex).trim())
                    } else if (d.length > 500) {
                        // Single sub-path border ribbon (e.g., Bahrain main island,
                        // Sao Tome). Use SVG path API to find the turnaround point
                        // and extract just the outer boundary as a filled polygon.
                        try {
                            paths.push(extractOuterBoundaryFromRibbon(d))
                        } catch {
                            paths.push(d)
                        }
                    } else {
                        // Short single sub-path (e.g., Maldives atolls) — use as-is
                        paths.push(d)
                    }
                })

                if (paths.length > 0) {
                    setPathData({ paths, viewBox })
                }
            })
            .catch(() => {/* silently fail */})

        return () => { cancelled = true }
    }, [filename])

    if (!pathData) {
        return (
            <div
                className={`flex items-center justify-center ${className}`}
                style={{ width: maxSize, height: maxSize }}
            />
        )
    }

    // Parse viewBox (e.g. "0 0 600 450" or "0 0 300 420") for transform and aspect ratio
    const vbParts = pathData.viewBox.trim().split(/\s+/).map(Number)
    const vbWidth = vbParts[2] ?? 600
    const vbHeight = vbParts[3] ?? 450

    // Extra SVGs use pt units with transform translate(0, height) scale(0.1, -0.1)
    return (
        <div className={`flex items-center justify-center ${className}`} style={{ maxWidth: '100%' }}>
            <svg
                viewBox={pathData.viewBox}
                aria-label={`Outline of ${countryName}`}
                preserveAspectRatio="xMidYMid meet"
                style={{
                    width: maxSize,
                    height: maxSize * (vbHeight / vbWidth),
                    maxWidth: '100%',
                    maxHeight: '100%',
                }}
            >
                {/* Render outer-boundary-only paths with same style as GeoJSON outlines */}
                <g transform={`translate(0,${vbHeight}) scale(0.1,-0.1)`}>
                    {pathData.paths.map((d, i) => (
                        <path
                            key={i}
                            d={d}
                            fill="currentColor"
                            stroke="currentColor"
                            strokeWidth={1.5}
                            fillOpacity={0.2}
                            strokeOpacity={0.7}
                            vectorEffect="non-scaling-stroke"
                            strokeLinejoin="round"
                        />
                    ))}
                </g>
            </svg>
        </div>
    )
})

ExtraOutlineSvg.displayName = "ExtraOutlineSvg"
