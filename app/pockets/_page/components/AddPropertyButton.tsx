"use client"

import { memo } from "react"
import { Plus, Home, Key } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AddPropertyButtonProps {
  onAddOwned: () => void
  onAddRented: () => void
  disabled?: boolean
}

export const AddPropertyButton = memo(function AddPropertyButton({
  onAddOwned,
  onAddRented,
  disabled = false,
}: AddPropertyButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Plus className="mr-2 h-4 w-4" />
          Add Property
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={onAddOwned}>
          <Home className="mr-2 h-4 w-4" />
          <div>
            <div className="font-medium">Owned Property</div>
            <div className="text-xs text-muted-foreground">You own or have a mortgage</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAddRented}>
          <Key className="mr-2 h-4 w-4" />
          <div>
            <div className="font-medium">Rented Property</div>
            <div className="text-xs text-muted-foreground">You pay rent (tenant)</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})

AddPropertyButton.displayName = "AddPropertyButton"
