"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function CookiePolicyPage() {
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
            {/* Header */}
            <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Home
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 py-12 max-w-3xl">
                <motion.article
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="prose prose-invert prose-zinc max-w-none"
                >
                    <h1 className="text-3xl font-bold mb-2">Cookie Policy</h1>
                    <p className="text-zinc-400 text-sm mb-8">Effective date: January 1, 2026</p>

                    <div className="space-y-8 text-zinc-300">
                        <section>
                            <p>This website uses cookies and similar technologies for essential functionality and analytics.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">1. What Cookies Are</h2>
                            <p>Cookies are small files stored on your device that help websites function and, in some cases, measure usage.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">2. Types of Cookies We Use</h2>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-medium text-white mb-2">Strictly Necessary Cookies</h3>
                                    <p>Used for core functionality such as authentication and security. These are required for the Service to operate.</p>
                                </div>

                                <div>
                                    <h3 className="text-lg font-medium text-white mb-2">Analytics Cookies (PostHog)</h3>
                                    <p>Used to understand how users interact with Trakzi (e.g., pages viewed, feature usage) to improve the product.</p>
                                </div>

                                <div>
                                    <h3 className="text-lg font-medium text-white mb-2">Session Replay (PostHog)</h3>
                                    <p>If enabled, session replay helps us understand usability issues by replaying interactions. We configure the tool to avoid collecting sensitive content where possible (e.g., masking inputs). Because this can be intrusive, it should be enabled only with appropriate consent and safeguards.</p>
                                </div>
                            </div>

                            <p className="mt-4 text-sm text-zinc-400">In Spain/EU, analytics cookies generally require consent unless configured and used in a strictly exempt manner.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">3. Managing Consent</h2>
                            <p>When you first visit, you will be asked to accept or reject non-essential cookies. You can change your preference at any time via the cookie settings in your browser or through our consent banner.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">4. Third-Party Cookies</h2>
                            <p>We may use third-party services that set their own cookies. These include:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li><strong>PostHog:</strong> Analytics and session replay</li>
                                <li><strong>Clerk:</strong> Authentication</li>
                                <li><strong>Stripe:</strong> Payment processing</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">5. Contact</h2>
                            <p>If you have questions about our use of cookies, contact us at <a href="mailto:help@trakzi.com" className="text-primary hover:underline">help@trakzi.com</a>.</p>
                        </section>
                    </div>

                    {/* Footer links */}
                    <div className="mt-12 pt-8 border-t border-zinc-800">
                        <p className="text-sm text-zinc-500">
                            Related: <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> · <Link href="/terms" className="text-primary hover:underline">Terms & Conditions</Link> · <Link href="/legal" className="text-primary hover:underline">Legal Notice</Link>
                        </p>
                    </div>
                </motion.article>
            </main>
        </div>
    )
}
