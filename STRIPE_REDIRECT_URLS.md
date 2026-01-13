# Stripe Payment Redirect URLs

Configure these **success redirect URLs** in your Stripe payment links:

## 1. Monthly/Yearly Plan
**Stripe Payment Link:** `https://buy.stripe.com/5kQbJ109xauE2ONelLfUQ06`

**Success Redirect URL:**
```
https://mizan-vite.vercel.app/dashboard?payment=success&plan=monthly
```

---

## 2. Commitment Pass (3 months)
**Stripe Payment Link:** `https://buy.stripe.com/7sY5kDe0n46ggFD6TjfUQ07`

**Success Redirect URL:**
```
https://mizan-vite.vercel.app/dashboard?payment=success&plan=commitment
```

---

## 3. Lifetime Access
**Stripe Payment Link:** `https://buy.stripe.com/5kQcN57BZ0U4exv3H7fUQ08`

**Success Redirect URL:**
```
https://mizan-vite.vercel.app/dashboard?payment=success&plan=lifetime
```

---

## How to Configure in Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/payment-links)
2. Click on each payment link
3. Click "Edit" or "Settings"
4. Find **"After payment"** or **"Success redirect"** section
5. Paste the corresponding redirect URL from above
6. Save changes

## What Happens After Redirect

1. User completes payment on Stripe
2. Stripe redirects to: `https://mizan-vite.vercel.app/dashboard?payment=success&plan={PLAN}`
3. Dashboard detects the `payment=success` parameter
4. Calls `activatePremium(userId, plan)` which stores premium on server
5. Refreshes premium status from server
6. Premium features immediately available on all devices

## Testing

Test by adding the URL parameters manually:
- `https://mizan-vite.vercel.app/dashboard?payment=success&plan=lifetime`
- Should activate premium and redirect to clean dashboard URL
