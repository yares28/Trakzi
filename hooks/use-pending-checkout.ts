"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

/**
 * Hook to handle pending checkout after user signs up
 * Checks localStorage for a pending priceId and redirects to checkout
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
                    return
                }

                if (data.url) {
                    // Redirect to Stripe checkout
                    window.location.href = data.url
                }
            } catch (error) {
                console.error('Checkout error:', error)
                toast.error('Failed to start checkout. Please try again.')
            } finally {
                setIsProcessing(false)
            }
        }

        processCheckout()
    }, [isSignedIn, isLoaded, router])

    return { isProcessing }
}
