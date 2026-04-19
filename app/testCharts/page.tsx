import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CSSProperties } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { TestLabWorkbench } from "@/components/test-charts/test-lab-workbench";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

async function loadPrompt(promptSegments: string[]) {
  const promptPath = path.join(process.cwd(), ...promptSegments);

  const markdown = await readFile(promptPath, "utf8");
  const promptMatch = markdown.match(/```(?:md)?\n([\s\S]*?)```/);

  return (promptMatch?.[1] ?? markdown).trim();
}

export default async function TestChartsPage() {
  const [
    chartPrompt,
    chartResolutionPrompt,
    featurePrompt,
    featureResolutionPrompt,
  ] = await Promise.all([
    loadPrompt(["docs", "chart generation", "ONE_CLICK_PROMPT.md"]),
    loadPrompt(["docs", "chart generation", "SHORTLIST_RESOLUTION_PROMPT.md"]),
    loadPrompt(["docs", "feature generation", "ONE_CLICK_FEATURE_PROMPT.md"]),
    loadPrompt([
      "docs",
      "feature generation",
      "SHORTLIST_RESOLUTION_PROMPT.md",
    ]),
  ]);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72 - 15px)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <main className="flex-1 space-y-8 p-4 pt-0 lg:p-6 lg:pt-2">
          <TestLabWorkbench
            chartPrompts={{
              generation: chartPrompt,
              resolution: chartResolutionPrompt,
            }}
            featurePrompts={{
              generation: featurePrompt,
              resolution: featureResolutionPrompt,
            }}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
