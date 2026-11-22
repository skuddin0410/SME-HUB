import Stripe from "stripe";

/** True once the Stripe keys are set in the server settings. Until then the site shows "being set up". */
export function billingConfigured() {
  return !!(process.env.STRIPE_SECRET_KEY && (process.env.STRIPE_PRICE_PLUS_MONTHLY || process.env.STRIPE_PRICE_PLUS_YEARLY || process.env.STRIPE_PRICE_ADVISOR_YEARLY));
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}
