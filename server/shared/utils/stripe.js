import Stripe from "stripe";
import { STRIPE_SECRET_KEY } from "../config/env.js";

let stripeClient = null;

export const getStripeClient = () => {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("Stripe secret key is not configured");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(STRIPE_SECRET_KEY);
  }

  return stripeClient;
};
