import { useInfiniteQuery, InfiniteData } from "@tanstack/react-query"
import type { FeatureRow, FeaturesPage, SortKey } from "../types"

export const FEATURES_QUERY_KEY = (sort: SortKey) => ["feedback-features", sort] as const

export function useFeatures(sort: SortKey) {
  return useInfiniteQuery<FeaturesPage, Error, InfiniteData<FeaturesPage>, readonly ["feedback-features", SortKey], string | undefined>({
    queryKey: FEATURES_QUERY_KEY(sort),
    queryFn: async ({ pageParam }) => {
      const url = new URL("/api/feedback/features", window.location.origin)
      url.searchParams.set("sort", sort)
      url.searchParams.set("limit", "25")
      if (pageParam) url.searchParams.set("cursor", pageParam)
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error("Failed to load features")
      return res.json() as Promise<FeaturesPage>
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })
}
