"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { ChartCategoryFlow } from "@/components/chart-category-flow"
import { ChartTransactionCalendar } from "@/components/chart-transaction-calendar"
import { ChartSpendingFunnel } from "@/components/chart-spending-funnel"
import { ChartExpensesPie } from "@/components/chart-expenses-pie"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { FileDropzone } from "@/components/file-dropzone"
import { TransactionDialog } from "@/components/transaction-dialog"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

interface Transaction {
  id: number
  header: string
  type: string
  status: string
  target: string
  limit: string
  reviewer: string
}

export default function Page() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleAddTransaction = (transaction: Omit<Transaction, "id">) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Math.max(...transactions.map(t => t.id), 0) + 1,
    }
    setTransactions([newTransaction, ...transactions])
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72 - 80px)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" onQuickCreate={() => setDialogOpen(true)} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {/* Drop Zone */}
              <div className="px-4 lg:px-6">
                <FileDropzone onFilesSelected={(files) => console.log("Files:", files)} />
              </div>
              <SectionCards />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive data={[]} />
              </div>
              <div className="px-4 lg:px-6">
                <ChartCategoryFlow data={[]} />
              </div>
              <div className="px-4 lg:px-6">
                <ChartTransactionCalendar data={[]} />
              </div>
              {/* Funnel and Pie Charts Side by Side */}
              <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
                <ChartSpendingFunnel data={[]} />
                <ChartExpensesPie data={[]} />
              </div>
              <DataTable data={transactions} />
            </div>
          </div>
        </div>
      </SidebarInset>
      
      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAddTransaction={handleAddTransaction}
      />
    </SidebarProvider>
  )
}
