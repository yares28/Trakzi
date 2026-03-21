"use client"

import { m } from "framer-motion"
import Link from "next/link"
import { ArrowRight, Clock, Calendar } from "lucide-react"
import { geist } from "@/lib/fonts"
import { cn } from "@/lib/utils"
import { posts } from "@/lib/docs/posts"

export default function DocsIndexPage() {
  return (
    <div className="relative z-10">
      {/* Hero */}
      <section className="py-24 px-6">
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-6">
            <span className="text-[#e78a53] font-medium text-sm">Trakzi Docs</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-7xl lg:text-9xl mb-8">
            Guides & Documentation
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl">
            Step-by-step guides for budgeting, expense tracking, and saving money.
          </p>
        </m.div>
      </section>

      {/* Posts */}
      <section className="pb-24 px-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {posts.map((post, i) => (
            <m.div key={post.slug} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.08 }}>
              <Link
                href={`/docs/${post.slug}`}
                className="group block p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:border-[#e78a53]/60 hover:shadow-[0_0_30px_rgba(231,138,83,0.15)] transition-all"
              >
                <div className="flex flex-wrap gap-2 mb-3">
                  {post.tags.map((tag) => (
                    <span key={tag} className="text-[10px] font-medium text-[#e78a53] bg-[#e78a53]/10 px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="text-2xl leading-none font-semibold tracking-tight text-foreground mb-2 group-hover:text-[#e78a53] transition-colors">
                  {post.title}
                </h2>
                <p className="text-sm text-muted-foreground mb-3">{post.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {post.readingTime}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[#e78a53] text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  Read guide <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            </m.div>
          ))}
        </div>
      </section>

      {/* Comparisons */}
      <section className="pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6">Comparisons</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { href: "/compare/trakzi-vs-ynab", name: "Trakzi vs YNAB", desc: "Free CSV import vs $14.99/mo envelope budgeting" },
              { href: "/compare/trakzi-vs-splitwise", name: "Trakzi vs Splitwise", desc: "All-in-one finance vs split-only app" },
              { href: "/compare/trakzi-vs-monarch", name: "Trakzi vs Monarch", desc: "Privacy-first CSV vs bank-linked budgeting" },
            ].map((c) => (
              <Link key={c.href} href={c.href} className="group block p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:border-[#e78a53]/60 hover:shadow-[0_0_20px_rgba(231,138,83,0.15)] transition-all">
                <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-[#e78a53] transition-colors">{c.name}</h3>
                <p className="text-[10px] text-muted-foreground">{c.desc}</p>
                <div className="mt-2 flex items-center gap-1 text-[#e78a53] text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                  Compare <ArrowRight className="h-2.5 w-2.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className={cn("text-2xl font-semibold text-white mb-3", geist.className)}>Ready to take action?</h2>
          <p className="text-sm text-muted-foreground mb-6">Put these guides into practice with Trakzi. Free to start.</p>
          <Link href="/sign-up" className="inline-block rounded-full font-bold text-sm bg-gradient-to-b from-[#fe985b] to-[#fe985b]/80 text-white shadow-[0px_2px_0px_0px_rgba(255,255,255,0.3)_inset] px-8 py-3 transition-all hover:-translate-y-0.5">
            Create Free Account
          </Link>
        </div>
      </section>
    </div>
  )
}
