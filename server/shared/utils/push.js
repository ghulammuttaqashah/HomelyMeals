import webpush from "web-push";
import dotenv from "dotenv";
dotenv.config();

// Configure web-push with VAPID keys (only if valid keys are provided)
try {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  
  if (vapidPublicKey && vapidPrivateKey && vapidPublicKey.length > 20 && vapidPrivateKey.length > 20) {
    webpush.setVapidDetails(
      "mailto:homelymeals4@gmail.com",
      vapidPublicKey,
      vapidPrivateKey
    );
    console.log("✅ Web push notifications configured");
  } else {
    console.warn("⚠️  VAPID keys not configured - push notifications disabled");
  }
} catch (error) {
  console.warn("⚠️  Failed to configure web push:", error.message);
}

export const sendPushNotification = async (subscription, payload) => {
  if (!subscription || !subscription.endpoint) {
    return { sent: false, expired: false };
  }
  
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { sent: true, expired: false };
  } catch (error) {
    // 410 Gone or 404 = subscription is no longer valid (user unsubscribed/reinstalled)
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.warn("⚠️  Push subscription expired (410/404), should be removed from DB");
      return { sent: false, expired: true };
    }
    console.error("Error sending push notification:", error.statusCode || error.message);
    return { sent: false, expired: false };
  }
};

/**
 * Send push notification to a user and auto-clean expired subscriptions.
 * @param {Object} userDoc - Mongoose document (Customer or Cook) with pushSubscription field
 * @param {Object} payload - { title, body, url, actions }
 */
export const sendPushToUser = async (userDoc, payload) => {
  if (!userDoc || !userDoc.pushSubscription) return;
  
  const result = await sendPushNotification(userDoc.pushSubscription, payload);
  
  // Auto-clean expired subscriptions from DB
  if (result.expired) {
    try {
      userDoc.pushSubscription = null;
      await userDoc.save();
      console.log(`🧹 Cleared expired push subscription for user ${userDoc._id}`);
    } catch (e) {
      console.error("Failed to clear expired push subscription:", e.message);
    }
  }
};
