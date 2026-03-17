// components/onboarding/tour-content.ts

export interface TourStep {
  title: string
  description: string
  /** Optional image/GIF path relative to /public */
  image?: string
}

export interface PageTour {
  pageId: string
  steps: TourStep[]
}

export const PAGE_TOURS: Record<string, PageTour> = {
  home: {
    pageId: "home",
    steps: [
      {
        title: "Welcome to your dashboard",
        description: "This is your financial command center. All your key metrics are here at a glance.",
      },
      {
        title: "Your charts",
        description: "Charts update automatically as you add data. Drag and resize them to customize your layout.",
      },
      {
        title: "Filter by date",
        description: "Use the date filter at the top to zoom in on any time period — last month, last year, or custom.",
      },
      {
        title: "Add your first data",
        description: "Upload a bank statement CSV or scan a receipt to start seeing your spending insights.",
      },
    ],
  },
  analytics: {
    pageId: "analytics",
    steps: [
      {
        title: "Your spending breakdown",
        description: "Analytics gives you a deep dive into where your money goes, broken down by category.",
      },
      {
        title: "Filter by category",
        description: "Click any category chip to focus the charts on a specific spending area.",
      },
      {
        title: "Adjust the date range",
        description: "Narrow or widen the time window to compare spending across different periods.",
      },
    ],
  },
  fridge: {
    pageId: "fridge",
    steps: [
      {
        title: "Grocery & receipt tracking",
        description: "The Fridge section tracks your grocery spending. Upload receipts to get item-level insights.",
      },
      {
        title: "Upload a receipt",
        description: "Take a photo of any grocery receipt. Our AI reads and categorizes each item automatically.",
      },
      {
        title: "See your food trends",
        description: "Charts here show which categories you spend most on and how your grocery bill changes over time.",
      },
    ],
  },
  savings: {
    pageId: "savings",
    steps: [
      {
        title: "Track your savings",
        description: "Savings shows how much you're setting aside each month and your progress toward goals.",
      },
      {
        title: "Monitor progress",
        description: "Charts track your savings rate over time so you can spot when you're ahead or behind.",
      },
      {
        title: "Set a savings goal",
        description: "Define a target amount and a deadline. Trakzi tracks your progress automatically.",
      },
    ],
  },
  pockets: {
    pageId: "pockets",
    steps: [
      {
        title: "Budget pockets",
        description: "Pockets are virtual envelopes for your spending categories — like a digital cash budgeting system.",
      },
      {
        title: "Allocate your budget",
        description: "Set a monthly limit per pocket. The charts show how much you've used versus what's left.",
      },
      {
        title: "Create your first pocket",
        description: "Hit the + button to create a pocket for any spending category that matters to you.",
      },
    ],
  },
  "data-library": {
    pageId: "data-library",
    steps: [
      {
        title: "All your transactions",
        description: "The Data Library is a searchable, filterable table of every transaction you've imported.",
      },
      {
        title: "Search and filter",
        description: "Use the search bar and filters to find any transaction by name, category, date, or amount.",
      },
      {
        title: "Edit or delete",
        description: "Click any row to edit transaction details, fix a category, or remove a duplicate.",
      },
    ],
  },
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
