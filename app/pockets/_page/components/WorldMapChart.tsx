 "use client"

import { memo, useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useTheme } from "next-themes"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { geoMercator, geoPath, GeoGeometryObjects } from "d3-geo"
import { select, pointer } from "d3-selection"
import { zoom, zoomIdentity, zoomTransform, ZoomBehavior, D3ZoomEvent } from "d3-zoom"
import { scaleQuantize } from "d3-scale"

// Import transition module for .transition() support
import "d3-transition"

// World countries GeoJSON features
import worldCountriesRaw from "@/lib/data/world-countries.json"

// Type for GeoJSON feature
interface GeoFeature {
  type: "Feature"
  properties: { name: string }
  geometry: GeoGeometryObjects
  id?: string
}

interface FeatureCollection {
  type: "FeatureCollection"
  features: GeoFeature[]
}

// Helper to merge Western Sahara into Morocco (combines geometries)
function mergeWesternSaharaIntoMorocco(features: GeoFeature[]): GeoFeature[] {
  const morocco = features.find(f => f.properties.name === "Morocco")
  const westernSahara = features.find(f => f.properties.name === "Western Sahara")

  if (!morocco || !westernSahara) {
    // If either is missing, just filter out Western Sahara
    return features.filter(f => f.properties.name !== "Western Sahara")
  }

  // Extract polygon coordinates from geometries
  const getPolygons = (geometry: GeoGeometryObjects): number[][][][] => {
    const geo = geometry as { type: string; coordinates: number[][][] | number[][][][] }
    if (geo.type === "Polygon") {
      return [geo.coordinates as number[][][]]
    } else if (geo.type === "MultiPolygon") {
      return geo.coordinates as number[][][][]
    }
    return []
  }

  const moroccoPolygons = getPolygons(morocco.geometry)
  const saharaPolygons = getPolygons(westernSahara.geometry)

  // Create merged Morocco with combined MultiPolygon geometry
  const mergedMorocco: GeoFeature = {
    type: "Feature",
    properties: { name: "Morocco" },
    geometry: {
      type: "MultiPolygon",
      coordinates: [...moroccoPolygons, ...saharaPolygons],
    } as GeoGeometryObjects,
    id: "Morocco",
  }

  // Return features with Western Sahara removed and Morocco replaced
  return features
    .filter(f => f.properties.name !== "Western Sahara" && f.properties.name !== "Morocco")
    .concat(mergedMorocco)
}

// Add id to each feature, merge Western Sahara into Morocco
const worldCountries: FeatureCollection = {
  type: "FeatureCollection",
  features: mergeWesternSaharaIntoMorocco(
    (worldCountriesRaw.features as GeoFeature[]).map((feature) => ({
      ...feature,
      id: feature.properties.name,
    }))
  ),
}

import type { CountryData } from "@/lib/types/pockets"

export type { CountryData } from "@/lib/types/pockets"

interface WorldMapChartProps {
  data?: CountryData[]
  isLoading?: boolean
  title?: string
}

