"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

/**
 * Hook to handle pending checkout after user signs up
 * Checks localStorage for a pending priceId and redirects to checkout
 * Also checks if user already has a subscription and redirects to dashboard
 */
export function usePendingCheckout() {
    const { isSignedIn, isLoaded } = useAuth()
    const router = useRouter()
    const [isProcessing, setIsProcessing] = useState(false)

    useEffect(() => {
        // Only run when auth is loaded and user is signed in
        if (!isLoaded || !isSignedIn) return

        const pendingPriceId = localStorage.getItem('pendingCheckoutPriceId')

        if (!pendingPriceId) return

        // Clear the pending checkout immediately to prevent loops
        localStorage.removeItem('pendingCheckoutPriceId')

        // Redirect to checkout
        const processCheckout = async () => {
            setIsProcessing(true)

            try {
                // First check if user already has a subscription
                const subResponse = await fetch('/api/subscription/status')
                if (subResponse.ok) {
                    const subData = await subResponse.json()
                    // If user already has a paid plan (not free), redirect to dashboard
                    if (subData.plan && subData.plan !== 'free') {
                        toast.info('Welcome back! You already have an active subscription.', {
                            description: 'Manage your subscription from the Dashboard.',
                            duration: 5000,
                        })
                        router.push('/dashboard')
                        return
                    }
                }

                const response = await fetch('/api/checkout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        priceId: pendingPriceId,
                    }),
                })

                const data = await response.json()

                if (data.error) {
                    console.error('Checkout error:', data.error)
                    toast.error('Failed to start checkout. Please try selecting a plan again.')
                    router.push('/dashboard')
                    return
                }

                if (data.url) {
                    // Redirect to Stripe checkout
                    window.location.href = data.url
                }
            } catch (error) {
                console.error('Checkout error:', error)
                toast.error('Failed to start checkout. Please try again.')
                router.push('/dashboard')
            } finally {
                setIsProcessing(false)
            }
        }

        processCheckout()
    }, [isSignedIn, isLoaded, router])

    return { isProcessing }
}
