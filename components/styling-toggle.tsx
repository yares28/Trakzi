"use client"

import * as React from "react"
import { IconPalette } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function StylingToggle() {
  const [theme, setTheme] = React.useState<"dark" | "colored">("dark")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <IconPalette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle styling</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("colored")}>
          Colored
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}



