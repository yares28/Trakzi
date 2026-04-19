"use client";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { DateFilter } from "@/components/date-filter";
import { useState, useEffect, useRef } from "react";
import { useDateFilter } from "@/components/date-filter-provider";
import { demoFetch } from "@/lib/demo/demo-fetch";

export function SiteHeader() {
  const { filter: dateFilter, setFilter: setDateFilter } = useDateFilter();
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const headerRef = useRef<HTMLElement>(null);

  // Fetch available years on mount
  useEffect(() => {
    const fetchYears = async () => {
      try {
        const response = await demoFetch("/api/transactions/years");
        if (response.ok) {
          const years = await response.json();
          setAvailableYears(years);
        }
      } catch (error) {
        console.warn("Error fetching available years:", error);
      }
    };
    fetchYears();
  }, []);

  // Mobile: hide header on scroll down, show on scroll up
  // Listens to the scrollable sibling container (the main content area)
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    // The scrollable sibling is the main content div/main that sits right after the header
    const scrollContainer = header.nextElementSibling as HTMLElement | null;
    if (!scrollContainer) return;

    let lastScrollTop = 0;
    const SCROLL_THRESHOLD = 5;

    const handleScroll = () => {
      // Only apply auto-hide behavior on mobile (below md breakpoint)
      if (window.innerWidth >= 768) {
        setIsHeaderVisible(true);
        return;
      }

      const scrollTop = scrollContainer.scrollTop;

      if (scrollTop <= 20) {
        // At/near top — always show
        setIsHeaderVisible(true);
      } else if (scrollTop < lastScrollTop - SCROLL_THRESHOLD) {
        // Scrolling up — show header
        setIsHeaderVisible(true);
      } else if (scrollTop > lastScrollTop + SCROLL_THRESHOLD) {
        // Scrolling down — hide header
        setIsHeaderVisible(false);
      }

      lastScrollTop = scrollTop;
    };

    // On window resize to desktop, always show the header
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsHeaderVisible(true);
      }
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <header
      ref={headerRef}
      className={cn(
        // Base layout
        "flex shrink-0 items-center gap-2",
        // Stacking & positioning
        "sticky top-0 z-40",
        // Mobile: floating glass island styles
        "mx-2 mt-2 mb-1 h-14 rounded-2xl",
        "bg-background/80 backdrop-blur-xl",
        "border border-border/50 shadow-lg shadow-black/5",
        // Smooth transform transition (GPU-accelerated, no layout thrash)
        "transition-transform duration-300 ease-in-out will-change-transform",
        // Desktop: header removed entirely now that trigger + filter live in the sidebar
        "md:hidden",
        // Mobile: slide up out of view when scrolling down
        !isHeaderVisible && "-translate-y-full",
      )}
    >
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:pl-6 lg:pr-8 group-has-data-[collapsible=icon]/sidebar-wrapper:lg:pl-4">
        <SidebarTrigger className="-ml-1 md:hidden" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4 hidden md:block"
        />
        <div className="ml-auto flex items-center gap-2">
          <DateFilter
            value={dateFilter}
            onChange={setDateFilter}
            availableYears={availableYears}
          />
        </div>
      </div>
    </header>
  );
}
