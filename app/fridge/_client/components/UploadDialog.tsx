import { Dialog, DialogContent } from "@/components/ui/dialog"
import { FileUpload01, type FileUpload01Lead } from "@/components/file-upload-01"

type UploadDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  files: File[]
  fileProgresses: Record<string, number>
  isUploading: boolean
  error: string | null
  projectName: string
  onProjectNameChange: (value: string) => void
  projectLead?: FileUpload01Lead | null
  onFilesChange: (files: File[]) => void
  onCancel: () => void
  onContinue: () => void
}

export function UploadDialog({
  open,
  onOpenChange,
  files,
  fileProgresses,
  isUploading,
  error,
  projectName,
  onProjectNameChange,
  projectLead,
  onFilesChange,
  onCancel,
  onContinue,
}: UploadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 border-0 bg-transparent shadow-none sm:max-w-[95vw] md:max-w-[720px]">
        <FileUpload01
          files={files}
          fileProgresses={fileProgresses}
          isBusy={isUploading}
          error={error}
          projectName={projectName}
          onProjectNameChange={onProjectNameChange}
          projectLead={projectLead}
          onFilesChange={onFilesChange}
          onCancel={onCancel}
          onContinue={onContinue}
          continueLabel={isUploading ? "Uploading..." : "Upload receipts"}
        />
      </DialogContent>
    </Dialog>
  )
}
