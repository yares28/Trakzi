"use client"

import { memo, useMemo } from "react"
import worldCountriesRaw from "@/lib/data/world-countries.json"

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

    if (mainPolygons.length === 0 || !mainSvgData) {
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
