"use client";

// app/billing/return/page.tsx
// Handles redirect after Stripe Checkout or Portal
// Syncs subscription and redirects to dashboard

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { mutate } from "swr";

export const dynamic = 'force-dynamic';

export default function BillingReturnPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("Syncing your subscription...");

    useEffect(() => {
        async function syncAndRedirect() {
            try {
                // Call sync endpoint to update DB from Stripe
                const response = await fetch("/api/stripe/sync-subscription", {
                    method: "POST",
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Failed to sync subscription");
                }

                // Invalidate SWR cache for subscription endpoints
                await mutate("/api/subscription/me");
                await mutate("/api/subscription/status");
                await mutate("/api/checkout"); // Legacy endpoint

                setStatus("success");

                // Determine redirect based on URL params
                const checkoutStatus = searchParams.get("checkout");
                const plan = searchParams.get("plan");

                if (checkoutStatus === "success") {
                    setMessage(`You're now subscribed to ${plan?.toUpperCase() || "PRO"}!`);
                } else if (checkoutStatus === "canceled") {
                    setMessage("Checkout was cancelled.");
                } else {
                    setMessage("Your subscription has been updated.");
                }

                // Redirect after short delay
                setTimeout(() => {
                    router.push("/dashboard");
                }, 1500);
            } catch (error: any) {
                console.error("[BillingReturn] Error:", error);
                setStatus("error");
                setMessage(error.message || "Something went wrong. Redirecting...");

                // Still redirect to dashboard after error
                setTimeout(() => {
                    router.push("/dashboard");
                }, 2000);
            }
        }

        syncAndRedirect();
    }, [router, searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
                {status === "loading" && (
                    <>
                        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                        <p className="text-muted-foreground">{message}</p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                        <p className="text-foreground font-medium">{message}</p>
                        <p className="text-muted-foreground text-sm">Redirecting to dashboard...</p>
                    </>
                )}

                {status === "error" && (
                    <>
                        <XCircle className="h-12 w-12 text-red-500 mx-auto" />
                        <p className="text-foreground font-medium">{message}</p>
                        <p className="text-muted-foreground text-sm">Redirecting to dashboard...</p>
                    </>
                )}
            </div>
        </div>
    );
}
