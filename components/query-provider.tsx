"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                // Dashboard-optimized caching settings
                staleTime: 2 * 60 * 1000,      // 2 min - data considered fresh
                gcTime: 20 * 60 * 1000,        // 20 min - cache retention
                refetchOnWindowFocus: false,   // No refetch on tab switch (speed)
                refetchOnMount: false,         // Use cache on navigation (speed)
                retry: 1,                      // Single retry for failed requests
            },
        },
    })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
    if (typeof window === "undefined") {
        // Server: always make a new query client
        return makeQueryClient()
    } else {
        // Browser: make a new query client if we don't already have one
        if (!browserQueryClient) browserQueryClient = makeQueryClient()
        return browserQueryClient
    }
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const queryClient = getQueryClient()

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}
