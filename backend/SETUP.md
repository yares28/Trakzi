# Backend Setup Guide

## Quick Start

Follow these steps to set up the backend MVP:

### 1. Database Setup

1. Go to [Neon Console](https://console.neon.tech)
2. Open your project's SQL Editor
3. Run the SQL script from `backend/schema.sql`
4. Verify all 5 tables are created: `users`, `categories`, `statements`, `transactions`, `user_files`
5. Create a test user and note the UUID:
   ```sql
   INSERT INTO users (email, name) VALUES ('test@example.com', 'Test User') RETURNING id;
   ```

### 2. Environment Configuration

1. Copy `backend/env-template.txt` contents
2. Create `.env.local` file in project root
3. Fill in your actual values:
   - `NEON_API_KEY` - Get from Neon Console → Project Settings → API Keys
   - `OPENAI_API_KEY` - Get from OpenAI Platform → API Keys
   - `DEMO_USER_ID` - Use the UUID from step 1.5

### 3. Restart Dev Server

```bash
npm run dev
```

The server will load the new environment variables.

### 4. Test the Endpoints

#### Test 1: File Upload
```bash
curl -X POST http://localhost:3000/api/files/upload \
  -F "file=@path/to/test.pdf"
```

Expected: JSON with `fileId` and `stored` object

#### Test 2: Statement Parsing
```bash
curl -X POST http://localhost:3000/api/statements/parse \
  -F "file=@path/to/statement.pdf" \
  -F "bankName=Santander" \
  > output.csv
```

Expected: CSV file with categorized transactions

#### Test 3: Import CSV
```bash
curl -X POST http://localhost:3000/api/statements/import \
  -H "Content-Type: application/json" \
  -d @request.json
```

Where `request.json` contains:
```json
{
  "csv": "date,description,amount,balance,category\n2025-10-30,Test,-45.20,1234.56,Groceries",
  "statementMeta": {
    "bankName": "Santander",
    "sourceFilename": "statement.pdf",
    "rawFormat": "pdf"
  }
}
```

Expected: JSON with `statementId` and `inserted` count

### 5. Verify in Database

Check your Neon database:

```sql
-- Check uploaded files
SELECT * FROM user_files ORDER BY uploaded_at DESC LIMIT 5;

-- Check statements
SELECT * FROM statements ORDER BY uploaded_at DESC LIMIT 5;

-- Check transactions
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;
```

## File Structure

All backend files created:

```
folio2/
├── app/api/
│   ├── files/upload/route.ts
│   └── statements/
│       ├── parse/route.ts
│       └── import/route.ts
├── lib/
│   ├── types/transactions.ts
│   ├── neonClient.ts
│   ├── auth.ts
│   ├── files/saveFileToNeon.ts
│   ├── parsing/
│   │   ├── parsePdfToRows.ts
│   │   ├── parseExcelToRows.ts
│   │   ├── parseCsvToRows.ts
│   │   └── rowsToCanonicalCsv.ts
│   └── ai/categoriseTransactions.ts
└── backend/
    ├── README.md
    ├── schema.sql
    ├── env-template.txt
    └── SETUP.md (this file)
```

## Next Steps

1. Connect frontend UI to these endpoints
2. Build file upload component
3. Create CSV preview/edit interface
4. Display imported transactions in your graphs
5. Replace `DEMO_USER_ID` with real Neon auth

## Troubleshooting

**Error: "NEON_API_KEY not set"**
- Make sure `.env.local` exists and contains valid `NEON_API_KEY`
- Restart dev server after creating `.env.local`

**Error: "No user auth implemented"**
- Set `DEMO_USER_ID` in `.env.local` to a valid UUID from users table

**Error: "Neon error 404"**
- Check `NEON_REST_URL` matches your Neon project endpoint
- Verify tables exist by running schema.sql

**AI categorization not working**
- Verify `OPENAI_API_KEY` is valid
- Check OpenAI account has credits
- Model used: `gpt-4o-mini` (verify availability in your region)

## API Reference

See `backend/README.md` for complete API documentation including:
- Request/response formats
- Example workflows
- File parsing details
- Database schema
