import { Subscription } from "../models/subscription.model.js";

export const normalizeSubscriptionStatus = async (subscriptionDoc) => {
  if (!subscriptionDoc) return null;

  if (
    subscriptionDoc.status === "active" &&
    subscriptionDoc.end_date &&
    subscriptionDoc.end_date < new Date()
  ) {
    subscriptionDoc.status = "expired";
    await subscriptionDoc.save();
  }

  return subscriptionDoc;
};

export const hasActiveCookSubscription = async (cookId) => {
  const subscription = await Subscription.findOne({
    cook_id: cookId,
    status: "active",
  }).sort({ createdAt: -1 });

  const normalizedSubscription = await normalizeSubscriptionStatus(subscription);
  return Boolean(normalizedSubscription && normalizedSubscription.status === "active");
};

export const getActiveSubscribedCookIds = async (cookIds = null) => {
  const now = new Date();
  const query = {
    status: "active",
    $or: [{ end_date: { $gte: now } }, { end_date: null }, { end_date: { $exists: false } }],
  };

  if (Array.isArray(cookIds) && cookIds.length > 0) {
    query.cook_id = { $in: cookIds };
  }

  const activeCookIds = await Subscription.distinct("cook_id", query);
  return new Set(activeCookIds.map((id) => String(id)));
};