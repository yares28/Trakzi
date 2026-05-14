"use client"

import type React from "react"

interface MarkdownRendererProps {
  content: string
}

function parseInline(text: string): (string | React.ReactNode)[] {
  const parts: (string | React.ReactNode)[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    const linkMatch = remaining.match(/\[(.+?)\]\((.+?)\)/)
    const codeMatch = remaining.match(/`(.+?)`/)

    let earliest = -1
    let earliestMatch: RegExpMatchArray | null = null
    let type = ""

    if (boldMatch && (earliest === -1 || boldMatch.index! < earliest)) {
      earliest = boldMatch.index!
      earliestMatch = boldMatch
      type = "bold"
    }
    if (linkMatch && (earliest === -1 || linkMatch.index! < earliest)) {
      earliest = linkMatch.index!
      earliestMatch = linkMatch
      type = "link"
    }
    if (codeMatch && (earliest === -1 || codeMatch.index! < earliest)) {
      earliest = codeMatch.index!
      earliestMatch = codeMatch
      type = "code"
    }

    if (!earliestMatch || earliest === -1) {
      parts.push(remaining)
      break
    }

    if (earliest > 0) parts.push(remaining.slice(0, earliest))

    if (type === "bold") {
      parts.push(
        <strong key={key++} className="font-semibold text-foreground">
          {earliestMatch[1]}
        </strong>
      )
    } else if (type === "link") {
      const href = earliestMatch[2]
      parts.push(
        <a
          key={key++}
          href={href}
          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
          {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {earliestMatch[1]}
        </a>
      )
    } else if (type === "code") {
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 rounded-md bg-muted text-foreground text-[0.875em] font-mono">
          {earliestMatch[1]}
        </code>
      )
    }

    remaining = remaining.slice(earliest + earliestMatch[0].length)
  }

  return parts
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const lines = content.split("\n")
  const elements: React.ReactNode[] = []
  let key = 0
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === "") { i++; continue }

    // H2 — section break with a bit of top breathing room
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={key++} className="text-2xl sm:text-3xl font-bold text-foreground mt-12 mb-4 leading-snug">
          {parseInline(line.slice(3))}
        </h2>
      )
      i++; continue
    }

    // H3 — sub-section
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={key++} className="text-lg sm:text-xl font-semibold text-foreground mt-8 mb-3 leading-snug">
          {parseInline(line.slice(4))}
        </h3>
      )
      i++; continue
    }

    // YouTube embed: @youtube[VIDEO_ID]
    const youtubeMatch = line.trim().match(/^@youtube\[([^\]]+)\]$/)
    if (youtubeMatch) {
      elements.push(
        <div key={key++} className="my-8 rounded-2xl overflow-hidden w-full" style={{ aspectRatio: "16/9" }}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeMatch[1]}`}
            title="YouTube video"
            width="100%"
            height="100%"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ border: 0, display: "block" }}
          />
        </div>
      )
      i++; continue
    }

    // Blockquote: > text
    if (line.trim().startsWith("> ")) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        quoteLines.push(lines[i].trim().slice(2))
        i++
      }
      elements.push(
        <blockquote key={key++} className="border-l-[3px] border-primary/50 pl-5 my-6 space-y-1">
          {quoteLines.map((ql, j) => (
            <p key={j} className="text-muted-foreground italic leading-relaxed text-[0.95rem]">
              {parseInline(ql)}
            </p>
          ))}
        </blockquote>
      )
      continue
    }

    // Image: ![alt](url)
    const imageMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (imageMatch) {
      elements.push(
        <figure key={key++} className="my-8">
          <img
            src={imageMatch[2]}
            alt={imageMatch[1]}
            className="w-full rounded-2xl object-cover border border-border"
            loading="lazy"
          />
          {imageMatch[1] && (
            <figcaption className="text-center text-xs text-muted-foreground mt-2">{imageMatch[1]}</figcaption>
          )}
        </figure>
      )
      i++; continue
    }

    // Table
    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].includes("|") && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i])
        i++
      }
      const headers = tableLines[0].split("|").filter(c => c.trim()).map(c => c.trim())
      const dataRows = tableLines.slice(2)

      elements.push(
        <div key={key++} className="overflow-x-auto my-8 rounded-xl border border-border">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50">
                {headers.map((h, j) => (
                  <th key={j} className="text-left py-3 px-4 text-foreground font-semibold border-b border-border">
                    {parseInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, ri) => {
                const cells = row.split("|").filter(c => c.trim()).map(c => c.trim())
                return (
                  <tr key={ri} className={ri % 2 === 0 ? "" : "bg-muted/20"}>
                    {cells.map((cell, ci) => (
                      <td key={ci} className="py-3 px-4 text-muted-foreground border-b border-border/50 last:border-b-0">
                        {parseInline(cell)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    // Unordered list
    if (line.trim().startsWith("- ")) {
      const items: string[] = []
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(lines[i].trim().slice(2))
        i++
      }
      elements.push(
        <ul key={key++} className="my-5 space-y-2 pl-5">
          {items.map((item, j) => (
            <li key={j} className="text-muted-foreground leading-relaxed relative before:absolute before:-left-4 before:top-[0.6em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-primary/60">
              {parseInline(item)}
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Numbered list
    if (line.trim().match(/^\d+\.\s/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ""))
        i++
      }
      elements.push(
        <ol key={key++} className="my-5 space-y-2 pl-6 list-decimal marker:text-primary/70 marker:font-semibold">
          {items.map((item, j) => (
            <li key={j} className="text-muted-foreground leading-relaxed pl-1">
              {parseInline(item)}
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Paragraph
    elements.push(
      <p key={key++} className="text-[1.0625rem] text-muted-foreground leading-[1.75] my-5">
        {parseInline(line)}
      </p>
    )
    i++
  }

  return (
    <article className="max-w-none">
      {elements}
    </article>
  )
}
