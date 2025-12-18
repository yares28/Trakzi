"use client"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import Link from "next/link"

export function StickyFooter() {
  const [isAtBottom, setIsAtBottom] = useState(false)

  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollTop = window.scrollY
          const windowHeight = window.innerHeight
          const documentHeight = document.documentElement.scrollHeight
          const isNearBottom = scrollTop + windowHeight >= documentHeight - 100

          setIsAtBottom(isNearBottom)
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll() // Check initial state
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const linkStyle = { color: "#121113" }
  const hoverColor = "rgba(18, 17, 19, 0.8)"

  return (
    <AnimatePresence>
      {isAtBottom && (
        <motion.div
          className="fixed z-50 bottom-0 left-0 w-full h-80 flex justify-center items-center"
          style={{ backgroundColor: "#e78a53" }}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div
            className="relative overflow-hidden w-full h-full flex justify-end px-12 text-right items-start py-12"
            style={{ color: "#121113" }}
          >
            <motion.div
              className="flex flex-row space-x-12 sm:space-x-16 md:space-x-24 text-sm sm:text-lg md:text-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              {/* Navigation */}
              <ul className="space-y-2">
                <li
                  className="hover:underline cursor-pointer transition-colors"
                  style={linkStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.color = hoverColor)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#121113")}
                >
                  <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                    Home
                  </button>
                </li>
                <li
                  className="hover:underline cursor-pointer transition-colors"
                  style={linkStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.color = hoverColor)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#121113")}
                >
                  <button onClick={() => {
                    const el = document.getElementById("features")
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
                  }}>
                    Features
                  </button>
                </li>
                <li
                  className="hover:underline cursor-pointer transition-colors"
                  style={linkStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.color = hoverColor)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#121113")}
                >
                  <button onClick={() => {
                    const el = document.getElementById("pricing")
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
                  }}>
                    Pricing
                  </button>
                </li>
              </ul>

              {/* Legal */}
              <ul className="space-y-2">
                <li
                  className="hover:underline cursor-pointer transition-colors"
                  style={linkStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.color = hoverColor)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#121113")}
                >
                  <Link href="/terms">Terms</Link>
                </li>
                <li
                  className="hover:underline cursor-pointer transition-colors"
                  style={linkStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.color = hoverColor)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#121113")}
                >
                  <Link href="/privacy">Privacy</Link>
                </li>
                <li
                  className="hover:underline cursor-pointer transition-colors"
                  style={linkStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.color = hoverColor)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#121113")}
                >
                  <Link href="/cookies">Cookies</Link>
                </li>
                <li
                  className="hover:underline cursor-pointer transition-colors"
                  style={linkStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.color = hoverColor)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#121113")}
                >
                  <Link href="/legal">Legal</Link>
                </li>
              </ul>

              {/* Contact */}
              <ul className="space-y-2">
                <li
                  className="hover:underline cursor-pointer transition-colors"
                  style={linkStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.color = hoverColor)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#121113")}
                >
                  <a href="mailto:help@trakzi.com">Contact</a>
                </li>
              </ul>
            </motion.div>
            <motion.img
              src="/Trakzi/TrakziiconB.png"
              alt="Trakzi"
              className="absolute bottom-0 left-0 translate-y-1/4 sm:h-[180px] h-[100px] w-auto select-none opacity-20"
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 0.2, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
