// lib/categories.ts
// Category management with max limit and custom categories

const MAX_CATEGORIES = 20;
const DEFAULT_CATEGORIES = [
  "Groceries",
  "Restaurants",
  "Shopping",
  "Transport",
  "Utilities",
  "Insurance",
  "Taxes",
  "Income",
  "Transfers",
  "Savings",
  "Other"
];

const STORAGE_KEY = "folio_categories";

export function getCategories(): string[] {
  if (typeof window === "undefined") {
    return DEFAULT_CATEGORIES;
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : DEFAULT_CATEGORIES;
    }
  } catch (e) {
    console.warn("Failed to load categories from localStorage:", e);
  }
  
  return DEFAULT_CATEGORIES;
}

export function addCategory(category: string): { success: boolean; message: string; categories: string[] } {
  if (typeof window === "undefined") {
    return { success: false, message: "Not available on server", categories: DEFAULT_CATEGORIES };
  }
  
  // Normalize: single word, capitalize first letter
  const normalized = category.trim().split(/\s+/)[0].charAt(0).toUpperCase() + category.trim().split(/\s+/)[0].slice(1).toLowerCase();
  
  if (!normalized || normalized.length === 0) {
    return { success: false, message: "Category cannot be empty", categories: getCategories() };
  }
  
  const current = getCategories();
  
  if (current.includes(normalized)) {
    return { success: false, message: "Category already exists", categories: current };
  }
  
  if (current.length >= MAX_CATEGORIES) {
    return { success: false, message: `Maximum ${MAX_CATEGORIES} categories allowed`, categories: current };
  }
  
  const updated = [...current, normalized];
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Dispatch custom event to notify other components
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event('categoriesUpdated'));
    }
    return { success: true, message: `Category "${normalized}" added`, categories: updated };
  } catch (e) {
    console.error("Failed to save category:", e);
    return { success: false, message: "Failed to save category", categories: current };
  }
}

export function removeCategory(category: string): { success: boolean; message: string; categories: string[] } {
  if (typeof window === "undefined") {
    return { success: false, message: "Not available on server", categories: DEFAULT_CATEGORIES };
  }
  
  const current = getCategories();
  const updated = current.filter(c => c !== category);
  
  if (updated.length === current.length) {
    return { success: false, message: "Category not found", categories: current };
  }
  
  // Don't allow removing if it's the last category
  if (updated.length === 0) {
    return { success: false, message: "Cannot remove the last category", categories: current };
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return { success: true, message: `Category "${category}" removed`, categories: updated };
  } catch (e) {
    console.error("Failed to remove category:", e);
    return { success: false, message: "Failed to remove category", categories: current };
  }
}

export function resetCategories(): string[] {
  if (typeof window === "undefined") {
    return DEFAULT_CATEGORIES;
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CATEGORIES));
    return DEFAULT_CATEGORIES;
  } catch (e) {
    console.error("Failed to reset categories:", e);
    return getCategories();
  }
}

