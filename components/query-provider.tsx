"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister"
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval"

// Bump this string to invalidate all persisted caches (e.g. after a data schema change)
const CACHE_BUSTER = "v2"

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                // Dashboard-optimized caching settings
                staleTime: 2 * 60 * 1000,      // 2 min - data considered fresh
                gcTime: 20 * 60 * 1000,        // 20 min - in-memory cache retention
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
        return makeQueryClient()
    }
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
}

// IndexedDB-backed persister — created lazily to avoid SSR issues
let idbPersister: ReturnType<typeof createAsyncStoragePersister> | undefined

function getPersister() {
    if (typeof window === "undefined") return undefined
    if (!idbPersister) {
        idbPersister = createAsyncStoragePersister({
            storage: {
                getItem: (key) => idbGet<string>(key),
                setItem: (key, value) => idbSet(key, value),
                removeItem: (key) => idbDel(key),
            },
            key: "trakzi-rq-cache",
            throttleTime: 1000, // Write to IndexedDB at most once per second
        })
    }
    return idbPersister
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const queryClient = getQueryClient()
    const persister = getPersister()

    if (!persister) {
        // SSR fallback — no persistence on the server
        return (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        )
    }

    return (
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
                persister,
                maxAge: SEVEN_DAYS_MS,
                buster: CACHE_BUSTER,
            }}
        >
            {children}
        </PersistQueryClientProvider>
    )
}
