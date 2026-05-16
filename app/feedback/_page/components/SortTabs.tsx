"use client"

import { memo } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { SortKey } from "../types"

type Props = {
  value: SortKey
  onChange: (value: SortKey) => void
}

export const SortTabs = memo(function SortTabs({ value, onChange }: Props) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as SortKey)}>
      <TabsList>
        <TabsTrigger value="top">Top</TabsTrigger>
        <TabsTrigger value="new">New</TabsTrigger>
        <TabsTrigger value="trending">Trending</TabsTrigger>
      </TabsList>
    </Tabs>
  )
})

SortTabs.displayName = "SortTabs"
