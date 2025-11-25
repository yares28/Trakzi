// lib/parsing/parseCsvToRows.ts
import Papa from "papaparse";
import { TxRow } from "../types/transactions";

/**
 * Normalizes a date string to YYYY-MM-DD format.
 * Handles datetime strings like "2024-08-31 12:57:40" by extracting just the date part.
 */
function normalizeDate(dateStr: string): string {
    if (!dateStr) return "";
    
    const trimmed = dateStr.trim();
    
    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
    }
    
    // Handle dates with pipe separator: "24/11/2025 | 23:28:24" -> extract "24/11/2025"
    let datePart = trimmed;
    if (trimmed.includes('|')) {
        datePart = trimmed.split('|')[0].trim();
    }
    
    // If it's a datetime string like "2024-08-31 12:57:40", extract just the date part
    const isoDateMatch = datePart.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoDateMatch) {
        return isoDateMatch[1];
    }
    
    // Handle DD/MM/YYYY or MM/DD/YYYY format: "24/11/2025" or "11/24/2025"
    const dateSlashMatch = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dateSlashMatch) {
        const [, part1, part2, year] = dateSlashMatch;
        const num1 = parseInt(part1);
        const num2 = parseInt(part2);
        
        // If part1 > 12, it must be DD/MM format (day/month)
        if (num1 > 12) {
            return `${year}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}`;
        }
        // If part2 > 12, it must be MM/DD format (month/day)
        if (num2 > 12) {
            return `${year}-${part1.padStart(2, '0')}-${part2.padStart(2, '0')}`;
        }
        // Ambiguous case (both <= 12): assume DD/MM/YYYY (more common in European formats)
        // This handles dates like "05/06/2025" as 5th June, not June 5th
        return `${year}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}`;
    }
    
    // Try to parse as Date and format as YYYY-MM-DD
    try {
        const date = new Date(datePart);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            // Validate year is reasonable (not 1970 from epoch)
            if (year >= 1900 && year <= 2100) {
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        }
    } catch (e) {
        // Fall through to return empty string
    }
    
    // Return empty string if we can't parse it (instead of original)
    return "";
}

/**
 * Pre-processes CSV to handle XLSX files saved as CSV
 * Removes leading empty columns, finds the actual header row, and skips metadata
 */
