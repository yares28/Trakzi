// lib/parsing/parseExcelToRows.ts
import * as XLSX from "xlsx";
import { TxRow } from "../types/transactions";

/**
 * Converts Excel serial date (days since 1900-01-01) to ISO date string
 */
function excelDateToISO(excelDate: number): string {
    // Excel epoch is 1900-01-01, but Excel incorrectly treats 1900 as a leap year
    // So we need to adjust: Excel date 1 = 1900-01-01, but we subtract 1 day
    const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899 (day before 1900-01-01)
    const jsDate = new Date(excelEpoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
    
    // Format as YYYY-MM-DD
    const year = jsDate.getFullYear();
    const month = String(jsDate.getMonth() + 1).padStart(2, '0');
    const day = String(jsDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Checks if a value looks like a valid date
 */
function isValidDateValue(value: any): boolean {
    if (value == null || value === "") return false;
    
    // Numbers between 1 and ~50000 are likely Excel serial dates
    if (typeof value === "number") {
        return value >= 1 && value <= 100000;
    }
    
    // Date objects are valid
    if (value instanceof Date) {
        return !isNaN(value.getTime());
    }
    
    // Strings - check if they match date patterns
    if (typeof value === "string") {
        const str = value.trim();
        // ISO format: YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            const parsed = new Date(str);
            return !isNaN(parsed.getTime());
        }
        // Common date formats: DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, etc.
        if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(str)) {
            const parsed = new Date(str);
            return !isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100;
        }
        // Try parsing as date but validate it's reasonable
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) {
            const year = parsed.getFullYear();
            // Reject if year is unreasonable (likely misparsed text)
            return year >= 1900 && year <= 2100;
        }
    }
    
    return false;
}

/**
 * Parses a date value from Excel (can be string, number, or Date object)
 */
