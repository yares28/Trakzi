"use client"

import { memo } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"

interface AddCountryButtonProps {
    onClick: () => void
    disabled?: boolean
}

export const AddCountryButton = memo(function AddCountryButton({
    onClick,
    disabled = false,
}: AddCountryButtonProps) {
    return (
        <Button
            variant="outline"
            size="sm"
            onClick={onClick}
            disabled={disabled}
        >
            <Plus className="mr-2 h-4 w-4" />
            Add Country
        </Button>
    )
})

AddCountryButton.displayName = "AddCountryButton"
