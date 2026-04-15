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

const TOUR_PATHNAME_TO_PAGE_ID = {
  "/home": "home",
  "/analytics": "analytics",
  "/fridge": "fridge",
  "/savings": "savings",
  "/pockets": "pockets",
  "/friends": "friends",
  "/data-library": "data-library",
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
  savings: {
    pageId: "savings",
    steps: [
      {
        title: "Track your savings",
        description: "Savings shows how much you're setting aside each month, how your savings rate changes, and how close you are to your goals.",
      },
      {
        title: "Monitor progress",
        description: "Charts track your savings rate and net worth over time so you can spot when you're ahead or behind.",
      },
      {
        title: "Set goals and track debt",
        description: "Create savings or pocket goals, switch into the debt view when you need it, and follow progress across related parts of the app.",
      },
    ],
  },
  pockets: {
    pageId: "pockets",
    steps: [
      {
        title: "Track trips and assets",
        description: "Pockets help you see what your last trip cost you and what your vehicles, homes, or other assets cost over time.",
      },
      {
        title: "Track costs and loans",
        description: "Break each pocket down into the tabs that matter, like mortgage, rent, utilities, fuel, maintenance, insurance, financing, parking, and fees.",
      },
      {
        title: "Create your first pocket",
        description: "Add a travel country, vehicle, owned or rented property, or other pocket to organize the costs you want to track.",
      },
    ],
  },
  friends: {
    pageId: "friends",
    steps: [
      {
        title: "Your social finance hub",
        description: "The Friends section lets you compare privacy-safe scores, share rooms, and join challenges to build better financial habits together.",
      },
      {
        title: "Rankings",
        description: "See how your score stacks up against friends. Rankings update as activity changes without exposing raw dollar amounts.",
      },
      {
        title: "Rooms",
        description: "Create a shared room with roommates or travel companions. Share full transactions, specific receipt items, or statement expenses, then split and settle up in one place.",
      },
      {
        title: "Challenges",
        description: "Create private or public challenge groups with friends or strangers and track everyone's progress in real time.",
      },
    ],
  },
  "data-library": {
    pageId: "data-library",
    steps: [
      {
        title: "All your transactions",
        description: "The Data Library is a searchable, editable table of every transaction you've imported.",
      },
      {
        title: "Search and filter",
        description: "Use the search bar and filters to find any transaction by name, category, date, or amount, then update categories when something needs fixing.",
      },
      {
        title: "Edit or delete",
        description: "Click any row to edit transaction details, change its category, or delete duplicates and transactions you no longer want to keep.",
      },
    ],
  },
}

export function getTourPageIdFromPathname(pathname: string | null | undefined): TourPageId | null {
  if (!pathname) return null

  const normalizedPath = pathname !== "/" ? pathname.replace(/\/+$/, "") : pathname

  return TOUR_PATHNAME_TO_PAGE_ID[normalizedPath as keyof typeof TOUR_PATHNAME_TO_PAGE_ID] ?? null
}

export const CHECKLIST_ITEMS = [
  { id: "upload_statement", label: "Import your first bank statement" },
  { id: "upload_receipt", label: "Upload a grocery receipt" },
  { id: "explore_analytics", label: "Explore the Analytics page" },
  { id: "explore_fridge", label: "Explore the Fridge page" },
  { id: "explore_savings", label: "Explore the Savings page" },
  { id: "explore_pockets", label: "Explore the Pockets page" },
] as const

export type ChecklistItemId = typeof CHECKLIST_ITEMS[number]["id"]
