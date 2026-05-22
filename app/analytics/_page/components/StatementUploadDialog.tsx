import { useMemo } from "react"
import { useUser } from "@clerk/nextjs"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FileUploadStatement, type FileUploadStatementLead } from "@/components/file-upload-statement"

type StatementUploadDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  pendingFiles: File[]
  isParsing: boolean
  parsingProgress: number
  parseError: string | null
  projectName: string
  onProjectNameChange: (name: string) => void
  onFilesChange: (files: File[]) => void
  onCancel: () => void
  onContinue: () => void
  accountId?: string | null
  onAccountChange?: (id: string | null) => void
}

export function StatementUploadDialog({
  open,
  onOpenChange,
  pendingFiles,
  isParsing,
  parsingProgress,
  parseError,
  projectName,
  onProjectNameChange,
  onFilesChange,
  onCancel,
  onContinue,
  accountId,
  onAccountChange,
}: StatementUploadDialogProps) {
  const { user, isLoaded: isUserLoaded } = useUser()

  const currentFile = pendingFiles[0] ?? null
  const fileProgresses = currentFile
    ? { [`${currentFile.name}::${currentFile.size}::${currentFile.lastModified}`]: parsingProgress }
    : {}

  const parsingStatus = isParsing ? `Parsing file... ${Math.round(parsingProgress)}%` : null

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
        <DialogHeader className="sr-only">
          <DialogTitle>Upload statement</DialogTitle>
          <DialogDescription>Upload one or more bank statements to parse transactions.</DialogDescription>
        </DialogHeader>
        <FileUploadStatement
          files={pendingFiles}
          fileProgresses={fileProgresses}
          isBusy={isParsing}
          error={parseError}
          parsingStatus={parsingStatus}
          projectName={projectName}
          onProjectNameChange={onProjectNameChange}
          projectLead={projectLead}
          accountId={accountId}
          onAccountChange={onAccountChange}
          onFilesChange={onFilesChange}
          onCancel={onCancel}
          onContinue={onContinue}
          continueLabel={isParsing ? "Parsing..." : pendingFiles.length > 1 ? `Parse ${pendingFiles.length} files` : "Parse file"}
        />
      </DialogContent>
    </Dialog>
  )
}
