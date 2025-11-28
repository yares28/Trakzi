// lib/parsing/parsePdfToRows.ts
import { TxRow } from "../types/transactions";

// pdf-parse is a CommonJS module that uses browser APIs (DOMMatrix)
// We load it dynamically to avoid SSR issues
// This function is only called when actually parsing a PDF, not during module evaluation
async function getPdfParse(): Promise<(buffer: Buffer) => Promise<any>> {
    // Use require for CommonJS module (pdf-parse v1.1.1 exports a function directly)
    // In Next.js API routes, require works fine for server-side code
    const pdfParseModule = require("pdf-parse");

    // pdf-parse v1.1.1 exports the function directly
    // Handle both direct function export and wrapped exports
    if (typeof pdfParseModule === 'function') {
        return pdfParseModule;
    }

    // Try default export (for ES module compatibility)
    if (pdfParseModule?.default && typeof pdfParseModule.default === 'function') {
        return pdfParseModule.default;
    }

    // If it's an object, it might be callable (some CommonJS wrappers)
    if (pdfParseModule && typeof pdfParseModule === 'object') {
        // Some versions wrap the function but it's still callable
        return pdfParseModule as any;
    }

    throw new Error(
        `Cannot find pdf-parse function. ` +
        `Module type: ${typeof pdfParseModule}. ` +
        `Available properties: ${pdfParseModule ? Object.keys(pdfParseModule).join(', ') : 'none'}`
    );
}

function parseEuroAmount(str: string): number {
    if (!str) return 0;

    // Normalize: handle various minus signs, currency symbols, and whitespace
    let cleaned = str
        .replace(/[ −–—]/g, "-")  // Various minus signs
        .replace(/€/g, "")         // Remove Euro symbol
        .replace(/\s+/g, "")       // Remove all whitespace
        .trim();

    // Handle European number format: "1.234,56" -> "1234.56"
    // Check if there's a comma (likely decimal separator in European format)
    if (cleaned.includes(',')) {
        // If comma is followed by 2 digits, it's likely decimal separator
        if (/,(\d{1,2})$/.test(cleaned)) {
            // European format: remove dots (thousands), replace comma with dot
            cleaned = cleaned.replace(/\./g, "").replace(",", ".");
        } else {
            // Comma might be thousands separator, just remove it
            cleaned = cleaned.replace(/,/g, "");
        }
    } else {
        // No comma: dots might be thousands separator or decimal
        // If there are multiple dots, they're likely thousands separators
        const dotCount = (cleaned.match(/\./g) || []).length;
        if (dotCount > 1 || (dotCount === 1 && cleaned.split('.')[1]?.length === 3)) {
            // Thousands separator, remove dots
            cleaned = cleaned.replace(/\./g, "");
        }
        // Otherwise, dot is decimal separator (keep it)
    }

    const result = parseFloat(cleaned);
    if (isNaN(result)) {
        console.warn(`[PDF Parse] Failed to parse amount: "${str}" -> "${cleaned}"`);
        return 0;
    }
    return result;
}

function parseDateString(raw: string): string {
    // '30 oct 2025' -> '2025-10-30'
    const parts = raw.trim().split(/\s+/);
    if (parts.length < 3) {
        throw new Error(`Invalid date format: ${raw}`);
    }

    const [day, mon, year] = parts;
    const monthMap: Record<string, string> = {
        ene: "01", feb: "02", mar: "03", abr: "04", may: "05", jun: "06",
        jul: "07", ago: "08", sep: "09", oct: "10", nov: "11", dic: "12",
        jan: "01", apr: "04", aug: "08", dec: "12"
    };

    const mm = monthMap[mon.toLowerCase()];
    if (!mm) {
        throw new Error(`Unknown month: ${mon} in date: ${raw}`);
    }

    return `${year}-${mm}-${day.padStart(2, "0")}`;
}

