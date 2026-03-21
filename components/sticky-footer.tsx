"use client"
import { m, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import Link from "next/link"

export function StickyFooter() {
  const [isAtBottom, setIsAtBottom] = useState(false)

  useEffect(() => {
    let ticking = false

    const checkBottom = () => {
      // Check window scroll
      const windowAtBottom =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 200

      // Check all scrollable ancestors (handles SidebarInset overflow-y-auto)
      let ancestorAtBottom = false
      const allElements = document.querySelectorAll('*')
      for (const el of allElements) {
        const style = getComputedStyle(el)
        if (
          (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
          el.scrollHeight > el.clientHeight + 10
        ) {
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
            ancestorAtBottom = true
            break
          }
        }
      }

      setIsAtBottom(windowAtBottom || ancestorAtBottom)
    }

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          checkBottom()
          ticking = false
        })
        ticking = true
      }
    }

    // Listen on window
    window.addEventListener('scroll', handleScroll, { passive: true })

    // Also listen on all scrollable containers (SidebarInset, ScrollArea, etc.)
    const scrollContainers: Element[] = []
    const findScrollContainers = () => {
      scrollContainers.forEach(el => el.removeEventListener('scroll', handleScroll))
      scrollContainers.length = 0

      const allElements = document.querySelectorAll('*')
      for (const el of allElements) {
        const style = getComputedStyle(el)
        if (
          (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
          el.scrollHeight > el.clientHeight + 10
        ) {
          el.addEventListener('scroll', handleScroll, { passive: true })
          scrollContainers.push(el)
        }
      }
    }

    // Find containers after mount and on resize
    const timer = setTimeout(() => {
      findScrollContainers()
      checkBottom()
    }, 500)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', handleScroll)
      scrollContainers.forEach(el => el.removeEventListener('scroll', handleScroll))
    }
  }, [])

  const linkStyle = { color: "#121113" }
  const hoverColor = "rgba(18, 17, 19, 0.8)"

  return (
    <AnimatePresence>
      {isAtBottom && (
        <m.div
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
            <m.div
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
                  <Link href="/features">Features</Link>
                </li>
                <li
                  className="hover:underline cursor-pointer transition-colors"
                  style={linkStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.color = hoverColor)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#121113")}
                >
                  <Link href="/pricing">Pricing</Link>
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
            </m.div>
            <m.img
              src="/Trakzi/TrakziiconB.png"
              alt="Trakzi"
              className="absolute bottom-0 left-0 translate-y-1/4 sm:h-[180px] h-[100px] w-auto select-none opacity-20"
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 0.2, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
