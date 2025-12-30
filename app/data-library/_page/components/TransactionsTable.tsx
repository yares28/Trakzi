import { Card, CardContent } from "@/components/ui/card"
import { DataTable } from "@/components/data-table"

import type { Transaction } from "../types"

type TransactionsTableProps = {
  transactions: Transaction[]
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  return (
    <Card className="lg:col-span-2">
      <CardContent className="p-0">
        <DataTable data={[]} transactions={transactions} />
      </CardContent>
    </Card>
  )
}
