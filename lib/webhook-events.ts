// lib/webhook-events.ts
// Webhook event idempotency tracking (Stripe best practice)
// Prevents duplicate processing of webhook events

import { neonQuery } from './neonClient';

export type WebhookEventStatus = 'processing' | 'completed' | 'failed';

export interface WebhookEvent {
    event_id: string;
    event_type: string;
    status: WebhookEventStatus;
    error_message: string | null;
    subscription_id: string | null;
    customer_id: string | null;
    processed_at: Date | null;
    created_at: Date;
}

interface WebhookEventRow {
    event_id: string;
    event_type: string;
    status: string;
    error_message: string | null;
    subscription_id: string | null;
    customer_id: string | null;
    processed_at: string | Date | null;
    created_at: string | Date;
}

function rowToWebhookEvent(row: WebhookEventRow): WebhookEvent {
    return {
        event_id: row.event_id,
        event_type: row.event_type,
        status: row.status as WebhookEventStatus,
        error_message: row.error_message,
        subscription_id: row.subscription_id,
        customer_id: row.customer_id,
        processed_at: row.processed_at ? new Date(row.processed_at) : null,
        created_at: new Date(row.created_at),
    };
}

/**
 * Check if a webhook event has already been processed
 * Returns the event if found, null otherwise
 */
export async function getWebhookEvent(eventId: string): Promise<WebhookEvent | null> {
    const rows = await neonQuery<WebhookEventRow>(
        `SELECT * FROM webhook_events WHERE event_id = $1 LIMIT 1`,
        [eventId]
    );

    if (rows.length === 0) {
        return null;
    }

    return rowToWebhookEvent(rows[0]);
}

/**
 * Check if an event has already been successfully processed
 */
export async function isEventProcessed(eventId: string): Promise<boolean> {
    const event = await getWebhookEvent(eventId);
    return event?.status === 'completed';
}

/**
 * Atomically claim a webhook event for processing.
 * Uses INSERT ... ON CONFLICT DO NOTHING so only ONE concurrent caller
 * gets a returned row — the other(s) get an empty result and must skip.
 *
 * Returns true if THIS caller successfully claimed the event (should process).
 * Returns false if another process already claimed it (must skip).
 */
export async function claimWebhookEvent(
    eventId: string,
    eventType: string,
    metadata?: { subscriptionId?: string; customerId?: string }
): Promise<boolean> {
    const rows = await neonQuery<{ event_id: string }>(
        `INSERT INTO webhook_events (event_id, event_type, status, subscription_id, customer_id)
         VALUES ($1, $2, 'processing', $3, $4)
         ON CONFLICT (event_id) DO NOTHING
         RETURNING event_id`,
        [eventId, eventType, metadata?.subscriptionId ?? null, metadata?.customerId ?? null]
    );
    // Non-empty means we inserted (claimed). Empty means conflict — already claimed.
    return rows.length > 0;
}

/**
 * @deprecated Use claimWebhookEvent() instead — it's atomic and race-safe.
 */
export async function markEventAsProcessing(
    eventId: string,
    eventType: string,
    metadata?: { subscriptionId?: string; customerId?: string }
): Promise<void> {
    await claimWebhookEvent(eventId, eventType, metadata);
}

/**
 * Mark an event as successfully processed
 */
export async function markEventAsCompleted(
    eventId: string,
    metadata?: { subscriptionId?: string; customerId?: string }
): Promise<void> {
    await neonQuery(
        `UPDATE webhook_events 
         SET status = 'completed',
             processed_at = NOW(),
             subscription_id = COALESCE($2, subscription_id),
             customer_id = COALESCE($3, customer_id)
         WHERE event_id = $1`,
        [eventId, metadata?.subscriptionId ?? null, metadata?.customerId ?? null]
    );
}

/**
 * Mark an event as failed (allows Stripe to retry)
 */
export async function markEventAsFailed(
    eventId: string,
    error: Error | string,
    metadata?: { subscriptionId?: string; customerId?: string }
): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await neonQuery(
        `UPDATE webhook_events 
         SET status = 'failed',
             error_message = $2,
             subscription_id = COALESCE($3, subscription_id),
             customer_id = COALESCE($4, customer_id)
         WHERE event_id = $1`,
        [eventId, errorMessage, metadata?.subscriptionId ?? null, metadata?.customerId ?? null]
    );
}

/**
 * Get failure count for an event (for monitoring/alerting)
 */
export async function getEventFailureCount(eventId: string): Promise<number> {
    // This would require tracking retry attempts separately
    // For now, we can check if event exists and has failed status
    const event = await getWebhookEvent(eventId);
    return event?.status === 'failed' ? 1 : 0;
}

