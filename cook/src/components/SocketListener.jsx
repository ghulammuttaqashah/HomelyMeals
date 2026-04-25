import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import {
  subscribeToNewOrders,
  subscribeToOrderUpdates,
  initializeSocket,
} from "../utils/socket";

/**
 * Global socket listener component.
 * Mounted once at app level — shows toasts for new orders
 * and cancellation requests regardless of which page the cook is on.
 */
const SocketListener = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) return;

    initializeSocket();

    // --- New order notifications ---
    const unsubNewOrder = subscribeToNewOrders((data) => {
      // Play a notification sound
      try {
        const audio = new Audio("https://cdn.pixabay.com/audio/2022/12/12/audio_e8c250c0c6.mp3");
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {}

      toast(
        (t) => (
          <div
            className="flex items-start gap-3 cursor-pointer"
            onClick={() => {
              toast.dismiss(t.id);
              if (data.orderId) {
                navigate(`/orders/${data.orderId}`);
              } else {
                navigate("/orders");
              }
            }}
          >
            <span className="text-2xl">🔔</span>
            <div>
              <p className="font-semibold text-gray-900">New Order!</p>
              <p className="text-sm text-gray-600">
                {data.orderNumber
                  ? `Order #${data.orderNumber}`
                  : "You have a new order"}
                {data.totalAmount ? ` — Rs. ${data.totalAmount}` : ""}
              </p>
              <p className="text-xs text-orange-600 mt-1">Tap to view</p>
            </div>
          </div>
        ),
        {
          duration: 2000,
          style: {
            background: "#fff",
            color: "#333",
            border: "2px solid #f97316",
            padding: "12px",
            maxWidth: "400px",
          },
          id: `new-order-${data.orderId || Date.now()}`,
        }
      );
    });

    // --- Order update notifications (cancellation requests, status changes, etc.) ---
    const unsubOrderUpdate = subscribeToOrderUpdates((data) => {
      const event = data.eventType;

      if (event === "cancellation_request") {
        // Play a notification sound for cancellation too
        try {
          const audio = new Audio("https://cdn.pixabay.com/audio/2022/12/12/audio_e8c250c0c6.mp3");
          audio.volume = 0.4;
          audio.play().catch(() => {});
        } catch {}

        toast(
          (t) => (
            <div
              className="flex items-start gap-3 cursor-pointer"
              onClick={() => {
                toast.dismiss(t.id);
                if (data.orderId) {
                  navigate(`/orders/${data.orderId}`);
                } else {
                  navigate("/orders");
                }
              }}
            >
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-red-700">Cancellation Request</p>
                <p className="text-sm text-gray-600">
                  {data.orderNumber
                    ? `Order #${data.orderNumber}`
                    : "A customer wants to cancel"}
                  {data.reason ? ` — "${data.reason}"` : ""}
                </p>
                <p className="text-xs text-red-600 mt-1">Tap to respond</p>
              </div>
            </div>
          ),
          {
            duration: 2000,
            style: {
              background: "#fff",
              color: "#333",
              border: "2px solid #ef4444",
              padding: "12px",
              maxWidth: "400px",
            },
            id: `cancel-req-${data.orderId || Date.now()}`,
          }
        );
      } else if (event === "order_auto_cancelled") {
        toast(
          (t) => (
            <div
              className="flex items-start gap-3 cursor-pointer"
              onClick={() => {
                toast.dismiss(t.id);
                if (data.orderId) {
                  navigate(`/orders/${data.orderId}`);
                } else {
                  navigate("/orders");
                }
              }}
            >
              <span className="text-2xl">⏰</span>
              <div>
                <p className="font-semibold text-red-600">Order Auto-Cancelled</p>
                <p className="text-sm text-gray-600">
                  {data.message || "Order was automatically cancelled"}
                </p>
                <p className="text-xs text-red-700 mt-1">Tap to view</p>
              </div>
            </div>
          ),
          {
            duration: 2000,
            style: {
              background: "#fff",
              color: "#333",
              border: "2px solid #ef4444",
              padding: "12px",
              maxWidth: "400px",
            },
            id: `order-auto-cancel-${data.orderId || Date.now()}`,
          }
        );
      }
      // Other order updates are already handled by individual page listeners
    });

    return () => {
      unsubNewOrder();
      unsubOrderUpdate();
    };
  }, [isAuthenticated, navigate]);

  return null; // This component renders nothing — it only listens
};

export default SocketListener;
