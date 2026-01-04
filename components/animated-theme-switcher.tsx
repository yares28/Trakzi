'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'motion/react'
import { SunIcon, MoonIcon, MonitorIcon } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

const themes = [
    {
        name: 'Light',
        value: 'light',
        icon: SunIcon,
    },
    {
        name: 'Dark',
        value: 'dark',
        icon: MoonIcon,
    },
    {
        name: 'System',
        value: 'system',
        icon: MonitorIcon,
    },
]

export function AnimatedThemeSwitcher() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="h-10 w-full rounded-lg bg-muted animate-pulse" />
        )
    }

    const activeTheme = theme || 'system'

    return (
        <div className="w-full">
            <Tabs value={activeTheme} onValueChange={setTheme} className="w-full">
                <TabsList className="h-auto gap-1 rounded-xl p-1 w-full bg-muted/50">
                    {themes.map(({ icon: Icon, name, value }) => {
                        const isActive = activeTheme === value

                        return (
                            <motion.div
                                key={value}
                                layout
                                className={cn(
                                    'flex h-9 items-center justify-center overflow-hidden rounded-lg cursor-pointer',
                                    isActive ? 'flex-1' : 'flex-none'
                                )}
                                onClick={() => setTheme(value)}
                                initial={false}
                                animate={{
                                    width: isActive ? '100%' : 40,
                                    backgroundColor: isActive
                                        ? 'hsl(var(--background))'
                                        : 'transparent',
                                }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 400,
                                    damping: 30,
                                }}
                                style={{
                                    boxShadow: isActive ? '0 1px 3px 0 rgb(0 0 0 / 0.1)' : 'none',
                                }}
                            >
                                <TabsTrigger
                                    value={value}
                                    asChild
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                                >
                                    <motion.div
                                        className="flex h-9 w-full items-center justify-center gap-2 px-3"
                                        animate={{ filter: 'blur(0px)' }}
                                        exit={{ filter: 'blur(2px)' }}
                                        transition={{ duration: 0.2, ease: 'easeOut' }}
                                    >
                                        <Icon className={cn(
                                            "size-4 shrink-0 transition-colors",
                                            isActive ? "text-primary" : "text-muted-foreground"
                                        )} />
                                        <AnimatePresence initial={false}>
                                            {isActive && (
                                                <motion.span
                                                    className="text-sm font-medium text-foreground whitespace-nowrap"
                                                    initial={{ opacity: 0, width: 0 }}
                                                    animate={{ opacity: 1, width: 'auto' }}
                                                    exit={{ opacity: 0, width: 0 }}
                                                    transition={{ duration: 0.2, ease: 'easeOut' }}
                                                >
                                                    {name}
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                </TabsTrigger>
                            </motion.div>
                        )
                    })}
                </TabsList>
            </Tabs>
        </div>
    )
}

export default AnimatedThemeSwitcher
