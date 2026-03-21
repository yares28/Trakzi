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
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    // Links
    const linkMatch = remaining.match(/\[(.+?)\]\((.+?)\)/)
    // Inline code
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

    if (earliest > 0) {
      parts.push(remaining.slice(0, earliest))
    }

    if (type === "bold") {
      parts.push(
        <strong key={key++} className="font-semibold text-white">
          {earliestMatch[1]}
        </strong>
      )
    } else if (type === "link") {
      const href = earliestMatch[2]
      const isExternal = href.startsWith("http")
      parts.push(
        <a
          key={key++}
          href={href}
          className="text-[#fe985b] hover:text-[#fe985b]/80 underline underline-offset-2 transition-colors"
          {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {earliestMatch[1]}
        </a>
      )
    } else if (type === "code") {
      parts.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 text-sm font-mono"
        >
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

    // Skip empty lines
    if (line.trim() === "") {
      i++
      continue
    }

    // Headings
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={key++} className="text-2xl font-bold text-white mt-10 mb-4">
          {parseInline(line.slice(3))}
        </h2>
      )
      i++
      continue
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={key++} className="text-xl font-semibold text-white mt-8 mb-3">
          {parseInline(line.slice(4))}
        </h3>
      )
      i++
      continue
    }

    // Tables
    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].includes("|") && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i])
        i++
      }

      const headerRow = tableLines[0]
      const dataRows = tableLines.slice(2) // Skip separator row

      const headers = headerRow
        .split("|")
        .filter((c) => c.trim() !== "")
        .map((c) => c.trim())

      elements.push(
        <div key={key++} className="overflow-x-auto my-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-zinc-700">
                {headers.map((h, j) => (
                  <th key={j} className="text-left py-2 px-3 text-zinc-300 font-medium">
                    {parseInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, ri) => {
                const cells = row
                  .split("|")
                  .filter((c) => c.trim() !== "")
                  .map((c) => c.trim())
                return (
                  <tr key={ri} className="border-b border-zinc-800/50">
                    {cells.map((cell, ci) => (
                      <td key={ci} className="py-2 px-3 text-zinc-400">
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

    // Unordered lists
    if (line.trim().startsWith("- ")) {
      const items: string[] = []
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(lines[i].trim().slice(2))
        i++
      }
      elements.push(
        <ul key={key++} className="list-disc pl-6 space-y-1.5 my-4">
          {items.map((item, j) => (
            <li key={j} className="text-zinc-400 leading-relaxed">
              {parseInline(item)}
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Numbered lists
    const numberedMatch = line.trim().match(/^(\d+)\.\s/)
    if (numberedMatch) {
      const items: string[] = []
      while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ""))
        i++
      }
      elements.push(
        <ol key={key++} className="list-decimal pl-6 space-y-1.5 my-4">
          {items.map((item, j) => (
            <li key={j} className="text-zinc-400 leading-relaxed">
              {parseInline(item)}
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Regular paragraphs
    elements.push(
      <p key={key++} className="text-zinc-400 leading-relaxed my-4">
        {parseInline(line)}
      </p>
    )
    i++
  }

  return <div className="prose-content">{elements}</div>
}
