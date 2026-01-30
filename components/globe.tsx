"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import createGlobe from "cobe"
import { cn } from "@/lib/utils"

interface EarthProps {
  className?: string
  theta?: number
  dark?: number
  scale?: number
  diffuse?: number
  mapSamples?: number
  mapBrightness?: number
  baseColor?: [number, number, number]
  markerColor?: [number, number, number]
  glowColor?: [number, number, number]
}
const Earth: React.FC<EarthProps> = ({
  className,
  theta = 0.25,
  dark = 1,
  scale = 1.1,
  diffuse = 1.2,
  mapSamples = 40000,
  mapBrightness = 6,
  baseColor = [0.4, 0.6509, 1],
  markerColor = [1, 0, 0],
  glowColor = [0.2745, 0.5765, 0.898],
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let width = 0
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null

    const onResize = () => canvasRef.current && (width = canvasRef.current.offsetWidth)

    // Debounced resize handler (250ms) - globe recreation is expensive
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(onResize, 250)
    }

    window.addEventListener("resize", handleResize, { passive: true })
    onResize()
    let phi = 0
    const globe = createGlobe(canvasRef.current!, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: theta,
      dark: dark,
      scale: scale,
      diffuse: diffuse,
      mapSamples: mapSamples,
      mapBrightness: mapBrightness,
      baseColor: baseColor,
      markerColor: markerColor,
      glowColor: glowColor,
      opacity: 1,
      offset: [0, 0],
      markers: [
        // longitude latitude
      ],
      onRender: (state: Record<string, any>) => {
        // Called on every animation frame.
        // `state` will be an empty object, return updated params.\
        state.phi = phi
        phi += 0.003
      },
    })

    return () => {
      globe.destroy()
      window.removeEventListener("resize", handleResize)
      if (resizeTimeout) clearTimeout(resizeTimeout)
    }
  }, [dark])

  return (
    <div className={cn("z-[10] mx-auto flex w-full max-w-[350px] items-center justify-center", className)}>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          maxWidth: "100%",
          aspectRatio: "1",
        }}
      />
    </div>
  )
}

export default Earth
