"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChartFullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Optional header actions to show in fullscreen (AI insight, info buttons) */
  headerActions?: React.ReactNode;
  /** Optional filter control to render in header (e.g., time period selector) */
  filterControl?: React.ReactNode;
  /**
   * Chart orientation hint for mobile fullscreen behaviour.
   * - "landscape" (default): tries to lock orientation / CSS-rotate to landscape (good for area, bar, line, treemap charts)
   * - "portrait": stays in portrait — no rotation (good for pie, funnel, radar charts)
   */
  orientation?: "portrait" | "landscape";
}

export function ChartFullscreenModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  headerActions,
  filterControl,
  orientation = "landscape",
}: ChartFullscreenModalProps) {
  const isMobile = useIsMobile();
  const [isPortrait, setIsPortrait] = React.useState(false);

  // Detect portrait orientation with debounced resize handling
  React.useEffect(() => {
    if (!isOpen) return;

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    // Debounced resize handler (100ms) to prevent excessive re-renders
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(checkOrientation, 100);
    };

    checkOrientation();
    window.addEventListener("resize", handleResize, { passive: true });
    // orientationchange is infrequent, no debounce needed
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", checkOrientation);
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
  }, [isOpen]);

  // Lock body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // For landscape charts: try to lock orientation via the Screen Orientation API
  // (works on Android Chrome; iOS Safari will fall back to the CSS rotation below)
  React.useEffect(() => {
    if (!isOpen || orientation !== "landscape") return;

    const lockOrientation = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orient = screen.orientation as any;
        if (orient?.lock) {
          await orient.lock("landscape");
        }
      } catch {
        // Orientation lock not supported — CSS fallback handles it
      }
    };

    lockOrientation();

    return () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orient = screen.orientation as any;
        if (orient?.unlock) {
          orient.unlock();
        }
      } catch {
        // Ignore unlock errors
      }
    };
  }, [isOpen, orientation]);

  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // For landscape charts on mobile in portrait mode, rotate the overlay 90° so the
  // chart fills the screen horizontally without forcing the user to flip their device.
  // Portrait-oriented charts (pie, funnel, radar) skip this entirely.
  const shouldRotate = orientation === "landscape" && isMobile && isPortrait;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex flex-col bg-background"
          style={
            shouldRotate
              ? {
                  // Rotate the overlay so landscape charts display correctly in portrait mode
                  transform: "rotate(90deg)",
                  transformOrigin: "center center",
                  width: "100vh",
                  height: "100vw",
                  position: "fixed",
                  top: "50%",
                  left: "50%",
                  marginTop: "-50vw",
                  marginLeft: "-50vh",
                }
              : undefined
          }
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {/* Compact header */}
          <div className="flex items-center justify-between px-2 py-1 border-b border-border/50 shrink-0">
            <h2 className="text-xs font-semibold truncate">{title}</h2>
            <div className="flex items-center gap-1 ml-2">
              {filterControl}
              {headerActions}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-7 w-7"
                aria-label="Close fullscreen"
              >
                <IconX className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Chart content — fills all remaining space */}
          <div className="flex-1 p-1 min-h-0 overflow-hidden">
            <div className="h-full w-full">{children}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
