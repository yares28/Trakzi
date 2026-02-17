"use client"

import { memo, useCallback, useRef, useEffect, useState, useMemo } from "react"
import {
  Banknote,
  Check,
  FileText,
  Home,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Shield,
  Wrench,
  X,
  X as XIcon,
  Eye,
  Settings,
  Zap,
} from "lucide-react"

import { useCurrency } from "@/components/currency-provider"
import { cn } from "@/lib/utils"
import { calculateMonthlyPayment } from "@/app/savings/_page/mortgage/calculations"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { PropertyMortgageContent } from "./PropertyMortgageContent"
import { PropertyDetailsContent } from "./PropertyDetailsContent"
import { PropertyTransactionsDialog } from "./PropertyTransactionsDialog"

/**
 * Compute remaining mortgage balance after a number of years paid,
 * by iterating month-by-month through the amortization schedule.
 */
function computeRemainingBalance(
  principal: number,
  annualRate: number,
  totalYears: number,
  yearsPaid: number
): number {
  if (principal <= 0 || totalYears <= 0 || yearsPaid <= 0) return principal
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, totalYears)
  const monthlyRate = annualRate / 100 / 12
  let balance = principal
  const monthsPaid = Math.round(yearsPaid * 12)

  for (let i = 0; i < monthsPaid; i++) {
    if (balance <= 0) break
    const interest = balance * monthlyRate
    const principalPaid = monthlyPayment - interest
    balance = Math.max(0, balance - principalPaid)
  }

  return balance
}

/**
 * Compute ownership metrics for property card display
 */
function computeOwnershipMetrics(
  propertyValue: number,
  mortgageOriginalAmount?: number,
  mortgageInterestRate?: number,
  mortgageLoanYears?: number,
  mortgageYearsPaid?: number,
  mortgageRemainingAmount?: number,
  mortgageTotalPaid?: number
): { percentOwned: number | null; amountLeftWithInterestAndFees: number | null } {
  if (!mortgageOriginalAmount || mortgageOriginalAmount <= 0 || propertyValue <= 0) {
    return { percentOwned: null, amountLeftWithInterestAndFees: null }
  }

  const rate = mortgageInterestRate ?? 0
  const years = mortgageLoanYears ?? 0
  const yearsPaid = mortgageYearsPaid ?? 0

  // Calculate remaining balance using amortization if we have all parameters
  let remainingBalance: number
  if (rate >= 0 && years > 0) {
    const monthlyPayment = calculateMonthlyPayment(mortgageOriginalAmount, rate, years)
    const clampedYearsPaid = Math.min(yearsPaid, years)
    remainingBalance = computeRemainingBalance(mortgageOriginalAmount, rate, years, clampedYearsPaid)
    const yearsRemaining = years - clampedYearsPaid
    const totalRemainingToPay = monthlyPayment * yearsRemaining * 12
    // For amount left, use total remaining to pay (includes interest)
    return {
      percentOwned: Math.min(100, Math.max(0, ((propertyValue - remainingBalance) / propertyValue) * 100)),
      amountLeftWithInterestAndFees: totalRemainingToPay,
    }
  } else {
    // Fallback: use mortgageRemainingAmount if available
    const balance = mortgageRemainingAmount ?? mortgageOriginalAmount
    return {
      percentOwned: Math.min(100, Math.max(0, ((propertyValue - balance) / propertyValue) * 100)),
      amountLeftWithInterestAndFees: balance,
    }
  }
}

export interface PropertyCardData {
  id: string
  label: string
  value: number
  svgPath: string
  propertyType: "owned" | "rented"
  mortgageOriginalAmount?: number
  mortgageInterestRate?: number
  mortgageRemainingAmount?: number
  mortgageLinkedTransactionIds?: number[]
  mortgageTotalPaid?: number
  mortgageLoanYears?: number
  mortgageYearsPaid?: number
  /** Total spent on this property (mortgage + maintenance + insurance + taxes, or rent + utilities + deposit + fees). */
  totalSpent?: number
}

