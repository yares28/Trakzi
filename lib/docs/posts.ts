import type { BlogPost } from "./types"

export const defaultAuthor = {
  name: "Trakzi Team",
  role: "Documentation",
  bio: "The Trakzi documentation team writes guides to help you get the most out of budgeting, expense tracking, and shared expense management.",
}

export const posts: BlogPost[] = [
  {
    slug: "how-to-budget-your-money",
    title: "How to Budget Your Money",
    description:
      "A step-by-step guide to creating a personal budget. Learn the 50/30/20 rule, zero-based budgeting, and envelope method — and how to choose the right one for you.",
    date: "2026-03-15",
    author: defaultAuthor,
    readingTime: "8 min read",
    tags: ["budgeting", "guide"],
    relatedSlugs: ["how-to-track-expenses", "grocery-budget-tips"],
    content: `
## Overview

A budget is a plan for your money. Without one, spending happens by accident. This guide walks you through creating a budget that works — step by step.

**What you'll need:**
- Your net monthly income (after tax)
- Last month's bank transactions (export as CSV from your bank)
- 20 minutes

## Step 1: Know Your Income

Use your **net income** — what actually arrives in your bank account. If income varies, use the lowest of the last 3 months.

| Income Type | What to Use |
|---|---|
| Fixed salary | Exact net amount |
| Freelance / variable | Lowest of last 3 months |
| Multiple sources | Sum of all sources (use lowest month) |

## Step 2: Track Current Spending

Before setting limits, see where your money actually goes. Export your bank transactions as a CSV and upload them to [Trakzi](/). Transactions are auto-categorized instantly.

**Why this matters:** Most people underestimate spending by 20-30%. Data beats guessing.

## Step 3: Choose a Method

### 50/30/20 Rule

Split income into three buckets:
- **50%** — Needs (rent, groceries, utilities, insurance)
- **30%** — Wants (dining out, entertainment, subscriptions)
- **20%** — Savings and debt repayment

Best for: Beginners. Simple, flexible, no tracking per category required.

### Zero-Based Budget

Assign every euro a category. Income minus all allocations = zero.

Best for: People who want full control. Requires weekly tracking.

### Envelope Method

Allocate fixed amounts per category at month start. When an envelope is empty, stop spending in that category.

Best for: Overspenders who need hard limits.

## Step 4: Set Limits

Look at your tracked spending (Step 2), then set category limits:

- Be realistic — if you spend €400/month on groceries, don't budget €200
- Add a 5-10% buffer for unexpected costs
- Automate savings — transfer to savings on payday, before budgeting the rest

## Step 5: Review Weekly

Set a recurring 10-minute check:

1. How much spent so far this month?
2. Any category over budget?
3. Adjust if needed

A budget is a living document, not a one-time setup.

## Common Mistakes

- **Too tight.** Leave room for enjoyment or you'll abandon it.
- **Ignoring irregular costs.** Divide annual expenses (insurance, subscriptions) by 12 and budget monthly.
- **No tracking.** A budget without tracking is just a wish list.
- **Giving up.** Bad months happen. Reset and continue.

## Next Steps

- [Track your expenses →](/docs/how-to-track-expenses)
- [Cut grocery spending →](/docs/grocery-budget-tips)
- [Create a free Trakzi account →](/sign-up)
    `,
  },
  {
    slug: "how-to-track-expenses",
    title: "How to Track Expenses",
    description:
      "Seven proven methods for tracking expenses — from pen and paper to AI-powered receipt scanning. Find the right method for your workflow.",
    date: "2026-03-10",
    author: defaultAuthor,
    readingTime: "6 min read",
    tags: ["expense tracking", "guide"],
    relatedSlugs: ["how-to-budget-your-money", "grocery-budget-tips"],
    content: `
## Overview

Expense tracking is the foundation of any financial plan. Without knowing where money goes, budgeting is guesswork.

This guide covers 7 methods, ranked from simplest to most comprehensive.

## Method 1: Notebook

Write down every purchase in a small notebook as it happens.

- **Setup time:** 0 minutes
- **Ongoing effort:** High (must remember to write)
- **Data quality:** Low (no totals, no charts)
- **Best for:** Trying tracking for the first time

## Method 2: Envelope System

Withdraw cash per category at month start. Put in labeled envelopes. When empty, stop spending.

- **Setup time:** 30 minutes
- **Ongoing effort:** Medium
- **Data quality:** Low (physical only)
- **Best for:** People who overspend and need hard limits

## Method 3: Spreadsheet

Create a Google Sheets or Excel file. Log date, amount, category for each purchase.

- **Setup time:** 15 minutes
- **Ongoing effort:** High (manual entry)
- **Data quality:** Medium (totals work, no charts unless you build them)
- **Best for:** Spreadsheet enthusiasts

## Method 4: Bank CSV Import

Export transactions from your bank as CSV. Upload to a tool like [Trakzi](/) that auto-categorizes and generates charts.

- **Setup time:** 5 minutes
- **Ongoing effort:** Low (export CSV monthly)
- **Data quality:** High (auto-categorized, 20+ chart types)
- **Best for:** Most people. Best balance of effort vs. insight.

## Method 5: Receipt Scanning

Photograph receipts. AI extracts store, date, total, and items automatically.

- **Setup time:** 2 minutes
- **Ongoing effort:** Low (snap photo after purchase)
- **Data quality:** High (captures cash purchases too)
- **Best for:** People who pay with cash regularly

## Method 6: Bank Account Linking

Connect your bank account to an app. Transactions sync automatically.

- **Setup time:** 10 minutes
- **Ongoing effort:** None
- **Data quality:** High
- **Best for:** People comfortable sharing bank credentials (limited bank support outside the US)

## Method 7: Hybrid (Recommended)

Combine CSV import (card transactions) + receipt scanning (cash purchases) in one tool.

- **Setup time:** 5 minutes
- **Ongoing effort:** Low
- **Data quality:** Highest (captures everything)
- **Best for:** Complete, accurate tracking

## Comparison

| Method | Setup | Effort | Data Quality | Captures Cash? |
|---|---|---|---|---|
| Notebook | None | High | Low | Yes |
| Envelopes | 30 min | Medium | Low | Yes |
| Spreadsheet | 15 min | High | Medium | Manual |
| CSV Import | 5 min | Low | High | No |
| Receipt Scan | 2 min | Low | High | Yes |
| Bank Link | 10 min | None | High | No |
| Hybrid | 5 min | Low | Highest | Yes |

## Getting Started

1. Export your last month's bank CSV
2. Upload to [Trakzi](/sign-up) — auto-categorization starts immediately
3. Scan any cash receipts you have
4. Review the generated charts

## Next Steps

- [Create a budget →](/docs/how-to-budget-your-money)
- [Track groceries specifically →](/docs/grocery-budget-tips)
- [Try Trakzi free →](/sign-up)
    `,
  },
  {
    slug: "split-bills-with-roommates",
    title: "How to Split Bills With Roommates",
    description:
      "A practical guide to splitting shared expenses fairly. Covers methods, tools, rules, and how to handle common situations with roommates or partners.",
    date: "2026-03-05",
    author: defaultAuthor,
    readingTime: "5 min read",
    tags: ["shared expenses", "guide"],
    relatedSlugs: ["how-to-budget-your-money", "how-to-track-expenses"],
    content: `
## Overview

Shared living means shared costs. Without a system, tracking who paid what becomes a source of conflict. This guide covers the rules, methods, and tools that make it fair.

## The 3 Rules

### 1. Decide Before Spending

Agree on how to split before someone pays. Don't assume — confirm.

### 2. Record Immediately

Log the expense the moment it happens. Memory fades within hours.

### 3. Settle Regularly

Don't let balances grow for months. Settle weekly or biweekly.

## Splitting Methods

### Equal Split

Everyone pays the same amount. Simplest approach.

**Best for:** Roommates with similar usage and income.

### Usage-Based Split

Split based on consumption. Bigger room = more rent. More showers = more water.

**Best for:** Groups where usage varies significantly.

### Income-Based Split

Higher earners pay proportionally more.

**Best for:** Couples with income differences.

### Itemized Split

Each person pays for exactly what they bought.

**Best for:** Grocery shopping with different dietary needs.

## What to Split

**Split these:**
- Rent
- Utilities (electricity, water, gas, internet)
- Shared groceries
- Household supplies
- Shared subscriptions
- Shared meals

**Don't split:**
- Personal groceries
- Personal subscriptions
- Clothing, personal items
- Solo meals

## Setting Up in Trakzi

1. Go to the Rooms section in [Trakzi](/sign-up)
2. Create a new room and name it (e.g., "Apartment")
3. Invite roommates via link or code
4. Add expenses as they happen — choose how to split each one
5. View running balances in real time

Each expense updates the group balance instantly. Everyone sees who owes what.

## Common Situations

**Someone moved in mid-month:** Prorate rent and fixed costs by days occupied.

**One person buys all groceries:** Add as a shared expense, split equally or by consumption.

**Shared streaming subscription:** Split equally — everyone benefits the same.

**Guest stays for a week:** The host covers or the guest contributes — decide upfront.

## Having the Money Conversation

1. Pick a calm moment — not during an argument
2. Be specific: "Let's agree on how we split groceries and utilities"
3. Write down the agreement
4. Use a tool to track (removes human error)
5. Review monthly

## Next Steps

- [Set up a shared room →](/sign-up)
- [Track your personal expenses →](/docs/how-to-track-expenses)
- [Budget your money →](/docs/how-to-budget-your-money)
    `,
  },
  {
    slug: "grocery-budget-tips",
    title: "How to Reduce Your Grocery Budget",
    description:
      "Practical tips to cut grocery spending by 25-35% without eating worse. Covers meal planning, store comparison, seasonal buying, and waste reduction.",
    date: "2026-02-28",
    author: defaultAuthor,
    readingTime: "7 min read",
    tags: ["grocery budget", "saving money", "guide"],
    relatedSlugs: ["how-to-budget-your-money", "how-to-track-expenses"],
    content: `
## Overview

Groceries typically consume 10-15% of household income. Cutting that by 30% saves €90-135/month for a €3,000 income household — over €1,000/year.

These tips are ordered by impact.

## Step 1: Track First

Before optimizing, measure. Scan grocery receipts for one month to see:
- Total spent per store
- Spending per category (produce, dairy, meat, snacks)
- Shopping frequency

Use [Trakzi](/) to scan receipts — it extracts store, total, and date automatically.

## Tip 1: Meal Plan Weekly

Plan 5-7 dinners before shopping. Check what you have. Buy only what you need.

**Impact:** Reduces food waste by 25-30% and eliminates impulse buys.

## Tip 2: Shop With a List

Write the list before leaving. Organize by store section. Don't deviate.

**Impact:** Reduces spending by 10-20% vs. shopping without a list.

## Tip 3: Compare Stores

Track spending at 2-3 stores for a month. Common findings:

| Store Type | Price Difference |
|---|---|
| Discount (Aldi, Lidl, Mercadona) | 20-40% cheaper for staples |
| Premium supermarkets | Sometimes cheaper for specialty items |
| Online bulk stores | Better for non-perishables |

## Tip 4: Buy Seasonal Produce

Out-of-season produce costs 2-3x more. Seasonal guide:

- **Spring:** Asparagus, strawberries, peas
- **Summer:** Tomatoes, peppers, peaches
- **Fall:** Squash, apples, root vegetables
- **Winter:** Citrus, cabbage, Brussels sprouts

## Tip 5: Reduce Waste

The average household throws away 20-30% of food purchased. Fixes:

- Check fridge before shopping (use what you have)
- FIFO: First In, First Out (use older items first)
- Freeze leftovers before they spoil
- Buy smaller quantities more often

## Tip 6: Cook in Batch

Large-batch cooking reduces per-meal cost significantly:

| Dish | Cost to Make | Servings | Cost per Meal |
|---|---|---|---|
| Soup | €8 | 6 | €1.33 |
| Pasta sauce | €6 | 5 | €1.20 |
| Rice bowls | €7 | 4 | €1.75 |

## Tip 7: Cut Snacks and Drinks

Snacks and beverages have the highest markup. Swaps:

- Soda → water with lemon
- Pre-cut fruit → whole fruit
- Granola bars → homemade trail mix
- Pre-made salads → fresh ingredients

## Tip 8: Shop Once Per Week

Each store visit is an impulse-buy opportunity. Plan one trip, stick to it.

**Impact:** People who shop 3x/week spend 30% more than 1x/week shoppers.

## Tip 9: Use Loyalty Programs

- **Mercadona:** Everyday low prices (no card needed)
- **Carrefour:** Loyalty card with personalized discounts
- **Lidl:** App with weekly digital coupons

Sign up for every store you use regularly.

## Savings Summary

| Tip | Potential Savings |
|---|---|
| Meal planning | 15-25% |
| Shopping with list | 10-20% |
| Store comparison | 10-30% |
| Seasonal buying | 10-20% |
| Waste reduction | 10-20% |
| Batch cooking | 15-25% |
| Cut snacks/drinks | 5-15% |

**Combined realistic savings: 25-35%** of current grocery spend.

## Next Steps

- [Start tracking groceries →](/sign-up)
- [Create a budget →](/docs/how-to-budget-your-money)
- [Track all expenses →](/docs/how-to-track-expenses)
    `,
  },
]

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug)
}

export function getAllSlugs(): string[] {
  return posts.map((p) => p.slug)
}

export function getRelatedPosts(currentSlug: string): BlogPost[] {
  const current = getPostBySlug(currentSlug)
  if (!current?.relatedSlugs) return []
  return current.relatedSlugs
    .map((s) => getPostBySlug(s))
    .filter((p): p is BlogPost => p !== undefined)
}
