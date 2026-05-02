import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="relative flex h-screen w-full items-center justify-center">
      <div className="pointer-events-none fixed inset-0" style={{ background: "radial-gradient(ellipse 50% 50% at 50% 50%, oklch(0.6716 0.1368 48.513 / 0.07) 0%, transparent 70%)" }} />
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  )
}
