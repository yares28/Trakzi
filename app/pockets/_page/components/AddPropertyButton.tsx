"use client"

import { memo } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"

interface AddPropertyButtonProps {
  onClick: () => void
  disabled?: boolean
}

export const AddPropertyButton = memo(function AddPropertyButton({
  onClick,
  disabled = false,
}: AddPropertyButtonProps) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={disabled}>
      <Plus className="mr-2 h-4 w-4" />
      Add Property
    </Button>
  )
})

AddPropertyButton.displayName = "AddPropertyButton"
