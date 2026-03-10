"use client"

import React from "react"

// Types
interface GlassTabProps {
  children: React.ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
}

// Glass Tab Component
export const GlassTab: React.FC<GlassTabProps> = ({
  children,
  active = false,
  onClick,
  className = "",
}) => {
  const glassStyle = {
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2), 0 0 12px rgba(0, 0, 0, 0.1)",
    transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 2.2)",
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-700 overflow-hidden shrink-0 ${className}`}
      style={glassStyle}
    >
      {/* Glass Layers */}
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-full"
        style={{
          backdropFilter: "blur(3px)",
          filter: "url(#glass-distortion)",
          isolation: "isolate",
        }}
      />
      <div
        className="absolute inset-0 z-10 rounded-full"
        style={{
          background: active
            ? "rgba(255, 255, 255, 0.85)"
            : "rgba(255, 255, 255, 0.25)",
        }}
      />
      <div
        className="absolute inset-0 z-20 rounded-full overflow-hidden"
        style={{
          boxShadow: active
            ? "inset 2px 2px 1px 0 rgba(255, 255, 255, 0.7), inset -1px -1px 1px 1px rgba(255, 255, 255, 0.5)"
            : "inset 1px 1px 0.5px 0 rgba(255, 255, 255, 0.5), inset -0.5px -0.5px 0.5px 0.5px rgba(255, 255, 255, 0.3)",
        }}
      />

      {/* Content */}
      <span className={`relative z-30 ${active ? "text-foreground" : "text-muted-foreground"} hover:text-foreground`}>
        {children}
      </span>
    </button>
  )
}

// SVG Filter Component - Add this once in your layout
export const GlassFilter: React.FC = () => (
  <svg style={{ display: "none" }}>
    <filter
      id="glass-distortion"
      x="0%"
      y="0%"
      width="100%"
      height="100%"
      filterUnits="objectBoundingBox"
    >
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.001 0.005"
        numOctaves="1"
        seed="17"
        result="turbulence"
      />
      <feComponentTransfer in="turbulence" result="mapped">
        <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
        <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
        <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
      </feComponentTransfer>
      <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
      <feSpecularLighting
        in="softMap"
        surfaceScale="5"
        specularConstant="1"
        specularExponent="100"
        lightingColor="white"
        result="specLight"
      >
        <fePointLight x="-200" y="-200" z="300" />
      </feSpecularLighting>
      <feComposite
        in="specLight"
        operator="arithmetic"
        k1="0"
        k2="1"
        k3="1"
        k4="0"
        result="litImage"
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="softMap"
        scale="200"
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>
  </svg>
)
