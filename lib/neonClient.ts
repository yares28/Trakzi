// lib/neonClient.ts
// Using @neondatabase/serverless for direct PostgreSQL connections with connection pooling
// This handles authentication automatically via the connection string

import { neon } from '@neondatabase/serverless';

// Note: Connection pooling is handled via the pooled connection string
// The -pooler suffix in the connection string enables Neon's built-in connection pooling
// Environment variables are automatically loaded by Next.js from .env/.env.local

// Get connection string from environment
// For connection pooling, use the pooled connection string (adds -pooler to hostname)
// Example: postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/dbname
const CONNECTION_STRING = process.env.DATABASE_URL || process.env.NEON_CONNECTION_STRING;

// Auto-detect and convert to pooled connection string if not already pooled
function getPooledConnectionString(connString: string | undefined): string | null {
    if (!connString) return null;
    
    // If already contains -pooler, return as is
    if (connString.includes('-pooler')) {
        return connString;
    }
    
    // Convert regular connection string to pooled version
    // Replace ep-xxx.region.aws.neon.tech with ep-xxx-pooler.region.aws.neon.tech
    return connString.replace(
        /@([^@]+)\.([^.]+\.aws\.neon\.tech)/,
        '@$1-pooler.$2'
    );
}

const POOLED_CONNECTION_STRING = getPooledConnectionString(CONNECTION_STRING);

if (!POOLED_CONNECTION_STRING) {
    console.warn("[Neon] DATABASE_URL or NEON_CONNECTION_STRING not set in .env or .env.local");
    console.warn("[Neon] Using Neon requires a connection string like:");
    console.warn("[Neon] postgresql://user:password@host/database?sslmode=require");
    console.warn("[Neon] For best performance, use the pooled connection string (adds -pooler to hostname)");
}

// Create Neon client instance with pooled connection
const sql = POOLED_CONNECTION_STRING ? neon(POOLED_CONNECTION_STRING) : null;

type NeonOptions = {
    returnRepresentation?: boolean;
};

// Helper to ensure client is initialized
function ensureClient() {
    if (!sql) {
        throw new Error(
            "Neon client not initialized. Set DATABASE_URL or NEON_CONNECTION_STRING in .env or .env.local\n" +
            "Example: postgresql://user:password@host/database?sslmode=require"
        );
    }
    return sql;
}

// Insert rows into a table
export async function neonInsert<T extends Record<string, any>>(
    table: string,
    rows: T | T[],
    options: NeonOptions = { returnRepresentation: true }
): Promise<T[]> {
    const client = ensureClient();
    const rowsArray = Array.isArray(rows) ? rows : [rows];
    
    if (rowsArray.length === 0) {
        return [];
    }
    
    // Get column names from first row
    const columns = Object.keys(rowsArray[0]);
    
    // Build INSERT query using sql.query() for parameterized queries
    if (rowsArray.length === 1) {
        const row = rowsArray[0];
        const values = columns.map(col => row[col]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})${options.returnRepresentation ? ' RETURNING *' : ''}`;
        
        try {
            // Use sql.query() for parameterized queries with $1, $2, etc.
            const result = await (client as any).query(query, values);
            // Handle both array and { rows: [] } return formats
            const rows = Array.isArray(result) ? result : (result.rows || []);
            return options.returnRepresentation ? (rows as T[]) : [];
        } catch (error: any) {
            console.error(`[Neon] Insert error for table ${table}:`, error.message);
            throw new Error(`Failed to insert into ${table}: ${error.message}`);
        }
    }
    
    // For multiple rows, build batch insert
    const allValues: any[] = [];
    const valuePlaceholders: string[] = [];
    
    rowsArray.forEach((row, rowIdx) => {
        const rowValues = columns.map(col => row[col]);
        const placeholders = columns.map((_, colIdx) => `$${rowIdx * columns.length + colIdx + 1}`).join(', ');
        valuePlaceholders.push(`(${placeholders})`);
        allValues.push(...rowValues);
    });
    
    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${valuePlaceholders.join(', ')}${options.returnRepresentation ? ' RETURNING *' : ''}`;
    
    try {
        const result = await (client as any).query(query, allValues);
        // Handle both array and { rows: [] } return formats
        const rows = Array.isArray(result) ? result : (result.rows || []);
        return options.returnRepresentation ? (rows as T[]) : [];
    } catch (error: any) {
        console.error(`[Neon] Insert error for table ${table}:`, error.message);
        throw new Error(`Failed to insert into ${table}: ${error.message}`);
    }
}

// Query data from a table
export async function neonQuery<T = any>(
    query: string,
    params: any[] = []
): Promise<T[]> {
    const client = ensureClient();
    
    try {
        // The Neon client is a tagged template function: sql`SELECT * FROM table WHERE id = ${value}`
        // Convert $1, $2 placeholders to template literal format
        
        if (params.length === 0) {
            // No parameters - execute query directly as template literal
            const result = await (client as any)`${query}`;
            const rows = Array.isArray(result) ? result : (result.rows || []);
            return rows as T[];
        }
        
        // Find all $N placeholders and build template parts
        const parts: string[] = [];
        const values: any[] = [];
        let lastIndex = 0;
        const placeholderRegex = /\$(\d+)/g;
        const matches: Array<{ index: number; num: number; length: number }> = [];
        
        // Collect all matches
        let match;
        while ((match = placeholderRegex.exec(query)) !== null) {
            matches.push({
                index: match.index,
                num: parseInt(match[1]),
                length: match[0].length
            });
        }
        
        // Sort by index to process in order
        matches.sort((a, b) => a.index - b.index);
        
        // Build template parts and values
        for (const m of matches) {
            const paramIndex = m.num - 1; // $1 -> index 0
            
            if (paramIndex >= 0 && paramIndex < params.length) {
                // Add SQL text before this placeholder
                parts.push(query.substring(lastIndex, m.index));
                // Add the parameter value
                values.push(params[paramIndex]);
                lastIndex = m.index + m.length;
            }
        }
        
        // Add remaining SQL text
        parts.push(query.substring(lastIndex));
        
        // Create TemplateStringsArray - this is what JavaScript creates for tagged templates
        // It needs to be an array-like object with a 'raw' property
        const templateStrings = Object.assign([...parts], {
            raw: [...parts] // For SQL, raw and cooked strings are the same
        }) as TemplateStringsArray;
        
        // Call the client as a tagged template function
        // This is equivalent to: client`part1${value1}part2${value2}part3`
        const result = await (client as any)(templateStrings, ...values);
        
        // Handle both array and { rows: [] } return formats
        const rows = Array.isArray(result) ? result : (result.rows || []);
        return rows as T[];
    } catch (error: any) {
        console.error(`[Neon] Query error:`, error.message);
        console.error(`[Neon] Query was:`, query.substring(0, 200));
        console.error(`[Neon] Params were:`, params);
        console.error(`[Neon] Full error:`, error);
        console.error(`[Neon] Error stack:`, error.stack);
        throw new Error(`Failed to query: ${error.message}`);
    }
}