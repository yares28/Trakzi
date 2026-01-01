import { useMemo } from "react"
import { useUser } from "@clerk/nextjs"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { FileUploadStatement, type FileUploadStatementLead } from "@/components/file-upload-statement"

type StatementUploadDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  droppedFile: File | null
  isParsing: boolean
  parsingProgress: number
  parseError: string | null
  projectName: string
  onProjectNameChange: (name: string) => void
  onFilesChange: (files: File[]) => void
  onCancel: () => void
  onContinue: () => void
}

export function StatementUploadDialog({
  open,
  onOpenChange,
  droppedFile,
  isParsing,
  parsingProgress,
  parseError,
  projectName,
  onProjectNameChange,
  onFilesChange,
  onCancel,
  onContinue,
}: StatementUploadDialogProps) {
  const { user, isLoaded: isUserLoaded } = useUser()

  const files = droppedFile ? [droppedFile] : []
  const fileProgresses = droppedFile ? { [`${droppedFile.name}::${droppedFile.size}::${droppedFile.lastModified}`]: parsingProgress } : {}

  const parsingStatus = isParsing ? `Parsing file... ${Math.round(parsingProgress)}%` : null
  const accept =
    ".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp,.heic,.heif,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf,image/png,image/jpeg,image/webp,image/heic,image/heif"

  const projectLead = useMemo<FileUploadStatementLead | null>(() => {
    if (!isUserLoaded || !user) return null
    return {
      id: user.id,
      name: user.fullName || user.username || user.primaryEmailAddress?.emailAddress || "You",
      imageUrl: user.imageUrl,
    }
  }, [isUserLoaded, user])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 border-0 bg-transparent shadow-none sm:max-w-[95vw] md:max-w-[720px]">
        <FileUploadStatement
          files={files}
          fileProgresses={fileProgresses}
          isBusy={isParsing}
          error={parseError}
          parsingStatus={parsingStatus}
          projectName={projectName}
          onProjectNameChange={onProjectNameChange}
          projectLead={projectLead}
          accept={accept}
          onFilesChange={onFilesChange}
          onCancel={onCancel}
          onContinue={onContinue}
          continueLabel={isParsing ? "Parsing..." : "Parse file"}
        />
      </DialogContent>
    </Dialog>
  )
}