export const MOCK_PROPERTIES: PropertyCardData[] = [
  {
    id: "mock-1",
    label: "Main Home",
    value: 420000,
    svgPath: "/property/houseplan1.svg",
    propertyType: "owned",
    mortgageOriginalAmount: 336000,
    mortgageInterestRate: 3.5,
    mortgageLoanYears: 25,
    mortgageYearsPaid: 6,
  },
  {
    id: "mock-2",
    label: "Studio Rental",
    value: 1800,
    svgPath: "/property/houseplan2.svg",
    propertyType: "rented",
  },
]

type PropertyBackFaceView = "mortgage" | "maintenance" | "insurance" | "taxes" | "details"
type RentedBackFaceView = "rent" | "utilities" | "deposit" | "fees" | "details"

interface PropertyCardProps {
  id: string
  label: string
  value: number
  svgPath: string
  propertyType: "owned" | "rented"
  mortgageOriginalAmount?: number
  mortgageInterestRate?: number
  mortgageRemainingAmount?: number
  mortgageLinkedTransactionIds?: number[]
  mortgageTotalPaid?: number
  mortgageLoanYears?: number
  mortgageYearsPaid?: number
  totalSpent?: number
  onView?: () => void
  onRemove?: () => void | Promise<void>
  onLabelUpdated?: (newLabel: string) => void
  onUpdate: (updates: Partial<PropertyCardData>) => void
}

const PROPERTY_ACTIONS = [
  { id: "mortgage", label: "Mortgage", icon: Banknote },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
  { id: "insurance", label: "Insurance", icon: Shield },
  { id: "taxes", label: "Taxes", icon: FileText },
] as const

const RENTED_PROPERTY_ACTIONS = [
  { id: "rent", label: "Rent", icon: Banknote },
  { id: "utilities", label: "Utilities", icon: Zap },
  { id: "deposit", label: "Deposit", icon: KeyRound },
  { id: "fees", label: "Fees", icon: FileText },
] as const