function parseDate(rawDate: any): string {
    if (rawDate == null || rawDate === "") {
        throw new Error("Date field is missing or empty");
    }

    // If it's already a string, try to parse it
    if (typeof rawDate === "string") {
        const dateStr = rawDate.trim();
        if (dateStr === "") {
            throw new Error("Date field is empty");
        }
        
        // Try ISO format first (YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const parsed = new Date(dateStr);
            if (!isNaN(parsed.getTime())) {
                const year = parsed.getFullYear();
                const month = String(parsed.getMonth() + 1).padStart(2, '0');
                const day = String(parsed.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        }
        
        // Try parsing as Date but validate it's reasonable
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
            const year = parsed.getFullYear();
            // Reject if year is unreasonable (likely misparsed text)
            if (year >= 1900 && year <= 2100) {
                const month = String(parsed.getMonth() + 1).padStart(2, '0');
                const day = String(parsed.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        }
        
        throw new Error(`Invalid date format: "${dateStr}"`);
    }

    // If it's a number, it's likely an Excel serial date
    if (typeof rawDate === "number") {
        // Excel dates are typically between 1 (1900-01-01) and ~50000 (2037+)
        // But could also be a timestamp in milliseconds
        if (rawDate > 100000) {
            // Likely a JavaScript timestamp (milliseconds since epoch)
            const jsDate = new Date(rawDate);
            if (isNaN(jsDate.getTime())) {
                throw new Error(`Invalid timestamp: ${rawDate}`);
            }
            const year = jsDate.getFullYear();
            const month = String(jsDate.getMonth() + 1).padStart(2, '0');
            const day = String(jsDate.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } else if (rawDate >= 1 && rawDate <= 100000) {
            // Excel serial date
            return excelDateToISO(rawDate);
        } else {
            throw new Error(`Invalid Excel date number: ${rawDate}`);
        }
    }

    // If it's a Date object
    if (rawDate instanceof Date) {
        if (isNaN(rawDate.getTime())) {
            throw new Error("Invalid Date object");
        }
        const year = rawDate.getFullYear();
        const month = String(rawDate.getMonth() + 1).padStart(2, '0');
        const day = String(rawDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    throw new Error(`Unable to parse date: ${rawDate} (type: ${typeof rawDate})`);
}

/**
 * Parses a number value, handling currency symbols and formatting
 */
function parseNumber(rawValue: any): number {
    if (rawValue == null || rawValue === "") {
        throw new Error("Number field is missing or empty");
    }

    // If already a number, return it
    if (typeof rawValue === "number") {
        return rawValue;
    }

    // If string, clean it first
    if (typeof rawValue === "string") {
        // Remove currency symbols, spaces, and other non-numeric characters except minus, decimal point, and comma
        let cleaned = rawValue.trim()
            .replace(/[€$£¥]/g, '') // Remove currency symbols
            .replace(/\s/g, '') // Remove spaces
            .replace(/[^\d.,-]/g, ''); // Keep only digits, dots, commas, and minus

        // Handle European number format (1.234,56) vs US format (1,234.56)
        // Check if comma is used as decimal separator (European format)
        const hasCommaDecimal = cleaned.includes(',') && cleaned.split(',').length === 2;
        const hasDotDecimal = cleaned.includes('.') && cleaned.split('.').length === 2;
        
        if (hasCommaDecimal && !hasDotDecimal) {
            // European format: 1.234,56 -> 1234.56
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else if (hasDotDecimal && !hasCommaDecimal) {
            // US format: 1,234.56 -> 1234.56
            cleaned = cleaned.replace(/,/g, '');
        } else if (cleaned.includes(',') && cleaned.includes('.')) {
            // Both present - assume last separator is decimal
            const lastComma = cleaned.lastIndexOf(',');
            const lastDot = cleaned.lastIndexOf('.');
            if (lastComma > lastDot) {
                // Comma is decimal: 1.234,56
                cleaned = cleaned.replace(/\./g, '').replace(',', '.');
            } else {
                // Dot is decimal: 1,234.56
                cleaned = cleaned.replace(/,/g, '');
            }
        } else if (cleaned.includes(',')) {
            // Only comma - could be thousands separator or decimal
            // If there are 3+ digits after comma, it's likely thousands separator
            const parts = cleaned.split(',');
            if (parts.length === 2 && parts[1].length <= 2) {
                // Likely decimal: 1234,56
                cleaned = cleaned.replace(',', '.');
            } else {
                // Likely thousands: 1,234
                cleaned = cleaned.replace(/,/g, '');
            }
        }

        const parsed = parseFloat(cleaned);
        if (isNaN(parsed)) {
            throw new Error(`Unable to parse number: ${rawValue}`);
        }
        return parsed;
    }

    throw new Error(`Unable to parse number: ${rawValue} (type: ${typeof rawValue})`);
}

/**
 * Finds a column key by name (case-insensitive, with better matching)
 */
function findColumnKey(keys: string[], name: string): string | null {
    const lowerName = name.toLowerCase();
    
    // First try exact match (case-insensitive)
    const exact = keys.find(k => k.toLowerCase() === lowerName);
    if (exact) return exact;
    
    // Then try starts with
    const startsWith = keys.find(k => k.toLowerCase().startsWith(lowerName));
    if (startsWith) return startsWith;
    
    // Then try contains (but prefer shorter matches to avoid false positives)
    const contains = keys
        .filter(k => k.toLowerCase().includes(lowerName))
        .sort((a, b) => a.length - b.length)[0]; // Prefer shorter matches
    
    return contains || null;
}

export function parseExcelToRows(buffer: Buffer): TxRow[] {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error("Excel file has no sheets");
    }
    
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // First, try to detect the range of the sheet to see all columns
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const maxCol = range.e.c; // Maximum column index
    
    // Use raw: true to get raw cell values, then we'll handle conversion ourselves
    // This gives us more control over date and number parsing
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { 
        defval: null,
        raw: true, // Get raw values so we can handle dates/numbers ourselves
        blankrows: false // Skip completely empty rows
    });

    if (rows.length === 0) {
        throw new Error("Excel file has no data rows");
    }

    // Get column keys from first row to understand structure
    const firstRow = rows[0];
    if (!firstRow || typeof firstRow !== 'object') {
        throw new Error("Excel file has invalid structure");
    }
    
    // Get all keys - we need to check which ones actually have data
    const allKeys = Object.keys(firstRow);
    
    // Helper to check if a column has meaningful data (not just null/empty)
    const hasData = (key: string): boolean => {
        const sampleSize = Math.min(10, rows.length);
        for (let i = 0; i < sampleSize; i++) {
            const value = rows[i]?.[key];
            if (value != null && value !== "" && value !== null) {
                return true;
            }
        }
        return false;
    };
    
    // Keep columns that have data, even if header is empty (__EMPTY, __EMPTY_1, etc.)
    const keys = allKeys.filter(k => 
        k !== '__rowNum__' && 
        hasData(k) // Only keep columns that actually have data
    );
    
    // Log available columns for debugging
    console.log(`[Excel Parser] Available columns: ${keys.join(", ")}`);
    if (allKeys.length !== keys.length) {
        const filteredOut = allKeys.filter(k => !keys.includes(k) && k !== '__rowNum__');
        if (filteredOut.length > 0) {
            console.log(`[Excel Parser] Filtered out empty columns: ${filteredOut.join(", ")}`);
        }
    }
    
    // If we have very few columns but the sheet has more columns, try to get column names from the sheet range
    // XLSX might name columns as A, B, C, etc. if headers are missing
    if (keys.length <= 2 && maxCol >= 2) {
        console.warn(`[Excel Parser] Only found ${keys.length} columns but sheet has ${maxCol + 1} columns. Checking for letter-named columns.`);
        // Try to access columns by letter (A, B, C, etc.)
        for (let col = 0; col <= maxCol; col++) {
            const colLetter = XLSX.utils.encode_col(col);
            const cellRef = `${colLetter}1`; // First row header
            const headerCell = sheet[cellRef];
            if (headerCell && headerCell.v) {
                const headerValue = String(headerCell.v).trim();
                if (headerValue && !keys.includes(headerValue)) {
                    // Check if this column has data in any row
                    let hasData = false;
                    for (let rowIdx = 0; rowIdx < Math.min(5, rows.length); rowIdx++) {
                        const dataCellRef = `${colLetter}${rowIdx + 2}`; // +2 because row 1 is header, rows start at 2
                        const dataCell = sheet[dataCellRef];
                        if (dataCell && dataCell.v != null && dataCell.v !== '') {
                            hasData = true;
                            break;
                        }
                    }
                    if (hasData) {
                        keys.push(headerValue);
                        // Also add the data to firstRow so it's accessible
                        const firstDataCellRef = `${colLetter}2`;
                        const firstDataCell = sheet[firstDataCellRef];
                        if (firstDataCell) {
                            firstRow[headerValue] = firstDataCell.v;
                        }
                    }
                }
            }
        }
    }
    
    // Helper function to check if a column appears to be numeric
    const isNumericColumn = (key: string): boolean => {
        // Check first few rows to see if values are numeric
        const sampleSize = Math.min(5, rows.length);
        let numericCount = 0;
        let totalChecked = 0;
        for (let i = 0; i < sampleSize; i++) {
            const value = rows[i]?.[key];
            if (value != null && value !== "") {
                totalChecked++;
                const num = typeof value === "number" ? value : parseFloat(String(value).replace(/[€$£¥,\s]/g, '').replace(',', '.'));
                if (!isNaN(num)) {
                    numericCount++;
                }
            }
        }
        return totalChecked > 0 && numericCount >= totalChecked * 0.6; // At least 60% of non-empty samples are numeric
    };
    
    // Helper function to check if a column appears to be a date column
    const isDateColumn = (key: string): boolean => {
        const sampleSize = Math.min(5, rows.length);
        let dateCount = 0;
        let totalChecked = 0;
        for (let i = 0; i < sampleSize; i++) {
            const value = rows[i]?.[key];
            if (value != null && value !== "") {
                totalChecked++;
                if (isValidDateValue(value)) {
                    dateCount++;
                }
            }
        }
        return totalChecked > 0 && dateCount >= totalChecked * 0.6; // At least 60% of non-empty samples are dates
    };
    
    // Log available columns for debugging (after adding any found columns)
    console.log(`[Excel Parser] Available columns: ${keys.join(", ")}`);
    
    // Find column mappings - but validate them with data type checks
    let dateKey = findColumnKey(keys, "date");
    // Validate that the found date column actually contains dates
    if (dateKey && !isDateColumn(dateKey)) {
        console.warn(`[Excel Parser] Column "${dateKey}" has "date" in name but doesn't contain valid dates. Searching for date column by data type.`);
        dateKey = null;
    }
    // If no date column found by name, try to find one by data type
    if (!dateKey) {
        const dateCandidates = keys.filter(k => isDateColumn(k));
        if (dateCandidates.length > 0) {
            dateKey = dateCandidates[0];
            console.warn(`[Excel Parser] Found date column by data type: "${dateKey}"`);
        }
    }
    
    const amountKey = findColumnKey(keys, "amount") || findColumnKey(keys, "value") || findColumnKey(keys, "montant");
    const balanceKey = findColumnKey(keys, "balance") || findColumnKey(keys, "solde");
    
    // Try multiple variations for description
    const descKey = findColumnKey(keys, "description") || 
                    findColumnKey(keys, "desc") || 
                    findColumnKey(keys, "details") ||
                    findColumnKey(keys, "libelle") ||
                    findColumnKey(keys, "label") ||
                    findColumnKey(keys, "transaction") ||
                    findColumnKey(keys, "note") ||
                    findColumnKey(keys, "memo") ||
                    findColumnKey(keys, "comment");
    
    // If description not found by name, infer it as the first non-date/non-amount/non-balance column
    let inferredDescKey = descKey;
    if (!inferredDescKey) {
        const excludedKeys = [dateKey, amountKey, balanceKey].filter(Boolean);
        const candidateKeys = keys.filter(k => !excludedKeys.includes(k));
        
        if (candidateKeys.length > 0) {
            // Prefer the first non-empty column that's likely text (not numeric and not date)
            // Exclude columns that look like dates or numbers
            inferredDescKey = candidateKeys.find(k => 
                !isNumericColumn(k) && 
                !isDateColumn(k)
            ) || candidateKeys[0];
            console.warn(`[Excel Parser] Could not find 'Description' column by name. Using inferred column: "${inferredDescKey}"`);
        }
    }
    
    // If amount not found by name, infer it as the first numeric column that's not Date or Description
    let inferredAmountKey = amountKey;
    if (!inferredAmountKey) {
        const excludedKeys = [dateKey, inferredDescKey, balanceKey].filter(Boolean);
        const candidateKeys = keys.filter(k => !excludedKeys.includes(k));
        
        if (candidateKeys.length > 0) {
            // Prefer numeric columns for amount
            inferredAmountKey = candidateKeys.find(k => isNumericColumn(k)) || candidateKeys[0];
            console.warn(`[Excel Parser] Could not find 'Amount' column by name. Using inferred column: "${inferredAmountKey}"`);
        } else {
            // No remaining columns - check if description column might actually be numeric (amount)
            if (inferredDescKey && isNumericColumn(inferredDescKey)) {
                // Edge case: if description column is actually numeric, it might be the amount
                console.warn(`[Excel Parser] Only found Date and one numeric column "${inferredDescKey}". Using it as Amount, description will be empty.`);
                inferredAmountKey = inferredDescKey;
                inferredDescKey = null; // Clear description since we're using that column for amount
            } else if (inferredDescKey) {
                // We have a text description column but no amount column
                // Check if maybe there are more columns we're missing (e.g., empty headers)
                const allCandidateKeys = allKeys.filter(k => 
                    k !== '__rowNum__' && 
                    !k.startsWith('__EMPTY') &&
                    k !== dateKey && 
                    k !== inferredDescKey && 
                    k !== balanceKey
                );
                if (allCandidateKeys.length > 0) {
                    // Try these as potential amount columns
                    inferredAmountKey = allCandidateKeys.find(k => isNumericColumn(k)) || allCandidateKeys[0];
                    console.warn(`[Excel Parser] Found additional column "${inferredAmountKey}" to use as Amount.`);
                }
            }
        }
    }

    if (!dateKey) {
        throw new Error("Could not find 'Date' column in Excel file. Available columns: " + keys.join(", "));
    }
    if (!inferredAmountKey) {
        throw new Error("Could not find 'Amount' column in Excel file. Available columns: " + keys.join(", ") + 
            ". Please ensure your Excel file has columns for Date, Description, and Amount.");
    }
    // Description is optional - we can use empty string if not found
    if (!inferredDescKey) {
        console.warn(`[Excel Parser] No description column found. Description will be empty for all rows.`);
    }

    // Parse rows
    const parsedRows: TxRow[] = [];
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        try {
            const rawDate = row[dateKey];
            const rawDesc = inferredDescKey ? row[inferredDescKey] : "";
            const rawAmount = row[inferredAmountKey!];
            const rawBalance = balanceKey ? row[balanceKey] : null;

            // Skip rows where required fields are missing
            if (rawDate == null || rawDate === "" || rawAmount == null || rawAmount === "") {
                console.warn(`Skipping row ${i + 1}: missing required fields (date or amount)`);
                continue;
            }

            // Validate date before parsing
            if (!isValidDateValue(rawDate)) {
                console.warn(`Skipping row ${i + 1}: invalid date value "${rawDate}"`);
                continue;
            }

            const dateIso = parseDate(rawDate);
            const description = String(rawDesc ?? "").trim();
            const amount = parseNumber(rawAmount);
            const balance = rawBalance != null && rawBalance !== "" ? parseNumber(rawBalance) : null;

            parsedRows.push({
                date: dateIso,
                description,
                amount,
                balance
            });
        } catch (err: any) {
            console.warn(`Error parsing row ${i + 1}:`, err.message);
            // Continue with next row instead of failing completely
            continue;
        }
    }

    if (parsedRows.length === 0) {
        throw new Error("No valid transaction rows found in Excel file");
    }

    return parsedRows;
}
