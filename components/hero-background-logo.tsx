"use client"

import { m } from "framer-motion"

export function HeroBackgroundLogo() {
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 2, ease: "easeOut" }}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 pointer-events-none select-none"
      style={{ perspective: "1400px" }}
    >
      {/* Ambient glow pulse */}
      <m.div
        animate={{ scale: [1, 1.45, 1], opacity: [0.05, 0.2, 0.05] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-primary/20 dark:bg-white/20 blur-[150px] rounded-full dark:mix-blend-screen"
      />

      {/* Logo — floating + slow tilt */}
      <m.div
        animate={{
          y: [-20, 20, -20],
          rotateZ: [8, 18, 8],
          rotateX: [-6, 6, -6],
        }}
        transition={{
          y: { duration: 7, repeat: Infinity, ease: "easeInOut" },
          rotateZ: { duration: 14, repeat: Infinity, ease: "easeInOut" },
          rotateX: { duration: 11, repeat: Infinity, ease: "easeInOut" },
        }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative flex items-center justify-center w-[min(680px,88vw)] h-[min(680px,88vw)] sm:w-[min(1050px,108vw)] sm:h-[min(1050px,108vw)]"
      >
        <img
          src="/Trakzi/LogoShort.svg"
          alt=""
          className="absolute w-full h-full object-contain dark:brightness-0 dark:invert blur-[45px] opacity-[0.18] dark:opacity-[0.22] dark:mix-blend-screen"
        />
        <img
          src="/Trakzi/LogoShort.svg"
          alt=""
          className="absolute w-full h-full object-contain dark:brightness-0 dark:invert blur-[12px] opacity-[0.15] dark:opacity-[0.18] dark:mix-blend-screen"
        />
        <img
          src="/Trakzi/LogoShort.svg"
          alt=""
          className="absolute w-full h-full object-contain dark:brightness-0 dark:invert opacity-[0.2] dark:opacity-[0.22] drop-shadow-[0_0_55px_rgba(231,138,83,0.5)] dark:drop-shadow-[0_0_55px_rgba(255,255,255,0.7)]"
        />
      </m.div>
    </m.div>
  )
}
