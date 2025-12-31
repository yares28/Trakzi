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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
import { CategorySelect } from "@/components/category-select"
import { toast } from "sonner"
import { sanitizeDescription } from "@/lib/ai/sanitize-description"
import { ruleSimplifyDescription } from "@/lib/ai/rule-simplify"

interface Category {
  id: number
  name: string
  color: string | null
}

interface ReceiptCategory {
  id: number
  name: string
  typeName: string
  typeId: number
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
  const [receiptCategories, setReceiptCategories] = useState<ReceiptCategory[]>([])
  const [statements, setStatements] = useState<Statement[]>([])
  const [categoryName, setCategoryName] = useState<string>("")
  const [transactionType, setTransactionType] = useState<"transaction" | "receipt">("transaction")

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // Default to today
    description: "",
    amount: "",
    category_id: "none",
    category_name: "", // For CategorySelect component
    statement_id: "none",
    // Receipt specific
    store_name: "",
    quantity: "1",
    receipt_category_id: "none"
  })

  // Fetch data when dialog opens
  useEffect(() => {
    if (open) {
      fetchCategories()
      fetchReceiptCategories()
      fetchStatements()
      // Reset form when dialog opens
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: "",
        amount: "",
        category_id: "none",
        category_name: "", // For CategorySelect component
        statement_id: "none",
        store_name: "",
        quantity: "1",
        receipt_category_id: "none"
      })
      setCategoryName("")
      setTransactionType("transaction")
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

  const fetchReceiptCategories = async () => {
    try {
      const response = await fetch("/api/receipt-categories")
      if (response.ok) {
        const data = await response.json()
        setReceiptCategories(data)
      }
    } catch (error) {
      console.error("Error fetching receipt categories:", error)
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

  // Group receipt categories by type name
  const groupedReceiptCategories = receiptCategories.reduce((acc, cat) => {
    if (!acc[cat.typeName]) {
      acc[cat.typeName] = []
    }
    acc[cat.typeName].push(cat)
    return acc
  }, {} as Record<string, ReceiptCategory[]>)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (transactionType === "transaction") {
        // Regular Transaction Logic
        let categoryIdToUse: number | null = null
        if (formData.category_name && formData.category_name.trim()) {
          const categoryName = formData.category_name.trim()
          // Find existing category by name
          const existingCategory = categories.find(
            (cat) => cat.name.toLowerCase() === categoryName.toLowerCase()
          )
          if (existingCategory) {
            categoryIdToUse = existingCategory.id
          } else {
            // Create new category
            try {
              const categoryResponse = await fetch("/api/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: categoryName }),
              })
              if (categoryResponse.ok) {
                const newCategory = await categoryResponse.json()
                categoryIdToUse = newCategory.id
                await fetchCategories()
              }
            } catch (error) {
              console.error("Error creating category:", error)
            }
          }
        } else if (formData.category_id && formData.category_id !== "none") {
          categoryIdToUse = Number(formData.category_id)
        }

        const payload: any = {
          date: formData.date,
          description: formData.description.trim(),
          amount: Number(formData.amount),
        }

        if (categoryIdToUse) payload.category_id = categoryIdToUse
        if (formData.statement_id && formData.statement_id !== "none") {
          payload.statement_id = Number(formData.statement_id)
        }

        // Add simplified description for manual entries
        const sanitized = sanitizeDescription(payload.description)
        const ruleResult = ruleSimplifyDescription(sanitized)
        payload.simplified_description = ruleResult.simplified || sanitized.substring(0, 50)

        const response = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to create transaction")
        }

      } else {
        // Receipt Transaction Logic
        const categoryId = formData.receipt_category_id !== "none" ? Number(formData.receipt_category_id) : null

        // Find the category object to get typeId
        const category = receiptCategories.find(c => c.id === categoryId)

        const payload = {
          date: formData.date,
          storeName: formData.store_name.trim(),
          description: formData.description.trim(), // Item name
          amount: Number(formData.amount), // Price per unit
          quantity: Number(formData.quantity),
          categoryId: categoryId,
          categoryTypeId: category ? category.typeId : null
        }

        const response = await fetch("/api/receipts/manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to create receipt transaction")
        }
      }

      toast.success("Transaction added successfully")

      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: "",
        amount: "",
        category_id: "none",
        category_name: "",
        statement_id: "none",
        store_name: "",
        quantity: "1",
        receipt_category_id: "none"
      })
      setCategoryName("")

      onOpenChange(false)

      if (onSuccess) onSuccess()

      setTimeout(() => {
        window.location.reload()
      }, 300)

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
            Quickly add a spending/income transaction or a manual receipt item.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={transactionType} onValueChange={(v) => setTransactionType(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="transaction">Spending / Income</TabsTrigger>
            <TabsTrigger value="receipt">Receipt Transaction</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit}>
            <TabsContent value="transaction" className="space-y-4">
              <FieldGroup>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="date-t">Date</FieldLabel>
                    <Input
                      id="date-t"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="amount-t">Amount</FieldLabel>
                    <Input
                      id="amount-t"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="description-t">Description</FieldLabel>
                  <Input
                    id="description-t"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Starbucks Coffee"
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="category-t">Category</FieldLabel>
                  <CategorySelect
                    value={categoryName}
                    onValueChange={(value) => {
                      setCategoryName(value)
                      setFormData({ ...formData, category_name: value })
                    }}
                    onCategoryAdded={(newCategory) => {
                      fetchCategories()
                      setCategoryName(newCategory)
                      setFormData({ ...formData, category_name: newCategory })
                    }}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="statement">Link to Report/Statement</FieldLabel>
                  <Select
                    value={formData.statement_id}
                    onValueChange={(value) => setFormData({ ...formData, statement_id: value })}
                  >
                    <SelectTrigger id="statement">
                      <SelectValue placeholder="None (individual transaction)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (individual transaction)</SelectItem>
                      {statements
                        .filter((statement) => statement.statementId != null)
                        .map((statement) => (
                          <SelectItem key={`stmt-${statement.statementId}`} value={String(statement.statementId)}>
                            {statement.name} ({statement.type})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </TabsContent>

            <TabsContent value="receipt" className="space-y-4">
              <FieldGroup>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="date-r">Receipt Date</FieldLabel>
                    <Input
                      id="date-r"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="store">Store Name</FieldLabel>
                    <Input
                      id="store"
                      value={formData.store_name}
                      onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                      placeholder="e.g. Walmart"
                      required
                    />
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="item-desc">Item Description</FieldLabel>
                  <Input
                    id="item-desc"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g. Milk 1L"
                    required
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="price">Price per Item</FieldLabel>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="quantity">Quantity</FieldLabel>
                    <Input
                      id="quantity"
                      type="number"
                      step="1"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="1"
                      required
                    />
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="cat-r">Item Category</FieldLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" type="button" className="w-full justify-between font-normal">
                        {formData.receipt_category_id !== "none"
                          ? receiptCategories.find(c => String(c.id) === formData.receipt_category_id)?.name
                          : "Select receipt category"}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[300px]" align="start">
                      <DropdownMenuItem onClick={() => setFormData({ ...formData, receipt_category_id: "none" })}>
                        Uncategorized
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {Object.entries(groupedReceiptCategories).map(([typeName, cats]) => (
                        <DropdownMenuSub key={typeName}>
                          <DropdownMenuSubTrigger>
                            {typeName}
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {cats.map((cat) => (
                              <DropdownMenuItem
                                key={cat.id}
                                onClick={() => setFormData({ ...formData, receipt_category_id: String(cat.id) })}
                              >
                                {cat.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Field>
              </FieldGroup>
            </TabsContent>

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
                {loading ? "Adding..." : (transactionType === "transaction" ? "Add Transaction" : "Add Receipt Item")}
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
