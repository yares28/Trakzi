# Clerk Configuration Checklist

This document outlines all the remaining steps needed to fully integrate Clerk authentication into your Next.js application.

## ✅ Already Completed

- [x] Installed `@clerk/nextjs` package
- [x] Created `proxy.ts` with `clerkMiddleware()` 
- [x] Added `<ClerkProvider>` to `app/layout.tsx`
- [x] Created sign-in page at `app/sign-in/[[...sign-in]]/page.tsx`
- [x] Created sign-up page at `app/sign-up/[[...sign-up]]/page.tsx`
- [x] Updated `nav-user.tsx` to use Clerk components
- [x] Configured route protection in middleware

## 🔴 Critical: Must Complete

### 1. Environment Variables

Add these to your `.env.local` file (create it if it doesn't exist):

```bash
# Clerk Authentication Keys (REQUIRED)
# Get these from: https://dashboard.clerk.com/last-active?path=api-keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
CLERK_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE

# Clerk Sign-In/Sign-Up URLs (REQUIRED))
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/

# Optional: After sign-in/sign-up redirects
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

**Action Required:** 
- Go to [Clerk Dashboard](https://dashboard.clerk.com/last-active?path=api-keys)
- Copy your Publishable Key and Secret Key
- Replace the placeholder values in `.env.local`

### 2. Update API Routes to Use Clerk Authentication

**Current Issue:** All API routes are using `getCurrentUserId()` from `lib/auth.ts`, which currently returns a demo user ID from environment variables.

**Files to Update:** (55+ API route files)
- `lib/auth.ts` - Replace with Clerk's `auth()` function
- All files in `app/api/**/route.ts` that import `getCurrentUserId`


### 3. Update Public Routes Configuration

**Current:** Only `/sign-in` and `/sign-up` are public.

**Consider Adding:**
- `/` (home page) - Currently redirects to `/dashboard`, might want to make it public
- `/api/public/*` - If you have any public API endpoints
- Any other routes that should be accessible without authentication


## 🟡 Recommended: Should Complete

### 4. Remove or Update Old Auth System

**Current State:**
- `components/auth-provider.tsx` - Mock auth provider still in use
- `components/login-form.tsx` - Uses old auth system
- `components/register-form.tsx` - Uses old auth system
- `app/login/page.tsx` - Uses old login form
- `app/register/page.tsx` - Uses old register form

**Options:**

**Option A: Remove Old Auth (Recommended)**
- Remove `AuthProvider` from `app/layout.tsx`
- Delete or redirect `/login` and `/register` pages to `/sign-in` and `/sign-up`
- Remove unused auth components (or keep for reference)

**Option B: Keep for Development**
- Keep old auth system but mark as deprecated
- Use Clerk for production, old system for testing

### 5. Database User ID Integration

**Current Issue:** Your database uses `user_id` fields, but they're currently set to `DEMO_USER_ID`. You need to:

1. **Sync Clerk User IDs with Database:**
   - When a user signs up, create a record in your database with their Clerk `userId`
   - Update all queries to use Clerk's `userId` instead of `DEMO_USER_ID`

2. **Create User Sync Function:**

3. **Update Database Schema (if needed):**
   - Ensure `user_id` columns can store Clerk's user IDs (usually strings like `user_xxxxx`)
   - Consider adding a `users` table if you don't have one to store Clerk user metadata

### 6. Update Redirect Links

**Current:** Some components still link to `/login`:
- `components/register-form.tsx` - Links to `/login`
- `components/login-form.tsx` - Links to `/register`

**Action:** Update these to point to `/sign-in` and `/sign-up`:
```typescript
// Change: href="/login"
// To: href="/sign-in"

// Change: href="/register"  
// To: href="/sign-up"
```

## 🟢 Optional: Nice to Have

### 7. Clerk Dashboard Configuration

Configure in [Clerk Dashboard](https://dashboard.clerk.com):

- **Appearance:** Customize sign-in/sign-up UI to match your brand
- **Social Providers:** Enable Google, GitHub, etc. if desired
- **Email Templates:** Customize welcome emails
- **User Metadata:** Configure custom user fields if needed
- **Webhooks:** Set up webhooks for user events (sign-up, sign-in, etc.)

### 8. Error Handling

Add proper error handling for:
- Unauthenticated API requests
- Expired sessions
- Network errors during authentication

### 9. Testing

- Test sign-in flow
- Test sign-up flow  
- Test protected routes redirect
- Test API route authentication
- Test user data retrieval

### 10. Remove DEMO_USER_ID

Once everything is working:
- Remove `DEMO_USER_ID` from `.env.local`
- Remove fallback logic that uses `DEMO_USER_ID`

## 📋 Quick Start Priority Order

1. **First:** Add Clerk API keys to `.env.local` (Critical)
2. **Second:** Update `lib/auth.ts` to use Clerk (Critical)
3. **Third:** Test that sign-in/sign-up pages work (Critical)
4. **Fourth:** Update public routes if needed (Recommended)
5. **Fifth:** Remove old auth system (Recommended)
6. **Sixth:** Sync database with Clerk user IDs (Recommended)

## 🚨 Common Issues

### Issue: "Module not found: Can't resolve '@clerk/nextjs'"
**Solution:** Run `npm install @clerk/nextjs`

### Issue: "Unauthorized" errors in API routes
**Solution:** Make sure `lib/auth.ts` is updated to use Clerk's `auth()` function

### Issue: Sign-in page shows blank
**Solution:** Check that Clerk API keys are set correctly in `.env.local` and restart dev server

### Issue: Routes redirecting incorrectly
**Solution:** Check `proxy.ts` public routes configuration and Clerk redirect URLs in `.env.local`

## 📚 Resources

- [Clerk Next.js Documentation](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk API Reference](https://clerk.com/docs/reference/nextjs/overview)
- [Clerk Dashboard](https://dashboard.clerk.com)

