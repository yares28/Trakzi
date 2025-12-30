import type { DragEvent } from "react"

export const isFileDragEvent = (event: DragEvent<HTMLElement>) => {
  const types = Array.from(event.dataTransfer?.types ?? [])
  return types.includes("Files")
}
