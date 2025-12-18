"use client"

import { useState, useEffect, useCallback } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { ReportsDataTable } from "@/components/reports-data-table"

export default function ReportsPage() {
    const [reports, setReports] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchReports = useCallback(async () => {
        try {
            setLoading(true)
            const response = await fetch("/api/statements")
            if (response.ok) {
                const data = await response.json()
                setReports(data)
            } else {
                console.error("Failed to fetch reports")
            }
        } catch (error) {
            console.error("Error fetching reports:", error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchReports()
    }, [fetchReports])

    const handleDelete = useCallback(async (statementId: string) => {
        try {
            console.log("[Reports Page] Deleting statement with ID:", statementId, typeof statementId);
            const response = await fetch(`/api/statements/${statementId}`, {
                method: "DELETE",
            })
            if (response.ok) {
                // Refresh the list after deletion
                fetchReports()
            } else {
                const errorData = await response.json().catch(() => ({}))
                console.error("Failed to delete statement:", errorData.error || response.statusText)
                alert(`Failed to delete statement: ${errorData.error || response.statusText}`)
            }
        } catch (error) {
            console.error("Error deleting statement:", error)
            alert(`Error deleting statement: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }, [fetchReports])

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72 - 15px)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col">
                    <div className="@container/main flex flex-1 flex-col gap-2">
                        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                            <div className="px-4 lg:px-6">
                                <section className="mb-6">
                                    <div className="flex flex-col justify-between gap-4 rounded-3xl border bg-muted/30 px-6 py-6 lg:flex-row lg:items-center">
                                        <div className="space-y-2">
                                            <span className="inline-flex items-center gap-1 px-3 py-1 text-sm border rounded-full">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                                                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                                                    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                                                    <path d="M10 9H8" />
                                                    <path d="M16 13H8" />
                                                    <path d="M16 17H8" />
                                                </svg>
                                                Document Archive
                                            </span>
                                            <h1 className="text-3xl font-semibold tracking-tight">
                                                Reports
                                            </h1>
                                            <p className="text-muted-foreground max-w-2xl">
                                                View and manage all imported documents from Income/Expenses and Fridge/Receipts.
                                                Track your financial history and uploaded statements in one place.
                                            </p>
                                        </div>
                                    </div>
                                </section>
                                <ReportsDataTable
                                    data={reports}
                                    onDelete={handleDelete}
                                    loading={loading}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
