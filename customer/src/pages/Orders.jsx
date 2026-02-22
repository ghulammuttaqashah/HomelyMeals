import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { getOrders } from "../api/orders";
import { subscribeToOrderUpdates, initializeSocket } from "../utils/socket";
import { useCart } from "../context/CartContext";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Loader from "../components/Loader";
import { FiPackage, FiCheck, FiX, FiChevronRight, FiArrowLeft, FiClock, FiRepeat } from "react-icons/fi";

const STATUS_CONFIG = {
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-800", icon: FiCheck },
  preparing: { label: "Preparing", color: "bg-purple-100 text-purple-800", icon: FiPackage },
  out_for_delivery: { label: "Out for Delivery", color: "bg-indigo-100 text-indigo-800", icon: FiPackage },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800", icon: FiCheck },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800", icon: FiX },
  cancelled_by_customer: { label: "Cancelled by You", color: "bg-gray-100 text-gray-800", icon: FiX },
};

const TABS = [
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

const Orders = () => {
  const navigate = useNavigate();
  const { setCartFromOrder, cart } = useCart();
  const [activeTab, setActiveTab] = useState("active");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const result = await getOrders({
        status: activeTab,
        page,
        limit: 10,
      });
      setOrders(result.orders);
      setPagination(result.pagination);
    } catch (error) {
      console.error("Fetch orders error:", error);
      toast.error("No orders found. Please check your connection and try again.", { id: 'fetch-orders-error' });
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Socket subscription for real-time updates
  useEffect(() => {
    initializeSocket();
    
    const unsubscribe = subscribeToOrderUpdates(() => {
      // Silently refresh — toasts are handled by global SocketListener
      fetchOrders();
    });

    return () => unsubscribe();
  }, [fetchOrders]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-PK", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleReorder = (e, order) => {
    e.stopPropagation(); // Prevent navigation to order details
    
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

  const OrderCard = ({ order }) => {
    // Determine display status based on cancelledBy
    let displayStatus = order.status;
    if (order.status === "cancelled" && order.cancelledBy) {
      displayStatus = order.cancelledBy === "cook" ? "cancelled_by_cook" : "cancelled_by_customer";
    }
    
    const statusConfig = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.confirmed;
    const StatusIcon = statusConfig.icon;

    return (
      <div
        onClick={() => navigate(`/orders/${order._id}`)}
        className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-semibold text-gray-800">#{order.orderNumber}</p>
            <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
          </div>
          <span
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}
          >
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </span>
        </div>

        {/* Show rejection/cancellation reason preview */}
        {order.status === "cancelled" && (order.rejectionReason || order.cancellationReason) && (
          <p className="text-sm text-red-600 mb-3 line-clamp-1">
            Reason: {order.rejectionReason || order.cancellationReason}
          </p>
        )}

        {/* Pending cancellation request badge */}
        {order.cancellationRequest?.status === "pending" && (
          <div className="flex items-center gap-2 px-3 py-2 mb-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <FiClock className="w-4 h-4 text-yellow-600 flex-shrink-0" />
            <p className="text-xs font-medium text-yellow-700">Cancellation request pending</p>
          </div>
        )}

        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <span className="text-lg">👨‍🍳</span>
          </div>
          <div>
            <p className="font-medium text-gray-800">{order.cook?.name || "Cook"}</p>
            <p className="text-sm text-gray-500">
              {order.itemsCount} {order.itemsCount === 1 ? "item" : "items"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          <span className="font-bold text-orange-600">Rs. {order.totalAmount}</span>
          <div className="flex items-center gap-2">
            {order.status === "delivered" && (
              <button
                onClick={(e) => handleReorder(e, order)}
                className="flex items-center gap-1 px-3 py-1.5 bg-orange-100 text-orange-600 rounded-full text-sm font-medium hover:bg-orange-200 transition-colors"
              >
                <FiRepeat className="w-3.5 h-3.5" />
                Reorder
              </button>
            )}
            <FiChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-6 max-w-4xl">
        {/* Back Button */}
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-orange-600 mb-4 transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">My Orders</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-orange-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <FiPackage className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              {activeTab === "active"
                ? "No active orders"
                : activeTab === "completed"
                ? "No completed orders yet"
                : "No cancelled orders"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <OrderCard key={order._id} order={order} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => fetchOrders(page)}
                className={`w-10 h-10 rounded-full ${
                  pagination.page === page
                    ? "bg-orange-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Orders;
