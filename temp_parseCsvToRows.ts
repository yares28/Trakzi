// lib/parsing/parseCsvToRows.ts
import Papa from "papaparse";
import { TxRow } from "../types/transactions";

/**
 * Normalizes a date string to YYYY-MM-DD format.
 * Handles datetime strings like "2024-08-31 12:57:40" by extracting just the date part.
 */
function normalizeDate(dateStr: string): string {
    if (!dateStr) return "";
    
    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
        return dateStr.trim();
    }
    
    // If it's a datetime string like "2024-08-31 12:57:40", extract just the date part
    const dateMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
        return dateMatch[1];
    }
    
    // Try to parse as Date and format as YYYY-MM-DD
    try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    } catch (e) {
        // Fall through to return original string
    }
    
    // Return original if we can't parse it
    return dateStr.trim();
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
            const strValue = String(value).trim();
            // Check if it looks like a date (YYYY-MM-DD or datetime format)
            if (/^\d{4}-\d{2}-\d{2}/.test(strValue) || 
                /^\d{4}\/\d{2}\/\d{2}/.test(strValue) ||
                /^\d{2}\/\d{2}\/\d{4}/.test(strValue) ||
                /^\d{2}-\d{2}-\d{4}/.test(strValue)) {
                return col;
            }
        }
    }
    
    return null;
}

export function parseCsvToRows(csv: string): TxRow[] {
    // First, try parsing with headers
    let parsed = Papa.parse(csv, {
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
        const rawParsed = Papa.parse(csv, {
            header: false,
            skipEmptyLines: true
        });
        
        if (rawParsed.data.length > 0) {
            const firstRow = rawParsed.data[0] as any[];
            console.log(`[CLIENT] First row (no headers):`, firstRow);
            
            // Try to detect date column by pattern matching values
            let dateColumnIndex = -1;
            for (let i = 0; i < firstRow.length; i++) {
                const value = String(firstRow[i] || "").trim();
                // Check if it looks like a date
                if (/^\d{4}-\d{2}-\d{2}/.test(value) || 
                    /^\d{4}\/\d{2}\/\d{2}/.test(value) ||
                    /^\d{2}\/\d{2}\/\d{4}/.test(value) ||
                    /^\d{2}-\d{2}-\d{4}/.test(value)) {
                    dateColumnIndex = i;
                    console.log(`[CLIENT] Detected date column at index ${i}: ${value}`);
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
                    const strValue = String(value).trim();
                    // Check if it looks like a date
                    if (strValue && (/^\d{4}-\d{2}-\d{2}/.test(strValue) || 
                        /^\d{4}\/\d{2}\/\d{2}/.test(strValue) ||
                        /^\d{2}\/\d{2}\/\d{4}/.test(strValue) ||
                        /^\d{2}-\d{2}-\d{4}/.test(strValue))) {
                        rawDate = strValue;
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

    // Log category extraction for debugging
    const withCategories = rows.filter(r => r.category && r.category !== "Other");
    const withDates = rows.filter(r => r.date && r.date.trim() !== "");
    console.log(`[CLIENT] Parsed ${rows.length} rows, ${withCategories.length} have categories, ${withDates.length} have dates`);
    
    if (withDates.length === 0) {
        console.error(`[CLIENT] ERROR: No dates found in CSV! Available columns:`, columns);
        console.error(`[CLIENT] First row sample:`, rows[0]);
    }
    
    if (withCategories.length > 0) {
        console.log(`[CLIENT] Sample categories:`, withCategories.slice(0, 3).map(r => ({ desc: r.description.substring(0, 30), cat: r.category })));
    } else {
        console.warn(`[CLIENT] WARNING: No categories found in CSV! Available columns:`, columns);
        console.warn(`[CLIENT] First row data:`, rows[0]);
    }

    return rows;
}