function preprocessCsv(csv: string): string {
    const lines = csv.split(/\r?\n/).filter(line => line.trim() !== "");
    
    if (lines.length === 0) {
        return csv;
    }
    
    // Parse all lines to arrays
    const rows: string[][] = [];
    for (const line of lines) {
        // Use PapaParse to handle quoted fields correctly
        const parsed = Papa.parse(line, { header: false });
        if (parsed.data.length > 0) {
            rows.push(parsed.data[0] as string[]);
        }
    }
    
    if (rows.length === 0) {
        return csv;
    }
    
    // Find the maximum number of columns
    const maxCols = Math.max(...rows.map(r => r.length));
    
    // Find the first non-empty column index (skip leading empty columns)
    let firstNonEmptyCol = -1;
    for (let col = 0; col < maxCols; col++) {
        // Check if this column has any non-empty values in the first 10 rows
        let hasData = false;
        for (let row = 0; row < Math.min(10, rows.length); row++) {
            const value = rows[row]?.[col];
            if (value != null && String(value).trim() !== "") {
                hasData = true;
                break;
            }
        }
        if (hasData) {
            firstNonEmptyCol = col;
            break;
        }
    }
    
    // If we found a starting column, remove leading empty columns
    if (firstNonEmptyCol > 0) {
        console.log(`[CSV Preprocess] Removing ${firstNonEmptyCol} leading empty columns`);
        for (let i = 0; i < rows.length; i++) {
            rows[i] = rows[i].slice(firstNonEmptyCol);
        }
    } else if (firstNonEmptyCol === -1) {
        // No data found in any column - this might be a completely empty CSV
        // Return original CSV to let the parser handle it
        console.warn("[CSV Preprocess] No data columns found, returning original CSV");
        return csv;
    }
    
    // Find the header row by looking for common column names
    // Common patterns: date, description, amount, balance, transaction, etc.
    const headerKeywords = [
        "date", "description", "desc", "amount", "balance", "transaction",
        "transactions", "debit", "credit", "value", "montant", "solde",
        "libelle", "details", "memo", "note", "category", "categorie"
    ];
    
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(20, rows.length); i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        
        // Check if this row contains header keywords
        const rowText = row.map(cell => String(cell || "").toLowerCase().trim()).join(" ");
        const matches = headerKeywords.filter(keyword => rowText.includes(keyword));
        
        // If we find at least 2 header keywords, this is likely the header row
        if (matches.length >= 2) {
            headerRowIndex = i;
            console.log(`[CSV Preprocess] Found header row at line ${i + 1} with keywords: ${matches.join(", ")}`);
            break;
        }
        
        // Also check if any cell looks like a date header
        const hasDateHeader = row.some(cell => {
            const cellLower = String(cell || "").toLowerCase().trim();
            return /^date|transaction.*date|posted.*date|value.*date/i.test(cellLower);
        });
        
        // Check if any cell looks like an amount header
        const hasAmountHeader = row.some(cell => {
            const cellLower = String(cell || "").toLowerCase().trim();
            return /^amount|montant|value|debit|credit/i.test(cellLower);
        });
        
        // Check if any cell looks like a description header
        const hasDescHeader = row.some(cell => {
            const cellLower = String(cell || "").toLowerCase().trim();
            return /^description|desc|details|libelle|memo|note|transaction/i.test(cellLower);
        });
        
        // If we have date + (amount OR description), it's likely a header row
        if (hasDateHeader && (hasAmountHeader || hasDescHeader)) {
            headerRowIndex = i;
            console.log(`[CSV Preprocess] Found header row at line ${i + 1} (date + amount/description headers detected)`);
            break;
        }
        
        // Also check if row has "Transactions" as a header (common in bank statements)
        const hasTransactionsHeader = row.some(cell => {
            const cellLower = String(cell || "").toLowerCase().trim();
            return cellLower === "transactions" || cellLower === "transaction";
        });
        
        // If we have "Transactions" header and at least one other header keyword, it's likely the header
        if (hasTransactionsHeader && matches.length >= 1) {
            headerRowIndex = i;
            console.log(`[CSV Preprocess] Found header row at line ${i + 1} (transactions header detected)`);
            break;
        }
        
        // Special case: If first row has "Date" and next row has a date-like value, use first row as header
        if (i === 0 && hasDateHeader && rows.length > 1) {
            const nextRow = rows[i + 1];
            if (nextRow) {
                // Check if next row has a date-like value
                const hasDateValue = nextRow.some(cell => {
                    const str = String(cell || "").trim();
                    return /^\d{4}-\d{2}-\d{2}/.test(str) || 
                           /^\d{4}\/\d{2}\/\d{2}/.test(str) ||
                           /^\d{2}\/\d{2}\/\d{4}/.test(str) ||
                           /^\d{2}-\d{2}-\d{4}/.test(str) ||
                           /\d{2}\/\d{2}\/\d{4}/.test(str); // Also check for dates with time
                });
                if (hasDateValue) {
                    headerRowIndex = i;
                    console.log(`[CSV Preprocess] Found header row at line ${i + 1} (Date header with date values in next row)`);
                    break;
                }
            }
        }
    }
    
    // If we found a header row, remove everything before it
    if (headerRowIndex > 0) {
        console.log(`[CSV Preprocess] Removing ${headerRowIndex} metadata rows before header`);
        rows.splice(0, headerRowIndex);
    }
    
    // Reconstruct CSV, filtering out completely empty rows
    const cleanedRows = rows
        .map(row => {
            // Clean up each cell and join with commas
            const cleanedCells = row.map(cell => {
                const str = String(cell || "").trim();
                // If cell contains comma, quote, or newline, wrap in quotes and escape quotes
                if (str.includes(",") || str.includes('"') || str.includes("\n")) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            });
            return cleanedCells.join(",");
        })
        .filter(row => {
            // Remove rows that are completely empty (just commas)
            const hasContent = row.split(",").some(cell => cell.trim() !== "");
            return hasContent;
        });
    
    if (cleanedRows.length === 0) {
        console.warn("[CSV Preprocess] No rows remaining after cleaning, returning original CSV");
        return csv;
    }
    
    return cleanedRows.join("\n");
}

/**
 * Finds a date column by checking column names and values
 */
