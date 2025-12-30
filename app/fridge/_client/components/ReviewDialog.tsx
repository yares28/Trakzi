import { Minus, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

import type { ReviewUploadWarning } from "../hooks/useReviewDialog"
import type { ReceiptCategoryOption, UploadedReceipt } from "../types"

type ReviewCategoryGroup = {
  broadType: string
  categories: ReceiptCategoryOption[]
}

type ReviewDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  reviewReceipts: UploadedReceipt[]
  activeReviewReceiptIndex: number
  setActiveReviewReceiptIndex: (value: number | ((prev: number) => number)) => void
  reviewUploadWarnings: ReviewUploadWarning[]
  reviewCommitError: string | null
  isCommittingReview: boolean
  reviewCategoryByLowerName: Map<string, ReceiptCategoryOption>
  reviewCategoryGroups: ReviewCategoryGroup[]
  availableBroadTypes: string[]
  receiptCategoryTypes: Array<{ id: number; name: string; color: string | null }>
  activeReviewCategoryBroadType: string
  setActiveReviewCategoryBroadType: (value: string) => void
  openDropdownId: string | null
  setOpenDropdownId: (id: string | null) => void
  hasMultipleReviewReceipts: boolean
  isFirstReviewReceipt: boolean
  isLastReviewReceipt: boolean
  showReviewOnly: boolean
  setShowReviewOnly: (value: boolean) => void
  reviewQueueCount: number
  storeLanguageValue: string
  isStoreLanguageLoading: boolean
  storeLanguageError: string | null
  onStoreLanguageChange: (value: string) => void
  onUpdateItemCategory: (itemId: string, value: string) => void
  onUpdateItemBroadType: (itemId: string, value: string) => void
  onUpdateItemCategoryType: (itemId: string, value: string) => void
  onUpdateItemQuantity: (itemId: string, value: number) => void
  onDeleteItem: (itemId: string) => void
  onCommitReview: () => void
  onCreateCategoryRequest: (broadType: string, itemId: string) => void
}
const LANGUAGE_OPTIONS = [
  { value: "auto", label: "Auto detect" },
  { value: "es", label: "Spanish" },
  { value: "en", label: "English" },
  { value: "pt", label: "Portuguese" },
  { value: "fr", label: "French" },
  { value: "it", label: "Italian" },
  { value: "de", label: "German" },
  { value: "nl", label: "Dutch" },
  { value: "ca", label: "Catalan" },
]

const LANGUAGE_LABELS: Record<string, string> = LANGUAGE_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label
  return acc
}, {} as Record<string, string>)

function getLanguageLabel(value: string | null | undefined) {
  if (!value) return "Unknown"
  return LANGUAGE_LABELS[value] ?? value.toUpperCase()
}

