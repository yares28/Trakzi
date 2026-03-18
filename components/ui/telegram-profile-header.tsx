"use client";

import * as React from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Generate a stable pleasant color from a name string */
function getColorFromName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 55%)`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface AvatarContentProps {
  hasImage: boolean;
  avatar: string | null | undefined;
  name: string;
  bgColor: string;
  initials: string;
  textSize?: string;
}

const AvatarContent = React.memo(function AvatarContent({
  hasImage,
  avatar,
  name,
  bgColor,
  initials,
  textSize,
}: AvatarContentProps) {
  return hasImage ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatar!}
      alt={name}
      className="pointer-events-none h-full w-full object-cover"
    />
  ) : (
    <div
      className="flex items-center justify-center h-full w-full select-none"
      style={{ backgroundColor: bgColor }}
    >
      <span
        className={cn("text-white font-bold", textSize || "text-2xl")}
      >
        {initials}
      </span>
    </div>
  );
});

AvatarContent.displayName = "AvatarContent";

export interface TelegramHeaderProps {
  avatar?: string | null;
  name: string;
  phone: string;
  username: string;
  actionButton?: {
    text: string;
    onClick: () => void;
    backgroundColor?: string;
  };
}

export function TelegramHeader({
  avatar,
  name,
  phone,
  username,
  actionButton = {
    text: "Edit",
    onClick: () => { },
    backgroundColor: "rgb(255,112,0)",
  },
}: TelegramHeaderProps) {
  const [expand, setExpand] = React.useState(false);
  const hasImage = !!(avatar && avatar.length > 0);
  const bgColor = getColorFromName(name);
  const initials = getInitials(name);

  return (
    <MotionConfig
      transition={{
        duration: 0.4,
        type: "spring",
        bounce: 0.2,
      }}
    >
      <motion.button
        className={cn(
          "text-blue-500 absolute z-30 rounded-full px-2 cursor-pointer",
          expand ? "top-[64px]" : ""
        )}
        initial={{ right: 0 }}
        animate={{
          right: expand ? 8 : 0,
          background: expand
            ? actionButton.backgroundColor
            : "transparent",
          color: expand ? "rgb(255, 255, 255)" : "rgb(59, 130, 246)",
        }}
        onClick={actionButton.onClick}
      >
        {actionButton.text}
      </motion.button>

      <motion.header
        layout
        style={{ aspectRatio: expand ? "1/1" : "" }}
        className={cn(
          "relative isolate flex flex-col",
          expand
            ? "mt-0 items-start justify-end p-4"
            : "mt-4 items-center justify-center"
        )}
      >
        <motion.button
          layoutId="user-avatar"
          className="relative flex aspect-square w-16 items-start justify-center overflow-hidden"
          onClick={() => setExpand(!expand)}
          style={{
            borderRadius: 34,
          }}
        >
          <AvatarContent hasImage={hasImage} avatar={avatar} name={name} bgColor={bgColor} initials={initials} textSize="text-2xl" />
        </motion.button>

        <motion.div
          className={`relative z-20 flex flex-col ${expand ? "items-start" : "items-center"}`}
        >
          <motion.h2
            layout
            className="inline-block text-xl font-medium"
            animate={{
              color: expand ? "#ffffff" : "var(--foreground, #000000)",
            }}
          >
            {name}
          </motion.h2>
          <motion.div
            layout
            className="flex gap-1 text-xs"
            animate={{
              color: expand
                ? "#ffffff"
                : "var(--muted-foreground, #8C8C93)",
            }}
          >
            {phone && <p className="tracking-tight">{phone}</p>}
            {phone && <>•</>}
            <p>{username}</p>
          </motion.div>
        </motion.div>

        <AnimatePresence>
          {expand && (
            <motion.button
              layoutId="user-avatar"
              className="absolute inset-0 -z-10 aspect-square overflow-hidden"
              style={{ borderRadius: 0 }}
              onClick={() => setExpand(!expand)}
            >
              <AvatarContent hasImage={hasImage} avatar={avatar} name={name} bgColor={bgColor} initials={initials} textSize="text-6xl" />
              <motion.div className="absolute bottom-0 left-0 h-24 w-full bg-gradient-to-t from-black/50 to-transparent" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.header>
    </MotionConfig>
  );
}