export const isFileDragEvent = (event: React.DragEvent) => {
  const types = Array.from(event.dataTransfer.types || [])
  if (types.includes("Files")) return true
  const items = Array.from(event.dataTransfer.items || [])
  return items.some((item) => item.kind === "file")
}
