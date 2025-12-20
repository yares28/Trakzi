# Development Auth Bypass

This document explains how to bypass Clerk authentication for local development.

## How to Enable Auth Bypass

Add the following line to your `.env` file:

```env
BYPASS_CLERK_AUTH=true
```

Then restart your development server:

```bash
npm run dev
```

You'll see `[DEV] Auth bypass enabled - skipping authentication` in your console for each request.

## How to Disable (Return to Normal)

To restore normal Clerk authentication:

1. **Option A**: Remove or comment out the line in `.env`:
   ```env
   # BYPASS_CLERK_AUTH=true
   ```

2. **Option B**: Set it to false:
   ```env
   BYPASS_CLERK_AUTH=false
   ```

3. Restart your development server:
   ```bash
   npm run dev
   ```

## Important Notes

⚠️ **Never enable this in production!** The bypass only works when `BYPASS_CLERK_AUTH=true`.

### Limitations when bypassed:
- `useUser()` and `useAuth()` hooks from Clerk will return `null`/`undefined` values
- User-specific data may not load correctly (anything requiring `userId`)
- Some components that depend on Clerk user data may show errors or empty states

### If you encounter errors:
If components break because they expect a `userId`, you may also need to:
1. Mock the user ID in API calls, or
2. Use Clerk's development keys instead (which provide real auth with test accounts)

## Related Files

- `middleware.ts` - Contains the bypass logic
- `.env` - Where you set `BYPASS_CLERK_AUTH`
