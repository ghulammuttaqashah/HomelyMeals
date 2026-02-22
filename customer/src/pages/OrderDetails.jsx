import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  getOrderById,
  requestCancellation,
} from "../api/orders";
import { checkCanReview } from "../api/review";
import { subscribeToOrderUpdates, initializeSocket } from "../utils/socket";
import { useCart } from "../context/CartContext";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Button from "../components/Button";
import Loader from "../components/Loader";
import ReviewModal from "../components/ReviewModal";
import {
  FiArrowLeft,
  FiMapPin,
  FiClock,
  FiPhone,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiCheckCircle,
  FiHome,
  FiTruck,
  FiRepeat,
  FiMessageCircle,
  FiStar,
} from "react-icons/fi";

const STATUS_CONFIG = {
  confirmed: { label: "Order Confirmed", color: "bg-blue-500", step: 1 },
  preparing: { label: "Being Prepared", color: "bg-purple-500", step: 2 },
  out_for_delivery: { label: "Out for Delivery", color: "bg-indigo-500", step: 3 },
  delivered: { label: "Delivered", color: "bg-green-500", step: 4 },
  cancelled: { label: "Cancelled", color: "bg-red-500", step: 0 },
  cancelled_by_cook: { label: "Cancelled by Cook", color: "bg-red-500", step: 0 },
  cancelled_by_customer: { label: "Cancelled by You", color: "bg-gray-500", step: 0 },
};



