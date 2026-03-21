"use client"

import FeaturePage from "@/components/feature-page"

export default function SplitExpensesPage() {
  return (
    <FeaturePage
      locale="en"
      headline="Split Bills. Share Costs. Stay Friends."
      subheadline="Shared Expenses"
      heroDescription="Create a room with your roommates, partner, or travel group. Add shared expenses, split them any way you like, and see who owes whom — no spreadsheets, no awkward conversations."
      ctaText="Create a Room Free"
      statsValue="Any split"
      statsLabel="Equal, percentage, or custom"
      benefits={[
        {
          title: "Instant Balance Tracking",
          description:
            "Every expense you add updates the group balance in real time. Everyone sees exactly who owes what — no confusion, no arguments.",
        },
        {
          title: "Flexible Splitting",
          description:
            "Split equally, by percentage, or by custom amounts. Perfect for shared rent, groceries, utilities, or group trips.",
        },
        {
          title: "Multiple Rooms",
          description:
            "Create separate rooms for different groups — one for your apartment, one for your trip, one for shared subscriptions.",
        },
        {
          title: "Combined With Personal Finance",
          description:
            "Unlike standalone split apps, Trakzi also tracks your personal expenses. See your full financial picture in one place.",
        },
      ]}
      steps={[
        {
          step: 1,
          title: "Create a Room",
          description:
            "Start a room and invite friends or roommates by sharing a link or code. Everyone joins in seconds.",
        },
        {
          step: 2,
          title: "Add Expenses",
          description:
            "Log shared expenses as they happen — rent, groceries, utilities, dinners. Set how to split each one.",
        },
        {
          step: 3,
          title: "Settle Up",
          description:
            "Trakzi calculates running balances and simplifies debts. See who owes whom and mark payments as settled.",
        },
      ]}
      relatedPages={[
        { href: "/receipt-scanner", label: "Receipt Scanner" },
        { href: "/grocery-tracker", label: "Grocery Tracker" },
        { href: "/csv-import", label: "CSV Import" },
      ]}
    />
  )
}
