import mongoose from "mongoose";
import { Plan } from "../../../shared/models/plan.model.js";
import { Subscription } from "../../../shared/models/subscription.model.js";
import { getStripeClient } from "../../../shared/utils/stripe.js";
import { normalizeSubscriptionStatus } from "../../../shared/utils/subscriptionAccess.js";

/**
 * GET /api/cook/subscriptions/plans
 */
export const getActivePlans = async (req, res) => {
  try {
    const plans = await Plan.find({ status: "active" }).sort({ price: 1 });
    return res.status(200).json({ plans });
  } catch (error) {
    console.error("Get active plans error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /api/cook/subscriptions/payment-intent
 */
export const createSubscriptionPaymentIntent = async (req, res) => {
  try {
    const cookId = req.user._id;
    const { planId } = req.body;

    if (!planId || !mongoose.Types.ObjectId.isValid(planId)) {
      return res.status(400).json({ message: "Valid plan ID is required" });
    }

    const plan = await Plan.findOne({ _id: planId, status: "active" });
    if (!plan) {
      return res.status(404).json({ message: "Plan not found or inactive" });
    }

    const currentActiveSubscription = await Subscription.findOne({
      cook_id: cookId,
      status: "active",
      end_date: { $gte: new Date() },
    });

    if (currentActiveSubscription) {
      return res.status(400).json({
        message: "You already have an active subscription",
      });
    }

    const stripe = getStripeClient();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(plan.price * 100),
      currency: "pkr",
      metadata: {
        cookId: String(cookId),
        planId: String(plan._id),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    await Subscription.deleteMany({
      cook_id: cookId,
      status: "pending",
    });

    await Subscription.create({
      cook_id: cookId,
      plan_id: plan._id,
      status: "pending",
      stripe_payment_intent_id: paymentIntent.id,
    });

    return res.status(200).json({
      message: "Payment intent created",
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      plan: {
        _id: plan._id,
        name: plan.name,
        price: plan.price,
        duration: plan.duration,
      },
    });
  } catch (error) {
    console.error("Create subscription payment intent error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /api/cook/subscriptions/confirm
 */
export const confirmSubscription = async (req, res) => {
  try {
    const cookId = req.user._id;
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ message: "paymentIntentId is required" });
    }

    const stripe = getStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent || paymentIntent.status !== "succeeded") {
      return res.status(400).json({ message: "Payment is not completed" });
    }

    const pendingSubscription = await Subscription.findOne({
      cook_id: cookId,
      stripe_payment_intent_id: paymentIntentId,
      status: "pending",
    }).populate("plan_id");

    if (!pendingSubscription) {
      return res.status(404).json({ message: "Pending subscription not found" });
    }

    const now = new Date();
    const endDate = new Date(now.getTime() + pendingSubscription.plan_id.duration * 24 * 60 * 60 * 1000);

    await Subscription.updateMany(
      {
        cook_id: cookId,
        status: "active",
      },
      {
        $set: { status: "expired" },
      }
    );

    pendingSubscription.start_date = now;
    pendingSubscription.end_date = endDate;
    pendingSubscription.status = "active";
    await pendingSubscription.save();

    return res.status(200).json({
      message: "Subscription activated successfully",
      subscription: {
        _id: pendingSubscription._id,
        status: pendingSubscription.status,
        start_date: pendingSubscription.start_date,
        end_date: pendingSubscription.end_date,
        stripe_payment_intent_id: pendingSubscription.stripe_payment_intent_id,
        plan: {
          _id: pendingSubscription.plan_id._id,
          name: pendingSubscription.plan_id.name,
          price: pendingSubscription.plan_id.price,
          duration: pendingSubscription.plan_id.duration,
        },
      },
    });
  } catch (error) {
    console.error("Confirm subscription error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/cook/subscriptions/me
 */
export const getMySubscriptionStatus = async (req, res) => {
  try {
    const cookId = req.user._id;

    let subscription = await Subscription.findOne({ cook_id: cookId })
      .sort({ createdAt: -1 })
      .populate("plan_id");

    subscription = await normalizeSubscriptionStatus(subscription);

    if (!subscription) {
      return res.status(200).json({
        subscription: null,
        message: "No subscription found",
      });
    }

    return res.status(200).json({
      subscription: {
        _id: subscription._id,
        status: subscription.status,
        start_date: subscription.start_date,
        end_date: subscription.end_date,
        stripe_payment_intent_id: subscription.stripe_payment_intent_id,
        plan: subscription.plan_id
          ? {
              _id: subscription.plan_id._id,
              name: subscription.plan_id.name,
              price: subscription.plan_id.price,
              duration: subscription.plan_id.duration,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Get my subscription error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
