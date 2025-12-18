"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function PrivacyPolicyPage() {
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
                    <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
                    <p className="text-zinc-400 text-sm mb-8">Effective date: January 1, 2026</p>

                    <div className="space-y-8 text-zinc-300">
                        <section>
                            <p className="text-sm text-zinc-400">
                                <strong>Controller:</strong> Yahya Fares (Spain)<br />
                                <strong>Email:</strong> <a href="mailto:help@trakzi.com" className="text-primary hover:underline">help@trakzi.com</a><br />
                                <strong>Address:</strong> Carrer de Borriol 9, 46022 Valencia, Spain
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">1. Data We Process</h2>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Account data:</strong> email, user ID, authentication metadata (via your auth provider).</li>
                                <li><strong>Transaction data:</strong> transactions you create/import and the extracted results from files/receipts.</li>
                                <li><strong>Uploaded files/receipt images:</strong> processed for extraction and not stored.</li>
                                <li><strong>Analytics data:</strong> usage events and technical data collected via PostHog (and session replay if enabled).</li>
                                <li><strong>AI chat:</strong> prompts and responses are processed to answer your questions. We do not store chat history in our database. The AI provider&apos;s retention is unknown.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">2. Purposes and Legal Bases</h2>
                            <p className="mb-4">We process data to:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Provide the Service</strong> (account, transactions, charts). Legal basis: contract (GDPR Art. 6(1)(b)).</li>
                                <li><strong>Maintain security</strong> and prevent abuse. Legal basis: legitimate interests (Art. 6(1)(f)).</li>
                                <li><strong>Analytics and product improvement</strong> (PostHog). Legal basis: consent where required for cookies/trackers.</li>
                                <li><strong>Handle subscription billing</strong> where applicable. Legal basis: contract and legal obligations.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">3. Processors (Who We Share Data With)</h2>
                            <p className="mb-4">We use service providers (processors) to run Trakzi, typically including:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Authentication (e.g., Clerk)</li>
                                <li>Database (Neon)</li>
                                <li>Hosting/infrastructure (Vercel)</li>
                                <li>Payments (Stripe)</li>
                                <li>Analytics (PostHog)</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">4. International Transfers</h2>
                            <p>We aim to process data in the EU/EEA where possible. Transfers may occur depending on provider configuration and your location. Where required, we rely on appropriate safeguards (e.g., Standard Contractual Clauses).</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">5. Retention</h2>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Active account:</strong> we retain your transaction data while your account is active.</li>
                                <li><strong>Account deletion:</strong> when you delete your account, we delete your personal data from active systems. Backup copies may persist for a limited period (e.g., up to 30 days) before being purged.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">6. Your Rights</h2>
                            <p className="mb-4">You can request access, rectification, erasure, restriction, portability, and object to processing. Where processing is based on consent, you can withdraw consent at any time.</p>
                            <p className="mb-4">To exercise rights: <a href="mailto:help@trakzi.com" className="text-primary hover:underline">help@trakzi.com</a></p>
                            <p>You may lodge a complaint with your local authority; in Spain, the AEPD.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">7. Security</h2>
                            <p>We use technical and organizational measures to protect data (access controls, encryption in transit, least privilege). No system is perfectly secure.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">8. Cookies and Tracking</h2>
                            <p>See the <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link> for details about PostHog analytics and session replay and your choices.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">9. Changes</h2>
                            <p>We may update this policy and will update the effective date.</p>
                        </section>
                    </div>

                    {/* Footer links */}
                    <div className="mt-12 pt-8 border-t border-zinc-800">
                        <p className="text-sm text-zinc-500">
                            Related: <Link href="/terms" className="text-primary hover:underline">Terms & Conditions</Link> · <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link> · <Link href="/legal" className="text-primary hover:underline">Legal Notice</Link>
                        </p>
                    </div>
                </motion.article>
            </main>
        </div>
    )
}
