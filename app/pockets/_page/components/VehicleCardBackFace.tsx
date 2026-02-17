"use client"

import { memo } from "react"
import {
  Fuel,
  Wrench,
  Shield,
  FileCheck,
  Banknote,
  Car,
  Settings,
} from "lucide-react"

import type { VehicleData } from "@/lib/types/pockets"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { VehicleDetailContent } from "./VehicleDetailContent"
import { VehicleFinancingContent } from "./VehicleFinancingContent"
import { VehicleDetailsContent } from "./VehicleDetailsContent"

export type BackFaceView =
  | "details"
  | "fuel"
  | "maintenance"
  | "insurance"
  | "certificate"
  | "financing"
  | "parking"

const TABS: { view: BackFaceView; icon: typeof Fuel; label: string }[] = [
  { view: "financing", icon: Banknote, label: "Financing" },
  { view: "fuel", icon: Fuel, label: "Fuel" },
  { view: "maintenance", icon: Wrench, label: "Maintenance" },
  { view: "insurance", icon: Shield, label: "Insurance" },
  { view: "certificate", icon: FileCheck, label: "Certificate" },
  { view: "parking", icon: Car, label: "Parking" },
  { view: "details", icon: Settings, label: "Details" },
]

interface VehicleCardBackFaceProps {
  vehicle: VehicleData
  activeView: BackFaceView
  onViewChange: (view: BackFaceView) => void
  onFlipBack: () => void
  onUpdate: (updates: Partial<VehicleData>) => void
}

export const VehicleCardBackFace = memo(function VehicleCardBackFace({
  vehicle,
  activeView,
  onViewChange,
  onFlipBack,
  onUpdate,
}: VehicleCardBackFaceProps) {
  const handleTabClick = (view: BackFaceView) => {
    if (activeView === view) {
      onFlipBack()
    } else {
      onViewChange(view)
    }
  }

  return (
    <div className="flex h-full flex-col relative">
      {/* Tab strip — clicking the active tab flips back to SVG */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-center gap-1.5 pt-2 sm:gap-2">
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          {TABS.map(({ view, icon: Icon, label }) => (
            <Button
              key={view}
              type="button"
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleTabClick(view)
              }}
              className={cn(
                "h-9 w-9 rounded-xl border-border/80 bg-background/90 shadow-md backdrop-blur-sm transition-all hover:scale-105 hover:bg-primary/10 hover:border-primary/30 hover:shadow-lg sm:h-10 sm:w-10 [&_svg]:size-4 sm:[&_svg]:size-[18px]",
                activeView === view && "bg-primary/10 border-primary/30 text-foreground"
              )}
              aria-label={activeView === view ? `${label} (click to go back)` : label}
              title={activeView === view ? `Back to vehicle` : label}
            >
              <Icon className={cn(
                "size-4 sm:size-[18px]",
                activeView === view ? "text-foreground" : "text-muted-foreground"
              )} />
            </Button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-1 flex-col overflow-hidden p-3 pt-14">
        {activeView === "details" ? (
          <VehicleDetailsContent
            key="details"
            vehicle={vehicle}
            onUpdate={onUpdate}
            onCancel={onFlipBack}
          />
        ) : activeView === "financing" ? (
          <VehicleFinancingContent
            key="financing"
            vehicle={vehicle}
            onUpdate={onUpdate}
            onDone={onFlipBack}
          />
        ) : (
          <VehicleDetailContent
            key={activeView}
            vehicle={vehicle}
            type={activeView}
            onUpdate={onUpdate}
          />
        )}
      </div>
    </div>
  )
})

VehicleCardBackFace.displayName = "VehicleCardBackFace"
