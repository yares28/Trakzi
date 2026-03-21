"use client"

import { m } from "framer-motion"
import Link from "next/link"
import { ArrowRight, Clock, Calendar } from "lucide-react"
import { geist } from "@/lib/fonts"
import { cn } from "@/lib/utils"
import type { BlogPost } from "@/lib/docs/types"
import { ArticleJsonLd } from "@/components/article-json-ld"
import { AuthorBio } from "@/components/author-bio"
import { MarkdownRenderer } from "@/components/markdown-renderer"

interface DocPostContentProps {
  post: BlogPost
  relatedPosts: BlogPost[]
  locale?: "en" | "es"
}

export function DocPostContent({ post, relatedPosts, locale = "en" }: DocPostContentProps) {
  const isEs = locale === "es"
  const docsHref = isEs ? "/es/docs" : "/docs"
  const relatedLabel = isEs ? "Guías Relacionadas" : "Related Guides"
  const ctaTitle = isEs ? "Ponlo en práctica" : "Put this into practice"
  const ctaText = isEs ? "Controla tus gastos con Trakzi. Gratis para empezar, sin tarjeta de crédito." : "Track your spending with Trakzi. Free to start, no credit card required."
  const ctaButton = isEs ? "Crear Cuenta Gratis" : "Create Free Account"
  const authorLabel = isEs ? "Sobre el Autor" : "About the Author"

  return (
    <div className="relative z-10 py-12 px-6">
      <ArticleJsonLd post={post} />

      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto"
      >
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {post.tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#e78a53] text-xs font-medium">
              {tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-7xl lg:text-9xl mb-8">
          {post.title}
        </h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-10 pb-10 border-b border-white/10">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {post.readingTime}
          </span>
          <span>by {post.author.name}</span>
        </div>

        {/* Description */}
        <p className="text-xl text-white/80 leading-relaxed mb-10">
          {post.description}
        </p>

        {/* Content */}
        <MarkdownRenderer content={post.content} />

        {/* Author Bio */}
        <div className="mt-16 pt-10 border-t border-white/10">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">{authorLabel}</p>
          <AuthorBio author={post.author} />
        </div>

        {/* CTA */}
        <div className="mt-16 p-8 rounded-2xl border border-[#e78a53]/20 bg-[#e78a53]/5 text-center">
          <h3 className={cn("text-xl font-semibold text-white mb-3", geist.className)}>{ctaTitle}</h3>
          <p className="text-sm text-muted-foreground mb-6">{ctaText}</p>
          <Link href="/sign-up" className="inline-block rounded-full font-bold text-sm bg-gradient-to-b from-[#fe985b] to-[#fe985b]/80 text-white shadow-[0px_2px_0px_0px_rgba(255,255,255,0.3)_inset] px-8 py-3 transition-all hover:-translate-y-0.5">
            {ctaButton}
          </Link>
        </div>
      </m.div>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <div className="max-w-3xl mx-auto mt-16 pt-10 border-t border-white/10">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6">{relatedLabel}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {relatedPosts.map((rp) => (
              <Link
                key={rp.slug}
                href={`${docsHref}/${rp.slug}`}
                className="group block p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:border-[#e78a53]/60 hover:shadow-[0_0_20px_rgba(231,138,83,0.15)] transition-all"
              >
                <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-[#e78a53] transition-colors">
                  {rp.title}
                </h3>
                <p className="text-[10px] text-muted-foreground">{rp.readingTime}</p>
                <div className="mt-2 flex items-center gap-1 text-[#e78a53] text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                  Read <ArrowRight className="h-2.5 w-2.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
