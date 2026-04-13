import { Cook } from "../models/cook.model.js";
import stripeService from "../services/stripe.service.js";

/**
 * Initiate Stripe onboarding for cook
 * POST /api/cook/stripe/onboard
 */
export const initiateOnboarding = async (req, res) => {
  try {
    const cookId = req.user._id;

    const cook = await Cook.findById(cookId);
    if (!cook) {
      return res.status(404).json({ message: "Cook not found" });
    }

    let stripeAccountId = cook.stripeAccountId;

    // Create Stripe account if doesn't exist
    if (!stripeAccountId) {
      const { accountId } = await stripeService.createConnectAccount(
        cookId,
        cook.email
      );
      
      stripeAccountId = accountId;
      cook.stripeAccountId = accountId;
      cook.stripeAccountStatus = "pending";
      await cook.save();
    }

    // Generate onboarding link
    const baseUrl = process.env.COOK_APP_URL || "http://localhost:5173";
    const returnUrl = `${baseUrl}/payment-settings?onboarding=success`;
    const refreshUrl = `${baseUrl}/payment-settings?onboarding=refresh`;

    const { url } = await stripeService.generateOnboardingLink(
      stripeAccountId,
      returnUrl,
      refreshUrl
    );

    return res.status(200).json({
      success: true,
      onboardingUrl: url,
      message: "Onboarding link generated successfully",
    });
  } catch (error) {
    console.error("Initiate onboarding error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Failed to initiate onboarding",
      error: error.message 
    });
  }
};

/**
 * Get Stripe account management link
 * POST /api/cook/stripe/manage
 */
export const getManageLink = async (req, res) => {
  try {
    const cookId = req.user._id;

    const cook = await Cook.findById(cookId);
    if (!cook) {
      return res.status(404).json({ message: "Cook not found" });
    }

    if (!cook.stripeAccountId) {
      return res.status(400).json({ 
        message: "Please complete KYC verification first",
        action: "complete_kyc"
      });
    }

    const { url } = await stripeService.generateLoginLink(cook.stripeAccountId);

    return res.status(200).json({
      success: true,
      manageUrl: url,
      message: "Management link generated successfully",
    });
  } catch (error) {
    console.error("Get manage link error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Failed to generate management link",
      error: error.message 
    });
  }
};

/**
 * Get Stripe account status
 * GET /api/cook/stripe/status
 */
export const getStripeStatus = async (req, res) => {
  try {
    const cookId = req.user._id;

    const cook = await Cook.findById(cookId);
    if (!cook) {
      return res.status(404).json({ message: "Cook not found" });
    }

    // If no Stripe account, return not_started status
    if (!cook.stripeAccountId) {
      return res.status(200).json({
        stripeAccountId: null,
        stripeAccountStatus: "not_started",
        isOnlinePaymentEnabled: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      });
    }

    // Fetch latest status from Stripe
    const accountStatus = await stripeService.getAccountStatus(cook.stripeAccountId);

    // Update cook model if status changed
    if (cook.stripeAccountStatus !== accountStatus.status) {
      cook.stripeAccountStatus = accountStatus.status;
      
      // Mark onboarding as completed if account is active
      if (accountStatus.status === "active" && !cook.stripeOnboardingCompletedAt) {
        cook.stripeOnboardingCompletedAt = new Date();
      }
      
      await cook.save();
    }

    return res.status(200).json({
      stripeAccountId: cook.stripeAccountId,
      stripeAccountStatus: accountStatus.status,
      isOnlinePaymentEnabled: cook.isOnlinePaymentEnabled,
      chargesEnabled: accountStatus.chargesEnabled,
      payoutsEnabled: accountStatus.payoutsEnabled,
      detailsSubmitted: accountStatus.detailsSubmitted,
    });
  } catch (error) {
    console.error("Get Stripe status error:", error);
    return res.status(500).json({ 
      message: "Failed to retrieve Stripe status",
      error: error.message 
    });
  }
};

/**
 * Update payment settings (enable/disable online payments)
 * PATCH /api/cook/payment-settings
 */
export const updatePaymentSettings = async (req, res) => {
  try {
    const cookId = req.user._id;
    const { isOnlinePaymentEnabled } = req.body;

    if (typeof isOnlinePaymentEnabled !== "boolean") {
      return res.status(400).json({ 
        message: "isOnlinePaymentEnabled must be a boolean value" 
      });
    }

    const cook = await Cook.findById(cookId);
    if (!cook) {
      return res.status(404).json({ message: "Cook not found" });
    }

    // Validate KYC requirement when enabling online payments
    if (isOnlinePaymentEnabled && !cook.stripeAccountId) {
      return res.status(400).json({
        message: "Please complete KYC verification before enabling online payments",
        action: "complete_kyc"
      });
    }

    // Verify account is active when enabling
    if (isOnlinePaymentEnabled && cook.stripeAccountStatus !== "active") {
      return res.status(400).json({
        message: "Your Stripe account must be active to enable online payments",
        currentStatus: cook.stripeAccountStatus,
        action: "complete_kyc"
      });
    }

    cook.isOnlinePaymentEnabled = isOnlinePaymentEnabled;
    await cook.save();

    return res.status(200).json({
      success: true,
      message: `Online payments ${isOnlinePaymentEnabled ? "enabled" : "disabled"} successfully`,
      isOnlinePaymentEnabled: cook.isOnlinePaymentEnabled,
    });
  } catch (error) {
    console.error("Update payment settings error:", error);
    return res.status(500).json({ 
      message: "Failed to update payment settings",
      error: error.message 
    });
  }
};