function PropertyCard({
  id,
  label,
  value,
  svgPath,
  propertyType,
  mortgageOriginalAmount,
  mortgageInterestRate,
  mortgageRemainingAmount,
  mortgageLinkedTransactionIds,
  mortgageTotalPaid,
  mortgageLoanYears,
  mortgageYearsPaid,
  totalSpent,
  onView,
  onRemove,
  onLabelUpdated,
  onUpdate,
}: PropertyCardProps) {
  const { formatCurrency } = useCurrency()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedLabel, setEditedLabel] = useState(label)
  const [editError, setEditError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const [backFaceView, setBackFaceView] = useState<PropertyBackFaceView | RentedBackFaceView>(
    propertyType === "rented" ? "rent" : "mortgage"
  )

  const actions = propertyType === "owned" ? PROPERTY_ACTIONS : RENTED_PROPERTY_ACTIONS
  const backFaceTitle =
    backFaceView === "details"
      ? "Details"
      : propertyType === "owned"
        ? (backFaceView === "mortgage"
            ? "Mortgage"
            : backFaceView === "maintenance"
              ? "Maintenance"
              : backFaceView === "insurance"
                ? "Insurance"
                : "Taxes")
        : (backFaceView === "rent"
            ? "Rent"
            : backFaceView === "utilities"
              ? "Utilities"
              : backFaceView === "deposit"
                ? "Deposit"
                : "Fees")

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    if (!isEditing) {
      setEditedLabel(label)
      setEditError(null)
    }
  }, [label, isEditing])

  const handleStartEdit = useCallback(() => {
    setIsEditing(true)
    setEditedLabel(label)
    setEditError(null)
  }, [label])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditedLabel(label)
    setEditError(null)
  }, [label])

  const handleSaveEdit = useCallback(() => {
    const trimmed = editedLabel.trim()
    if (!trimmed) {
      setEditError("Name cannot be empty")
      return
    }
    if (trimmed === label) {
      setIsEditing(false)
      return
    }
    setEditError(null)
    onLabelUpdated?.(trimmed)
    setIsEditing(false)
  }, [editedLabel, label, onLabelUpdated])

  const handleRemove = useCallback(async () => {
    if (!onRemove || isDeleting) return
    setIsDeleting(true)
    try {
      await onRemove()
    } finally {
      setIsDeleting(false)
    }
  }, [onRemove, isDeleting])

  const handleBackTabClick = useCallback(
    (view: PropertyBackFaceView | RentedBackFaceView) => {
      if (backFaceView === view) {
        // Same tab clicked again → flip back to front, keep selection
        setIsFlipped(false)
        return
      }
      setBackFaceView(view)
      setActiveAction(view)
    },
    [backFaceView],
  )

  // Compute ownership metrics for front face display
  const ownershipMetrics = useMemo(
    () => computeOwnershipMetrics(
      value,
      mortgageOriginalAmount,
      mortgageInterestRate,
      mortgageLoanYears,
      mortgageYearsPaid,
      mortgageRemainingAmount,
      mortgageTotalPaid
    ),
    [value, mortgageOriginalAmount, mortgageInterestRate, mortgageLoanYears, mortgageYearsPaid, mortgageRemainingAmount, mortgageTotalPaid]
  )

  return (
    <div
      className="h-[420px] min-h-[18rem] [perspective:1200px]"
    >
      <div
        className={cn(
          "relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]",
          isFlipped && "[transform:rotateY(180deg)]",
        )}
      >
        {/* FRONT FACE */}
        <Card
          className={cn(
            "absolute inset-0 overflow-hidden border-border/60 bg-card/50 py-0 shadow-sm [backface-visibility:hidden] group",
            isFlipped && "pointer-events-none",
          )}
          aria-hidden={isFlipped}
        >
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (!isDeleting) {
                  handleRemove()
                }
              }}
              disabled={isDeleting}
              aria-label={`Remove ${label}`}
              className="absolute right-2 top-2 z-30 h-8 w-8 rounded-full text-muted-foreground opacity-60 transition-opacity hover:opacity-100 hover:text-destructive hover:bg-destructive/10 cursor-pointer"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          )}

          <CardContent className="relative flex h-full min-h-[18rem] flex-col p-0">
            {/* Property image area */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-[inherit] bg-muted/30 p-4">
              <img
                src={svgPath}
                alt={label}
                className="h-full w-full max-h-[120%] max-w-[120%] object-contain"
              />
            </div>

            {/* Category buttons at top of card (mirroring vehicle actions) */}
            <div className="absolute inset-x-0 top-0 z-20 flex justify-center pt-2">
              <div className="flex flex-wrap items-center justify-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:gap-2">
                {actions.map(({ id: actionId, label: actionLabel, icon: Icon }) => (
                  <Button
                    key={actionId}
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-xl border-border/80 bg-background/90 shadow-md backdrop-blur-sm transition-all hover:scale-105 hover:bg-primary/10 hover:border-primary/30 hover:shadow-lg sm:h-10 sm:w-10 [&_svg]:size-4 sm:[&_svg]:size-[18px]"
                    aria-pressed={activeAction === actionId}
                    aria-label={actionLabel}
                    title={actionLabel}
                    onClick={() => {
                      setActiveAction(actionId)
                      setBackFaceView(actionId as PropertyBackFaceView | RentedBackFaceView)
                      setIsFlipped(true)
                    }}
                  >
                    <Icon className="size-4 sm:size-[18px]" />
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl border-border/80 bg-background/90 shadow-md backdrop-blur-sm transition-all hover:scale-105 hover:bg-primary/10 hover:border-primary/30 hover:shadow-lg sm:h-10 sm:w-10 [&_svg]:size-4 sm:[&_svg]:size-[18px]"
                  aria-label="Details"
                  title="Details"
                  onClick={() => {
                    setActiveAction("details")
                    setBackFaceView("details")
                    setIsFlipped(true)
                  }}
                >
                  <Settings className="size-4 sm:size-[18px]" />
                </Button>
              </div>
            </div>

            {/* Data overlay at bottom (aligned with vehicle card style) */}
            <div className="absolute inset-x-0 bottom-0 z-10 border-t border-border/20 px-4 py-3 [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Property
              </p>

              <div className="relative mt-1 group/label">
                {isEditing ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <Input
                        ref={inputRef}
                        value={editedLabel}
                        onChange={(e) => {
                          setEditedLabel(e.target.value)
                          if (editError) setEditError(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleSaveEdit()
                          } else if (e.key === "Escape") {
                            e.preventDefault()
                            handleCancelEdit()
                          }
                        }}
                        maxLength={100}
                        className={`h-8 text-base font-medium ${editError ? "border-destructive" : ""}`}
                        aria-invalid={!!editError}
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleSaveEdit}
                        disabled={!editedLabel.trim()}
                        className="h-8 w-8 shrink-0"
                        aria-label="Save name"
                      >
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleCancelEdit}
                        className="h-8 w-8 shrink-0"
                        aria-label="Cancel editing"
                      >
                        <XIcon className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                    {editError && (
                      <p className="text-xs text-destructive">{editError}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span
                      className="truncate text-base font-medium text-foreground min-w-0"
                      title={label}
                    >
                      {label}
                    </span>
                    {onLabelUpdated && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleStartEdit}
                        className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover/label:opacity-100 hover:bg-accent"
                        aria-label={`Edit name for ${label}`}
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-1 flex items-baseline justify-between gap-2">
                <p className="text-lg tabular-nums text-foreground">
                  {formatCurrency(value, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </p>
                <p className="text-right text-sm tabular-nums text-muted-foreground pr-[30px]" title={propertyType === "owned" ? "Spent (linked) + equity owned (amount, not %)" : "Total spent: rent + utilities + deposit + fees"}>
                  Spent {formatCurrency(
                    (totalSpent ?? 0) +
                    (propertyType === "owned" && ownershipMetrics.percentOwned != null
                      ? (ownershipMetrics.percentOwned / 100) * value
                      : 0),
                    { minimumFractionDigits: 0, maximumFractionDigits: 0 }
                  )}
                </p>
              </div>

              {/* Mortgage ownership info */}
              {ownershipMetrics.percentOwned !== null && ownershipMetrics.amountLeftWithInterestAndFees !== null && (
                <>
                  <div className="mt-2 space-y-1">
                    <Progress 
                      value={ownershipMetrics.percentOwned} 
                      className="h-1.5" 
                      aria-label={`Ownership progress: ${ownershipMetrics.percentOwned.toFixed(0)}% of property value paid off `}
                    />
                    <p className="text-xs text-muted-foreground">
                      {ownershipMetrics.percentOwned.toFixed(0)}% owned
                      {" · "}
                      {formatCurrency(ownershipMetrics.amountLeftWithInterestAndFees, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}{" "}
                      left to pay 
                    </p>
                  </div>
                </>
              )}

            </div>

            {/* Hover action: view (bottom-right) */}
            {onView && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute bottom-2 right-2 z-30 h-8 w-8 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground hover:bg-accent"
                onClick={onView}
                aria-label={`View ${label}`}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>

        {/* BACK FACE */}
        <Card
          className="absolute inset-0 overflow-hidden border-border/60 bg-card py-0 shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)]"
          aria-hidden={!isFlipped}
        >
          <CardContent className="flex h-full flex-col p-4 overflow-y-auto">
            {/* Back-face tabs – mirror vehicle back-face behavior */}
            <div className="mb-3 flex items-center justify-center gap-1.5">
              {actions.map(({ id: actionId, label: actionLabel, icon: Icon }) => (
                <Button
                  key={actionId}
                  type="button"
                  variant={backFaceView === actionId ? "default" : "ghost"}
                  size="icon-sm"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleBackTabClick(actionId as PropertyBackFaceView | RentedBackFaceView)
                  }}
                  className={cn(
                    "h-8 w-8 rounded-lg transition-all",
                    backFaceView === actionId
                      ? "shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-label={
                    backFaceView === actionId
                      ? `${actionLabel} (click to go back)`
                      : actionLabel
                  }
                  title={
                    backFaceView === actionId ? "Back to property card" : actionLabel
                  }
                >
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
              <Button
                type="button"
                variant={backFaceView === "details" ? "default" : "ghost"}
                size="icon-sm"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleBackTabClick("details")
                }}
                className={cn(
                  "h-8 w-8 rounded-lg transition-all",
                  backFaceView === "details"
                    ? "shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-label={
                  backFaceView === "details"
                    ? "Details (click to go back)"
                    : "Details"
                }
                title={
                  backFaceView === "details" ? "Back to property card" : "Details"
                }
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {backFaceTitle}
                </p>
                <p className="text-sm font-medium text-foreground">
                  {label}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-7 w-7"
                onClick={() => setIsFlipped(false)}
                aria-label="Back to card"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-3 flex-1">
              {backFaceView === "details" ? (
                <PropertyDetailsContent
                  key="details"
                  property={{
                    id,
                    label,
                    value,
                    svgPath,
                    propertyType,
                  }}
                  onUpdate={onUpdate}
                  onCancel={() => setIsFlipped(false)}
                />
              ) : propertyType === "owned" && backFaceView === "mortgage" ? (
                <PropertyMortgageContent
                  property={{
                    id,
                    label,
                    value,
                    svgPath,
                    propertyType,
                    mortgageOriginalAmount,
                    mortgageInterestRate,
                    mortgageRemainingAmount,
                    mortgageLinkedTransactionIds,
                    mortgageTotalPaid,
                    mortgageLoanYears,
                    mortgageYearsPaid,
                  }}
                  onUpdate={onUpdate}
                  onDone={() => setIsFlipped(false)}
                />
              ) : propertyType === "owned" ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  {backFaceView === "maintenance" && (
                    <>
                      <p>
                        Track all maintenance and improvement costs for this property to
                        understand real lifetime cost.
                      </p>
                      <p className="text-xs">
                        You&apos;ll be able to link categories like repairs, renovations, and
                        utilities here.
                      </p>
                    </>
                  )}
                  {backFaceView === "insurance" && (
                    <>
                      <p>
                        Keep insurance premiums and coverage-related payments tied to this
                        property.
                      </p>
                      <p className="text-xs">
                        Great for seeing yearly coverage cost across your portfolio.
                      </p>
                    </>
                  )}
                  {backFaceView === "taxes" && (
                    <>
                      <p>
                        Group property taxes and related fees so you can quickly see the
                        annual tax burden for this asset.
                      </p>
                      <p className="text-xs">
                        Future iterations will let you link tax transactions directly from
                        your statements.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-2 text-sm text-muted-foreground">
                  {backFaceView === "rent" && (
                    <>
                      <p>
                        Track rent payments for this property. Link recurring rent
                        transactions to see monthly and yearly spend.
                      </p>
                      <p className="text-xs">
                        You&apos;ll be able to link categories and transactions for rent
                        here.
                      </p>
                    </>
                  )}
                  {backFaceView === "utilities" && (
                    <>
                      <p>
                        Track gas, electricity, water, internet, and other utilities for
                        this rental.
                      </p>
                      <p className="text-xs">
                        Link utility bills and subscriptions to see total monthly cost.
                      </p>
                    </>
                  )}
                  {backFaceView === "deposit" && (
                    <>
                      <p>
                        Record your security or damage deposit for this rental. Useful for
                        tracking what you&apos;ll get back when you leave.
                      </p>
                      <p className="text-xs">
                        Future iterations will let you track deposit status and refunds.
                      </p>
                    </>
                  )}
                  {backFaceView === "fees" && (
                    <>
                      <p>
                        Track letting fees, admin fees, and other one-off or recurring
                        charges related to this rental.
                      </p>
                      <p className="text-xs">
                        Link transactions from your statements to see total fees over time.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface PropertyCardsGridProps {
  properties: PropertyCardData[]
  isLoading?: boolean
  onRemove: (id: string) => void
  onUpdate: (id: string, updates: Partial<PropertyCardData>) => void
  onLabelUpdated: (id: string, newLabel: string) => void
  onOpenAddProperty?: () => void
  onTransactionsLinked?: () => void
}

export const PropertyCardsGrid = memo(function PropertyCardsGrid({
  properties,
  isLoading = false,
  onRemove,
  onUpdate,
  onLabelUpdated,
  onOpenAddProperty,
  onTransactionsLinked,
}: PropertyCardsGridProps) {
  const [selectedPocketId, setSelectedPocketId] = useState<number | null>(null)
  const [selectedPropertyType, setSelectedPropertyType] = useState<"owned" | "rented">("owned")

  // Group properties by type
  const ownedProperties = useMemo(
    () => properties.filter((p) => p.propertyType === "owned"),
    [properties],
  )
  const rentedProperties = useMemo(
    () => properties.filter((p) => p.propertyType === "rented"),
    [properties],
  )

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @md/main:grid-cols-2 @3xl/main:grid-cols-3">
        {[1, 2].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col gap-3">
                <div className="h-40 w-full rounded bg-muted animate-pulse" />
                <div className="h-5 w-2/3 rounded bg-muted animate-pulse" />
                <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
                <div className="h-4 w-1/4 rounded bg-muted animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="px-4 lg:px-6">
        <Card className="flex flex-col items-center justify-center py-12">
          <Home className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-4 text-center text-muted-foreground">No properties added yet</p>
          <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
            Track your properties and their value. Add a property to get started.
          </p>
          <Button variant="outline" onClick={onOpenAddProperty}>
            <Plus className="mr-2 h-4 w-4" />
            Add your first property
          </Button>
        </Card>
      </div>
    )
  }

    const renderPropertyCard = (p: PropertyCardData) => (
      <PropertyCard
        key={p.id}
        id={p.id}
        label={p.label}
        value={p.value}
        svgPath={p.svgPath}
        propertyType={p.propertyType}
        mortgageOriginalAmount={p.mortgageOriginalAmount}
        mortgageInterestRate={p.mortgageInterestRate}
        mortgageRemainingAmount={p.mortgageRemainingAmount}
        mortgageLinkedTransactionIds={p.mortgageLinkedTransactionIds}
        mortgageTotalPaid={p.mortgageTotalPaid}
        mortgageLoanYears={p.mortgageLoanYears}
        mortgageYearsPaid={p.mortgageYearsPaid}
        totalSpent={p.totalSpent}
      onView={() => {
        const pId = parseInt(p.id, 10)
        if (!isNaN(pId)) {
          setSelectedPocketId(pId)
          setSelectedPropertyType(p.propertyType)
        }
      }}
      onRemove={() => onRemove(p.id)}
      onLabelUpdated={(newLabel) => onLabelUpdated(p.id, newLabel)}
      onUpdate={(updates) => onUpdate(p.id, updates)}
    />
  )

  return (
    <>
      <div className="space-y-6 px-4 lg:px-6">
        {/* Owned Properties Section */}
        {ownedProperties.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Owned Properties
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {ownedProperties.map(renderPropertyCard)}
            </div>
          </div>
        )}

        {/* Rented Properties Section */}
        {rentedProperties.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Rented Properties
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {rentedProperties.map(renderPropertyCard)}
            </div>
          </div>
        )}
      </div>

      {/* Property Transactions Dialog */}
      <PropertyTransactionsDialog
        pocketId={selectedPocketId}
        propertyType={selectedPropertyType}
        open={selectedPocketId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedPocketId(null)
        }}
        onTransactionsLinked={() => {
          onTransactionsLinked?.()
          setSelectedPocketId(null)
        }}
      />
    </>
  )
})

PropertyCardsGrid.displayName = "PropertyCardsGrid"
