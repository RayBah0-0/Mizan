# Stripe Payment Flow Setup

## Automated Payment Verification Flow (Current Implementation)

1. **User clicks "Upgrade to Premium"** on `/pricing`
2. **Opens Stripe Payment Link** → `https://buy.stripe.com/test_fZubJ12hF46gahf5PffUQ01`
3. **User completes payment on Stripe**
4. **Returns to Mizan** → Payment status checker appears
5. **User clicks "Check Payment Status"** → System verifies payment automatically
6. **Premium activates immediately** → No manual intervention needed

## Previous Manual Flow (Deprecated)

1. **User clicks "Upgrade to Premium"** on `/pricing`
2. **Opens Stripe Payment Link** → `https://buy.stripe.com/test_fZubJ12hF46gahf5PffUQ01`
3. **User completes payment on Stripe**
4. **Returns to Mizan** → Success message shown
5. **User contacts support** → Email: support@mizan.app with payment confirmation
6. **Support manually activates** → Premium access granted within 24 hours

## Required Stripe Configuration

### In Stripe Dashboard:

1. Go to your Payment Link: `https://buy.stripe.com/test_fZubJ12hF46gahf5PffUQ01`
2. Click **"Edit"**
3. Under **"After payment"** section:
   - Select **"Redirect to a page"**
   - Enter: `https://mizan-rho.vercel.app/dashboard?payment=success`
   - (Redirects to dashboard with payment success flag)

### For Production:
Replace the test payment link with your live one and update the redirect URL.

### For Production:
Replace the test payment link with your live one and update the redirect URL.

## Testing the Automated Flow

### Test Locally:
1. Start dev server: `npm run dev`
2. Go to `http://localhost:5173/pricing`
3. Click "Upgrade to Premium"
4. Use Stripe test card: `4242 4242 4242 4242`
5. Should redirect to `/dashboard?payment=success`
6. Dashboard should show "Payment received. Activate premium to continue." banner
7. Click "Activate Premium" to enable premium features

### Current Files:
- **Pricing.tsx** - Opens Stripe payment link
- **Dashboard.tsx** - Handles payment success redirect and premium activation
- **premium.ts** - localStorage-based premium state management

## Troubleshooting

### If redirect doesn't work:
1. Check Stripe Dashboard redirect URL is correct
2. Verify `{CHECKOUT_SESSION_ID}` is in the URL
3. Check browser console for errors
4. Ensure user is logged in with Clerk

### If token generation fails:
- Check `createPremiumTokenFromStripe()` API endpoint
- Verify Stripe session ID is valid
- Check server logs

### If activation fails:
- Ensure user is authenticated
- Check `redeemPremiumToken()` API endpoint
- Verify token hasn't been used already
