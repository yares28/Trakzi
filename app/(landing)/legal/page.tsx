"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function LegalNoticePage() {
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
                    <h1 className="text-3xl font-bold mb-2">Legal Notice</h1>
                    <p className="text-zinc-400 text-sm mb-8">(Aviso Legal)</p>

                    <div className="space-y-8 text-zinc-300">
                        <section>
                            <p className="text-sm text-zinc-400">
                                <strong>Website:</strong> <a href="https://www.trakzi.com" className="text-primary hover:underline">https://www.trakzi.com</a><br />
                                <strong>Owner / Service Provider:</strong> Yahya Fares (individual)<br />
                                <strong>Address:</strong> Carrer de Borriol 9, 46022 Valencia, Spain<br />
                                <strong>Email:</strong> <a href="mailto:help@trakzi.com" className="text-primary hover:underline">help@trakzi.com</a><br />
                                <strong>Governing Law:</strong> Spain
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">1. Purpose</h2>
                            <p>This Legal Notice regulates access to and use of the website and web application Trakzi (the &quot;Website&quot; / &quot;Service&quot;). By browsing or using the Service, you agree to this Legal Notice, the <Link href="/terms" className="text-primary hover:underline">Terms & Conditions</Link>, and the <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">2. Intellectual Property</h2>
                            <p>All rights to the Website, its source code, design, text, trademarks, and other content are owned by the Service Provider or licensed to them. Any reproduction, distribution, or public communication without authorization is prohibited.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">3. Responsibility</h2>
                            <p>The Service Provider does not guarantee uninterrupted availability and may perform maintenance or suspend access for security or technical reasons. Users are responsible for ensuring their use complies with applicable law.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">4. External Links</h2>
                            <p>If the Website contains links to third-party sites, Trakzi is not responsible for their content, policies, or practices.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-4">5. Applicable Law and Jurisdiction</h2>
                            <p>This Legal Notice is governed by Spanish law. Any disputes will be submitted to the Courts of Valencia, Spain, unless mandatory consumer rules require otherwise.</p>
                        </section>
                    </div>

                    {/* Footer links */}
                    <div className="mt-12 pt-8 border-t border-zinc-800">
                        <p className="text-sm text-zinc-500">
                            Related: <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> · <Link href="/terms" className="text-primary hover:underline">Terms & Conditions</Link> · <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>
                        </p>
                    </div>
                </motion.article>
            </main>
        </div>
    )
}
