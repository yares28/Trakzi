"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { IconCirclePlusFilled, IconUpload } from "@tabler/icons-react"
import React, { useContext, useRef } from "react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { TransactionDialogContext } from "@/components/transaction-dialog-provider"

// Use a more flexible icon type that accepts any component
type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement> & { className?: string }> | React.ComponentType<React.ComponentProps<"div">>

export function NavMain({
  items,
  onQuickCreate,
}: {
  items: {
    title: string
    url: string
    icon?: IconComponent
  }[]
  onQuickCreate?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const dialogContext = useContext(TransactionDialogContext)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleQuickCreate = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // If onQuickCreate is provided (for backward compatibility), use it
    // Otherwise use the global dialog if available
    if (onQuickCreate) {
      onQuickCreate()
    } else if (dialogContext) {
      dialogContext.openDialog()
    }
  }

  const handleUploadClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const fileName = file.name.toLowerCase()
    const fileType = file.type.toLowerCase()

    // Check if it's a receipt (image or PDF from receipt context)
    const isImage =
      fileType.startsWith("image/") ||
      fileName.endsWith(".png") ||
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".jpeg") ||
      fileName.endsWith(".webp") ||
      fileName.endsWith(".heic") ||
      fileName.endsWith(".heif")

    const isPDF = fileType === "application/pdf" || fileName.endsWith(".pdf")
    const isCSV = fileType === "text/csv" || fileName.endsWith(".csv")
    const isExcel =
      fileType.includes("spreadsheet") ||
      fileName.endsWith(".xlsx") ||
      fileName.endsWith(".xls")

    // Route based on file type:
    // Images -> always receipts -> fridge
    // CSV/Excel -> always spending -> analytics  
    // PDF -> prefer receipts -> fridge
    if (isImage || (isPDF && !isCSV && !isExcel)) {
      // Receipt files go to fridge
      console.log('[NavMain] Routing to fridge for receipt:', file.name);

      // Create blob URL (survives navigation)
      const blobUrl = URL.createObjectURL(file);

      // Store metadata in sessionStorage
      sessionStorage.setItem('pendingUploadBlobUrl', blobUrl);
      sessionStorage.setItem('pendingUploadFileName', file.name);
      sessionStorage.setItem('pendingUploadFileType', file.type);
      sessionStorage.setItem('pendingUploadFileSize', file.size.toString());
      sessionStorage.setItem('pendingUploadTargetPage', 'fridge');

      router.push("/fridge")
    } else if (isCSV || isExcel || isPDF) {
      // Spending files go to analytics
      console.log('[NavMain] Routing to analytics for CSV/Excel:', file.name, {
        isCSV,
        isExcel,
        isPDF,
        fileType: file.type
      });

      // Create blob URL that survives navigation
      const blobUrl = URL.createObjectURL(file);

      // Store blob URL and metadata in sessionStorage
      sessionStorage.setItem('pendingUploadBlobUrl', blobUrl);
      sessionStorage.setItem('pendingUploadFileName', file.name);
      sessionStorage.setItem('pendingUploadFileType', file.type);
      sessionStorage.setItem('pendingUploadFileSize', file.size.toString());
      sessionStorage.setItem('pendingUploadTargetPage', 'analytics');

      console.log('[NavMain] Created blob URL and stored metadata:', {
        hasBlobUrl: !!blobUrl,
        fileName: file.name,
        targetPage: 'analytics'
      });

      router.push("/analytics")
    }

    // Reset the input so the user can upload the same file again
    e.target.value = ""
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip="Quick Create"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
              onClick={handleQuickCreate}
            >
              <IconCirclePlusFilled />
              <span>Quick Create</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <SidebarMenuButton
              tooltip="Upload File"
              className="text-white hover:text-white active:text-white min-w-8 duration-200 ease-linear"
              style={{ backgroundColor: '#5f8787' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4a6a6a'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#5f8787'}
              onClick={handleUploadClick}
            >
              <IconUpload />
              <span>Upload</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = pathname === item.url || (item.url !== "/" && pathname?.startsWith(item.url))
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton tooltip={item.title} isActive={isActive} asChild>
                  <Link href={item.url} prefetch={false}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