function findDateColumn(row: any, columns: string[]): string | null {
    // First, try common date column name variations
    const dateColumnNames = [
        "date", "Date", "DATE", "tx_date", "TxDate", "TX_DATE",
        "transaction_date", "TransactionDate", "TRANSACTION_DATE",
        "transaction date", "Transaction Date", "TRANSACTION DATE",
        "posted_date", "PostedDate", "POSTED_DATE",
        "value_date", "ValueDate", "VALUE_DATE",
        "booking_date", "BookingDate", "BOOKING_DATE"
    ];
    
    for (const colName of dateColumnNames) {
        if (row[colName] != null && String(row[colName]).trim() !== "") {
            return colName;
        }
    }
    
    // If no match by name, try to find by pattern (looks like a date)
    for (const col of columns) {
        const value = row[col];
        if (value != null) {
            let strValue = String(value).trim();
            // Handle dates with pipe separator: extract date part
            if (strValue.includes('|')) {
                strValue = strValue.split('|')[0].trim();
            }
            // Check if it looks like a date (YYYY-MM-DD or datetime format)
            if (/^\d{4}-\d{2}-\d{2}/.test(strValue) || 
                /^\d{4}\/\d{2}\/\d{2}/.test(strValue) ||
                /^\d{2}\/\d{2}\/\d{4}/.test(strValue) ||
                /^\d{2}-\d{2}-\d{4}/.test(strValue) ||
                /\d{1,2}\/\d{1,2}\/\d{4}/.test(strValue)) {
                return col;
            }
        }
    }
    
    return null;
}

