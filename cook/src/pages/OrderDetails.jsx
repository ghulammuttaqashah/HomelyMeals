import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  getOrderById,
  updateOrderStatus,
  addDeliveryNote,
  respondToCancellation,
} from "../api/orders";
import { subscribeToOrderUpdates, initializeSocket } from "../utils/socket";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Button from "../components/Button";
import Loader from "../components/Loader";
import {
  FiArrowLeft,
  FiMapPin,
  FiClock,
  FiPhone,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiAlertTriangle,
  FiImage,
  FiSend,
  FiTruck,
  FiMessageCircle,
} from "react-icons/fi";

const STATUS_CONFIG = {
  confirmed: { label: "Confirmed - Start Preparing", color: "bg-blue-500", canProgress: true, nextStatus: "preparing" },
  preparing: { label: "Preparing", color: "bg-purple-500", canProgress: true, nextStatus: "out_for_delivery" },
  out_for_delivery: { label: "Out for Delivery", color: "bg-indigo-500", canProgress: true, nextStatus: "delivered" },
  delivered: { label: "Delivered", color: "bg-green-500", canProgress: false },
  cancelled: { label: "Cancelled", color: "bg-red-500", canProgress: false },
};



const OrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState("");

  const [cancellationResponse, setCancellationResponse] = useState("");

  const fetchOrder = async () => {
    try {
      const result = await getOrderById(orderId);
      setOrder(result.order);
      setDispute(result.dispute);
    } catch (error) {
      console.error("Fetch order error:", error);
      toast.error("Order not found. Please try again.", { id: 'fetch-order-error' });
      navigate("/orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  // Socket subscriptions
  useEffect(() => {
    initializeSocket();

    const unsubOrderUpdate = subscribeToOrderUpdates((data) => {
      if (data.orderId === orderId) {
        fetchOrder();
      }
    });

    return () => {
      unsubOrderUpdate();
    };
  }, [orderId]);

  const handleStatusUpdate = async () => {
    const statusConfig = STATUS_CONFIG[order.status];
    if (!statusConfig?.canProgress) return;

    // Check payment requirement
    if (
      order.paymentMethod !== "cod" &&
      statusConfig.nextStatus === "out_for_delivery" &&
      order.paymentStatus !== "verified" &&
      order.paymentStatus !== "paid"
    ) {
      toast.error("Payment must be verified before delivery");
      return;
    }

    setActionLoading(true);
    try {
      await updateOrderStatus(orderId, statusConfig.nextStatus);
      toast.success(statusConfig.nextStatus === "delivered"
        ? "Order marked as delivered!"
        : "Order status updated");
      fetchOrder();
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't update order status. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddDeliveryNote = async () => {
    if (!deliveryNote.trim()) return;

    setActionLoading(true);
    try {
      await addDeliveryNote(orderId, deliveryNote);
      toast.success("Delivery note added");
      setDeliveryNote("");
      fetchOrder();
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't add delivery note. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancellationResponse = async (action) => {
    setActionLoading(true);
    try {
      await respondToCancellation(orderId, action, cancellationResponse);
      toast.success(action === "accept" ? "Cancellation accepted" : "Cancellation declined");
      setCancellationResponse("");
      fetchOrder();
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't respond to cancellation request.");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-PK", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header showSignOut={true} />
        <main className="flex-grow flex items-center justify-center px-4">
          <Loader />
        </main>
        <Footer />
      </div>
    );
  }

  if (!order) return null;

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.confirmed;


  // Determine button text for status update
  const getStatusButtonText = () => {
    if (statusConfig.nextStatus === "delivered") {
      return "Mark as Delivered";
    }
    return `Mark as ${statusConfig.nextStatus?.replace(/_/g, " ")}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header showSignOut={true} />
      <main className="flex-grow mx-auto w-full max-w-4xl px-4 sm:px-6 py-4 sm:py-6">
        {/* Back Button */}
        <button
          onClick={() => navigate("/orders")}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-orange-600 mb-4 transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" />
          <span>Back to Orders</span>
        </button>

        {/* Order Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-5 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-800">Order #{order.orderNumber}</h1>
              <p className="text-xs sm:text-sm text-gray-500">{formatDate(order.createdAt)}</p>
            </div>
            <span className={`self-start px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${statusConfig.color} text-white`}>
              {statusConfig.label}
            </span>
          </div>

          {/* Status Update Button */}
          {statusConfig.canProgress && (
            <Button
              onClick={handleStatusUpdate}
              disabled={actionLoading}
              variant="primary"
              className="w-full flex items-center justify-center gap-2 mb-3"
            >
              {actionLoading ? "Updating..." : getStatusButtonText()}
            </Button>
          )}

          {/* File Complaint Button */}
          <Button
            onClick={() => navigate(`/file-complaint?orderId=${order._id}`)}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 border-orange-500 text-orange-600 hover:bg-orange-50"
          >
            <FiAlertTriangle className="w-4 h-4" />
            File Complaint
          </Button>
        </div>

        {/* COD Payment Note */}
        {order.paymentMethod === "cod" && order.status === "out_for_delivery" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <FiAlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-700">
                Remember to collect <strong>Rs. {order.totalAmount}</strong> cash on delivery.
              </p>
            </div>
          </div>
        )}

        {/* Cancellation Request from Customer */}
        {order.cancellationRequest?.status === "pending" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-5 mb-4">
            <div className="flex items-start gap-3 mb-4">
              <FiAlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-red-800">Cancellation Request</h2>
                <p className="text-sm text-red-600 mt-1">
                  Customer wants to cancel this order
                </p>
                <p className="text-sm text-gray-700 mt-2">
                  <span className="font-medium">Reason:</span> {order.cancellationRequest.reason}
                </p>
              </div>
            </div>
            <div className="mb-3">
              <input
                type="text"
                value={cancellationResponse}
                onChange={(e) => setCancellationResponse(e.target.value)}
                placeholder="Optional response message..."
                className="w-full p-3 border rounded-lg text-sm"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => handleCancellationResponse("accept")}
                disabled={actionLoading}
                variant="primary"
                className="flex-1 bg-red-500 hover:bg-red-600"
              >
                {actionLoading ? "..." : "Accept Cancellation"}
              </Button>
              <Button
                onClick={() => handleCancellationResponse("reject")}
                disabled={actionLoading}
                variant="outline"
                className="flex-1"
              >
                {actionLoading ? "..." : "Decline"}
              </Button>
            </div>
          </div>
        )}

        {/* Dispute Alert */}
        {dispute && dispute.status === "open" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-700">Active Dispute</p>
                <p className="text-sm text-red-600">
                  Type: {dispute.type.replace(/_/g, " ")} - Admin is reviewing
                </p>
                <button
                  onClick={() => navigate(`/disputes/${dispute._id}`)}
                  className="text-sm text-red-600 underline mt-1"
                >
                  View Dispute Details
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
          <h2 className="text-lg font-semibold mb-4">Order Items</h2>
          <div className="space-y-3">
            {order.items.map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                {item.itemImage ? (
                  <img
                    src={item.itemImage}
                    alt={item.name}
                    className="w-16 h-16 rounded-lg object-cover bg-gray-100"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-orange-100 flex items-center justify-center">
                    <span className="text-2xl">🍽️</span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{item.name}</p>
                  <p className="text-sm text-gray-500">Qty: {item.quantity} × Rs. {item.price}</p>
                </div>
                <p className="font-semibold">Rs. {item.price * item.quantity}</p>
              </div>
            ))}
          </div>

          <div className="border-t mt-4 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span>Rs. {order.subtotal}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Delivery Fee</span>
              <span>Rs. {order.deliveryCharges}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span className="text-orange-600">Rs. {order.totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
          <h2 className="text-lg font-semibold mb-4">Customer Details</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-800">{order.customer?.name}</p>
              {order.customer?.contact && (
                <a
                  href={`tel:${order.customer.contact}`}
                  className="text-sm text-orange-600 flex items-center gap-1"
                >
                  <FiPhone className="w-3 h-3" />
                  {order.customer.contact}
                </a>
              )}
            </div>
          </div>

          {/* Message Customer Button */}
          {order.customer?._id && (
            <Button
              onClick={() => navigate(`/chats/${order.customer._id}`, {
                state: {
                  customerName: order.customer.name,
                  customerEmail: order.customer.email || '',
                  customerId: order.customer._id
                }
              })}
              variant="outline"
              className="w-full flex items-center justify-center gap-2 border-orange-600 text-orange-600 hover:bg-orange-50 mb-4"
            >
              <FiMessageCircle className="w-4 h-4" />
              Message Customer
            </Button>
          )}

          {/* Delivery Address */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <FiMapPin className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-gray-800">
                {order.deliveryAddress.houseNo && `${order.deliveryAddress.houseNo}, `}
                {order.deliveryAddress.street}
              </p>
              <p className="text-gray-600 text-sm">
                {order.deliveryAddress.city}
                {order.deliveryAddress.postalCode && ` - ${order.deliveryAddress.postalCode}`}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Distance: {order.deliveryDistance?.toFixed(1)} km • Est. {order.estimatedDeliveryTime} mins
              </p>
            </div>
          </div>
        </div>

        {/* Delivery Note */}
        {["out_for_delivery", "delivery_pending_confirmation"].includes(order.status) && (
          <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
            <h2 className="text-lg font-semibold mb-4">Add Delivery Note</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                placeholder="e.g., Left at door, handed to security..."
                className="flex-1 p-3 border rounded-lg"
              />
              <Button
                onClick={handleAddDeliveryNote}
                disabled={!deliveryNote.trim() || actionLoading}
                variant="primary"
              >
                <FiSend />
              </Button>
            </div>
            {order.deliveryNote && (
              <p className="mt-3 text-sm text-gray-600">
                Current note: {order.deliveryNote}
              </p>
            )}
          </div>
        )}

        {/* Order Notes */}
        {order.cookNote && (
          <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
            <h2 className="text-lg font-semibold mb-2">Customer Instructions</h2>
            <p className="text-gray-600">{order.cookNote}</p>
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
};

export default OrderDetails;
