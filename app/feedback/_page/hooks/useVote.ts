import { useMutation, useQueryClient, InfiniteData } from "@tanstack/react-query"
import type { FeatureRow, FeaturesPage, SortKey } from "../types"

const ALL_SORT_KEYS: SortKey[] = ["top", "new", "trending"]

export function useVote() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ featureId, value }: { featureId: string; value: 1 | -1 }) => {
      const res = await fetch(`/api/feedback/features/${featureId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to vote")
      return json as { score: number; myVote: -1 | 0 | 1 }
    },

    onMutate: async ({ featureId, value }) => {
      await qc.cancelQueries({ queryKey: ["feedback-features"] })

      const snapshots = ALL_SORT_KEYS.map((sort) => ({
        queryKey: ["feedback-features", sort] as const,
        data: qc.getQueryData<InfiniteData<FeaturesPage>>(["feedback-features", sort]),
      }))

      const updater = (old: InfiniteData<FeaturesPage> | undefined) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item: FeatureRow) => {
              if (item.id !== featureId) return item
              const prevVote = item.myVote
              const newVote: -1 | 0 | 1 = prevVote === value ? 0 : value
              const scoreDelta = newVote - prevVote
              return { ...item, myVote: newVote, score: item.score + scoreDelta }
            }),
          })),
        }
      }

      ALL_SORT_KEYS.forEach((sort) => {
        qc.setQueryData<InfiniteData<FeaturesPage>>(["feedback-features", sort], updater)
      })

      return { snapshots }
    },

    onSuccess: (data, { featureId }) => {
      const reconciler = (old: InfiniteData<FeaturesPage> | undefined) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item: FeatureRow) =>
              item.id === featureId
                ? { ...item, score: data.score, myVote: data.myVote }
                : item
            ),
          })),
        }
      }
      ALL_SORT_KEYS.forEach((sort) => {
        qc.setQueryData<InfiniteData<FeaturesPage>>(["feedback-features", sort], reconciler)
      })
    },

    onError: (_err, _vars, context) => {
      context?.snapshots.forEach(({ queryKey, data }) => {
        qc.setQueryData(queryKey, data)
      })
    },
  })
}