export const WorldMapChart = memo(function WorldMapChart({
  data = [],
  isLoading = false,
  title,
}: WorldMapChartProps) {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const [mounted, setMounted] = useState(false)

  // Refs for D3 — containerRef is the map area we observe for resize (not the whole card)
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [activeCountry, setActiveCountry] = useState<GeoFeature | null>(null)
  // Use ref to avoid stale closure in D3 event handlers
  const activeCountryRef = useRef<GeoFeature | null>(null)

  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    visible: boolean
    x: number
    y: number
    countryName: string
    value: number | null
  }>({ visible: false, x: 0, y: 0, countryName: "", value: null })

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = resolvedTheme === "dark"

  // Colors
  const borderColor = isDark ? "#52525b" : "#a1a1aa"
  const unknownColor = isDark ? "#3f3f46" : "#e5e7eb"

  // Get palette colors for the choropleth scale
  const colorScale = useMemo(() => {
    const palette = getPalette()
    return [...palette].reverse().slice(0, 7)
  }, [getPalette])

  // Calculate domain for color scale
  const domain = useMemo(() => {
    if (data.length === 0) return [0, 100] as [number, number]
    const values = data.map(d => d.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    return [min, max] as [number, number]
  }, [data])

  // Create color scale function
  const getColor = useMemo(() => {
    return scaleQuantize<string>()
      .domain(domain)
      .range(colorScale.length > 0 ? colorScale : ["#e5e7eb", "#d1d5db", "#9ca3af", "#6b7280", "#4b5563", "#374151", "#1f2937"])
  }, [domain, colorScale])

  // Create data lookup map
  const dataMap = useMemo(() => {
    const map = new Map<string, number>()
    data.forEach(d => map.set(d.id, d.value))
    return map
  }, [data])

  // Reset zoom function
  const reset = useCallback(() => {
    const svg = select(svgRef.current)
    if (!svgRef.current || !zoomRef.current) return

    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight

    // Smooth transition back to identity transform
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(svg.transition().duration(750) as any).call(
      zoomRef.current.transform,
      zoomIdentity,
      zoomTransform(svgRef.current).invert([width / 2, height / 2])
    )

    activeCountryRef.current = null
    setActiveCountry(null)
  }, [])

  // Click handler for countries - defined inline to always have fresh refs
  const handleCountryClickRef = useRef<(event: MouseEvent, feature: GeoFeature) => void>(null!)

  handleCountryClickRef.current = (event: MouseEvent, feature: GeoFeature) => {
    const svg = select(svgRef.current)
    if (!svgRef.current || !zoomRef.current) return

    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight

    // If clicking the same country, reset (use ref for current value)
    if (activeCountryRef.current && activeCountryRef.current.id === feature.id) {
      // Reset zoom
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(svg.transition().duration(750) as any).call(
        zoomRef.current.transform,
        zoomIdentity,
        zoomTransform(svgRef.current).invert([width / 2, height / 2])
      )
      activeCountryRef.current = null
      setActiveCountry(null)
      return
    }

    // Calculate bounds of the clicked country (same scale as initial map)
    const projection = geoMercator()
      .scale(120)
      .translate([width / 2, height / 2 + 50])

    const path = geoPath().projection(projection)
    const bounds = path.bounds(feature)

    const dx = bounds[1][0] - bounds[0][0]
    const dy = bounds[1][1] - bounds[0][1]
    const x = (bounds[0][0] + bounds[1][0]) / 2
    const y = (bounds[0][1] + bounds[1][1]) / 2

    // Calculate scale to fit the country with some padding
    const scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height)))
    const translateX = width / 2 - scale * x
    const translateY = height / 2 - scale * y

    // Smooth zoom transition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(svg.transition().duration(750) as any).call(
      zoomRef.current.transform,
      zoomIdentity.translate(translateX, translateY).scale(scale),
      pointer(event, svgRef.current)
    )

    // Update both ref and state
    activeCountryRef.current = feature
    setActiveCountry(feature)
  }

  // Track container dimensions for resize handling
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const lastDimensionsRef = useRef<{ width: number; height: number } | null>(null)

  // Observe container size changes and set initial dimensions.
  // Only update state when width/height actually change to avoid ResizeObserver
  // firing (e.g. layout recalc, scrollbar) from clearing and redrawing the map.
  // Re-run when isLoading changes so we attach to the real map container (not the skeleton).
  useEffect(() => {
    if (!containerRef.current) return

    // Reset so we always set dimensions for this container (e.g. after switching from skeleton)
    lastDimensionsRef.current = null

    // Set initial dimensions immediately (use fallback if container not yet sized)
    const initialWidth = containerRef.current.clientWidth || 800
    const initialHeight = containerRef.current.clientHeight || 450
    if (initialWidth > 0 && initialHeight > 0) {
      lastDimensionsRef.current = { width: initialWidth, height: initialHeight }
      setDimensions(lastDimensionsRef.current)
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      if (width <= 0 || height <= 0) return
      const prev = lastDimensionsRef.current
      if (prev && prev.width === width && prev.height === height) return
      lastDimensionsRef.current = { width, height }
      setDimensions(lastDimensionsRef.current)
    })

    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [mounted, isLoading])

  // Initialize D3 map - only when mounted and we have valid dimensions
  useEffect(() => {
    if (!mounted || !svgRef.current || !containerRef.current || !dimensions) return

    const svg = select(svgRef.current)
    const { width, height } = dimensions

    // Clear previous content
    svg.selectAll("*").remove()

    // Set SVG dimensions
    svg.attr("width", width).attr("height", height)

    // Create main group for zoom transforms
    const g = svg.append("g")

    // Create projection
    const projection = geoMercator()
      .scale(120)
      .translate([width / 2, height / 2 + 50])

    // Create path generator
    const path = geoPath().projection(projection)

    // Create zoom behavior — only programmatic zoom on country click (no wheel, no pan/drag)
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .on("zoom", (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr("transform", event.transform.toString())
        // Adjust stroke-width inversely to zoom scale for consistent visual thickness
        g.selectAll("path").attr("stroke-width", 0.5 / event.transform.k)
      })

    // Store zoom reference
    zoomRef.current = zoomBehavior

    // Apply zoom behavior to SVG, then remove user-input listeners so only programmatic zoom works
    svg.call(zoomBehavior)
    svg.on("wheel.zoom", null)
    svg.on("mousedown.zoom", null)
    svg.on("dblclick.zoom", null)
    svg.on("touchstart.zoom", null)
    svg.on("touchmove.zoom", null)
    svg.on("touchend.zoom touchcancel.zoom", null)

    // Draw countries with initial unknown color (actual colors applied by color update useEffect)
    g.selectAll<SVGPathElement, GeoFeature>("path")
      .data(worldCountries.features)
      .enter()
      .append("path")
      .attr("d", d => path(d) || "")
      .attr("fill", unknownColor) // Initial fill, updated by color useEffect
      .attr("stroke", borderColor)
      .attr("stroke-width", 0.5)
      .attr("cursor", "pointer")
      .on("click", (event: MouseEvent, d: GeoFeature) => {
        event.stopPropagation()
        // Use ref to always get the latest handler
        handleCountryClickRef.current?.(event, d)
      })
      .on("mouseenter", (event: MouseEvent, d: GeoFeature) => {
        const value = dataMap.get(d.properties.name)
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          setTooltip({
            visible: true,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            countryName: d.properties.name,
            value: value ?? null,
          })
        }
        // Highlight on hover - scale stroke-width inversely to current zoom
        const currentScale = svgRef.current ? zoomTransform(svgRef.current).k : 1
        select(event.currentTarget as SVGPathElement)
          .attr("stroke-width", 1.5 / currentScale)
          .attr("stroke", isDark ? "#a1a1aa" : "#52525b")
      })
      .on("mousemove", (event: MouseEvent) => {
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          setTooltip(prev => ({
            ...prev,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          }))
        }
      })
      .on("mouseleave", (event: MouseEvent) => {
        setTooltip(prev => ({ ...prev, visible: false }))
        // Reset stroke-width based on current zoom scale
        const currentScale = svgRef.current ? zoomTransform(svgRef.current).k : 1
        select(event.currentTarget as SVGPathElement)
          .attr("stroke-width", 0.5 / currentScale)
          .attr("stroke", borderColor)
      })

    // Click on SVG background to reset zoom
    svg.on("click", (event: MouseEvent) => {
      if (event.target === svgRef.current && activeCountryRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(svg.transition().duration(750) as any).call(
          zoomBehavior.transform,
          zoomIdentity,
          zoomTransform(svgRef.current!).invert([width / 2, height / 2])
        )
        activeCountryRef.current = null
        setActiveCountry(null)
      }
    })

    // Cleanup
    return () => {
      svg.on(".zoom", null)
    }
  // Only reinitialize when dimensions change or theme changes
  // Data/color updates are handled by the separate useEffect below
  }, [mounted, dimensions, isDark, borderColor, unknownColor])

  // Update colors when theme/data changes (without reinitializing zoom)
  useEffect(() => {
    // Wait for both mount and initialization (dimensions means SVG has paths)
    if (!mounted || !svgRef.current || !dimensions) return

    const svg = select(svgRef.current)

    svg.selectAll<SVGPathElement, GeoFeature>("path")
      .attr("fill", d => {
        const value = dataMap.get(d.properties.name)
        return value !== undefined ? getColor(value) : unknownColor
      })
      .attr("stroke", borderColor)
  }, [mounted, dimensions, dataMap, getColor, unknownColor, borderColor])

  // Bounded height so card cannot grow indefinitely on resize (avoids feedback: SVG size → card size → ResizeObserver → larger dimensions)
  const cardClassName =
    "relative bg-card text-card-foreground gap-6 rounded-xl border shadow-sm min-w-0 card-3d-light min-h-[500px] max-h-[min(80vh,900px)] flex flex-col p-0 overflow-hidden"

  // Loading skeleton - single full-bleed card div
  if (!mounted || isLoading) {
    return (
      <div className={cardClassName}>
        {title && (
          <div className="@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6">
            <div className="leading-none font-semibold">{title}</div>
          </div>
        )}
        <div ref={containerRef} className="flex-1 min-h-[450px] min-w-0">
          <div className="h-full w-full min-h-[450px] animate-pulse bg-muted/50" />
        </div>
      </div>
    )
  }

  // Main map card - map area is observed for resize so SVG dimensions stay in sync
  return (
    <div className={cardClassName}>
      {title && (
        <div className="@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6">
          <div className="leading-none font-semibold">{title}</div>
        </div>
      )}

      <div
        ref={containerRef}
        className="flex-1 min-h-[450px] min-w-0 flex flex-col overflow-hidden"
      >
        <svg
          ref={svgRef}
          className="w-full h-full min-h-[450px]"
          style={{ cursor: "pointer" }}
        />
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="absolute pointer-events-none z-50 px-3 py-2 rounded-md shadow-lg border text-sm"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            backgroundColor: isDark ? "#27272a" : "#ffffff",
            borderColor: isDark ? "#3f3f46" : "#e4e4e7",
            transform: "translateY(-100%)",
          }}
        >
          <div className="font-medium" style={{ color: isDark ? "#fafafa" : "#18181b" }}>
            {tooltip.countryName}
          </div>
          <div style={{ color: isDark ? "#a1a1aa" : "#71717a" }}>
            {tooltip.value !== null
              ? formatCurrency(tooltip.value)
              : "No spending recorded"
            }
          </div>
          {tooltip.value !== null && (
            <div className="text-xs" style={{ color: isDark ? "#71717a" : "#a1a1aa" }}>
              Total spending
            </div>
          )}
        </div>
      )}

      {/* Reset button when zoomed */}
      {activeCountry && (
        <button
          onClick={reset}
          className="absolute top-2 right-2 px-3 py-1.5 text-sm rounded-md border transition-colors"
          style={{
            backgroundColor: isDark ? "#27272a" : "#ffffff",
            borderColor: isDark ? "#3f3f46" : "#e4e4e7",
            color: isDark ? "#fafafa" : "#18181b",
          }}
        >
          Reset view
        </button>
      )}
    </div>
  )
})

WorldMapChart.displayName = "WorldMapChart"
