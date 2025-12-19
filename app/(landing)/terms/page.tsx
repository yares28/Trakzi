"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function TermsPage() {
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
                    <h1 className="text-3xl font-bold mb-2">Terms & Conditions</h1>
                    <p className="text-zinc-400 text-sm mb-8">Effective date: January 1, 2026</p>

                    <div className="space-y-8 text-zinc-300">
                        <section>
                            <p className="text-sm text-zinc-400">
                                <strong>Service:</strong> Trakzi (<a href="https://www.trakzi.com" className="text-primary hover:underline">https://www.trakzi.com</a>)<br />
                                <strong>Contact:</strong> <a href="mailto:help@trakzi.com" className="text-primary hover:underline">help@trakzi.com</a>
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">1. Who We Are</h2>
                            <p>Trakzi is operated by Yahya Fares (Spain) (&quot;Trakzi&quot;, &quot;we&quot;, &quot;us&quot;).</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">2. Acceptance</h2>
                            <p>By creating an account or using the Service, you agree to these Terms. If you do not agree, do not use the Service.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">3. The Service (No Financial Advice)</h2>
                            <p className="mb-4">Trakzi helps you organize and analyze your personal finance data (transactions, categories, charts) and may offer AI-assisted chat features.</p>
                            <p><strong>Trakzi is not a bank, accounting firm, or financial advisor.</strong> The Service is informational. You remain responsible for verifying accuracy and making decisions.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">4. Accounts</h2>
                            <p>You must provide accurate account details and keep them up to date. You are responsible for activity under your account. We may suspend or terminate accounts that violate these Terms or abuse the Service.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">5. Uploads and Extracted Data (No File Storage)</h2>
                            <p className="mb-4">You may upload files (e.g., bank statements, receipts) to extract transaction data. Trakzi does not store your uploaded files or receipt images—only the extracted data you choose to keep in your account.</p>
                            <p>You confirm you have the right to upload and process the files you submit.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">6. Plans, Limits, and Usage</h2>
                            <p className="mb-4">Trakzi offers Free and paid subscriptions.</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Free plan:</strong> up to 400 total transactions stored. If you reach the cap, you can still view and delete existing transactions, but you cannot add/import more until you delete transactions or upgrade.</li>
                                <li><strong>Pro:</strong> up to 3,000 total transactions stored.</li>
                                <li><strong>Max:</strong> Unlimited transactions (subject to reasonable use to protect platform stability).</li>
                            </ul>
                            <p className="mt-4">Other features and limits (e.g., AI chat message limits, exports) are described on the pricing page and may be updated from time to time.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">7. Subscription Billing and Cancellation</h2>

                            <h3 className="text-lg font-medium text-white mb-2">7.1 Auto-renewal</h3>
                            <p className="mb-4">Subscriptions renew automatically (monthly or yearly) until cancelled.</p>

                            <h3 className="text-lg font-medium text-white mb-2">7.2 Cancellation</h3>
                            <p className="mb-4">You can cancel at any time. Cancellation takes effect at the end of the current billing period; you keep access until then.</p>

                            <h3 className="text-lg font-medium text-white mb-2">7.3 Refunds</h3>
                            <p className="mb-4">Refunds are case-by-case at Trakzi&apos;s reasonable discretion. Contact <a href="mailto:help@trakzi.com" className="text-primary hover:underline">help@trakzi.com</a> with details.</p>

                            <h3 className="text-lg font-medium text-white mb-2">7.4 Right of Withdrawal (EU Consumers)</h3>
                            <p>If you are an EU consumer buying online, you may have a 14-day right of withdrawal for distance contracts, subject to exceptions—particularly for services that begin immediately with your consent and acknowledgement. If you request immediate access to the Service during the withdrawal period, you acknowledge this may affect your withdrawal right as permitted by law.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">8. Acceptable Use</h2>
                            <p className="mb-4">You agree not to:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>use the Service unlawfully;</li>
                                <li>bypass plan limits or security controls;</li>
                                <li>upload malware or attempt to disrupt the Service;</li>
                                <li>scrape, reverse engineer, or abuse the Service.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">9. Intellectual Property</h2>
                            <p>The Service and its components are protected by IP laws. You receive a limited, revocable, non-exclusive right to use the Service according to your plan.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">10. Feedback</h2>
                            <p>If you provide feedback, you allow Trakzi to use it without compensation.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">11. Disclaimers</h2>
                            <p>The Service is provided &quot;as is&quot; and &quot;as available.&quot; We do not guarantee extracted data is error-free or that the Service will be uninterrupted.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">12. Limitation of Liability</h2>
                            <p>To the maximum extent permitted by law, Trakzi will not be liable for indirect or consequential damages. Total liability is limited to amounts paid in the 12 months before the claim (or €0 for Free users), except where liability cannot be limited by law.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">13. Governing Law and Jurisdiction</h2>
                            <p>These Terms are governed by Spanish law. Disputes will be subject to the courts of Valencia, Spain, unless mandatory consumer protections apply.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">14. Contact</h2>
                            <p><a href="mailto:help@trakzi.com" className="text-primary hover:underline">help@trakzi.com</a></p>
                        </section>
                    </div>

                    {/* Footer links */}
                    <div className="mt-12 pt-8 border-t border-zinc-800">
                        <p className="text-sm text-zinc-500">
                            Related: <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> · <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link> · <Link href="/legal" className="text-primary hover:underline">Legal Notice</Link>
                        </p>
                    </div>
                </motion.article>
            </main>
        </div>
    )
}
