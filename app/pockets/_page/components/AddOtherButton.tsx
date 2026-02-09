"use client"

import { memo } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"

interface AddOtherButtonProps {
  onClick: () => void
  disabled?: boolean
}

export const AddOtherButton = memo(function AddOtherButton({
  onClick,
  disabled = false,
}: AddOtherButtonProps) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={disabled}>
      <Plus className="mr-2 h-4 w-4" />
      Add Other
    </Button>
  )
})

AddOtherButton.displayName = "AddOtherButton"
