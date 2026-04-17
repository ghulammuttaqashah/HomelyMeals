import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { subscribeToOrderUpdates, initializeSocket } from "../utils/socket";

/**
 * Global socket listener for the customer app.
 * Shows real-time toasts for order updates regardless of which page the customer is on.
 */
const SocketListener = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) return;

    initializeSocket();

    const unsubOrderUpdate = subscribeToOrderUpdates((data) => {
      const event = data.eventType;

      if (event === "cancellation_accepted") {
        toast(
          (t) => (
            <div
              className="flex items-start gap-3 cursor-pointer"
              onClick={() => {
                toast.dismiss(t.id);
                if (data.orderId) navigate(`/orders/${data.orderId}`);
              }}
            >
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-green-400">Cancellation Approved</p>
                <p className="text-sm text-gray-600">
                  {data.orderNumber
                    ? `Order #${data.orderNumber} has been cancelled`
                    : "Your cancellation request was approved"}
                </p>
                <p className="text-xs text-green-700 mt-1">Tap to view</p>
              </div>
            </div>
          ),
          {
            duration: 8000,
            style: { background: "#fff", color: "#333", border: "2px solid #22c55e", padding: "12px", maxWidth: "400px" },
            id: `cancel-accepted-${data.orderId || Date.now()}`,
          }
        );
      } else if (event === "cancellation_rejected") {
        toast(
          (t) => (
            <div
              className="flex items-start gap-3 cursor-pointer"
              onClick={() => {
                toast.dismiss(t.id);
                if (data.orderId) navigate(`/orders/${data.orderId}`);
              }}
            >
              <span className="text-2xl">❌</span>
              <div>
                <p className="font-semibold text-red-400">Cancellation Declined</p>
                <p className="text-sm text-gray-600">
                  {data.orderNumber
                    ? `Order #${data.orderNumber} cancellation was declined`
                    : "Your cancellation request was declined"}
                  {data.cookResponse ? ` — "${data.cookResponse}"` : ""}
                </p>
                <p className="text-xs text-red-700 mt-1">Tap to view</p>
              </div>
            </div>
          ),
          {
            duration: 8000,
            style: { background: "#fff", color: "#333", border: "2px solid #ef4444", padding: "12px", maxWidth: "400px" },
            id: `cancel-rejected-${data.orderId || Date.now()}`,
          }
        );
      } else if (event === "order_status_updated") {
        toast(
          (t) => (
            <div
              className="flex items-start gap-3 cursor-pointer"
              onClick={() => {
                toast.dismiss(t.id);
                if (data.orderId) navigate(`/orders/${data.orderId}`);
              }}
            >
              <span className="text-2xl">📦</span>
              <div>
                <p className="font-semibold text-gray-900">Order Updated</p>
                <p className="text-sm text-gray-600">
                  {data.message || "Your order status has been updated"}
                </p>
                <p className="text-xs text-orange-600 mt-1">Tap to view</p>
              </div>
            </div>
          ),
          {
            duration: 6000,
            style: { background: "#fff", color: "#333", border: "2px solid #f97316", padding: "12px", maxWidth: "400px" },
            id: `order-update-${data.orderId || Date.now()}`,
          }
        );
      } else if (event === "payment_verified") {
        toast(
          (t) => (
            <div
              className="flex items-start gap-3 cursor-pointer"
              onClick={() => {
                toast.dismiss(t.id);
                if (data.orderId) navigate(`/orders/${data.orderId}`);
              }}
            >
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-gray-900">Payment Verified</p>
                <p className="text-sm text-gray-600">
                  {data.message || "Your payment has been verified"}
                </p>
                <p className="text-xs text-green-700 mt-1">Tap to view</p>
              </div>
            </div>
          ),
          {
            duration: 6000,
            style: { background: "#fff", color: "#333", border: "2px solid #22c55e", padding: "12px", maxWidth: "400px" },
            id: `payment-verified-${data.orderId || Date.now()}`,
          }
        );
      } else if (event === "payment_rejected") {
        toast(
          (t) => (
            <div
              className="flex items-start gap-3 cursor-pointer"
              onClick={() => {
                toast.dismiss(t.id);
                if (data.orderId) navigate(`/orders/${data.orderId}`);
              }}
            >
              <span className="text-2xl">❌</span>
              <div>
                <p className="font-semibold text-gray-900">Payment Rejected</p>
                <p className="text-sm text-gray-600">
                  {data.message || "Your payment proof was rejected. Please re-upload."}
                </p>
                <p className="text-xs text-red-700 mt-1">Tap to view</p>
              </div>
            </div>
          ),
          {
            duration: 8000,
            style: { background: "#fff", color: "#333", border: "2px solid #ef4444", padding: "12px", maxWidth: "400px" },
            id: `payment-rejected-${data.orderId || Date.now()}`,
          }
        );
      } else if (event === "order_delivered") {
        toast(
          (t) => (
            <div
              className="flex items-start gap-3 cursor-pointer"
              onClick={() => {
                toast.dismiss(t.id);
                if (data.orderId) navigate(`/orders/${data.orderId}`);
              }}
            >
              <span className="text-2xl">🎉</span>
              <div>
                <p className="font-semibold text-gray-900">Order Delivered!</p>
                <p className="text-sm text-gray-600">
                  {data.message || "Your order has been delivered. Enjoy!"}
                </p>
                <p className="text-xs text-green-700 mt-1">Tap to view</p>
              </div>
            </div>
          ),
          {
            duration: 6000,
            style: { background: "#fff", color: "#333", border: "2px solid #22c55e", padding: "12px", maxWidth: "400px" },
            id: `order-delivered-${data.orderId || Date.now()}`,
          }
        );
      } else if (data.message) {
        // Catch-all for any other order events with a message
        toast(
          (t) => (
            <div
              className="flex items-start gap-3 cursor-pointer"
              onClick={() => {
                toast.dismiss(t.id);
                if (data.orderId) navigate(`/orders/${data.orderId}`);
              }}
            >
              <span className="text-2xl">🔔</span>
              <div>
                <p className="font-semibold text-gray-900">Order Update</p>
                <p className="text-sm text-gray-600">{data.message}</p>
                <p className="text-xs text-orange-600 mt-1">Tap to view</p>
              </div>
            </div>
          ),
          {
            duration: 6000,
            style: {
              background: "#fff",
              color: "#333",
              border: "2px solid #f97316",
              padding: "12px",
              maxWidth: "400px",
            },
            id: `order-event-${data.orderId || Date.now()}`,
          }
        );
      }
    });

    return () => unsubOrderUpdate();
  }, [isAuthenticated, navigate]);

  return null;
};

export default SocketListener;
