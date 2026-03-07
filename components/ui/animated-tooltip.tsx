"use client";
import React, { useState } from "react";
import {
  motion,
  useTransform,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { cn } from "@/lib/utils";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export type TooltipItem = {
  id: number | string;
  name: string;
  designation: string;
  image?: string | null;
  /** Palette accent color used for the initials avatar background */
  color?: string;
  onClick?: () => void;
};

export const AnimatedTooltip = ({
  items,
  className,
}: {
  items: TooltipItem[];
  className?: string;
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | string | null>(null);
  const springConfig = { stiffness: 100, damping: 5 };
  const x = useMotionValue(0);
  const rotate = useSpring(
    useTransform(x, [-100, 100], [-45, 45]),
    springConfig
  );
  const translateX = useSpring(
    useTransform(x, [-100, 100], [-50, 50]),
    springConfig
  );
  const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    const halfWidth = (event.target as HTMLElement).offsetWidth / 2;
    x.set(event.nativeEvent.offsetX - halfWidth);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {items.map((item, idx) => {
        const hasImage = item.image && item.image.length > 0;
        const bgColor = item.color || `hsl(${(idx * 67 + 200) % 360}, 60%, 55%)`;
        const initials = getInitials(item.name);

        return (
          <div
            className="-mr-4 relative group"
            key={item.id}
            onMouseEnter={() => setHoveredIndex(item.id)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <AnimatePresence mode="popLayout">
              {hoveredIndex === item.id && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.6 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: {
                      type: "spring",
                      stiffness: 260,
                      damping: 10,
                    },
                  }}
                  exit={{ opacity: 0, y: 20, scale: 0.6 }}
                  style={{
                    translateX: translateX,
                    rotate: rotate,
                    whiteSpace: "nowrap",
                  }}
                  className="absolute -top-16 -left-1/2 translate-x-1/2 flex text-xs flex-col items-center justify-center rounded-md bg-foreground z-50 shadow-xl px-4 py-2"
                >
                  <div className="absolute inset-x-10 z-30 w-[20%] -bottom-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent h-px" />
                  <div className="absolute left-10 w-[40%] z-30 -bottom-px bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px" />
                  <div className="font-bold text-background relative z-30 text-base">
                    {item.name}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {item.designation}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Avatar circle */}
            {hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                onMouseMove={handleMouseMove}
                onClick={(e) => {
                  if (item.onClick) {
                    e.stopPropagation();
                    e.preventDefault();
                    item.onClick();
                  }
                }}
                src={item.image!}
                alt={item.name}
                className={cn(
                  "object-cover !m-0 !p-0 object-top rounded-full h-7 w-7 sm:h-9 sm:w-9 border-2 group-hover:scale-105 group-hover:z-30 border-background relative transition duration-500",
                  item.onClick && "cursor-pointer"
                )}
              />
            ) : (
              <div
                onMouseMove={handleMouseMove}
                onClick={(e) => {
                  if (item.onClick) {
                    e.stopPropagation();
                    e.preventDefault();
                    item.onClick();
                  }
                }}
                className={cn(
                  "rounded-full h-7 w-7 sm:h-9 sm:w-9 border-2 border-background group-hover:scale-105 group-hover:z-30 relative transition duration-500 overflow-hidden flex items-center justify-center select-none shadow-sm !m-0 !p-0",
                  item.onClick && "cursor-pointer"
                )}
                style={{ backgroundColor: bgColor }}
              >
                <span className="text-white font-semibold text-[11px] leading-none">
                  {initials}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};