export function parseCsvToRows(csv: string): TxRow[] {
    // Pre-process CSV to handle XLSX files saved as CSV
    // This removes leading empty columns, finds the actual header row, and skips metadata
    const cleanedCsv = preprocessCsv(csv);
    
    // First, try parsing with headers
    let parsed = Papa.parse(cleanedCsv, {
        header: true,
        skipEmptyLines: true
    });

    // Log available columns for debugging
    let columns = parsed.meta?.fields || [];
    console.log(`[CLIENT] Available CSV columns:`, columns);
    
    // If no headers detected, try parsing without headers and detect columns
    if (columns.length === 0 && parsed.data.length > 0) {
        console.warn("[CLIENT] No headers detected, trying to parse without headers");
        
        // Parse without headers to get raw data
        const rawParsed = Papa.parse(cleanedCsv, {
            header: false,
            skipEmptyLines: true
        });
        
        if (rawParsed.data.length > 0) {
            const firstRow = rawParsed.data[0] as any[];
            console.log(`[CLIENT] First row (no headers):`, firstRow);
            
            // Try to detect date column by pattern matching values
            let dateColumnIndex = -1;
            for (let i = 0; i < firstRow.length; i++) {
                let value = String(firstRow[i] || "").trim();
                // Handle dates with pipe separator: extract date part
                if (value.includes('|')) {
                    value = value.split('|')[0].trim();
                }
                // Check if it looks like a date
                if (/^\d{4}-\d{2}-\d{2}/.test(value) || 
                    /^\d{4}\/\d{2}\/\d{2}/.test(value) ||
                    /^\d{2}\/\d{2}\/\d{4}/.test(value) ||
                    /^\d{2}-\d{2}-\d{4}/.test(value) ||
                    /\d{1,2}\/\d{1,2}\/\d{4}/.test(value)) {
                    dateColumnIndex = i;
                    console.log(`[CLIENT] Detected date column at index ${i}: ${String(firstRow[i] || "").trim()}`);
                    break;
                }
            }
            
            // Map rows to objects with detected columns
            const mappedData = (rawParsed.data as any[][]).map((row, rowIndex) => {
                const obj: any = {};
                // Try to map common positions
                // Assuming: [type, account, date1, date2, description, amount, ...]
                obj.date = dateColumnIndex >= 0 ? (row[dateColumnIndex] || "") : (row[2] || row[3] || "");
                obj.description = row[4] || row[5] || "";
                obj.amount = row[5] || row[6] || 0;
                obj.balance = row[row.length - 1] || null;
                return obj;
            });
            
            parsed.data = mappedData;
            columns = ["date", "description", "amount", "balance"];
        }
    }
    
    if (parsed.errors.length) {
        console.warn("[CLIENT] CSV parse errors:", parsed.errors);
    }

    const rows = (parsed.data as any[]).map((r, index) => {
        // Find date column dynamically
        let rawDate = "";
        const dateColumn = findDateColumn(r, columns);
        
        if (dateColumn) {
            rawDate = String(r[dateColumn] ?? "");
        } else {
            // Fallback: try all common variations
            rawDate = String(
                r.date ?? r.Date ?? r.DATE ?? 
                r.tx_date ?? r.TxDate ?? r.TX_DATE ??
                r.transaction_date ?? r.TransactionDate ??
                ""
            );
        }
        
        // If still empty, try to find any column that looks like a date
        if (!rawDate || rawDate.trim() === "") {
            for (const col of columns) {
                const value = r[col];
                if (value != null) {
                    let strValue = String(value).trim();
                    // Handle dates with pipe separator: extract date part
                    if (strValue.includes('|')) {
                        strValue = strValue.split('|')[0].trim();
                    }
                    // Check if it looks like a date
                    if (strValue && (/^\d{4}-\d{2}-\d{2}/.test(strValue) || 
                        /^\d{4}\/\d{2}\/\d{2}/.test(strValue) ||
                        /^\d{2}\/\d{2}\/\d{4}/.test(strValue) ||
                        /^\d{2}-\d{2}-\d{4}/.test(strValue) ||
                        /\d{1,2}\/\d{1,2}\/\d{4}/.test(strValue))) {
                        rawDate = String(value).trim(); // Use original value with pipe if present
                        console.log(`[CLIENT] Row ${index}: Found date in column "${col}": ${rawDate}`);
                        break;
                    }
                }
            }
        }
        
        // Log if date is still empty for first few rows
        if (index < 3 && (!rawDate || rawDate.trim() === "")) {
            console.warn(`[CLIENT] Row ${index}: No date found. Available fields:`, Object.keys(r));
            console.warn(`[CLIENT] Row ${index} data:`, r);
        }
        
        const normalizedDate = normalizeDate(rawDate);
        
        // Find description column (try common variations)
        const descColumn = columns.find(col => 
            /description|desc|memo|note|details|narration|particulars/i.test(col)
        ) || "description";
        const rawDescription = r[descColumn] ?? r.description ?? r.Description ?? r.DESCRIPTION ?? "";
        
        // Find amount column
        const amountColumn = columns.find(col => 
            /amount|amt|value|debit|credit/i.test(col)
        ) || "amount";
        const rawAmount = r[amountColumn] ?? r.amount ?? r.Amount ?? r.AMOUNT ?? 0;
        
        // Find balance column
        const balanceColumn = columns.find(col => 
            /balance|bal|running.*balance/i.test(col)
        );
        const rawBalance = balanceColumn ? r[balanceColumn] : (r.balance ?? r.Balance ?? r.BALANCE);
        
        return {
            date: normalizedDate || "", // Use empty string instead of undefined
            description: String(rawDescription),
            amount: Number(rawAmount) || 0,
            balance: rawBalance != null && rawBalance !== "" ? Number(rawBalance) : null,
            category: (r.category ?? r.Category ?? r.CATEGORY ?? "").trim() || undefined
        };
    });

    // Filter out invalid rows (metadata, empty rows, etc.)
    const validRows = rows.filter((r, index) => {
        // Skip rows without a valid date
        if (!r.date || r.date.trim() === "") {
            return false;
        }
        
        // Skip rows where description is just metadata keywords
        const descLower = r.description.toLowerCase().trim();
        const metadataKeywords = ["delete", "currency", "other", "category", "amount", "balance", "date", "description"];
        if (metadataKeywords.includes(descLower) && r.amount === 0) {
            return false;
        }
        
        // Skip rows with zero amount and no meaningful description
        if (r.amount === 0 && (!r.description || r.description.trim().length < 3)) {
            return false;
        }
        
        // Skip rows where the date doesn't look valid (not a real date pattern)
        const dateStr = r.date.trim();
        if (!/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
            // If it's not in YYYY-MM-DD format, it might be invalid
            // But we already normalized it, so if it's still not in that format, it's likely invalid
            return false;
        }
        
        // Skip rows where description matches common header/metadata patterns
        if (/^(currency|delete|other|category|amount|balance|date|description|transactions?)$/i.test(descLower)) {
            return false;
        }
        
        return true;
    });

    // Log category extraction for debugging
    const withCategories = validRows.filter(r => r.category && r.category !== "Other");
    const withDates = validRows.filter(r => r.date && r.date.trim() !== "");
    console.log(`[CLIENT] Parsed ${rows.length} rows, filtered to ${validRows.length} valid rows`);
    console.log(`[CLIENT] ${withCategories.length} have categories, ${withDates.length} have dates`);
    
    if (withDates.length === 0) {
        console.error(`[CLIENT] ERROR: No valid dates found in CSV! Available columns:`, columns);
        if (validRows.length > 0) {
            console.error(`[CLIENT] First valid row sample:`, validRows[0]);
        } else if (rows.length > 0) {
            console.error(`[CLIENT] First raw row sample (filtered out):`, rows[0]);
        }
    }
    
    if (withCategories.length > 0) {
        console.log(`[CLIENT] Sample categories:`, withCategories.slice(0, 3).map(r => ({ desc: r.description.substring(0, 30), cat: r.category })));
    } else {
        console.warn(`[CLIENT] WARNING: No categories found in CSV! Available columns:`, columns);
        if (validRows.length > 0) {
            console.warn(`[CLIENT] First valid row data:`, validRows[0]);
        }
    }

    return validRows;
}
