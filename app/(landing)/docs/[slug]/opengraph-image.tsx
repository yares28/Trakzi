// app/(landing)/docs/[slug]/opengraph-image.tsx
//
// Per-post Open Graph image generator. Next.js auto-wires this into the
// <meta property="og:image"> tag for every /docs/[slug] route — no manual
// per-post configuration required. Each post gets a unique branded card.
//
// Renders at the Edge runtime, so generation is fast and cached by Vercel
// at the CDN layer. The 1200×630 size is the canonical OG dimension that
// every social platform (Twitter, LinkedIn, Slack, Facebook, Discord) expects.

import { ImageResponse } from "next/og"
import { getPostBySlug } from "@/lib/docs/posts"

export const runtime = "edge"
export const alt = "Trakzi blog post"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// Brand color (matches /public/Trakzi/LogoShort.svg fill).
const BRAND_ORANGE = "#E78A53"

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPostBySlug(slug)

  // Fall back to a generic Trakzi card if the slug doesn't resolve (e.g. preview
  // builds, broken links, draft posts). Better than serving a 404 to crawlers.
  const title = post?.title ?? "Trakzi Docs"
  const description = post?.description ?? "Guides for budgeting, expense tracking, and shared expenses."
  const date = post?.date ?? ""
  const readingTime = post?.readingTime ?? ""
  const tag = post?.tags?.[0]

  // Format the date for display (YYYY-MM-DD → "May 21, 2026")
  const formattedDate = date
    ? new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : ""

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a0f08 50%, #2d1810 100%)",
          color: "white",
          padding: "72px 80px",
          position: "relative",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Left edge orange accent bar — the brand signature */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: 12,
            background: BRAND_ORANGE,
            display: "flex",
          }}
        />

        {/* Soft orange glow in the bottom-right, anchors the gradient */}
        <div
          style={{
            position: "absolute",
            bottom: -200,
            right: -200,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${BRAND_ORANGE}40 0%, transparent 70%)`,
            display: "flex",
          }}
        />

        {/* Top row: brand wordmark + optional tag chip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 48,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: BRAND_ORANGE,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 800,
                color: "#0a0a0a",
              }}
            >
              T
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: "white",
                display: "flex",
              }}
            >
              TRAKZI
            </div>
          </div>

          {tag && (
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: BRAND_ORANGE,
                padding: "8px 18px",
                border: `2px solid ${BRAND_ORANGE}`,
                borderRadius: 999,
                display: "flex",
              }}
            >
              {tag}
            </div>
          )}
        </div>

        {/* Title — the main event. Sized to handle 1–3 lines comfortably. */}
        <div
          style={{
            fontSize: title.length > 60 ? 56 : 68,
            fontWeight: 800,
            lineHeight: 1.1,
            color: "white",
            display: "flex",
            flex: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </div>

        {/* Description — muted secondary line */}
        {description && (
          <div
            style={{
              fontSize: 26,
              lineHeight: 1.4,
              color: "rgba(255,255,255,0.55)",
              marginTop: 28,
              marginBottom: 36,
              display: "flex",
            }}
          >
            {description.length > 140 ? `${description.slice(0, 137)}…` : description}
          </div>
        )}

        {/* Footer: date · reading time */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 22,
            color: "rgba(255,255,255,0.5)",
            paddingTop: 28,
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {formattedDate && <span style={{ display: "flex" }}>{formattedDate}</span>}
          {formattedDate && readingTime && (
            <span style={{ display: "flex", color: "rgba(255,255,255,0.3)" }}>·</span>
          )}
          {readingTime && <span style={{ display: "flex" }}>{readingTime}</span>}
          <span style={{ display: "flex", flex: 1 }} />
          <span style={{ display: "flex", color: BRAND_ORANGE, fontWeight: 600 }}>trakzi.com</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
