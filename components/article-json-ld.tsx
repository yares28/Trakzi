import type { BlogPost } from "@/lib/docs/types"

interface ArticleJsonLdProps {
  post: BlogPost
}

export function ArticleJsonLd({ post }: ArticleJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Person",
      name: post.author.name,
      jobTitle: post.author.role,
    },
    publisher: {
      "@type": "Organization",
      name: "Trakzi",
      logo: {
        "@type": "ImageObject",
        url: "https://trakzi.com/Trakzi/TrakzilogoB.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://trakzi.com/docs/${post.slug}`,
    },
    keywords: post.tags.join(", "),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
