import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import { invalidateUserCachePrefix } from '@/lib/cache/upstash'
import { isValidCountryName } from '@/lib/data/country-codes'
import type {
    CreateCountryInstanceRequest,
    CreateCountryInstanceResponse,
    CountryInstancesResponse,
    CountryInstance
} from '@/lib/types/pockets'

/**
 * GET /api/pockets/instances
 * Get all country instances for the current user
 */
export async function GET() {
    try {
        const userId = await getCurrentUserId()

        const rows = await neonQuery<CountryInstance>(
            `SELECT
                id,
                user_id,
                country_name,
                label,
                created_at::text as created_at,
                updated_at::text as updated_at
            FROM country_instances
            WHERE user_id = $1
            ORDER BY created_at DESC`,
            [userId]
        )

        const response: CountryInstancesResponse = {
            instances: rows
        }

        return NextResponse.json(response)

    } catch (error: unknown) {
        console.error('[Pockets Instances GET] Error:', error)
        const message = error instanceof Error ? error.message : 'Something went wrong loading your countries'
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}

/**
 * POST /api/pockets/instances
 * Create a new country instance
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId()
        const body: CreateCountryInstanceRequest = await request.json()

        const { country_name, label } = body

        // Validate country name
        if (!country_name || typeof country_name !== 'string') {
            return NextResponse.json(
                { error: 'Please select a country' },
                { status: 400 }
            )
        }

        if (!isValidCountryName(country_name)) {
            return NextResponse.json(
                { error: `"${country_name}" is not a recognised country name` },
                { status: 400 }
            )
        }

        // Validate label
        if (!label || typeof label !== 'string' || label.trim().length === 0) {
            return NextResponse.json(
                { error: 'Please enter a name for this trip' },
                { status: 400 }
            )
        }

        // Trim label
        const trimmedLabel = label.trim()

        // Check for duplicate (user_id, country_name, label) combination
        const existing = await neonQuery<{ id: number }>(
            `SELECT id FROM country_instances
            WHERE user_id = $1 AND country_name = $2 AND label = $3`,
            [userId, country_name, trimmedLabel]
        )

        if (existing.length > 0) {
            return NextResponse.json(
                { error: `"${trimmedLabel}" already exists for ${country_name}. Please choose a different name.` },
                { status: 409 }
            )
        }

        // Create the instance
        const result = await neonQuery<CountryInstance>(
            `INSERT INTO country_instances (user_id, country_name, label)
            VALUES ($1, $2, $3)
            RETURNING
                id,
                user_id,
                country_name,
                label,
                created_at::text as created_at,
                updated_at::text as updated_at`,
            [userId, country_name, trimmedLabel]
        )

        if (result.length === 0) {
            throw new Error('Failed to create country instance')
        }

        const instance = result[0]

        // Invalidate cache
        await invalidateUserCachePrefix(userId, 'pockets')

        const response: CreateCountryInstanceResponse = {
            instance
        }

        return NextResponse.json(response, { status: 201 })

    } catch (error: unknown) {
        console.error('[Pockets Instances POST] Error:', error)
        const message = error instanceof Error ? error.message : 'Something went wrong creating this country'
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}

/**
 * PATCH /api/pockets/instances?id=123
 * Update a country instance label
 */
export async function PATCH(request: Request) {
    try {
        const userId = await getCurrentUserId()
        const { searchParams } = new URL(request.url)
        const instanceId = searchParams.get('id')
        const body = await request.json()

        if (!instanceId) {
            return NextResponse.json(
                { error: 'Could not find which country to update' },
                { status: 400 }
            )
        }

        const id = parseInt(instanceId, 10)
        if (isNaN(id)) {
            return NextResponse.json(
                { error: 'Could not find which country to update' },
                { status: 400 }
            )
        }

        const { label } = body

        // Validate label
        if (!label || typeof label !== 'string' || label.trim().length === 0) {
            return NextResponse.json(
                { error: 'Please enter a name for this trip' },
                { status: 400 }
            )
        }

        const trimmedLabel = label.trim()

        // Verify the instance belongs to the user and get its country_name
        const verify = await neonQuery<{ id: number; country_name: string }>(
            `SELECT id, country_name FROM country_instances
            WHERE id = $1 AND user_id = $2`,
            [id, userId]
        )

        if (verify.length === 0) {
            return NextResponse.json(
                { error: 'This country was not found. It may have been deleted.' },
                { status: 404 }
            )
        }

        const instance = verify[0]

        // Check for duplicate label (same country, same user, different instance)
        const duplicate = await neonQuery<{ id: number }>(
            `SELECT id FROM country_instances
            WHERE user_id = $1 AND country_name = $2 AND label = $3 AND id != $4`,
            [userId, instance.country_name, trimmedLabel, id]
        )

        if (duplicate.length > 0) {
            return NextResponse.json(
                { error: `"${trimmedLabel}" already exists for ${instance.country_name}. Please choose a different name.` },
                { status: 409 }
            )
        }

        // Update the instance label
        const result = await neonQuery<CountryInstance>(
            `UPDATE country_instances
            SET label = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND user_id = $3
            RETURNING
                id,
                user_id,
                country_name,
                label,
                created_at::text as created_at,
                updated_at::text as updated_at`,
            [trimmedLabel, id, userId]
        )

        if (result.length === 0) {
            throw new Error('Failed to update country instance')
        }

        const updatedInstance = result[0]

        // Invalidate cache
        await invalidateUserCachePrefix(userId, 'pockets')

        return NextResponse.json({
            success: true,
            instance: updatedInstance
        })

    } catch (error: unknown) {
        console.error('[Pockets Instances PATCH] Error:', error)
        const message = error instanceof Error ? error.message : 'Something went wrong updating this country'
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/pockets/instances?id=123
 * Delete a country instance (transactions are unlinked via ON DELETE SET NULL)
 */
export async function DELETE(request: Request) {
    try {
        const userId = await getCurrentUserId()
        const { searchParams } = new URL(request.url)
        const instanceId = searchParams.get('id')

        if (!instanceId) {
            return NextResponse.json(
                { error: 'Could not find which country to delete' },
                { status: 400 }
            )
        }

        const id = parseInt(instanceId, 10)
        if (isNaN(id)) {
            return NextResponse.json(
                { error: 'Could not find which country to delete' },
                { status: 400 }
            )
        }

        // Verify the instance belongs to the user before deleting
        const verify = await neonQuery<{ id: number }>(
            `SELECT id FROM country_instances
            WHERE id = $1 AND user_id = $2`,
            [id, userId]
        )

        if (verify.length === 0) {
            return NextResponse.json(
                { error: 'This country was not found. It may have already been deleted.' },
                { status: 404 }
            )
        }

        // Delete the instance (transactions are automatically unlinked via ON DELETE SET NULL)
        await neonQuery(
            `DELETE FROM country_instances
            WHERE id = $1 AND user_id = $2`,
            [id, userId]
        )

        // Invalidate cache
        await invalidateUserCachePrefix(userId, 'pockets')

        return NextResponse.json({
            success: true,
            deleted: id
        })

    } catch (error: unknown) {
        console.error('[Pockets Instances DELETE] Error:', error)
        const message = error instanceof Error ? error.message : 'Something went wrong deleting this country'
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}
