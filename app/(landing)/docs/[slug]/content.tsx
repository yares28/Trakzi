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
    <div className="relative z-10 px-6">
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
            <span key={tag} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/40 text-primary text-xs font-medium">
              {tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl mb-8">
          {post.title}
        </h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-10 pb-10 border-b border-white/10">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {new Date(post.date).toLocaleDateString(isEs ? "es-ES" : "en-US", { month: "long", day: "numeric", year: "numeric" })}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {post.readingTime}
          </span>
          <span>{isEs ? "por" : "by"} {post.author.name}</span>
        </div>

        {/* Description */}
        <p className="text-xl text-foreground/80 leading-relaxed mb-10">
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
        <div className="mt-16 p-8 rounded-2xl border border-white/10 bg-card shadow-[0px_2px_0px_0px_rgba(255,255,255,0.1)_inset] text-center">
          <h3 className={cn("text-3xl font-semibold tracking-tighter text-foreground mb-3", geist.className)}>{ctaTitle}</h3>
          <p className="text-sm text-muted-foreground mb-8">{ctaText}</p>
          <Link href="/sign-up">
            <div className="group cursor-pointer border border-border bg-background gap-2 h-[60px] inline-flex items-center p-[10px] rounded-full">
              <div className="border border-border bg-primary h-[40px] rounded-full flex items-center justify-center text-primary-foreground">
                <p className="font-medium tracking-tight mr-3 ml-3 flex items-center gap-2 justify-center text-base">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-globe animate-spin">
                    <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
                  </svg>
                  {ctaButton}
                </p>
              </div>
              <div className="text-muted-foreground group-hover:ml-4 ease-in-out transition-all size-[24px] flex items-center justify-center rounded-full border-2 border-border">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right group-hover:rotate-180 ease-in-out transition-all">
                  <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>
      </m.div>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <div className="max-w-3xl mx-auto mt-16 pt-10 border-t border-white/10">
          <div className="border-primary/40 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 uppercase mb-6">
            <span>✶</span>
            <span className="text-sm">{relatedLabel}</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {relatedPosts.map((rp) => (
              <Link
                key={rp.slug}
                href={`${docsHref}/${rp.slug}`}
                className="group block p-5 rounded-2xl border border-white/10 bg-card shadow-[0px_2px_0px_0px_rgba(255,255,255,0.1)_inset] hover:border-white/20 transition-all"
              >
                <h3 className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {rp.title}
                </h3>
                <p className="text-[10px] text-muted-foreground">{rp.readingTime}</p>
                <div className="mt-2 flex items-center gap-1 text-primary text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                  {isEs ? "Leer" : "Read"} <ArrowRight className="h-2.5 w-2.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
