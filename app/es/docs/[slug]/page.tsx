import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getEsPostBySlug, getAllEsSlugs, getEsRelatedPosts } from "@/lib/docs/es-posts"

interface EsDocPageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return getAllEsSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: EsDocPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getEsPostBySlug(slug)
  if (!post) return {}

  return {
    title: `${post.title} | Trakzi Docs`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://trakzi.com/es/docs/${post.slug}`,
      type: "article",
      publishedTime: post.date,
      authors: [post.author.name],
      tags: post.tags,
    },
  }
}

export default async function EsDocPage({ params }: EsDocPageProps) {
  const { slug } = await params
  const post = getEsPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const related = getEsRelatedPosts(slug)

  const { DocPostContent } = await import("@/app/(landing)/docs/[slug]/content")

  return <DocPostContent post={post} relatedPosts={related} locale="es" />
}
