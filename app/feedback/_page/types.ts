export type SortKey = "top" | "new" | "trending"

export type FeatureAuthor = {
  id: string
  name: string | null
}

export type FeatureRow = {
  id: string
  title: string
  body: string | null
  score: number
  created_at: string
  author: FeatureAuthor
  myVote: -1 | 0 | 1
}

export type FeaturesPage = {
  items: FeatureRow[]
  nextCursor: string | null
}
