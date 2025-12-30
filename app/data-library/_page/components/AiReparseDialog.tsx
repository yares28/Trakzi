import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type AiReparseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  aiReparseContext: string
  onContextChange: (value: string) => void
  onConfirm: () => void
  isAiReparsing: boolean
  hasFile: boolean
}

export function AiReparseDialog({
  open,
  onOpenChange,
  aiReparseContext,
  onContextChange,
  onConfirm,
  isAiReparsing,
  hasFile,
}: AiReparseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Reparse with AI</DialogTitle>
          <DialogDescription>
            Add any context that helps the parser (bank name, column meanings, or date format).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="ai-reparse-context-data-library">
            Context (optional)
          </label>
          <textarea
            id="ai-reparse-context-data-library"
            className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Example: Date column is DD/MM/YY, amounts are negative for debits."
            value={aiReparseContext}
            onChange={(event) => onContextChange(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isAiReparsing || !hasFile}
          >
            {isAiReparsing ? "Reparsing..." : "Reparse with AI"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
