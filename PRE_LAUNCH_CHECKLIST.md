# Pre-Launch Checklist

## Infrastructure & Deployment
- [ ] Connect production Clerk authentication
- [ ] Link custom domain/URL
- [ ] Set up production database (Neon Postgres)
- [ ] Configure production environment variables
- [ ] Add email api to the report a bug button

## Analytics & Monitoring
- [ ] Add analytics (Vercel Analytics, PostHog, or similar)
- [ ] Set up error tracking (Sentry or similar)
- [ ] Configure performance monitoring

## Security
- [ ] Review API rate limiting
- [ ] Audit authentication flows
- [ ] Enable CORS restrictions for production

## Features to Re-enable
- [ ] Re-enable dashboard card locking threshold (disabled in `app/dashboard/page.tsx`)
  - Analytics/Savings: 100 transactions minimum
  - Fridge: 200 grocery items minimum

## Testing
- [ ] Test all authentication flows in production
- [ ] Verify database connections
- [ ] Test payment flows (if applicable)
- [ ] Mobile responsiveness check

## Content & Legal
- [ ] Privacy policy page
- [ ] Terms of service page
- [ ] Cookie consent (if required)

## Performance
- [ ] Image optimization
- [ ] Build and verify production bundle
- [ ] Lighthouse audit
