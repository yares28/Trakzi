"use client"

import { memo } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"

interface AddVehicleButtonProps {
  onClick: () => void
  disabled?: boolean
}

export const AddVehicleButton = memo(function AddVehicleButton({
  onClick,
  disabled = false,
}: AddVehicleButtonProps) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={disabled}>
      <Plus className="mr-2 h-4 w-4" />
      Add Vehicle
    </Button>
  )
})

AddVehicleButton.displayName = "AddVehicleButton"