export async function parsePdfToRows(fileBuffer: Buffer): Promise<TxRow[]> {
    // Get the pdf-parse function (v1.1.1 exports it directly)
    const pdfParseFn = await getPdfParse();

    // Parse the PDF buffer
    const data = await pdfParseFn(fileBuffer);
    const text = data.text;

    // Log raw text for debugging (first 1000 chars)
    console.log(`[PDF Parse] Raw text length: ${text.length} characters`);
    if (text.length > 0) {
        console.log(`[PDF Parse] First 1000 chars:`, text.substring(0, 1000));
    } else {
        console.error("[PDF Parse] WARNING: No text extracted from PDF! PDF might be image-based or corrupted.");
    }

    // Normalize text: handle various whitespace and line break patterns
    // But preserve line structure for parsing
    // Don't collapse all whitespace - preserve line breaks which are important
    const normalizedText = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n'); // Collapse multiple blank lines only

    const lines = normalizedText.split('\n').map((l: string) => l.trim()).filter(Boolean);

    console.log(`[PDF Parse] Extracted ${lines.length} lines from PDF`);
    if (lines.length < 5) {
        console.warn("[PDF Parse] Very few lines extracted, PDF might be image-based or empty");
        console.warn("[PDF Parse] Full text:", text);
    }

    // Log first 20 lines for debugging
    console.log(`[PDF Parse] First 20 lines:`, lines.slice(0, 20));

    const rows: TxRow[] = [];
    const monthMap: Record<string, string> = {
        // Spanish
        ene: "01", feb: "02", mar: "03", abr: "04", may: "05", jun: "06",
        jul: "07", ago: "08", sep: "09", oct: "10", nov: "11", dic: "12",
        // English (only those different from Spanish)
        jan: "01", apr: "04", aug: "08", dec: "12"
    };

    // Strategy 1: Try to find header and parse structured format
    let headerIdx = -1;
    const headerPatterns = [
        { pattern: /transaction.*date.*amount.*balance/i, name: "transaction date amount balance" },
        { pattern: /fecha.*importe.*saldo/i, name: "fecha importe saldo" },
        { pattern: /date.*amount.*balance/i, name: "date amount balance" },
        { pattern: /transaction.*date/i, name: "transaction date" },
        { pattern: /movimiento/i, name: "movimiento" }
    ];

    for (const { pattern, name } of headerPatterns) {
        headerIdx = lines.findIndex((l: string) => pattern.test(l.toLowerCase()));
        if (headerIdx !== -1) {
            console.log(`[PDF Parse] Found header pattern "${name}" at line ${headerIdx}`);
            break;
        }
    }

    // Strategy 2: If header found, parse structured format
    if (headerIdx !== -1) {
        // First, try to detect if it's a table format (pipe-separated or tab-separated)
        const isTableFormat = lines.slice(headerIdx, headerIdx + 3).some((l: string) => 
            l.includes('|') || (l.split(/\s{2,}/).length >= 3 && /^\d{1,2}\s+\w{3}\s+\d{4}/i.test(l))
        );
        
        if (isTableFormat) {
            console.log("[PDF Parse] Detected table format, using table parser");
            // Table format: each row has date, description, amount, balance separated by | or multiple spaces
            for (let i = headerIdx + 1; i < lines.length; i++) {
                const line = lines[i];
                
                // Skip empty lines
                if (!line.trim()) {
                    continue;
                }
                
                // Skip pure value date lines (but check if they have transaction data)
                if (line.toLowerCase().match(/^value\s+date:|^fecha\s+valor:/i)) {
                    // Check if this line also contains transaction data (amount/balance)
                    if (!/[−–-]?\d[\d\.\,]*\s*€/.test(line)) {
                        continue; // Pure value date line, skip it
                    }
                    // Otherwise, it might have transaction data, continue parsing
                }
                
                // Try to parse as table row: date | description | amount | balance
                // Handle both pipe-separated and space-separated tables
                let parts: string[] = [];
                if (line.includes('|')) {
                    parts = line.split('|').map(p => p.trim()).filter(p => p.length > 0);
                } else {
                    // Space-separated: split on 2+ spaces, but be more flexible
                    // First try splitting on 3+ spaces (more reliable for tables)
                    parts = line.split(/\s{3,}/).map(p => p.trim()).filter(p => p.length > 0);
                    // If that doesn't give us enough parts, try 2+ spaces
                    if (parts.length < 3) {
                        parts = line.split(/\s{2,}/).map(p => p.trim()).filter(p => p.length > 0);
                    }
                }
                
                if (parts.length < 2) {
                    // Not a table row, might be a continuation line - try line-by-line parsing instead
                    continue;
                }
                
                // First part should be date (or might be in the line itself if not split properly)
                let dateMatch = parts[0].match(/^(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/i);
                
                // If first part doesn't have date, check the whole line
                if (!dateMatch) {
                    dateMatch = line.match(/^(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/i);
                    if (dateMatch) {
                        // Re-parse with date at start
                        const dateStr = dateMatch[0];
                        const restOfLine = line.slice(dateMatch.index! + dateMatch[0].length).trim();
                        parts = [dateStr, ...restOfLine.split(/\s{2,}|\|/).map(p => p.trim()).filter(p => p.length > 0)];
                    }
                }
                
                if (!dateMatch) {
                    // Not a transaction row, skip
                    continue;
                }
                
                const [, day, mon, year] = dateMatch;
                const isoDate = `${year}-${monthMap[mon.toLowerCase()]}-${day.padStart(2, "0")}`;
                
                // Find amount and balance (they should be in the last parts)
                let amount: number | null = null;
                let balance: number | null = null;
                let description = "";
                
                // Scan from end to find amount and balance
                // Amount usually has a minus sign, balance usually doesn't (or is positive)
                for (let p = parts.length - 1; p >= 0; p--) {
                    const part = parts[p];
                    const amountMatch = part.match(/([−–-]?\d[\d\.\,]*\s*€)/);
                    const balanceMatch = part.match(/(\d[\d\.\,]*\s*€)/);
                    
                    // Balance is typically the last numeric value with €
                    if (balanceMatch && balance === null && p === parts.length - 1) {
                        balance = parseEuroAmount(balanceMatch[1]);
                    }
                    // Amount is typically the one with minus sign, or second-to-last if no balance found
                    if (amountMatch && amount === null) {
                        const amt = parseEuroAmount(amountMatch[1]);
                        // If it has a minus or it's the second-to-last part, it's likely the amount
                        if (amountMatch[1].includes('-') || amountMatch[1].includes('−') || amountMatch[1].includes('–') || p === parts.length - 2) {
                            amount = amt;
                        } else if (balance === null) {
                            // If no balance found yet, this might be the balance
                            balance = amt;
                        } else {
                            // Otherwise it's the amount
                            amount = amt;
                        }
                    }
                }
                
                // If we still don't have amount, scan the whole line
                if (amount === null) {
                    const lineAmountMatch = line.match(/([−–-]?\d[\d\.\,]*\s*€)/);
                    if (lineAmountMatch) {
                        amount = parseEuroAmount(lineAmountMatch[1]);
                    }
                }
                
                // Description is everything between date and amounts
                const descParts: string[] = [];
                for (let p = 1; p < parts.length; p++) {
                    const part = parts[p];
                    // Skip if it's an amount or balance
                    if (!part.match(/[−–-]?\d[\d\.\,]*\s*€/)) {
                        descParts.push(part);
                    }
                }
                description = descParts.join(" ").trim();
                
                // If description is empty, try extracting from the line directly
                if (!description || description.length < 3) {
                    // Remove date, amount, and balance from line to get description
                    let descLine = line.replace(dateMatch[0], "").trim();
                    descLine = descLine.replace(/([−–-]?\d[\d\.\,]*\s*€)/g, "").trim();
                    descLine = descLine.replace(/(\d[\d\.\,]*\s*€)/g, "").trim();
                    descLine = descLine.replace(/value\s+date:.*/i, "").trim();
                    if (descLine) {
                        description = descLine;
                    }
                }
                
                if (amount !== null) {
                    rows.push({
                        date: isoDate,
                        description: description || "Transaction",
                        amount,
                        balance
                    });
                    console.log(`[PDF Parse] Table row ${rows.length}: ${isoDate}, ${amount}, balance: ${balance}, "${description.substring(0, 50)}"`);
                } else {
                    console.warn(`[PDF Parse] Skipped line (no amount found): "${line.substring(0, 80)}"`);
                }
            }
        } else {
            // Original line-by-line parsing
            let i = headerIdx + 1;
            while (i < lines.length) {
                const dateLine = lines[i];
                // Match Spanish date format: "30 oct 2025" or "1 oct 2025"
                // Relaxed regex: allow trailing content (don't use $)
                const dateMatch = dateLine.match(/^(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/i);

            if (!dateMatch) {
                i++;
                continue;
            }

            const [, day, mon, year] = dateMatch;
            const isoDate = `${year}-${monthMap[mon.toLowerCase()]}-${day.padStart(2, "0")}`;
            i++;

            // Skip value date line if present (but don't skip if it contains transaction info)
            if (lines[i]?.toLowerCase().match(/^value\s+date:|^fecha\s+valor:/i)) {
                i++;
            }

            const descParts: string[] = [];
            let amount: number | null = null;
            let balance: number | null = null;

            // Look ahead for amount and balance (increased to 15 lines for longer descriptions)
            let foundTransaction = false;
            for (let j = i; j < Math.min(i + 15, lines.length) && !foundTransaction; j++) {
                const line = lines[j];

                // Skip pure value date lines (but continue looking)
                if (line.toLowerCase().match(/^value\s+date:|^fecha\s+valor:/i) && !/[−–-]?\d[\d\.\,]*\s*€/.test(line)) {
                    continue;
                }

                // Pattern 1: Amount and balance together on same line: "-45,20€  1.234,56€" or "-33,69€ | 1.591,87€"
                // Also handle table format with pipes: "-33,69€ | 1.591,87€"
                let match = line.match(/([−–-]?\d[\d\.\,]*\s*€)\s*[|]?\s*(\d[\d\.\,]*\s*€)/);
                if (!match) {
                    // Pattern 2: Amount and balance with different spacing (no pipe)
                    match = line.match(/([−–-]?\d[\d\.\,]*)\s*€\s+(\d[\d\.\,]*)\s*€/);
                }
                if (!match) {
                    // Pattern 3: Just amount: "-45,20€" (balance might be on next line or same line later)
                    match = line.match(/([−–-]?\d[\d\.\,]*\s*€)/);
                    if (match) {
                        // Check if balance is on same line after the amount
                        const afterAmount = line.slice((match.index || 0) + match[0].length);
                        const balanceOnSameLine = afterAmount.match(/(\d[\d\.\,]*\s*€)/);
                        
                        if (balanceOnSameLine) {
                            // Both on same line
                            amount = parseEuroAmount(match[1]);
                            balance = parseEuroAmount(balanceOnSameLine[1]);
                            const beforeAmounts = line.slice(0, match.index).trim();
                            if (beforeAmounts) descParts.push(beforeAmounts);
                            i = j + 1;
                            foundTransaction = true;
                            break;
                        } else if (j + 1 < lines.length) {
                            // Check next lines for balance (skip value date lines)
                            let nextLineIdx = j + 1;
                            while (nextLineIdx < lines.length && nextLineIdx < j + 4) {
                                const nextLine = lines[nextLineIdx];
                                // Skip pure value date lines
                                if (nextLine.toLowerCase().match(/^value\s+date:|^fecha\s+valor:/i) && !/[−–-]?\d[\d\.\,]*\s*€/.test(nextLine)) {
                                    nextLineIdx++;
                                    continue;
                                }
                                const balanceMatch = nextLine.match(/(\d[\d\.\,]*\s*€)/);
                                if (balanceMatch) {
                                    amount = parseEuroAmount(match[1]);
                                    balance = parseEuroAmount(balanceMatch[1]);
                                    const beforeAmounts = line.slice(0, match.index).trim();
                                    if (beforeAmounts) descParts.push(beforeAmounts);
                                    i = nextLineIdx + 1;
                                    foundTransaction = true;
                                    break;
                                }
                                // If next line is another date, stop looking
                                if (nextLine.match(/^\d{1,2}\s+\w{3}\s+\d{4}/i)) {
                                    break;
                                }
                                nextLineIdx++;
                            }
                            if (foundTransaction) {
                                break;
                            }
                            // If we found amount but no balance, still record the transaction
                            if (amount === null) {
                                amount = parseEuroAmount(match[1]);
                                const beforeAmounts = line.slice(0, match.index).trim();
                                if (beforeAmounts) descParts.push(beforeAmounts);
                                i = j + 1;
                                foundTransaction = true;
                                break;
                            }
                        }
                    }
                }

                if (match && match[2]) {
                    // Found both amount and balance on same line
                    amount = parseEuroAmount(match[1]);
                    balance = parseEuroAmount(match[2]);
                    const beforeAmounts = line.slice(0, match.index).trim();
                    if (beforeAmounts) descParts.push(beforeAmounts);
                    i = j + 1;
                    foundTransaction = true;
                    break;
                } else if (match && !match[2] && !foundTransaction) {
                    // Found only amount, try to find balance in next lines
                    amount = parseEuroAmount(match[1]);
                    const beforeAmounts = line.slice(0, match.index).trim();
                    if (beforeAmounts) descParts.push(beforeAmounts);

                    // Look for balance in next 4 lines (skip value date lines)
                    for (let k = j + 1; k < Math.min(j + 5, lines.length); k++) {
                        const balanceLine = lines[k];
                        // Skip pure value date lines
                        if (balanceLine.toLowerCase().match(/^value\s+date:|^fecha\s+valor:/i) && !/[−–-]?\d[\d\.\,]*\s*€/.test(balanceLine)) {
                            continue;
                        }
                        const balanceMatch = balanceLine.match(/(\d[\d\.\,]*\s*€)/);
                        if (balanceMatch) {
                            balance = parseEuroAmount(balanceMatch[1]);
                            i = k + 1;
                            foundTransaction = true;
                            break;
                        }
                        // Stop if we hit another date
                        if (balanceLine.match(/^\d{1,2}\s+\w{3}\s+\d{4}/i)) {
                            break;
                        }
                    }
                    if (!foundTransaction) {
                        // No balance found, but we have amount - still record transaction
                        i = j + 1;
                        foundTransaction = true;
                    }
                    break;
                } else if (line.match(/^\d{1,2}\s+\w{3}\s+\d{4}/i)) {
                    // Hit another date line, stop here
                    // But first, check if we have amount from previous lines
                    if (amount === null && descParts.length > 0) {
                        // Try to extract amount from description if it contains one
                        const descText = descParts.join(" ");
                        const amountInDesc = descText.match(/([−–-]?\d[\d\.\,]*\s*€)/);
                        if (amountInDesc) {
                            amount = parseEuroAmount(amountInDesc[1]);
                            // Remove amount from description
                            const descWithoutAmount = descText.replace(amountInDesc[0], "").trim();
                            descParts.length = 0;
                            if (descWithoutAmount) descParts.push(descWithoutAmount);
                        }
                    }
                    break;
                } else if (!foundTransaction) {
                    // Description line - but check if it contains amount info
                    const amountInLine = line.match(/([−–-]?\d[\d\.\,]*\s*€)/);
                    if (amountInLine && amount === null) {
                        // This line has amount, extract it
                        amount = parseEuroAmount(amountInLine[1]);
                        const descPart = line.slice(0, amountInLine.index).trim();
                        if (descPart) descParts.push(descPart);
                        // Look for balance in same line after amount
                        const afterAmount = line.slice((amountInLine.index || 0) + amountInLine[0].length);
                        const balanceInLine = afterAmount.match(/(\d[\d\.\,]*\s*€)/);
                        if (balanceInLine) {
                            balance = parseEuroAmount(balanceInLine[1]);
                            i = j + 1;
                            foundTransaction = true;
                            break;
                        }
                        // Look for balance in next lines
                        for (let k = j + 1; k < Math.min(j + 4, lines.length); k++) {
                            const nextLine = lines[k];
                            if (nextLine.toLowerCase().match(/^value\s+date:|^fecha\s+valor:/i) && !/[−–-]?\d[\d\.\,]*\s*€/.test(nextLine)) {
                                continue;
                            }
                            const balanceMatch = nextLine.match(/(\d[\d\.\,]*\s*€)/);
                            if (balanceMatch) {
                                balance = parseEuroAmount(balanceMatch[1]);
                                i = k + 1;
                                foundTransaction = true;
                                break;
                            }
                            if (nextLine.match(/^\d{1,2}\s+\w{3}\s+\d{4}/i)) {
                                break;
                            }
                        }
                        if (!foundTransaction) {
                            i = j + 1;
                            foundTransaction = true;
                        }
                        break;
                    } else {
                        // Regular description line
                        descParts.push(line);
                    }
                }
            }

            if (amount !== null) {
                rows.push({
                    date: isoDate,
                    description: descParts.join(" ").trim() || "Transaction",
                    amount,
                    balance
                });
            }
            }
        }
    }

    // Strategy 3: If no header or no rows found, try pattern-based extraction
    if (rows.length === 0) {
        console.log("[PDF Parse] No structured format found, trying pattern-based extraction...");

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Look for date pattern
            // Relaxed regex: allow trailing content (don't use $)
            const dateMatch = line.match(/^(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/i);

            if (dateMatch) {
                const [, day, mon, year] = dateMatch;
                const isoDate = `${year}-${monthMap[mon.toLowerCase()]}-${day.padStart(2, "0")}`;

                // Look ahead for amount and balance (up to 15 lines)
                let amount: number | null = null;
                let balance: number | null = null;
                const descParts: string[] = [];

                for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
                    const nextLine = lines[j];

                    // Skip if it's another date
                    if (nextLine.match(/^\d{1,2}\s+\w{3}\s+\d{4}$/i)) {
                        break;
                    }

                    // Try to find amount and balance
                    let amountMatch = nextLine.match(/([−–-]?\d[\d\.\,]*\s*€)\s+(\d[\d\.\,]*\s*€)/);
                    if (!amountMatch) {
                        amountMatch = nextLine.match(/([−–-]?\d[\d\.\,]*)\s*€\s+(\d[\d\.\,]*)\s*€/);
                    }
                    if (!amountMatch) {
                        amountMatch = nextLine.match(/([−–-]?\d[\d\.\,]*\s*€)/);
                    }

                    if (amountMatch) {
                        amount = parseEuroAmount(amountMatch[1]);
                        if (amountMatch[2]) {
                            balance = parseEuroAmount(amountMatch[2]);
                        } else {
                            // Look for balance in next line
                            if (j + 1 < lines.length) {
                                const balanceLine = lines[j + 1];
                                const balanceMatch = balanceLine.match(/(\d[\d\.\,]*\s*€)/);
                                if (balanceMatch) {
                                    balance = parseEuroAmount(balanceMatch[1]);
                                }
                            }
                        }

                        const beforeAmounts = nextLine.slice(0, amountMatch.index).trim();
                        if (beforeAmounts) descParts.push(beforeAmounts);
                        break;
                    } else {
                        descParts.push(nextLine);
                    }
                }

                if (amount !== null) {
                    rows.push({
                        date: isoDate,
                        description: descParts.join(" ").trim() || "Transaction",
                        amount,
                        balance
                    });
                }
            }
        }
    }

    // Final check: if still no rows, try one more aggressive strategy
    if (rows.length === 0) {
        console.log("[PDF Parse] Trying final aggressive extraction strategy...");

        // Strategy 4: Look for ANY pattern that might be a transaction
        // Look for lines with dates in various formats
        const datePatterns = [
            /(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/i,
            /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/, // DD/MM/YYYY or DD-MM-YYYY
            /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/  // YYYY/MM/DD
        ];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Try to find any date pattern
            for (const pattern of datePatterns) {
                const dateMatch = line.match(pattern);
                if (dateMatch) {
                    let isoDate: string | null = null;

                    try {
                        // Check if it's a month name format (first pattern)
                        if (dateMatch[2] && typeof dateMatch[2] === 'string' && monthMap[dateMatch[2].toLowerCase()]) {
                            // Spanish/English month format: "30 oct 2025"
                            const [, day, mon, year] = dateMatch;
                            isoDate = `${year}-${monthMap[mon.toLowerCase()]}-${day.padStart(2, "0")}`;
                        } else if (dateMatch.length >= 4) {
                            // Numeric date format: "30/10/2025" or "2025/10/30"
                            const [, part1, part2, part3] = dateMatch;
                            if (part3 && part3.length === 4) {
                                // YYYY/MM/DD format
                                isoDate = `${part3}-${String(part2).padStart(2, "0")}-${String(part1).padStart(2, "0")}`;
                            } else if (part3 && part3.length <= 2) {
                                // DD/MM/YY or DD/MM/YYYY format
                                const year = part3.length === 2 ? `20${part3}` : part3;
                                isoDate = `${year}-${String(part2).padStart(2, "0")}-${String(part1).padStart(2, "0")}`;
                            }
                        }
                    } catch (err) {
                        console.warn(`[PDF Parse] Error parsing date from match:`, dateMatch, err);
                        continue;
                    }

                    if (!isoDate) {
                        continue;
                    }

                    // Look for amounts in the same line or nearby lines (within 15 lines)
                    let foundTransaction = false;
                    for (let j = i; j < Math.min(i + 15, lines.length) && !foundTransaction; j++) {
                        const searchLine = lines[j];

                        // Try to find amount patterns (more flexible)
                        const amountPatterns = [
                            /([−–-]?\d[\d\.\,]*)\s*€/,           // "-45,20€" or "1.234,56€"
                            /€\s*([−–-]?\d[\d\.\,]*)/,           // "€ 45,20"
                            /([−–-]?\d+[.,]\d{2})\s*€/,          // "-45,20 €"
                            /([−–-]?\d+[.,]\d{2})/,              // "-45,20" or "1.234,56"
                            /([−–-]?\d{3,}[.,]\d{2})/,           // Large amounts with separators
                            /([−–-]?\d+\.\d{2})/,                // "-45.20" (US format)
                            /([−–-]?\d{2,})/                     // Last resort: any 2+ digit number
                        ];

                        for (const amountPattern of amountPatterns) {
                            const amountMatch = searchLine.match(amountPattern);
                            if (amountMatch) {
                                const amountStr = amountMatch[1] || amountMatch[0];
                                const amount = parseEuroAmount(amountStr);

                                // Ignore tiny amounts and very large amounts (likely page numbers, etc)
                                if (Math.abs(amount) > 0.01 && Math.abs(amount) < 1000000) {
                                    // Build description from the line, removing the date and amount
                                    let description = line.replace(dateMatch[0], "").trim();
                                    if (!description || description.length < 3) {
                                        description = searchLine.replace(amountMatch[0], "").trim();
                                    }
                                    if (!description || description.length < 3) {
                                        description = "Transaction";
                                    }

                                    rows.push({
                                        date: isoDate,
                                        description: description.substring(0, 200), // Limit description length
                                        amount,
                                        balance: null
                                    });
                                    console.log(`[PDF Parse] Found transaction via aggressive strategy: ${isoDate}, ${amount}, "${description.substring(0, 50)}"`);
                                    foundTransaction = true;
                                    break;
                                }
                            }
                        }
                    }
                    if (foundTransaction) {
                        break; // Found a transaction for this date, move to next date
                    }
                }
            }
        }

        console.log(`[PDF Parse] Aggressive strategy found ${rows.length} transactions`);
    }

    // Final check: if still no rows, provide helpful error with debugging info
    if (rows.length === 0) {
        const sampleText = lines.slice(0, 50).join("\n");
        const hasDates = lines.some((l: string) => /\d{1,2}\s+\w{3}\s+\d{4}/i.test(l) || /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(l));
        const hasAmounts = lines.some((l: string) => /€/.test(l) || /\d+[.,]\d{2}/.test(l));

        console.error("[PDF Parse] Failed to extract transactions.");
        console.error("[PDF Parse] Has date patterns:", hasDates);
        console.error("[PDF Parse] Has amount patterns:", hasAmounts);
        console.error("[PDF Parse] Sample text (first 50 lines):", sampleText.substring(0, 1000));

        let errorMsg = `No transactions found in the PDF file. `;
        if (!hasDates && !hasAmounts) {
            errorMsg += `The PDF appears to be image-based (no text found) and requires OCR. `;
        } else if (!hasDates) {
            errorMsg += `Found amounts but no recognizable date patterns. `;
        } else if (!hasAmounts) {
            errorMsg += `Found dates but no recognizable amount patterns. `;
        } else {
            errorMsg += `Found dates and amounts but couldn't match them into transactions. `;
        }
        errorMsg += `Please try exporting your bank statement as CSV or Excel format instead.`;

        throw new Error(errorMsg);
    }

    console.log(`[PDF Parse] Successfully extracted ${rows.length} transactions`);
    return rows;
}
