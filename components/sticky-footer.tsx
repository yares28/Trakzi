"use client"
import { m, AnimatePresence } from "framer-motion"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"

type FooterLocale = "en" | "es"

interface StickyFooterProps {
  locale?: FooterLocale
}

interface FooterLink {
  label: string
  href: string | null
  scroll?: boolean
}

const footerContent: Record<FooterLocale, { nav: FooterLink[]; legal: FooterLink[]; contact: FooterLink[] }> = {
  en: {
    nav: [
      { label: "Home", href: null, scroll: true },
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
    ],
    legal: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "Cookies", href: "/cookies" },
      { label: "Legal", href: "/legal" },
    ],
    contact: [
      { label: "Contact", href: "mailto:help@trakzi.com" },
      { label: "Blog", href: "/docs" },
    ],
  },
  es: {
    nav: [
      { label: "Inicio", href: null, scroll: true },
      { label: "Características", href: "/es/features" },
      { label: "Precios", href: "/es/precios" },
    ],
    legal: [
      { label: "Términos", href: "/terms" },
      { label: "Privacidad", href: "/privacy" },
      { label: "Cookies", href: "/cookies" },
      { label: "Legal", href: "/legal" },
    ],
    contact: [
      { label: "Contacto", href: "mailto:help@trakzi.com" },
      { label: "Blog", href: "/es/docs" },
    ],
  },
}

export function StickyFooter({ locale = "en" }: StickyFooterProps = {}) {
  const [isAtBottom, setIsAtBottom] = useState(false)
  const scrollContainersRef = useRef<Element[]>([])

  useEffect(() => {
    let ticking = false

    const checkBottom = () => {
      // O(1) window check
      const windowAtBottom =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 200

      // O(N_containers) — uses the pre-found list, no DOM walk on every scroll
      let containerAtBottom = false
      for (const el of scrollContainersRef.current) {
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
          containerAtBottom = true
          break
        }
      }

      setIsAtBottom(windowAtBottom || containerAtBottom)
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

    // One-time scan to find scrollable containers (runs only on mount, not on every scroll)
    const findScrollContainers = () => {
      scrollContainersRef.current.forEach(el => el.removeEventListener('scroll', handleScroll))
      scrollContainersRef.current = []

      const allElements = document.querySelectorAll('*')
      for (const el of allElements) {
        const style = getComputedStyle(el)
        if (
          (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
          el.scrollHeight > el.clientHeight + 10
        ) {
          el.addEventListener('scroll', handleScroll, { passive: true })
          scrollContainersRef.current.push(el)
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    const timer = setTimeout(() => {
      findScrollContainers()
      checkBottom()
    }, 500)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', handleScroll)
      scrollContainersRef.current.forEach(el => el.removeEventListener('scroll', handleScroll))
    }
  }, [])

  return (
    <AnimatePresence>
      {isAtBottom && (
        <m.div
          className="fixed z-50 bottom-0 left-0 w-full h-80 flex justify-center items-center bg-primary"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="relative overflow-hidden w-full h-full flex justify-end px-12 text-right items-start py-12 text-primary-foreground">
            <m.div
              className="flex flex-row space-x-12 sm:space-x-16 md:space-x-24 text-sm sm:text-lg md:text-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              {/* Navigation */}
              <ul className="space-y-2">
                {footerContent[locale].nav.map((item) => (
                  <li key={item.label} className="hover:underline cursor-pointer transition-opacity hover:opacity-80">
                    {item.scroll ? (
                      <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                        {item.label}
                      </button>
                    ) : (
                      <Link href={item.href!}>{item.label}</Link>
                    )}
                  </li>
                ))}
              </ul>

              {/* Legal */}
              <ul className="space-y-2">
                {footerContent[locale].legal.map((item) => (
                  <li key={item.label} className="hover:underline cursor-pointer transition-opacity hover:opacity-80">
                    <Link href={item.href!}>{item.label}</Link>
                  </li>
                ))}
              </ul>

              {/* Contact */}
              <ul className="space-y-2">
                {footerContent[locale].contact.map((item) => (
                  <li key={item.label} className="hover:underline cursor-pointer transition-opacity hover:opacity-80">
                    <a href={item.href!}>{item.label}</a>
                  </li>
                ))}
              </ul>
            </m.div>

            <m.div
              className="absolute bottom-0 left-0 translate-y-1/4 sm:h-[180px] h-[100px] w-auto select-none opacity-20"
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 0.2, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <Image
                src="/Trakzi/TrakziiconB.png"
                alt=""
                width={180}
                height={180}
                className="h-full w-auto object-contain"
                aria-hidden="true"
              />
            </m.div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
