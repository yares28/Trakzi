"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Transaction {
  id: number
  header: string
  type: string
  status: string
  target: string
  limit: string
  reviewer: string
}

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddTransaction: (transaction: Omit<Transaction, "id">) => void
}

export function TransactionDialog({
  open,
  onOpenChange,
  onAddTransaction,
}: TransactionDialogProps) {
  const [formData, setFormData] = useState({
    header: "",
    type: "Groceries",
    status: "Done",
    target: "",
    limit: "",
    reviewer: "Credit Card",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAddTransaction(formData)
    // Reset form
    setFormData({
      header: "",
      type: "Groceries",
      status: "Done",
      target: "",
      limit: "",
      reviewer: "Credit Card",
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Transaction</DialogTitle>
          <DialogDescription>
            Add a new transaction to track your expenses and budget.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Input
                id="description"
                value={formData.header}
                onChange={(e) =>
                  setFormData({ ...formData, header: e.target.value })
                }
                placeholder="e.g., Starbucks Coffee"
                required
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="category">Category</FieldLabel>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Groceries">Groceries</SelectItem>
                    <SelectItem value="Transportation">Transportation</SelectItem>
                    <SelectItem value="Entertainment">Entertainment</SelectItem>
                    <SelectItem value="Utilities">Utilities</SelectItem>
                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                    <SelectItem value="Shopping">Shopping</SelectItem>
                    <SelectItem value="Dining">Dining</SelectItem>
                    <SelectItem value="Housing">Housing</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="status">Status</FieldLabel>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Done">Done</SelectItem>
                    <SelectItem value="In Process">In Process</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="budget">Budget</FieldLabel>
                <Input
                  id="budget"
                  type="number"
                  value={formData.target}
                  onChange={(e) =>
                    setFormData({ ...formData, target: e.target.value })
                  }
                  placeholder="500"
                  required
                />
                <FieldDescription>Monthly budget for this category</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="spent">Amount Spent</FieldLabel>
                <Input
                  id="spent"
                  type="number"
                  value={formData.limit}
                  onChange={(e) =>
                    setFormData({ ...formData, limit: e.target.value })
                  }
                  placeholder="87"
                  required
                />
                <FieldDescription>Amount spent on this transaction</FieldDescription>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="payment">Payment Method</FieldLabel>
              <Select
                value={formData.reviewer}
                onValueChange={(value) =>
                  setFormData({ ...formData, reviewer: value })
                }
              >
                <SelectTrigger id="payment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Debit Card">Debit Card</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Transaction</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}