export function ReviewDialog({
  open,
  onOpenChange,
  reviewReceipts,
  activeReviewReceiptIndex,
  setActiveReviewReceiptIndex,
  reviewUploadWarnings,
  reviewCommitError,
  isCommittingReview,
  reviewCategoryByLowerName,
  reviewCategoryGroups,
  availableBroadTypes,
  receiptCategoryTypes,
  activeReviewCategoryBroadType,
  setActiveReviewCategoryBroadType,
  openDropdownId,
  setOpenDropdownId,
  hasMultipleReviewReceipts,
  isFirstReviewReceipt,
  isLastReviewReceipt,
  showReviewOnly,
  setShowReviewOnly,
  reviewQueueCount,
  storeLanguageValue,
  isStoreLanguageLoading,
  storeLanguageError,
  onStoreLanguageChange,
  onUpdateItemCategory,
  onUpdateItemBroadType,
  onUpdateItemCategoryType,
  onUpdateItemQuantity,
  onDeleteItem,
  onCommitReview,
  onCreateCategoryRequest,
}: ReviewDialogProps) {
  const activeReviewReceipt = reviewReceipts[activeReviewReceiptIndex] ?? null
  const visibleTransactions = activeReviewReceipt
    ? (showReviewOnly
      ? activeReviewReceipt.transactions.filter((item) => Boolean(item.needsReview))
      : activeReviewReceipt.transactions)
    : []
  const reviewQueueLabel = reviewQueueCount > 0 ? `Review queue (${reviewQueueCount})` : "Review queue"
  const detectedLanguageLabel = activeReviewReceipt?.languageDetected
    ? getLanguageLabel(activeReviewReceipt.languageDetected)
    : null
  const parseMeta = activeReviewReceipt?.meta ?? null
  const parseWarnings = activeReviewReceipt?.warnings ?? []
  const parseQuality = parseMeta?.quality ?? null
  const parseQualityLabel = parseQuality
    ? `${parseQuality[0].toUpperCase()}${parseQuality.slice(1)}`
    : "Unknown"
  const parseQualityReasons = parseMeta?.quality_reasons ?? []
  const parseValidation = parseMeta?.validation ?? null
  const lineItemsTotal =
    typeof parseValidation?.line_items_total === "number" ? parseValidation.line_items_total : null
  const receiptTotal =
    typeof parseValidation?.total_amount === "number" ? parseValidation.total_amount : null
  const totalMismatchDetail =
    parseValidation?.total_mismatch && lineItemsTotal !== null && receiptTotal !== null
      ? `Total mismatch: items $${lineItemsTotal.toFixed(2)} vs total $${receiptTotal.toFixed(2)}`
      : parseValidation?.total_mismatch
        ? "Total mismatch between line items and receipt total."
        : null
  const missingLineItemsDetail = parseValidation?.missing_line_items
    ? "Missing or incomplete line items detected."
    : null
  const showParseInsights = Boolean(parseMeta || parseWarnings.length > 0)
  const qualityBadgeClass = cn(
    "border text-xs",
    parseQuality === "high"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
      : parseQuality === "medium"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-700"
        : "border-rose-500/40 bg-rose-500/10 text-rose-700"
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border bg-background sm:max-w-[95vw] md:max-w-[1400px] max-h-[90vh] overflow-hidden">
        <div className="flex flex-col max-h-[85vh] overflow-hidden">
          <div className="flex flex-col gap-3 pb-4 border-b border-border/60">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight">Review Receipt Data</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Adjust categories and quantities before your grocery insights update.
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center justify-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                AI extraction may not be perfect ƒ?" please double-check for better tracking
              </p>
            </div>

            {activeReviewReceipt ? (
              <div className="flex items-start justify-between gap-3 text-sm text-muted-foreground">
                <div className="min-w-0 truncate">
                  {activeReviewReceipt.storeName ? (
                    <span className="font-medium text-foreground">{activeReviewReceipt.storeName}</span>
                  ) : null}
                  {activeReviewReceipt.storeName && (activeReviewReceipt.receiptDate ?? activeReviewReceipt.fileName) ? " ƒ?½ " : null}
                  {activeReviewReceipt.receiptDate ?? activeReviewReceipt.fileName}
                </div>
                {reviewReceipts.length > 1 ? (
                  <div className="shrink-0 text-xs">
                    Receipt {activeReviewReceiptIndex + 1} of {reviewReceipts.length}
                  </div>
                ) : null}
              </div>
            ) : null}

            {activeReviewReceipt ? (
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">Receipt language</span>
                  <Select
                    value={storeLanguageValue}
                    onValueChange={onStoreLanguageChange}
                    disabled={!activeReviewReceipt.storeName || isStoreLanguageLoading || isCommittingReview}
                  >
                    <SelectTrigger className="h-8 w-[160px]">
                      <SelectValue placeholder="Auto detect" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {detectedLanguageLabel ? (
                    <span className="text-[0.7rem] text-muted-foreground">
                      Detected: {detectedLanguageLabel}
                    </span>
                  ) : null}
                  {storeLanguageError ? (
                    <span className="text-[0.7rem] text-amber-600">{storeLanguageError}</span>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={showReviewOnly ? "default" : "outline"}
                  onClick={() => setShowReviewOnly(!showReviewOnly)}
                  disabled={reviewQueueCount === 0 && !showReviewOnly}
                >
                  {reviewQueueLabel}
                </Button>
              </div>
            ) : null}


            {reviewUploadWarnings.length > 0 ? (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                Skipped {reviewUploadWarnings.length} receipt(s) that failed to upload:{" "}
                {reviewUploadWarnings.map((warning) => warning.fileName).join(", ")}
              </div>
            ) : null}

            {activeReviewReceipt && showParseInsights ? (
              <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-foreground">Parse quality</span>
                  <Badge variant="outline" className={qualityBadgeClass}>
                    {parseQualityLabel}
                  </Badge>
                  {parseMeta?.repair_used ? (
                    <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700">
                      Auto-repair
                    </Badge>
                  ) : null}
                  {parseMeta?.ocr_used_for_pdf ? (
                    <Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 text-sky-700">
                      PDF OCR
                    </Badge>
                  ) : null}
                </div>
                {parseQualityReasons.length > 0 ? (
                  <div className="mt-1">
                    Signals: {parseQualityReasons.join(" | ")}
                  </div>
                ) : null}
                {missingLineItemsDetail ? (
                  <div className="mt-1 text-amber-700">{missingLineItemsDetail}</div>
                ) : null}
                {totalMismatchDetail ? (
                  <div className="mt-1 text-amber-700">{totalMismatchDetail}</div>
                ) : null}
                {parseWarnings.length > 0 ? (
                  <div className="mt-1">
                    Warnings: {parseWarnings.map((warning) => warning.message).join(" | ")}
                  </div>
                ) : null}
              </div>
            ) : null}

            {reviewCommitError ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {reviewCommitError}
              </div>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden pt-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40">
            {activeReviewReceipt ? (
              <Table className="w-full table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[20%]">Item</TableHead>
                    <TableHead className="w-[16%]">Category</TableHead>
                    <TableHead className="w-[14%]">Broad Type</TableHead>
                    <TableHead className="w-[14%]">Macronutrient</TableHead>
                    <TableHead className="w-[10%] text-center">Qty</TableHead>
                    <TableHead className="w-[10%] text-right">Unit</TableHead>
                    <TableHead className="w-[12%] text-right">Total</TableHead>
                    <TableHead className="w-[4%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleTransactions.map((item) => {
                    const rawCategoryName = (item.categoryName ?? "").trim()
                    const matchedCategory = rawCategoryName
                      ? (reviewCategoryByLowerName.get(rawCategoryName.toLowerCase()) ?? null)
                      : null
                    const categoryValue = rawCategoryName
                      ? matchedCategory?.name ?? rawCategoryName
                      : "__uncategorized__"
                    const selectedBroadType = matchedCategory?.broadType ?? null
                    const needsReview = Boolean(item.needsReview)
                    const reviewHintParts: string[] = []
                    if (item.aiCategoryRaw) reviewHintParts.push(`AI: ${item.aiCategoryRaw}`)
                    else if (item.aiCategoryResolved) reviewHintParts.push(`AI: ${item.aiCategoryResolved}`)
                    if (item.heuristicCategory) reviewHintParts.push(`Heuristic: ${item.heuristicCategory}`)
                    const reviewReason = item.reviewReason ?? null
                    if (reviewReason === "ai_heuristic_disagree") reviewHintParts.push("AI vs heuristic")
                    if (reviewReason === "low_confidence") reviewHintParts.push("Low confidence")
                    const reviewHint = reviewHintParts.join(" | ")
                    const activeCategoryGroup =
                      reviewCategoryGroups.find((group) => group.broadType === activeReviewCategoryBroadType) ??
                      reviewCategoryGroups[0] ??
                      null
                    return (
                      <TableRow
                        key={item.id}
                        className={cn(
                          needsReview
                            ? "bg-amber-50/60 dark:bg-amber-950/30"
                            : null
                        )}
                      >
                        <TableCell className="truncate">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="truncate font-medium" title={item.description}>
                              {item.description}
                            </div>
                            {needsReview ? (
                              <Badge
                                variant="outline"
                                title={reviewHint || "Review suggested by heuristics"}
                                className="border-amber-300 text-amber-700 bg-amber-50/80"
                              >
                                Review
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="truncate">
                          <Select
                            value={categoryValue}
                            open={openDropdownId === `category-${item.id}`}
                            onOpenChange={(openSelect) => {
                              if (openSelect) {
                                setOpenDropdownId(`category-${item.id}`)
                                const nextBroadType = matchedCategory?.broadType
                                if (nextBroadType) {
                                  setActiveReviewCategoryBroadType(nextBroadType)
                                }
                              } else {
                                setOpenDropdownId(null)
                              }
                            }}
                            onValueChange={(value) => {
                              if (value === "__create_new__") {
                                const inferredBroadType =
                                  activeReviewCategoryBroadType ||
                                  selectedBroadType ||
                                  "Other"

                                onCreateCategoryRequest(inferredBroadType, item.id)
                              } else {
                                onUpdateItemCategory(item.id, value)
                              }
                              setOpenDropdownId(null)
                            }}
                            disabled={isCommittingReview}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select category">
                                {matchedCategory ? (
                                  <span className="flex items-center gap-2">
                                    <span
                                      className="h-2 w-2 rounded-full shrink-0"
                                      style={{ backgroundColor: matchedCategory.color ?? "#64748b" }}
                                    />
                                    <span className="truncate">{matchedCategory.name}</span>
                                  </span>
                                ) : categoryValue && categoryValue !== "__uncategorized__" ? (
                                  <span className="truncate">{categoryValue}</span>
                                ) : null}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__uncategorized__">Uncategorized</SelectItem>
                              {reviewCategoryGroups.length > 0 ? (
                                <>
                                  <Separator className="my-1" />
                                  <div className="px-1 pb-1">
                                    <div className="flex flex-wrap gap-1">
                                      {reviewCategoryGroups.map((group) => {
                                        const isActive = group.broadType === activeReviewCategoryBroadType
                                        return (
                                          <button
                                            key={group.broadType}
                                            type="button"
                                            className={cn(
                                              "inline-flex items-center rounded-md border px-2 py-1 text-[0.7rem] font-medium transition-colors",
                                              isActive
                                                ? "border-primary/30 bg-primary/10 text-primary"
                                                : "border-border/60 bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                            )}
                                            onPointerDown={(event) => event.preventDefault()}
                                            onClick={() => setActiveReviewCategoryBroadType(group.broadType)}
                                          >
                                            {group.broadType}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </div>
                                  <Separator className="my-1" />
                                  {activeCategoryGroup ? (
                                    <div className="space-y-0.5">
                                      {activeCategoryGroup.categories.map((category) => (
                                        <SelectItem
                                          key={`${activeCategoryGroup.broadType}-${category.name}`}
                                          value={category.name}
                                        >
                                          <span className="flex items-center gap-2">
                                            <span
                                              className="h-2 w-2 rounded-full border border-border/50"
                                              style={{
                                                backgroundColor: category.color ?? undefined,
                                                borderColor: category.color ?? undefined,
                                              }}
                                            />
                                            <span className="truncate">{category.name}</span>
                                          </span>
                                        </SelectItem>
                                      ))}
                                    </div>
                                  ) : null}
                                </>
                              ) : null}

                              {matchedCategory &&
                              activeCategoryGroup &&
                              matchedCategory.broadType !== activeCategoryGroup.broadType ? (
                                <SelectItem value={matchedCategory.name} className="hidden">
                                  <span className="flex items-center gap-2">
                                    <span
                                      className="h-2 w-2 rounded-full border border-border/50"
                                      style={{
                                        backgroundColor: matchedCategory.color ?? undefined,
                                        borderColor: matchedCategory.color ?? undefined,
                                      }}
                                    />
                                    <span className="truncate">{matchedCategory.name}</span>
                                  </span>
                                </SelectItem>
                              ) : null}

                              {rawCategoryName && !matchedCategory ? (
                                <SelectItem value={rawCategoryName} className="hidden">
                                  {rawCategoryName}
                                </SelectItem>
                              ) : null}
                              <Separator className="my-1" />
                              <SelectItem value="__create_new__">
                                <span className="flex items-center gap-2">
                                  <Plus className="h-3 w-3" />
                                  Create new category
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="truncate">
                          <Select
                            value={item.broadType ?? selectedBroadType ?? ""}
                            open={openDropdownId === `broadtype-${item.id}`}
                            onOpenChange={(openSelect) => {
                              if (openSelect) {
                                setOpenDropdownId(`broadtype-${item.id}`)
                              } else {
                                setOpenDropdownId(null)
                              }
                            }}
                            onValueChange={(value) => {
                              onUpdateItemBroadType(item.id, value)
                              setOpenDropdownId(null)
                            }}
                            disabled={isCommittingReview}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableBroadTypes.map((broadType) => (
                                <SelectItem key={broadType} value={broadType}>
                                  {broadType}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="truncate">
                          <Select
                            value={item.categoryTypeName ?? matchedCategory?.typeName ?? ""}
                            open={openDropdownId === `macrotype-${item.id}`}
                            onOpenChange={(openSelect) => {
                              if (openSelect) {
                                setOpenDropdownId(`macrotype-${item.id}`)
                              } else {
                                setOpenDropdownId(null)
                              }
                            }}
                            onValueChange={(value) => {
                              onUpdateItemCategoryType(item.id, value)
                              setOpenDropdownId(null)
                            }}
                            disabled={isCommittingReview}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select macro" />
                            </SelectTrigger>
                            <SelectContent>
                              {receiptCategoryTypes.map((type) => (
                                <SelectItem key={type.id} value={type.name}>
                                  {type.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          {(() => {
                            const quantityValue = Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1
                            const formattedQuantity = Number.isInteger(quantityValue) ? String(quantityValue) : quantityValue.toFixed(2)
                            const isAtMin = quantityValue <= 1
                            return (
                              <div className="flex items-center justify-center gap-0.5 group/qty">
                                {!isAtMin && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0 opacity-0 pointer-events-none group-hover/qty:opacity-100 group-hover/qty:pointer-events-auto transition-opacity"
                                    onClick={() => onUpdateItemQuantity(item.id, Math.max(1, quantityValue - 1))}
                                    disabled={isCommittingReview}
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {isAtMin && <div className="h-7 w-7 shrink-0" />}
                                <span className="w-8 text-center tabular-nums font-medium">{formattedQuantity}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 shrink-0 opacity-0 pointer-events-none group-hover/qty:opacity-100 group-hover/qty:pointer-events-auto transition-opacity"
                                  onClick={() => onUpdateItemQuantity(item.id, quantityValue + 1)}
                                  disabled={isCommittingReview}
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )
                          })()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          ${item.pricePerUnit.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          ${item.totalPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => onDeleteItem(item.id)}
                            disabled={isCommittingReview}
                            aria-label="Delete item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-sm text-muted-foreground">No receipt selected.</div>
            )}
            {activeReviewReceipt && showReviewOnly && visibleTransactions.length === 0 ? (
              <div className="text-sm text-muted-foreground mt-4">
                No items are flagged for review in this receipt.
              </div>
            ) : null}
          </div>

          <div className="pt-4 border-t border-border/60 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {activeReviewReceipt ? (
                <>
                  {showReviewOnly ? (
                    <span>
                      Showing {visibleTransactions.length} of {activeReviewReceipt.transactions.length} item(s) 
                    </span>
                  ) : (
                    <span>{activeReviewReceipt.transactions.length} item(s) </span>
                  )}
                  Total{" "}
                  <span className="font-medium text-foreground">
                    $
                    {(showReviewOnly ? visibleTransactions : activeReviewReceipt.transactions)
                      .reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0)
                      .toFixed(2)}
                  </span>
                </>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {hasMultipleReviewReceipts ? (
                <Button
                  variant="outline"
                  onClick={() =>
                    setActiveReviewReceiptIndex((prev) => Math.max(0, prev - 1))
                  }
                  disabled={isCommittingReview || isFirstReviewReceipt}
                >
                  Back
                </Button>
              ) : null}
              <Button
                variant="outline"
                onClick={() => {
                  if (isLastReviewReceipt) {
                    onCommitReview()
                    return
                  }
                  setActiveReviewReceiptIndex((prev) =>
                    Math.min(reviewReceipts.length - 1, prev + 1)
                  )
                }}
                disabled={isCommittingReview || reviewReceipts.length === 0}
              >
                {isCommittingReview
                  ? "Importing..."
                  : isLastReviewReceipt
                    ? "Done"
                    : "Next"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
