import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { FeatureRow } from "../types"

type CreateFeatureInput = {
  title: string
  body?: string
}

export function useCreateFeature() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateFeatureInput): Promise<FeatureRow> => {
      const res = await fetch("/api/feedback/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create feature")
      return json as FeatureRow
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedback-features"] })
    },
  })
}
