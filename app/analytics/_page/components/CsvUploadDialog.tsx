import { Dialog, DialogContent } from "@/components/ui/dialog"
import { FileUploadCsv } from "@/components/file-upload-csv"

type CsvUploadDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  droppedFile: File | null
  isParsing: boolean
  parsingProgress: number
  parseError: string | null
  onFilesChange: (files: File[]) => void
  onCancel: () => void
  onContinue: () => void
}

export function CsvUploadDialog({
  open,
  onOpenChange,
  droppedFile,
  isParsing,
  parsingProgress,
  parseError,
  onFilesChange,
  onCancel,
  onContinue,
}: CsvUploadDialogProps) {
  const files = droppedFile ? [droppedFile] : []
  const fileProgresses = droppedFile ? { [`${droppedFile.name}::${droppedFile.size}::${droppedFile.lastModified}`]: parsingProgress } : {}

  const parsingStatus = isParsing ? `Parsing file... ${Math.round(parsingProgress)}%` : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 border-0 bg-transparent shadow-none sm:max-w-[95vw] md:max-w-[720px]">
        <FileUploadCsv
          files={files}
          fileProgresses={fileProgresses}
          isBusy={isParsing}
          error={parseError}
          parsingStatus={parsingStatus}
          onFilesChange={onFilesChange}
          onCancel={onCancel}
          onContinue={onContinue}
          continueLabel={isParsing ? "Parsing..." : "Parse file"}
        />
      </DialogContent>
    </Dialog>
  )
}
