"use client"

import { useState, useCallback, useRef, useEffect, useMemo, memo, startTransition } from "react"
import { IconTrendingDown, IconTrendingUp, IconGripVertical } from "@tabler/icons-react"
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface SectionCardsProps {
  totalIncome?: number
  totalExpenses?: number
  savingsRate?: number
  netWorth?: number
  incomeChange?: number
  expensesChange?: number
  savingsRateChange?: number
  netWorthChange?: number
}

type CardId = "income" | "expenses" | "netWorth"

interface CardData {
  id: CardId
  title: string
  value: number
  change: number
  description: string
  footerText: string
  footerSubtext: string
  formatOptions: { minimumFractionDigits: number; maximumFractionDigits: number }
}

interface SortableCardProps {
  card: CardData
  isOverlay?: boolean
}

const SortableCard = memo(function SortableCard({ card, isOverlay = false }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  // Store the last non-null transform to prevent snap-back during re-renders
  // This matches the pattern used in SortableAnalyticsChart which works correctly
  const lastTransformRef = useRef<string | null>(null)
  const transformString = CSS.Transform.toString(transform)
  
  // Always update the ref when we have a transform
  if (transformString) {
    lastTransformRef.current = transformString
  }

  // During transitions, preserve the transform even if it becomes null temporarily
  // This prevents the snap-back effect when React re-renders with new order
  const effectiveTransform = transformString || (transition ? lastTransformRef.current : null)

  // Clear the ref when transition completes and we're not dragging
  useEffect(() => {
    if (!transition && !isDragging && !transformString) {
      // Small delay to ensure animation is fully complete
      const timer = setTimeout(() => {
        lastTransformRef.current = null
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [transition, isDragging, transformString])

  // Track if we need to force a transition (when dropped outside)
  const [forceTransition, setForceTransition] = useState(false)
  
  useEffect(() => {
    if (transition) {
      setForceTransition(false)
    } else if (!isDragging && lastTransformRef.current) {
      // If we have a stored transform but no transition, we might have been dropped outside
      // Force a transition to smoothly return
      setForceTransition(true)
      const timer = setTimeout(() => {
        setForceTransition(false)
        lastTransformRef.current = null
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [transition, isDragging])
  
  const style: React.CSSProperties = {
    transform: effectiveTransform || undefined,
    transition: transition || (forceTransition ? "transform 250ms cubic-bezier(0.25, 1, 0.5, 1)" : undefined),
    opacity: isDragging ? (isOverlay ? 1 : 0.4) : 1,
    cursor: isDragging ? "grabbing" : "grab",
    willChange: isDragging || transition || forceTransition ? "transform" : undefined,
  }

  const cardContent = (
    <>
      {/* Drag handle */}
      {!isOverlay && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 rounded hover:bg-accent z-10"
          aria-label="Drag to reorder"
        >
          <IconGripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <CardHeader>
        <CardDescription>{card.title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          ${card.value.toLocaleString(undefined, card.formatOptions)}
        </CardTitle>
        <CardAction>
          <Badge variant="outline">
            {card.change >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
            {card.change >= 0 ? "+" : ""}
            {card.change.toFixed(1)}%
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          {card.footerText}
          {card.change >= 0 ? (
            <IconTrendingUp className="size-4" />
          ) : (
            <IconTrendingDown className="size-4" />
          )}
        </div>
        <div className="text-muted-foreground">{card.footerSubtext}</div>
      </CardFooter>
    </>
  )

  if (isOverlay) {
    return (
      <Card className="@container/card relative group shadow-lg rotate-2">
        {cardContent}
      </Card>
    )
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="@container/card relative group"
    >
      {cardContent}
    </Card>
  )
})

export function SectionCards({
  totalIncome = 0,
  totalExpenses = 0,
  savingsRate = 0,
  netWorth = 0,
  incomeChange = 0,
  expensesChange = 0,
  savingsRateChange = 0,
  netWorthChange = 0,
}: SectionCardsProps) {
  // Ensure all values are numbers (handle case where API returns strings)
  const safeTotalIncome = Number(totalIncome) || 0
  const safeTotalExpenses = Number(totalExpenses) || 0
  const safeSavingsRate = Number(savingsRate) || 0
  const safeNetWorth = Number(netWorth) || 0
  const safeIncomeChange = Number(incomeChange) || 0
  const safeExpensesChange = Number(expensesChange) || 0
  const safeSavingsRateChange = Number(savingsRateChange) || 0
  const safeNetWorthChange = Number(netWorthChange) || 0

  // Initialize card order state
  const [cardOrder, setCardOrder] = useState<CardId[]>([
    "income",
    "expenses",
    "netWorth",
  ])

  // Track active dragging card for overlay
  const [activeId, setActiveId] = useState<CardId | null>(null)
  
  // Store card data in a ref that only updates when not dragging
  // This ensures card objects maintain stable references during drag
  const cardDataRef = useRef<Record<CardId, CardData>>({
    income: {
      id: "income",
      title: "Total Income",
      value: safeTotalIncome,
      change: safeIncomeChange,
      description: "Total Income",
      footerText: `${
        safeIncomeChange >= 0 ? "Income growing" : "Income decreased"
      } this month`,
      footerSubtext: "Compared to last month",
      formatOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    },
    expenses: {
      id: "expenses",
      title: "Total Expenses",
      value: safeTotalExpenses,
      change: safeExpensesChange,
      description: "Total Expenses",
      footerText: `${
        safeExpensesChange <= 0
          ? "Reduced spending"
          : "Spending increased"
      } this period`,
      footerSubtext:
        safeExpensesChange <= 0
          ? "Great progress on budgeting"
          : "Review your expenses",
      formatOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    },
    netWorth: {
      id: "netWorth",
      title: "Net Worth",
      value: safeNetWorth,
      change: safeNetWorthChange,
      description: "Net Worth",
      footerText: `${
        safeNetWorthChange >= 0 ? "Wealth growing" : "Wealth decreased"
      }`,
      footerSubtext: "Compared to last month",
      formatOptions: { minimumFractionDigits: 0, maximumFractionDigits: 0 },
    },
  })
  
  // Update card data ref only when not dragging to prevent re-renders during drag
  useEffect(() => {
    if (!activeId) {
      cardDataRef.current = {
        income: {
          id: "income",
          title: "Total Income",
          value: safeTotalIncome,
          change: safeIncomeChange,
          description: "Total Income",
          footerText: `${
            safeIncomeChange >= 0 ? "Income growing" : "Income decreased"
          } this month`,
          footerSubtext: "Compared to last month",
          formatOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        },
        expenses: {
          id: "expenses",
          title: "Total Expenses",
          value: safeTotalExpenses,
          change: safeExpensesChange,
          description: "Total Expenses",
          footerText: `${
            safeExpensesChange <= 0
              ? "Reduced spending"
              : "Spending increased"
          } this period`,
          footerSubtext:
            safeExpensesChange <= 0
              ? "Great progress on budgeting"
              : "Review your expenses",
          formatOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        },
        netWorth: {
          id: "netWorth",
          title: "Net Worth",
          value: safeNetWorth,
          change: safeNetWorthChange,
          description: "Net Worth",
          footerText: `${
            safeNetWorthChange >= 0 ? "Wealth growing" : "Wealth decreased"
          }`,
          footerSubtext: "Compared to last month",
          formatOptions: { minimumFractionDigits: 0, maximumFractionDigits: 0 },
        },
      }
    }
  }, [
    activeId,
    safeTotalIncome,
    safeTotalExpenses,
    safeNetWorth,
    safeIncomeChange,
    safeExpensesChange,
    safeNetWorthChange,
  ])
  
  // Always use the ref - it only updates when not dragging
  const cardDataMap = cardDataRef.current

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    })
  )

  // Handle drag start event
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as CardId)
  }, [])

  // Handle drag end event
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    // If dropped outside or on same item, delay resetting activeId to allow transition
    if (!over || active.id === over.id) {
      // Wait for transition to start before resetting
      setTimeout(() => {
        setActiveId(null)
      }, 0)
      return
    }

    // Only update order if dropped on a valid target within this context
    setCardOrder((items) => {
      const oldIndex = items.indexOf(active.id as CardId)
      const newIndex = items.indexOf(over.id as CardId)

      if (oldIndex === -1 || newIndex === -1) {
        return items
      }

      return arrayMove(items, oldIndex, newIndex)
    })
    
    // Reset activeId after a brief delay to allow visual feedback
    setTimeout(() => {
      setActiveId(null)
    }, 0)
  }, [])

  // Handle drag cancel (e.g., ESC key or dropped outside)
  const handleDragCancel = useCallback(() => {
    startTransition(() => {
      setActiveId(null)
    })
  }, [])


  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={cardOrder} strategy={rectSortingStrategy}>
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
          {cardOrder.map((cardId) => (
            <SortableCard key={cardId} card={cardDataMap[cardId]} />
          ))}
        </div>
      </SortableContext>
      <DragOverlay
        dropAnimation={{
          duration: 250,
          easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
        }}
      >
        {activeId ? (
          <SortableCard card={cardDataMap[activeId]} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
