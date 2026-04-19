// components/onboarding/tour-content.ts

export interface TourStep {
  title: string
  description: string
  /** Optional image/GIF path relative to /public */
  image?: string
  /** Optional video clip path relative to /public */
  video?: string
  /** Optional poster image for the video */
  poster?: string
}

export interface PageTour {
  pageId: string
  steps: TourStep[]
}

// Only pages with real walkthrough media (images/videos) are listed here.
// Pages without media intentionally omit the tour so we never show empty
// placeholder slides.
const TOUR_PATHNAME_TO_PAGE_ID = {
  "/home": "home",
  "/analytics": "analytics",
  "/fridge": "fridge",
} as const

export type TourPageId = (typeof TOUR_PATHNAME_TO_PAGE_ID)[keyof typeof TOUR_PATHNAME_TO_PAGE_ID]

export const PAGE_TOURS: Record<string, PageTour | undefined> = {
  home: {
    pageId: "home",
    steps: [
      {
        title: "Welcome to your dashboard",
        description: "This is your financial command center. All your key metrics are here at a glance.",
        image: "/walkthrough/HOME1.jpeg",
      },
      {
        title: "Your charts",
        description: "Charts update automatically as you add data. Drag and resize them to customize your layout.",
        video: "/walkthrough/HOME2.mp4",
      },
      {
        title: "Filter by date",
        description: "Use the date filter at the top to zoom in on any time period — last month, last year, or custom.",
        video: "/walkthrough/HOME3.mp4",
      },
      {
        title: "Add your first data",
        description: "Upload a bank statement CSV or scan a receipt to start seeing your spending insights.",
        video: "/walkthrough/HOME4.mp4",
      },
    ],
  },
  analytics: {
    pageId: "analytics",
    steps: [
      {
        title: "Your spending breakdown",
        description: "Analytics gives you a deep dive into where your money goes, broken down by category.",
        video: "/walkthrough/ANALYTICS1.mp4",
      },
      {
        title: "Filter by category",
        description: "Click any category chip to focus the charts on a specific spending area.",
        video: "/walkthrough/ANALYTICS2.mp4",
      },
    ],
  },
  fridge: {
    pageId: "fridge",
    steps: [
      {
        title: "Grocery & receipt tracking",
        description: "The Fridge section tracks your grocery spending. Upload receipts to get item-level insights.",
        image: "/walkthrough/FRIDGE1.jpeg",
      },
      {
        title: "Upload a receipt",
        description: "Upload a grocery receipt image or PDF. Our AI reads and categorizes each item automatically.",
        image: "/walkthrough/FRIDGE2.jpeg",
      },
      {
        title: "See your food trends",
        description: "Charts here show which categories you spend most on and how your grocery bill changes over time.",
        video: "/walkthrough/FRIDGE3.mp4",
      },
    ],
  },
}

export function getTourPageIdFromPathname(pathname: string | null | undefined): TourPageId | null {
  if (!pathname) return null

  const normalizedPath = pathname !== "/" ? pathname.replace(/\/+$/, "") : pathname

  return TOUR_PATHNAME_TO_PAGE_ID[normalizedPath as keyof typeof TOUR_PATHNAME_TO_PAGE_ID] ?? null
}

// Only include tasks that correspond to pages with real walkthrough media.
// Keeping image-less pages out ensures every task lines up with a visual tour.
export const CHECKLIST_ITEMS = [
  { id: "upload_statement", label: "Import your first bank statement" },
  { id: "upload_receipt", label: "Upload a grocery receipt" },
  { id: "explore_analytics", label: "Explore the Analytics page" },
  { id: "explore_fridge", label: "Explore the Fridge page" },
] as const

export type ChecklistItemId = typeof CHECKLIST_ITEMS[number]["id"]
