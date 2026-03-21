export interface BlogPost {
  slug: string
  title: string
  description: string
  date: string // ISO date
  author: BlogAuthor
  readingTime: string
  tags: string[]
  content: string // Markdown content
  relatedSlugs?: string[]
  ogImage?: string
}

export interface BlogAuthor {
  name: string
  role: string
  bio: string
  avatar?: string
}