// Delivery ETA countdown component
const DeliveryCountdown = ({ estimatedDeliveryAt }) => {
  const [timeRemaining, setTimeRemaining] = useState("");
  const [arrived, setArrived] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const remaining = new Date(estimatedDeliveryAt) - new Date();
      if (remaining <= 0) {
        setTimeRemaining("Any moment now!");
        setArrived(true);
        return;
      }
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [estimatedDeliveryAt]);

  return (
    <span className={arrived ? "text-white/80 text-xl" : ""}>
      {timeRemaining}
    </span>
  );
};

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setCartFromOrder, cart } = useCart();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Review states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null); // { type: 'cook' | 'meal', id, name }
  const [canReview, setCanReview] = useState(null);

  const fetchOrder = async () => {
    try {
      const result = await getOrderById(id);
      setOrder(result.order);

      // Check review status if order is delivered
      if (result.order.status === 'delivered') {
        fetchReviewStatus();
      }
    } catch (error) {
      console.error("Fetch order error:", error);
      toast.error("Order not found. Please try again.", { id: 'fetch-order-error' });
      navigate("/orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewStatus = async () => {
    try {
      const result = await checkCanReview(id);
      setCanReview(result);
    } catch (error) {
      console.error("Check review status error:", error);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  // Socket subscription
  useEffect(() => {
    initializeSocket();

    const unsubscribe = subscribeToOrderUpdates((data) => {
      if (data.orderId === id) {
        // Silently refresh — toasts are handled by global SocketListener
        fetchOrder();
      }
    });

    return () => unsubscribe();
  }, [id]);

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a reason for cancellation");
      return;
    }

    setActionLoading(true);
    try {
      await requestCancellation(id, cancelReason);
      toast.success("Cancellation request sent to cook");
      fetchOrder();
      setShowCancelModal(false);
      setCancelReason("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't send cancellation request. Please try again.");
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
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <Loader />
        </main>
        <Footer />
      </div>
    );
  }

  if (!order) return null;

  // Determine display status based on cancelledBy
  let displayStatus = order.status;
  if (order.status === "cancelled" && order.cancelledBy) {
    displayStatus = order.cancelledBy === "cook" ? "cancelled_by_cook" : "cancelled_by_customer";
  }

  const statusConfig = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.confirmed;
  const canCancel = ["confirmed", "preparing", "out_for_delivery"].includes(order.status) &&
    (!order.cancellationRequest || order.cancellationRequest.status !== "pending");

  const handleReorder = () => {
    if (!order.cook?._id) {
      toast.error("Cook information not available");
      return;
    }

    // Check if cart has items from a different cook
    if (cart.cookId && cart.cookId !== order.cook._id && cart.items.length > 0) {
      const confirmed = window.confirm(
        `Your cart has items from ${cart.cookName}. Reordering will replace your cart. Continue?`
      );
      if (!confirmed) return;
    }

    // Set cart from order
    setCartFromOrder(order);
    toast.success("Items added to cart!");
    navigate("/checkout");
  };

  const handleOpenReview = (type, id, name) => {
    setReviewTarget({ type, id, name });
    setShowReviewModal(true);
  };

  const handleReviewSubmitted = () => {
    // Refresh review status after submission
    fetchReviewStatus();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-6 max-w-4xl">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate("/orders")}
            className="flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
            <span>Back to Orders</span>
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors"
          >
            <FiHome className="w-5 h-5" />
            <span>Dashboard</span>
          </button>
        </div>

        {/* Order Header */}
        <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Order #{order.orderNumber}</h1>
              <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color} text-white`}>
              {statusConfig.label}
            </span>
          </div>

          {/* Progress Steps */}
          {order.status !== "cancelled" && (
            <div className="flex items-center justify-between mt-6">
              {["Confirmed", "Preparing", "On the Way", "Delivered"].map((step, index) => (
                <div key={step} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${index + 1 <= statusConfig.step
                      ? "bg-orange-600 text-white"
                      : "bg-gray-200 text-gray-400"
                      }`}
                  >
                    {index + 1 <= statusConfig.step ? <FiCheck /> : index + 1}
                  </div>
                  <span className="text-xs mt-1 text-gray-500">{step}</span>
                </div>
              ))}
            </div>
          )}

          {/* Cancellation Info */}
          {order.status === "cancelled" && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">
                    {order.cancelledBy === "cook"
                      ? "This order was rejected by the cook"
                      : order.cancelledBy === "system"
                        ? "This order was cancelled by the system"
                        : order.cancelledBy === "admin"
                          ? "This order was cancelled by admin"
                          : "You cancelled this order"}
                  </p>
                  {(order.rejectionReason || order.cancellationReason) && (
                    <p className="text-sm text-red-600 mt-1">
                      <span className="font-medium">Reason:</span> {order.rejectionReason || order.cancellationReason}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Estimated Delivery Time - Prominent Banner */}
        {order.status === "out_for_delivery" && order.estimatedDeliveryAt && (
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow-md p-5 mb-4 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <FiTruck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Your order is on the way!</h2>
                <p className="text-orange-100 text-sm">Sit back and relax</p>
              </div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-4">
              <p className="text-orange-100 text-sm mb-1">Estimated arrival in</p>
              <div className="text-3xl font-bold">
                <DeliveryCountdown estimatedDeliveryAt={order.estimatedDeliveryAt} />
              </div>
            </div>
            {order.deliveryNote && (
              <p className="mt-3 text-sm text-orange-100">
                <span className="font-medium text-white">Note:</span> {order.deliveryNote}
              </p>
            )}
          </div>
        )}

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
          <h2 className="text-lg font-semibold mb-4">Order Items</h2>
          <div className="space-y-3">
            {order.items.map((item, index) => {
              const mealReviewInfo = canReview?.canReviewMeals?.find(m => m.mealId.toString() === item.mealId.toString());

              return (
                <div key={index} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center gap-4">
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

                  {/* Review button for delivered orders */}
                  {order.status === 'delivered' && mealReviewInfo && (
                    <div className="mt-2 ml-20">
                      {mealReviewInfo.alreadyReviewed ? (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <FiCheck className="w-3 h-3" />
                          Reviewed
                        </span>
                      ) : (
                        <button
                          onClick={() => handleOpenReview('meal', item.mealId, item.name)}
                          className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
                        >
                          <FiStar className="w-3 h-3" />
                          Write Review
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
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

        {/* Cook Info */}
        <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
          <h2 className="text-lg font-semibold mb-4">Cook Details</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">👨‍🍳</span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-800">{order.cook?.name}</p>
              {order.cook?.contact && (
                <a
                  href={`tel:${order.cook.contact}`}
                  className="text-sm text-orange-600 flex items-center gap-1"
                >
                  <FiPhone className="w-3 h-3" />
                  {order.cook.contact}
                </a>
              )}
            </div>
          </div>
          {/* Message Cook Button */}
          {order.cook?._id && (
            <div className="space-y-2">
              <Button
                onClick={() => navigate(`/chats/${order.cook._id}`)}
                variant="outline"
                className="w-full flex items-center justify-center gap-2 border-orange-600 text-orange-600 hover:bg-orange-50"
              >
                <FiMessageCircle className="w-4 h-4" />
                Message Cook
              </Button>

              {/* Review Cook Button */}
              {order.status === 'delivered' && canReview && (
                canReview.canReviewCook ? (
                  <Button
                    onClick={() => handleOpenReview('cook', order.cook._id, order.cook.name)}
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2 border-green-600 text-green-600 hover:bg-green-50"
                  >
                    <FiStar className="w-4 h-4" />
                    Review Cook
                  </Button>
                ) : (
                  <div className="w-full flex items-center justify-center gap-2 py-2 text-sm text-green-600">
                    <FiCheck className="w-4 h-4" />
                    Cook Reviewed
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Delivery Address */}
        <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
          <h2 className="text-lg font-semibold mb-4">Delivery Address</h2>
          <div className="flex items-start gap-3">
            <FiMapPin className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-gray-800">
                {order.deliveryAddress?.houseNo && `${order.deliveryAddress.houseNo}, `}
                {order.deliveryAddress?.street}
              </p>
              <p className="text-gray-600 text-sm">
                {order.deliveryAddress?.city}
                {order.deliveryAddress?.postalCode && ` - ${order.deliveryAddress.postalCode}`}
              </p>
              {(order.distance || order.estimatedTime) && (
                <p className="text-sm text-gray-500 mt-2">
                  {order.distance && `Distance: ${order.distance.toFixed(1)} km`}
                  {order.distance && order.estimatedTime && " • "}
                  {order.estimatedTime && `Est. time: ~${order.estimatedTime} mins`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Cook/Delivery Notes */}
        {(order.cookNote || order.deliveryNote) && (
          <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
            <h2 className="text-lg font-semibold mb-4">Notes</h2>
            {order.cookNote && (
              <div className="mb-3">
                <p className="text-sm text-gray-500">From Cook:</p>
                <p className="text-gray-800">{order.cookNote}</p>
              </div>
            )}
            {order.deliveryNote && (
              <div>
                <p className="text-sm text-gray-500">Delivery Note:</p>
                <p className="text-gray-800">{order.deliveryNote}</p>
              </div>
            )}
          </div>
        )}

        {/* Cancellation Request Status */}
        {order.cancellationRequest?.status && order.cancellationRequest?.reason && (
          <div className={`rounded-lg p-4 mb-4 border ${order.cancellationRequest.status === "pending"
            ? "bg-yellow-50 border-yellow-200"
            : order.cancellationRequest.status === "accepted"
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
            }`}>
            <div className="flex items-start gap-3">
              <FiAlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${order.cancellationRequest.status === "pending"
                ? "text-yellow-500"
                : order.cancellationRequest.status === "accepted"
                  ? "text-green-500"
                  : "text-red-500"
                }`} />
              <div>
                <p className={`font-medium ${order.cancellationRequest.status === "pending"
                  ? "text-yellow-800"
                  : order.cancellationRequest.status === "accepted"
                    ? "text-green-800"
                    : "text-red-800"
                  }`}>
                  {order.cancellationRequest.status === "pending"
                    ? "Cancellation request pending"
                    : order.cancellationRequest.status === "accepted"
                      ? "Cancellation request accepted"
                      : "Cancellation request declined"}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Your reason: {order.cancellationRequest.reason}
                </p>
                {order.cancellationRequest.status === "pending" && (
                  <p className="text-sm text-yellow-600 mt-1">
                    Waiting for cook to respond...
                  </p>
                )}
                {order.cancellationRequest.cookResponse && (
                  <p className="text-sm text-gray-600 mt-1">
                    Cook's response: {order.cancellationRequest.cookResponse}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {/* Reorder Button - for delivered orders */}
          {order.status === "delivered" && (
            <div className="flex justify-center">
              <Button
                onClick={handleReorder}
                variant="primary"
                className="bg-orange-600 hover:bg-orange-700 flex items-center gap-2"
              >
                <FiRepeat className="w-4 h-4" />
                Order Again
              </Button>
            </div>
          )}

          {/* Cancel Button */}
          {canCancel && (
            <div className="flex justify-center">
              <Button
                onClick={() => setShowCancelModal(true)}
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-50"
              >
                Request Cancellation
              </Button>
            </div>
          )}
        </div>

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">Request Cancellation</h3>
              <p className="text-gray-600 mb-4">
                Please provide a reason. The cook will review your request.
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
                className="w-full p-3 border rounded-lg resize-none mb-4"
                rows={3}
              />
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowCancelModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Go Back
                </Button>
                <Button
                  onClick={handleCancel}
                  disabled={actionLoading || !cancelReason.trim()}
                  variant="primary"
                  className="flex-1 bg-red-500 hover:bg-red-600"
                >
                  {actionLoading ? "Sending..." : "Send Request"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Review Modal */}
      {showReviewModal && reviewTarget && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setReviewTarget(null);
          }}
          orderId={id}
          cookId={reviewTarget.type === 'cook' ? reviewTarget.id : order.cook?._id}
          cookName={reviewTarget.type === 'cook' ? reviewTarget.name : order.cook?.name}
          mealId={reviewTarget.type === 'meal' ? reviewTarget.id : null}
          mealName={reviewTarget.type === 'meal' ? reviewTarget.name : null}
          reviewType={reviewTarget.type}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}

      <Footer />
    </div>
  );
};

export default OrderDetails;
