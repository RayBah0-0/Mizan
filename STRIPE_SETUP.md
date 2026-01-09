# Stripe Payment Flow Setup

## Simplified Flow (Current Implementation)

1. **User clicks "Upgrade to Premium"** on `/pricing`
2. **Opens Stripe Payment Link** → `https://buy.stripe.com/test_fZubJ12hF46gahf5PffUQ01`
3. **User completes payment on Stripe**
4. **Returns to Mizan** → Success message shown
5. **User contacts support** → Email: support@mizan.app with payment confirmation
6. **Support manually activates** → Premium access granted within 24 hours

## Previous Complex Flow (Deprecated)

1. **User clicks "Upgrade to Premium"** on `/pricing`
2. **Opens Stripe Payment Link** → `https://buy.stripe.com/test_fZubJ12hF46gahf5PffUQ01`
3. **User completes payment**
4. **Stripe redirects to** → `https://mizanproject.vercel.app/thank-you?token={CHECKOUT_SESSION_ID}`
5. **ThankYou page** calls API to generate activation token
6. **User clicks "Accept Premium"**
7. **Redirects to** → `/getpremium-{ACTIVATION_TOKEN}`
8. **RedeemPremium page** activates premium and shows success

## Required Stripe Configuration

### In Stripe Dashboard:

1. Go to your Payment Link: `https://buy.stripe.com/test_fZubJ12hF46gahf5PffUQ01`
2. Click **"Edit"**
3. Under **"After payment"** section:
   - Select **"Redirect to a page"**
   - Enter: `https://mizan-rho.vercel.app/pricing` (back to pricing page)
   - (Or leave as default Stripe success page)

### For Production:
Replace the test payment link with your live one and update the redirect URL.

## Testing the Simplified Flow

### Test Locally:
1. Start dev server: `npm run dev`
2. Go to `http://localhost:5173/pricing`
3. Click "Upgrade to Premium"
4. Use Stripe test card: `4242 4242 4242 4242`
5. Should show success message with support contact info

### Current Files:
- **Pricing.tsx** - Shows success message and support contact after payment link click

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
