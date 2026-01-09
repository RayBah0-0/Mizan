# Stripe Payment Flow Setup

## Complete Flow

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
   - Enter: `https://mizanproject.vercel.app/thank-you?token={CHECKOUT_SESSION_ID}`
   - (Replace with your actual Vercel domain)

### For Production:
Replace the test payment link with your live one and update the redirect URL.

## Testing the Flow

### Test Locally:
1. Start dev server: `npm run dev`
2. Go to `http://localhost:5173/pricing`
3. Click "Upgrade to Premium"
4. Use Stripe test card: `4242 4242 4242 4242`
5. Should redirect to `/thank-you` with session ID
6. Should generate activation token
7. Click accept and activate premium

### Current Files:
- **Pricing.tsx** - Stripe payment link button
- **ThankYou.tsx** - Receives Stripe session ID, generates activation token
- **RedeemPremium.tsx** - Activates premium with token

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
