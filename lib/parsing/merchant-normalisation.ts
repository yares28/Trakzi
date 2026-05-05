// lib/parsing/merchant-normalisation.ts
// 5-stage pipeline to extract a clean merchant name from raw bank transaction descriptions.

const BANK_PREFIXES: RegExp[] = [
    /^(COMPRA|PAGO\s+EN|PAGO|RECIBO|TRANSFERENCIA|BIZUM|CARGO|ABONO|INGRESO|TARJETA|TPV|POS)\s+/i,
    /^(EN|DE|A|DESDE|HACIA)\s+/i,
    /^(CARD\s+PURCHASE|CONTACTLESS|DIRECT\s+DEBIT|STANDING\s+ORDER|BANK\s+TRANSFER)\s+/i,
    /^(PURCHASE\s+AT|PAYMENT\s+TO|PAYMENT\s+FROM|WITHDRAWAL\s+AT)\s+/i,
    /^(POS\s+PURCHASE|ACH\s+DEBIT|ACH\s+CREDIT|CHECKCARD)\s+/i,
    /^(WWW\.|HTTPS?:\/\/)/i,
];

const TRAILING_NOISE: RegExp[] = [
    /\s+[A-Z0-9]{6,}$/i,
    /\s+REF[:\s]*[\w-]+$/i,
    /\s+NIF[:\s]*[A-Z0-9]+$/i,
    /\s+POLIZA[:\s]*[\d]+$/i,
    /\s+\*+\d+$/i,
    /\s+\d{2}\/\d{2}\/\d{2,4}$/i,
    /\s+\d+[.,]\d{2}\s*(EUR|GBP|USD|€|£|\$)?$/i,
    /\s+(Nº?\s*RECIBO|RECEIPT\s*NO\.?)\s*[\d\s-]+$/i,
    /\s+DEL\s+\d{6,8}\s+AL\s+\d{6,8}$/i,
    /\s+\d{6}\s+\d{8}$/,
    /\s+[A-Z]{2}\d{2}[A-Z0-9]{4,}$/,
];

const DOMAIN_REGEX = /\b([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)\.(com|es|net|org|eu|co|uk|de|fr|it|nl|io|app|shop|store|online|info|biz|me|tv|ai|tech|pt|pl|se|no|dk|fi|be|at|ch|mx|br|ar|cl|au|nz|ca|in|sg|hk|jp)\b/i;

function titleCase(str: string): string {
    return str
        .toLowerCase()
        .split(' ')
        .map(w => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
        .join(' ');
}

function isCleanName(name: string): boolean {
    if (name.length > 35) return false;
    if (/[A-Z]{5,}/.test(name)) return false;
    if (/\d{4,}/.test(name)) return false;
    return name.trim().length >= 2;
}

export function normaliseMerchantName(description: string): string {
    let cleaned = description.trim();

    // Stage 1 — strip bank noise prefixes (loop until no more match)
    let changed = true;
    while (changed) {
        changed = false;
        for (const re of BANK_PREFIXES) {
            const after = cleaned.replace(re, '');
            if (after !== cleaned) {
                cleaned = after.trim();
                changed = true;
                break;
            }
        }
    }

    // Stage 2 — strip trailing noise tokens (loop until stable)
    changed = true;
    while (changed) {
        changed = false;
        for (const re of TRAILING_NOISE) {
            const after = cleaned.replace(re, '');
            if (after !== cleaned) {
                cleaned = after.trim();
                changed = true;
                break;
            }
        }
    }

    // Stage 3 — URL / domain extraction
    const domainMatch = cleaned.match(DOMAIN_REGEX);
    if (domainMatch) {
        cleaned = domainMatch[1];
    }

    // Stage 4 — strip remaining inline noise tokens
    cleaned = cleaned
        .replace(/\b(TPV|POS|TARJETA|CARD|DEBIT|CREDIT|ONLINE|PURCHASE)\b/gi, '')
        .replace(/[*#|_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Stage 5 — intelligent length trimming (replaces hard 30-char / 3-word cap)
    const words = cleaned.split(' ').filter(Boolean);
    if (words.length > 5) {
        const four = words.slice(0, 4).join(' ');
        cleaned = four.length >= 10 ? four : words.slice(0, 3).join(' ');
    } else if (cleaned.length > 45) {
        cleaned = words.slice(0, 4).join(' ');
    }

    cleaned = titleCase(cleaned);

    if (!isCleanName(cleaned)) {
        // Fallback: return best-effort or raw truncation
        return cleaned || description.substring(0, 30);
    }

    return cleaned || description.substring(0, 30);
}
