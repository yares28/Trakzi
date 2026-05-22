import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getPostBySlug, getAllSlugs, getRelatedPosts } from "@/lib/docs/posts"

interface DocPageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: DocPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}

  return {
    title: `${post.title} | Trakzi Docs`,
    description: post.description,
    alternates: {
      canonical: `https://trakzi.com/docs/${post.slug}`,
      // hreflang declared per-post so each language version points at itself
      languages: {
        en: `https://trakzi.com/docs/${post.slug}`,
        "x-default": `https://trakzi.com/docs/${post.slug}`,
      },
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://trakzi.com/docs/${post.slug}`,
      type: "article",
      publishedTime: post.date,
      authors: [post.author.name],
      tags: post.tags,
    },
  }
}

export default async function DocPage({ params }: DocPageProps) {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const related = getRelatedPosts(slug)

  const { DocPostContent } = await import("./content")

  return (
    <div className="max-w-3xl mx-auto px-6 pt-12 pb-96">
      <DocPostContent post={post} relatedPosts={related} />
    </div>
  )
}
