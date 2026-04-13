import { getStripeClient } from "../../../shared/utils/stripe.js";

/**
 * Stripe Service for Connect Account Management
 * Handles all direct interactions with Stripe API for Connect accounts
 */
class StripeService {
  /**
   * Create a Stripe Express Connect account for a cook
   * @param {string} cookId - Cook's database ID
   * @param {string} email - Cook's email address
   * @returns {Promise<{accountId: string}>}
   */
  async createConnectAccount(cookId, email) {
    try {
      const stripe = getStripeClient();
      
      const account = await stripe.accounts.create({
        type: "express",
        email,
        country: process.env.STRIPE_DEFAULT_COUNTRY || "US",
        metadata: {
          cookId: String(cookId),
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      console.log(`✅ Stripe Connect account created: ${account.id} for cook: ${cookId}`);
      return { accountId: account.id };
    } catch (error) {
      console.error("Stripe createConnectAccount error:", error);
      throw new Error(`Failed to create Stripe account: ${error.message}`);
    }
  }

  /**
   * Generate onboarding link for KYC flow
   * @param {string} stripeAccountId - Stripe Connect account ID
   * @param {string} returnUrl - URL to redirect after successful onboarding
   * @param {string} refreshUrl - URL to redirect if onboarding is incomplete
   * @returns {Promise<{url: string}>}
   */
  async generateOnboardingLink(stripeAccountId, returnUrl, refreshUrl) {
    try {
      const stripe = getStripeClient();
      
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_onboarding",
      });

      console.log(`✅ Onboarding link generated for account: ${stripeAccountId}`);
      return { url: accountLink.url };
    } catch (error) {
      console.error("Stripe generateOnboardingLink error:", error);
      throw new Error(`Failed to generate onboarding link: ${error.message}`);
    }
  }

  /**
   * Generate login link for account management
   * @param {string} stripeAccountId - Stripe Connect account ID
   * @returns {Promise<{url: string}>}
   */
  async generateLoginLink(stripeAccountId) {
    try {
      const stripe = getStripeClient();
      
      const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);

      console.log(`✅ Login link generated for account: ${stripeAccountId}`);
      return { url: loginLink.url };
    } catch (error) {
      console.error("Stripe generateLoginLink error:", error);
      throw new Error(`Failed to generate login link: ${error.message}`);
    }
  }

  /**
   * Get Stripe account status and details
   * @param {string} stripeAccountId - Stripe Connect account ID
   * @returns {Promise<{status: string, chargesEnabled: boolean, payoutsEnabled: boolean, detailsSubmitted: boolean}>}
   */
  async getAccountStatus(stripeAccountId) {
    try {
      const stripe = getStripeClient();
      
      const account = await stripe.accounts.retrieve(stripeAccountId);

      const status = this._determineAccountStatus(account);

      return {
        status,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        requirements: account.requirements,
      };
    } catch (error) {
      console.error("Stripe getAccountStatus error:", error);
      throw new Error(`Failed to retrieve account status: ${error.message}`);
    }
  }

  /**
   * Determine account status based on Stripe account object
   * @private
   */
  _determineAccountStatus(account) {
    if (!account.details_submitted) {
      return "pending";
    }
    
    if (account.charges_enabled && account.payouts_enabled) {
      return "active";
    }
    
    if (account.requirements?.disabled_reason) {
      return "disabled";
    }
    
    if (account.requirements?.currently_due?.length > 0 || 
        account.requirements?.eventually_due?.length > 0) {
      return "restricted";
    }
    
    return "pending";
  }
}

export default new StripeService();
