/**
 * JSON.stringify wrapper that handles circular references gracefully.
 * Replaces circular values with null instead of throwing "cyclic object value" (Firefox)
 * or "Converting circular structure to JSON" (Node/Chrome).
 * Logs the offending key to the console to aid diagnosis.
 */
export function safeStringify(value: unknown): string {
  const seen = new WeakSet()
  return JSON.stringify(value, function replacer(key, val) {
    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) {
        console.error(`[safeStringify] Circular reference at key "${key}" — replacing with null. Report this to support.`)
        return null
      }
      seen.add(val)
    }
    return val
  })
}
