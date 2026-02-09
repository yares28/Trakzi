"use client"

import { memo } from "react"
import {
  Fuel,
  Wrench,
  Shield,
  FileCheck,
  Banknote,
} from "lucide-react"

import type { VehicleData } from "@/lib/types/pockets"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { VehicleDetailContent } from "@/app/pockets/_page/components/VehicleDetailContent"
import { VehicleFinancingContent } from "@/app/pockets/_page/components/VehicleFinancingContent"

export type BackFaceView =
  | "fuel"
  | "maintenance"
  | "insurance"
  | "certificate"
  | "financing"

const TABS: { view: BackFaceView; icon: typeof Fuel; label: string }[] = [
  { view: "fuel", icon: Fuel, label: "Fuel" },
  { view: "maintenance", icon: Wrench, label: "Maintenance" },
  { view: "insurance", icon: Shield, label: "Insurance" },
  { view: "certificate", icon: FileCheck, label: "Certificate" },
  { view: "financing", icon: Banknote, label: "Financing" },
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
    <div className="flex h-full flex-col">
      {/* Tab strip — clicking the active tab flips back to SVG */}
      <div className="flex items-center justify-center gap-1 border-b px-2 py-1.5">
        {TABS.map(({ view, icon: Icon, label }) => (
          <Button
            key={view}
            type="button"
            variant={activeView === view ? "default" : "ghost"}
            size="icon-sm"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleTabClick(view)
            }}
            className={cn(
              "h-8 w-8 rounded-lg transition-all",
              activeView === view
                ? "shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-label={activeView === view ? `${label} (click to go back)` : label}
            title={activeView === view ? `Back to vehicle` : label}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex flex-1 flex-col overflow-hidden p-3">
        {activeView === "financing" ? (
          <VehicleFinancingContent
            key="financing"
            vehicle={vehicle}
            onUpdate={onUpdate}
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
