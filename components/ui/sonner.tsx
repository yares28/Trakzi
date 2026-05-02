"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: "rounded-xl border shadow-sm font-sans text-sm",
          error: "!border-[oklch(0.6368_0.2078_25.3313/0.35)] !bg-[oklch(0.6368_0.2078_25.3313/0.06)]",
          success: "!border-green-200 !bg-green-50/70 dark:!border-green-800/40 dark:!bg-green-950/30",
          warning: "!border-amber-200 !bg-amber-50/70 dark:!border-amber-800/40 dark:!bg-amber-950/30",
          info: "!border-blue-200 !bg-blue-50/70 dark:!border-blue-800/40 dark:!bg-blue-950/30",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "12px",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
