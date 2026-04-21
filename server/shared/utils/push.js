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
  if (!subscription) {
    return;
  }
  
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (error) {
    console.error("Error sending push notification:", error);
    // If the subscription is no longer valid (e.g. user unsubscribed in browser)
    // we should ideally remove it from the DB. Handled per-call usually or ignored
  }
};
