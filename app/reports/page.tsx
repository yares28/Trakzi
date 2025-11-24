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
                                <div className="mb-6">
                                    <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
                                    <p className="text-muted-foreground mt-2">
                                        View all imported documents from Income/Expenses and Fridge/Receipts
                                    </p>
                                </div>
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
