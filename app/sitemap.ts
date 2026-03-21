import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = "https://trakzi.com"

    const staticPages = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: "weekly" as const,
            priority: 1,
        },
        {
            url: `${baseUrl}/sign-in`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.5,
        },
        {
            url: `${baseUrl}/sign-up`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.5,
        },
        {
            url: `${baseUrl}/terms`,
            lastModified: new Date(),
            changeFrequency: "yearly" as const,
            priority: 0.3,
        },
        {
            url: `${baseUrl}/privacy`,
            lastModified: new Date(),
            changeFrequency: "yearly" as const,
            priority: 0.3,
        },
        {
            url: `${baseUrl}/cookies`,
            lastModified: new Date(),
            changeFrequency: "yearly" as const,
            priority: 0.3,
        },
        {
            url: `${baseUrl}/legal`,
            lastModified: new Date(),
            changeFrequency: "yearly" as const,
            priority: 0.3,
        },
        {
            url: `${baseUrl}/features`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.9,
        },
        {
            url: `${baseUrl}/receipt-scanner`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.8,
        },
        {
            url: `${baseUrl}/split-expenses`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.8,
        },
        {
            url: `${baseUrl}/grocery-tracker`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.8,
        },
        {
            url: `${baseUrl}/csv-import`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.8,
        },
        // Spanish pages
        {
            url: `${baseUrl}/es`,
            lastModified: new Date(),
            changeFrequency: "weekly" as const,
            priority: 0.9,
        },
        {
            url: `${baseUrl}/es/features`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.8,
        },
        {
            url: `${baseUrl}/es/escaner-tickets`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.7,
        },
        {
            url: `${baseUrl}/es/dividir-gastos`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.7,
        },
        {
            url: `${baseUrl}/es/gastos-supermercado`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.7,
        },
        {
            url: `${baseUrl}/es/importar-csv`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.7,
        },
    ]

    // Docs pages
    const { posts } = require("@/lib/docs/posts")
    const docPages = posts.map((post: { slug: string; date: string }) => ({
        url: `${baseUrl}/docs/${post.slug}`,
        lastModified: new Date(post.date),
        changeFrequency: "monthly" as const,
        priority: 0.7,
    }))

    const docsIndex = {
        url: `${baseUrl}/docs`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
    }

    // Spanish docs pages
    const { esPosts } = require("@/lib/docs/es-posts")
    const esDocPages = esPosts.map((post: { slug: string; date: string }) => ({
        url: `${baseUrl}/es/docs/${post.slug}`,
        lastModified: new Date(post.date),
        changeFrequency: "monthly" as const,
        priority: 0.6,
    }))

    const esDocsIndex = {
        url: `${baseUrl}/es/docs`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
    }

    // Comparison pages
    const comparisonPages = [
        {
            url: `${baseUrl}/compare/trakzi-vs-ynab`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.7,
        },
        {
            url: `${baseUrl}/compare/trakzi-vs-splitwise`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.7,
        },
        {
            url: `${baseUrl}/compare/trakzi-vs-monarch}`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.7,
        },
        {
            url: `${baseUrl}/pricing`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.9,
        },
        // Spanish comparison pages
        {
            url: `${baseUrl}/es/compare/trakzi-vs-ynab`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.6,
        },
        {
            url: `${baseUrl}/es/compare/trakzi-vs-splitwise`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.6,
        },
        {
            url: `${baseUrl}/es/compare/trakzi-vs-monarch}`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.6,
        },
        {
            url: `${baseUrl}/es/precios`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.8,
        },
    ]

    return [...staticPages, docsIndex, ...docPages, esDocsIndex, ...esDocPages, ...comparisonPages]
}
