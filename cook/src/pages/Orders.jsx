import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { getOrders } from "../api/orders";
import { subscribeToNewOrders, subscribeToOrderUpdates, initializeSocket } from "../utils/socket";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Loader from "../components/Loader";
import { FiCheck, FiX, FiChevronRight, FiPackage, FiRefreshCw, FiAlertTriangle, FiArrowLeft } from "react-icons/fi";

const STATUS_CONFIG = {
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-800", icon: FiCheck },
  preparing: { label: "Preparing", color: "bg-purple-100 text-purple-800", icon: FiPackage },
  out_for_delivery: { label: "Out for Delivery", color: "bg-indigo-100 text-indigo-800", icon: FiPackage },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800", icon: FiCheck },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800", icon: FiX },
};

const TABS = [
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

const Orders = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("active");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
  }, [activeTab]); // Only depend on activeTab, not fetchOrders

  // Auto-refresh every 30 seconds as fallback
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders();
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Manual refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchOrders();
      toast.success("Orders refreshed", { id: "refresh-orders" });
    } finally {
      setRefreshing(false);
    }
  };

  // Socket subscriptions
  // Socket: silently refetch orders on real-time events (toasts handled by global SocketListener)
  useEffect(() => {
    initializeSocket();

    const unsubNewOrder = subscribeToNewOrders(() => {
      fetchOrders();
    });

    const unsubOrderUpdate = subscribeToOrderUpdates(() => {
      fetchOrders();
    });

    return () => {
      unsubNewOrder();
      unsubOrderUpdate();
    };
  }, [fetchOrders]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-PK", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const OrderCard = ({ order }) => {
    const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.confirmed;
    const StatusIcon = statusConfig.icon;

    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-semibold text-gray-800">#{order.orderNumber}</p>
              <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <span
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}
              >
                <StatusIcon className="w-3 h-3" />
                {statusConfig.label}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                order.paymentMethod === "cod" 
                  ? "bg-green-100 text-green-800" 
                  : "bg-blue-100 text-blue-800"
              }`}>
                {order.paymentMethod === "cod" ? "COD" : "Online"}
              </span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-lg">👤</span>
            </div>
            <div>
              <p className="font-medium text-gray-800">{order.customer?.name || "Customer"}</p>
              <p className="text-sm text-gray-500">
                {order.itemsCount} {order.itemsCount === 1 ? "item" : "items"}
              </p>
            </div>
          </div>

          {/* Cancellation Request Badge */}
          {order.cancellationRequest?.status === "pending" && (
            <div className="flex items-center gap-2 px-3 py-2 mb-3 bg-red-50 border border-red-200 rounded-lg">
              <FiAlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-xs font-medium text-red-700">Cancellation requested — tap to respond</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t">
            <span className="font-bold text-orange-600">Rs. {order.totalAmount}</span>
            <button
              onClick={() => navigate(`/orders/${order._id}`)}
              className="flex items-center gap-1 text-orange-600 hover:text-orange-700"
            >
              <span className="text-sm font-medium">View Details</span>
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header showSignOut={true} />
      <main className="flex-grow mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Orders</h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors relative ${
                activeTab === tab.id
                  ? "bg-orange-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white py-16 shadow-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader size="lg" />
              <p className="text-sm font-medium text-gray-600">Loading orders...</p>
            </div>
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
