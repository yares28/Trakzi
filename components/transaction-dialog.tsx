"use client"

import { useState, useEffect } from "react"
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
import { toast } from "sonner"

interface Category {
  id: number
  name: string
  color: string | null
}

interface Statement {
  id: string
  name: string
  type: string
  date: string
  statementId: number
}

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function TransactionDialog({
  open,
  onOpenChange,
  onSuccess,
}: TransactionDialogProps) {
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [statements, setStatements] = useState<Statement[]>([])
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // Default to today
    description: "",
    amount: "",
    category_id: "none",
    statement_id: "none",
  })

  // Fetch categories and statements when dialog opens
  useEffect(() => {
    if (open) {
      fetchCategories()
      fetchStatements()
    }
  }, [open])

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const fetchStatements = async () => {
    try {
      const response = await fetch("/api/statements")
      if (response.ok) {
        const data = await response.json()
        setStatements(data)
      }
    } catch (error) {
      console.error("Error fetching statements:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload: any = {
        date: formData.date,
        description: formData.description.trim(),
        amount: Number(formData.amount),
      }

      // Add category_id if selected (not "none")
      if (formData.category_id && formData.category_id !== "none") {
        payload.category_id = Number(formData.category_id)
      }

      // Add statement_id if selected (not "none")
      if (formData.statement_id && formData.statement_id !== "none") {
        payload.statement_id = Number(formData.statement_id)
      }

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create transaction")
      }

      toast.success("Transaction added successfully")
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: "",
        amount: "",
        category_id: "none",
        statement_id: "none",
      })
      
      onOpenChange(false)
      
      // Call onSuccess callback to refresh transactions
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error("Error creating transaction:", error)
      toast.error(error.message || "Failed to create transaction")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Transaction</DialogTitle>
          <DialogDescription>
            Create a new transaction. You can optionally link it to a report/statement.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="date">Date</FieldLabel>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="e.g., Starbucks Coffee"
                required
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="amount">Amount</FieldLabel>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  placeholder="0.00"
                  required
                />
                <FieldDescription>Use negative for expenses, positive for income</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="category">Category</FieldLabel>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category_id: value })
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="statement">Link to Report/Statement</FieldLabel>
              <Select
                value={formData.statement_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, statement_id: value })
                }
              >
                <SelectTrigger id="statement">
                  <SelectValue placeholder="None (individual transaction)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (individual transaction)</SelectItem>
                  {statements.map((statement) => (
                    <SelectItem key={statement.id} value={String(statement.statementId)}>
                      {statement.name} ({statement.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                Optionally link this transaction to an existing report/statement, or leave as individual transaction
              </FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
