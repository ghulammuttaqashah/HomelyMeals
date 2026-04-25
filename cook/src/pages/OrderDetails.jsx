import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  getOrderById,
  updateOrderStatus,
  addDeliveryNote,
  respondToCancellation,
  cancelOrder,
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
  const [statusLoading, setStatusLoading] = useState(false);
  const [deliveryNoteLoading, setDeliveryNoteLoading] = useState(false);
  const [cancellationLoading, setCancellationLoading] = useState(false);
  const [cancelOrderLoading, setCancelOrderLoading] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState("");

  const [cancellationResponse, setCancellationResponse] = useState("");
  const [cookCancelReason, setCookCancelReason] = useState("");

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

  const getEventOrderId = (data) => {
    if (!data) return "";
    return String(data.orderId || data._id || data?.order?._id || "");
  };

  // Socket subscriptions
  useEffect(() => {
    initializeSocket();

    const unsubOrderUpdate = subscribeToOrderUpdates((data) => {
      const eventOrderId = getEventOrderId(data);
      if (!eventOrderId || eventOrderId === String(orderId)) {
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

    setStatusLoading(true);
    try {
      const result = await updateOrderStatus(orderId, statusConfig.nextStatus);
      if (result?.order) {
        setOrder((prev) => (prev ? { ...prev, ...result.order } : prev));
      }
      fetchOrder();
      toast.success(statusConfig.nextStatus === "delivered"
        ? "Order marked as delivered!"
        : "Order status updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't update order status. Please try again.");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleAddDeliveryNote = async () => {
    if (!deliveryNote.trim()) return;

    setDeliveryNoteLoading(true);
    try {
      await addDeliveryNote(orderId, deliveryNote);
      toast.success("Delivery note added");
      setDeliveryNote("");
      fetchOrder();
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't add delivery note. Please try again.");
    } finally {
      setDeliveryNoteLoading(false);
    }
  };

  const handleCancellationResponse = async (action) => {
    setCancellationLoading(true);
    try {
      await respondToCancellation(orderId, action, cancellationResponse);
      toast.success(action === "accept" ? "Cancellation accepted" : "Cancellation declined");
      setCancellationResponse("");
      fetchOrder();
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't respond to cancellation request.");
    } finally {
      setCancellationLoading(false);
    }
  };

  const handleCookCancelOrder = async () => {
    if (!cookCancelReason.trim()) {
      toast.error("Please provide a cancellation reason.");
      return;
    }

    setCancelOrderLoading(true);
    try {
      await cancelOrder(orderId, cookCancelReason.trim());
      toast.success("Order cancelled successfully");
      setCookCancelReason("");
      fetchOrder();
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't cancel order.");
    } finally {
      setCancelOrderLoading(false);
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
      <main className="flex-grow mx-auto w-full max-w-6xl px-4 sm:px-6 py-4 sm:py-6">
        {/* Back Button */}
        <button
          onClick={() => navigate("/orders")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back to Orders
        </button>

        <div className="grid gap-4 lg:grid-cols-12">

          {/* ── 1: Order Items ── first on mobile, left col row-1 on desktop */}
          <div className="order-1 lg:col-span-7 lg:col-start-1">
            <div className="bg-white rounded-lg shadow-sm p-5">
              <h2 className="text-lg font-semibold mb-4">Order Items</h2>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 items-center gap-3 rounded-lg border border-gray-100 p-3">
                    <div className="col-span-2 sm:col-span-1">
                      {item.itemImage ? (
                        <img
                          src={item.itemImage}
                          alt={item.name}
                          className="w-14 h-14 rounded-lg object-cover bg-gray-100"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-orange-100 flex items-center justify-center">
                          <span className="text-xl">🍽️</span>
                        </div>
                      )}
                    </div>
                    <div className="col-span-6 sm:col-span-7">
                      <p className="font-medium text-gray-800">{item.name}</p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity} × Rs. {item.price}</p>
                    </div>
                    <div className="col-span-4 sm:col-span-4 text-right">
                      <p className="font-semibold text-gray-800">Rs. {item.price * item.quantity}</p>
                    </div>
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
                  <span>Rs. {Math.round(order.deliveryCharges)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span className="text-orange-600">Rs. {order.totalAmount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── 2: Status Update + File Complaint ── second on mobile, left col row-2 on desktop */}
          <div className="order-2 lg:col-span-7 lg:col-start-1 space-y-4">

            {/* Status Update + File Complaint */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-5">
              <div className="flex flex-col gap-3 mb-4">
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-800">Order #{order.orderNumber}</h1>
                  <p className="text-xs sm:text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${statusConfig.color} text-white`}>
                    {statusConfig.label}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                    order.paymentMethod === "cod" 
                      ? "bg-green-100 text-green-800" 
                      : "bg-blue-100 text-blue-800"
                  }`}>
                    {order.paymentMethod === "cod" ? "COD" : "Online"}
                  </span>
                </div>
              </div>

              {statusConfig.canProgress && (
                <Button
                  onClick={handleStatusUpdate}
                  loading={statusLoading}
                  loadingText="Updating..."
                  variant="primary"
                  className="w-full flex items-center justify-center gap-2 mb-3"
                >
                  {getStatusButtonText()}
                </Button>
              )}

              <Button
                onClick={() => navigate(`/file-complaint?orderId=${order._id}`)}
                variant="outline"
                className="w-full flex items-center justify-center gap-2 border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                <FiAlertTriangle className="w-4 h-4" />
                File Complaint
              </Button>
            </div>

            {/* Delivery Note */}
            {["out_for_delivery", "delivery_pending_confirmation"].includes(order.status) && (
              <div className="bg-white rounded-lg shadow-sm p-5">
                <h2 className="text-lg font-semibold mb-4">Add Delivery Note</h2>
                <div className="grid grid-cols-12 gap-3">
                  <input
                    type="text"
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                    placeholder="e.g., Left at door, handed to security..."
                    className="col-span-10 p-3 border rounded-lg"
                  />
                  <Button
                    onClick={handleAddDeliveryNote}
                    disabled={!deliveryNote.trim() || deliveryNoteLoading}
                    variant="primary"
                    className="col-span-2"
                  >
                    {deliveryNoteLoading ? "..." : <FiSend />}
                  </Button>
                </div>
                {order.deliveryNote && (
                  <p className="mt-3 text-sm text-gray-600">Current note: {order.deliveryNote}</p>
                )}
              </div>
            )}

          </div>

          {/* ── 3: Customer Details & Info ── third on mobile, right col spanning rows 1-3 on desktop */}
          <aside className="order-3 lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:row-span-3 space-y-4">

            {/* Customer Info */}
            <div className="bg-white rounded-lg shadow-sm p-5">
              <h2 className="text-lg font-semibold mb-4">Customer Details</h2>
              <div className="grid grid-cols-[auto_1fr] gap-3 items-center mb-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">👤</span>
                </div>
                <div>
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

              <div className="rounded-lg bg-gray-50 p-3 space-y-1.5">
                <div className="flex items-start gap-2">
                  <FiMapPin className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-800">
                    {order.deliveryAddress.houseNo && `${order.deliveryAddress.houseNo}, `}
                    {order.deliveryAddress.street}
                  </p>
                </div>
                <p className="text-sm text-gray-600 pl-6">
                  {order.deliveryAddress.city}
                  {order.deliveryAddress.postalCode && ` - ${order.deliveryAddress.postalCode}`}
                </p>
                <p className="text-xs text-gray-500 pl-6">
                  Distance: {Number(order.distance || 0).toFixed(1)} km • Est. {order.estimatedTime || '-'} mins
                </p>
              </div>
            </div>

            {order.paymentMethod === "cod" && order.status === "out_for_delivery" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <FiAlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-yellow-700 text-sm">
                    Remember to collect <strong>Rs. {order.totalAmount}</strong> cash on delivery.
                  </p>
                </div>
              </div>
            )}

            {dispute && dispute.status === "open" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
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
            {/* Cancellation Information - Show for cancelled orders */}
            {order.status === "cancelled" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <FiAlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-lg font-semibold text-red-800">Order Cancelled</h2>
                    <p className="text-sm text-red-600 mt-1">
                      {order.cancelledBy === "cook"
                        ? "You cancelled this order"
                        : order.cancelledBy === "customer"
                        ? "Cancelled by customer"
                        : order.cancelledBy === "system"
                        ? "Cancelled by system"
                        : order.cancelledBy === "admin"
                        ? "Cancelled by admin"
                        : "This order was cancelled"}
                    </p>
                    {(order.cancellationReason || order.rejectionReason) && (
                      <p className="text-sm text-gray-700 mt-2">
                        <span className="font-medium">Reason:</span> {order.cancellationReason || order.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Cancellation Request — always above Cancel Order */}
            {order.cancellationRequest?.status === "pending" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-5">
                <div className="flex items-start gap-3 mb-4">
                  <FiAlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-lg font-semibold text-red-800">Cancellation Request</h2>
                    <p className="text-sm text-red-600 mt-1">Customer wants to cancel this order</p>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleCancellationResponse("accept")}
                    disabled={cancellationLoading}
                    variant="primary"
                    className="bg-red-500 hover:bg-red-600"
                  >
                    {cancellationLoading ? "..." : "Accept Cancellation"}
                  </Button>
                  <Button
                    onClick={() => handleCancellationResponse("reject")}
                    disabled={cancellationLoading}
                    variant="outline"
                  >
                    {cancellationLoading ? "..." : "Decline"}
                  </Button>
                </div>
              </div>
            )}

            {/* Cook Cancel Order */}
            {!['delivered', 'cancelled'].includes(order.status) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-5">
                <div className="flex items-start gap-3 mb-3">
                  <FiAlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-red-800">Cancel Order</h2>
                    <p className="text-sm text-red-600 mt-1">
                      If needed, you can cancel this order by providing a clear reason for the customer.
                    </p>
                  </div>
                </div>
                <textarea
                  value={cookCancelReason}
                  onChange={(e) => setCookCancelReason(e.target.value)}
                  placeholder="e.g., Item unavailable due to stock issue"
                  className="w-full p-3 border border-red-200 rounded-lg text-sm bg-white"
                  rows={3}
                />
                <div className="mt-3 flex justify-end">
                  <Button
                    onClick={handleCookCancelOrder}
                    disabled={cancelOrderLoading || !cookCancelReason.trim()}
                    variant="primary"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {cancelOrderLoading ? "Cancelling..." : "Cancel This Order"}
                  </Button>
                </div>
              </div>
            )}

            {order.cookNote && (
              <div className="bg-white rounded-lg shadow-sm p-5">
                <h2 className="text-lg font-semibold mb-2">Customer Instructions</h2>
                <p className="text-gray-600">{order.cookNote}</p>
              </div>
            )}
          </aside>

        </div>

      </main>
      <Footer />
    </div>
  );
};



export default OrderDetails;
