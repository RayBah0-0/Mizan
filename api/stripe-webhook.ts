import type { VercelRequest, VercelResponse } from '@vercel/node';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'] as string;

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        // Initial payment succeeded
        const session = event.data.object;
        console.log('Payment successful:', session.id);
        // Premium is activated via redirect URL, no action needed here
        break;

      case 'customer.subscription.created':
        // New subscription created
        const newSubscription = event.data.object;
        console.log('Subscription created:', newSubscription.id);
        break;

      case 'invoice.payment_succeeded':
        // Recurring payment succeeded (renewal)
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        // TODO: Extend premium for this user
        // You'll need to store subscription_id -> user_id mapping
        console.log('Renewal successful for subscription:', subscriptionId);
        break;

      case 'customer.subscription.deleted':
        // Subscription cancelled
        const deletedSubscription = event.data.object;
        console.log('Subscription cancelled:', deletedSubscription.id);
        // Premium will naturally expire based on expiresAt date
        break;

      case 'invoice.payment_failed':
        // Payment failed - notify user
        const failedInvoice = event.data.object;
        console.log('Payment failed for subscription:', failedInvoice.subscription);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('Error processing webhook:', err);
    res.status(500).json({ error: err.message });
  }
}
