"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

/**
 * Hook to handle pending checkout after user signs up
 * Checks localStorage for a pending priceId and redirects to checkout
 * For EXISTING users (already have account), redirects to dashboard instead
 * Only NEW users go through Stripe checkout
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

        // Process the checkout
        const processCheckout = async () => {
            setIsProcessing(true)

            try {
                // Check if user already exists in our system (has subscription record)
                const subResponse = await fetch('/api/subscription/status')

                if (subResponse.ok) {
                    const subData = await subResponse.json()

                    // Check if user already has ANY subscription record (meaning they're an existing user)
                    // The API returns usage data for existing users, even on free plan
                    if (subData.usage && subData.usage.totalTransactions !== undefined) {
                        // User already exists in the system
                        if (subData.plan && subData.plan !== 'free') {
                            // User has a paid plan
                            toast.info('Welcome back! You already have an active subscription.', {
                                description: 'Manage your subscription from the Dashboard.',
                                duration: 5000,
                            })
                        } else {
                            // User exists but is on free plan - they can upgrade from dashboard
                            toast.success('Welcome back!', {
                                description: 'You can upgrade your plan from the Dashboard.',
                                duration: 5000,
                            })
                        }
                        router.push('/dashboard')
                        return
                    }
                }

                // User is NEW - proceed with Stripe checkout
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
                    // Validate redirect goes to Stripe before navigating
                    const redirectUrl = new URL(data.url)
                    if (!redirectUrl.hostname.endsWith('stripe.com')) {
                        throw new Error('Invalid checkout redirect URL')
                    }
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
