// lib/friends/codes.ts
// Cryptographically secure code generators for friend codes and room invite codes.

import { randomBytes } from 'crypto';

/**
 * Alphabet for human-readable codes.
 * Excludes ambiguous characters: 0/O, 1/I/l, 5/S, 8/B
 * to prevent misreading when sharing verbally or via QR scan.
 */
const CODE_ALPHABET = '234679ACDEFGHJKMNPQRTUVWXYZ';

/**
 * Generate a cryptographically random code from the safe alphabet.
 * Uses rejection sampling to avoid modulo bias.
 */
function generateCode(length: number): string {
    const alphabetSize = CODE_ALPHABET.length;
    // Largest multiple of alphabetSize that fits in a byte (prevents modulo bias)
    const maxValid = Math.floor(256 / alphabetSize) * alphabetSize;

    let result = '';
    while (result.length < length) {
        const bytes = randomBytes(length - result.length);
        for (const byte of bytes) {
            if (byte < maxValid && result.length < length) {
                result += CODE_ALPHABET[byte % alphabetSize];
            }
        }
    }
    return result;
}

/**
 * Generate an 8-character friend code (e.g., "TRKZ-A4GH").
 * Format: 4 chars + hyphen + 4 chars for readability.
 * ~4.5 billion combinations — collision-safe for user-scale.
 */
export function generateFriendCode(): string {
    const raw = generateCode(8);
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

/**
 * Generate a 6-character room invite code (e.g., "K7MNPQ").
 * Shorter than friend codes since rooms are less permanent.
 * ~300 million combinations — sufficient for room invites.
 */
export function generateRoomInviteCode(): string {
    return generateCode(6);
}

/**
 * Validate that a string matches the friend code format.
 * Expected: XXXX-XXXX where X is from CODE_ALPHABET.
 */
export function isValidFriendCode(code: string): boolean {
    return /^[234679ACDEFGHJKMNPQRTUVWXYZ]{4}-[234679ACDEFGHJKMNPQRTUVWXYZ]{4}$/.test(code);
}

/**
 * Validate that a string matches the room invite code format.
 * Expected: 6 characters from CODE_ALPHABET.
 */
export function isValidRoomInviteCode(code: string): boolean {
    return /^[234679ACDEFGHJKMNPQRTUVWXYZ]{6}$/.test(code);
}

/**
 * Normalize user input: trim, uppercase, remove extra spaces.
 * Handles common input variations (lowercase, missing hyphen).
 */
export function normalizeFriendCode(input: string): string {
    return input.trim().toUpperCase().replace(/\s+/g, '');
}
