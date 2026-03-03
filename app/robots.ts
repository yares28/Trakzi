import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
    const baseUrl = "https://trakzi.com"

    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: ["/api/", "/home/", "/dashboard/", "/analytics/", "/savings/", "/fridge/", "/friends/", "/pockets/", "/rooms/", "/billing/", "/admin/", "/chat/", "/data-library/", "/challenges/"],
            },
            {
                userAgent: "GPTBot",
                allow: "/",
                disallow: ["/api/", "/home/", "/dashboard/", "/analytics/", "/savings/", "/fridge/", "/friends/", "/pockets/", "/rooms/", "/billing/", "/admin/", "/chat/", "/data-library/", "/challenges/"],
            },
            {
                userAgent: "ChatGPT-User",
                allow: "/",
                disallow: ["/api/", "/home/", "/dashboard/", "/analytics/", "/savings/", "/fridge/", "/friends/", "/pockets/", "/rooms/", "/billing/", "/admin/", "/chat/", "/data-library/", "/challenges/"],
            },
            {
                userAgent: "anthropic-ai",
                allow: "/",
                disallow: ["/api/", "/home/", "/dashboard/", "/analytics/", "/savings/", "/fridge/", "/friends/", "/pockets/", "/rooms/", "/billing/", "/admin/", "/chat/", "/data-library/", "/challenges/"],
            },
            {
                userAgent: "PerplexityBot",
                allow: "/",
                disallow: ["/api/", "/home/", "/dashboard/", "/analytics/", "/savings/", "/fridge/", "/friends/", "/pockets/", "/rooms/", "/billing/", "/admin/", "/chat/", "/data-library/", "/challenges/"],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
