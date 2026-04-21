import webpush from "web-push";
import dotenv from "dotenv";
dotenv.config();

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  "mailto:homelymeals4@gmail.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

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
