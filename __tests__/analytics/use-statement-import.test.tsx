import { act } from "react"
import { createRoot, type Root } from "react-dom/client"

import { useStatementImport } from "@/app/analytics/_page/hooks/useStatementImport"

function StatementImportHarness() {
  const statementImport = useStatementImport({
    refreshAnalyticsData: () => undefined,
  })

  return (
    <>
      <div data-testid="upload-open">{String(statementImport.isUploadDialogOpen)}</div>
      <div data-testid="pending-files">{statementImport.pendingFiles.map((file) => file.name).join(",")}</div>
    </>
  )
}

describe("useStatementImport", () => {
  let container: HTMLDivElement
  let root: Root

  beforeAll(() => {
    ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  })

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    delete (window as any).__pendingUploadFile
    delete (window as any).__pendingUploadTargetPage
    delete (window as any).__pendingUploadNeedsDetection
  })

  it("opens the analytics upload dialog when a pending upload arrives on the same page", async () => {
    await act(async () => {
      root.render(<StatementImportHarness />)
    })

    const file = new File(["date,amount\n2026-04-14,12.50"], "april-statement.csv", { type: "text/csv" })

    await act(async () => {
      ;(window as any).__pendingUploadFile = file
      ;(window as any).__pendingUploadTargetPage = "analytics"
      window.dispatchEvent(new CustomEvent("trakzi:pending-upload"))
    })

    expect(container.querySelector("[data-testid='upload-open']")?.textContent).toBe("true")
    expect(container.querySelector("[data-testid='pending-files']")?.textContent).toContain("april-statement.csv")
  })
})
