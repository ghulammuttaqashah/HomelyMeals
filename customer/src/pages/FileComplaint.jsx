import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { getOrders } from "../api/orders";
import { createComplaint, getMyComplaints } from "../api/complaints";
import { uploadToCloudinary } from "../utils/cloudinary";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Loader from "../components/Loader";
import {
  FiArrowLeft,
  FiUpload,
  FiX,
  FiAlertCircle,
  FiPackage,
  FiInfo,
  FiSearch,
  FiCheckCircle,
  FiChevronDown,
} from "react-icons/fi";

const COMPLAINT_TYPES = [
  {
    value: "Order Not Delivered",
    label: "Order Not Delivered",
    description: "You did not receive your order despite it being marked as delivered.",
    icon: "📦",
  },
  {
    value: "Wrong Food Delivered",
    label: "Wrong Food Delivered",
    description: "You received different items than what you ordered.",
    icon: "🔄",
  },
  {
    value: "Food Quality Issue",
    label: "Food Quality Issue",
    description: "The food was spoiled, undercooked, or not as described.",
    icon: "⚠️",
  },
  {
    value: "Payment Issue",
    label: "Payment Issue",
    description: "You were overcharged or experienced a payment-related problem.",
    icon: "💳",
  },
];

const FileComplaint = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedOrderId = searchParams.get("orderId");

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(preselectedOrderId || "");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const [delivered, cancelled, complaintsRes] = await Promise.all([
          getOrders({ status: "completed", limit: 50 }),
          getOrders({ status: "cancelled", limit: 50 }),
          getMyComplaints()
        ]);

        const myComplaints = complaintsRes.complaints || [];
        const complainedOrderIds = new Set(myComplaints.map(c => typeof c.orderId === 'object' ? c.orderId?._id : c.orderId));

        const all = [...(delivered.orders || []), ...(cancelled.orders || [])];
        const processedOrders = all.map(o => ({
          ...o,
          hasComplaint: complainedOrderIds.has(o._id)
        }));

        setOrders(processedOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));

        if (preselectedOrderId && complainedOrderIds.has(preselectedOrderId)) {
          toast.error("You have already filed a complaint against this order.");
          setSelectedOrder("");
        }
      } catch (err) {
        console.error("Fetch orders error:", err);
      } finally {
        setLoadingOrders(false);
      }
    };
    fetchOrders();
  }, [preselectedOrderId]);

  const handleImageAdd = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }

    const newImages = files
      .filter((f) => ["image/jpeg", "image/png", "image/jpg"].includes(f.type))
      .filter((f) => f.size <= 5 * 1024 * 1024)
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));

    if (newImages.length < files.length) {
      toast.error("Some files were skipped (only JPG/PNG under 5MB)");
    }

    setImages((prev) => [...prev, ...newImages]);
    e.target.value = "";
  };

  const removeImage = (index) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedOrder || !type || !description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);

    try {
      let proofUrls = [];
      if (images.length > 0) {
        setUploading(true);
        proofUrls = await Promise.all(
          images.map((img) => uploadToCloudinary(img.file, "complaints"))
        );
        setUploading(false);
      }

      await createComplaint({
        orderId: selectedOrder,
        type,
        description: description.trim(),
        proofUrls,
      });

      toast.success("Complaint submitted successfully!");
      navigate("/complaints");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to submit complaint";
      toast.error(msg);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const completedSteps = [!!selectedOrder, !!type, description.trim().length >= 10].filter(Boolean).length;

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    const orderNum = (order.orderNumber || "").toLowerCase();
    const items = (order.items?.map(i => i.name).join(" ") || "").toLowerCase();
    const cook = (order.cook?.name || "").toLowerCase();
    return orderNum.includes(term) || items.includes(term) || cook.includes(term);
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-6 max-w-2xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-orange-600 mb-4 transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">File a Complaint</h1>
          <p className="text-gray-500 text-sm mt-1">
            Let us know what went wrong and we'll look into it.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2 mb-6">
          {["Order", "Type", "Details"].map((step, i) => (
            <div key={step} className="flex items-center gap-2 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i < completedSteps
                    ? "bg-orange-600 text-white"
                    : i === completedSteps
                      ? "bg-orange-100 text-orange-600 border-2 border-orange-400"
                      : "bg-gray-200 text-gray-400"
                  }`}
              >
                {i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${i < completedSteps ? "text-orange-600" : "text-gray-400"}`}>
                {step}
              </span>
              {i < 2 && <div className={`flex-1 h-0.5 ${i < completedSteps ? "bg-orange-400" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        {loadingOrders ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader />
            <p className="text-gray-400 text-sm mt-3">Loading your orders...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Order Selection */}
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                <FiPackage className="w-4 h-4 text-orange-500" />
                Select Order <span className="text-red-400">*</span>
              </label>

              {orders.length === 0 ? (
                <p className="text-sm text-gray-500 mt-2 flex items-center gap-1.5 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <FiInfo className="w-4 h-4" />
                  No completed or cancelled orders found
                </p>
              ) : (
                <div className="relative" ref={dropdownRef}>
                  {/* Dropdown Toggle Header (shows selected order or placeholder) */}
                  <div
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`flex justify-between items-center w-full p-4 rounded-xl border-2 cursor-pointer transition-all ${isDropdownOpen ? 'border-orange-500 bg-orange-50' : selectedOrder ? 'border-orange-500 bg-orange-50/50' : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                      }`}
                  >
                    {!selectedOrder ? (
                      <span className="text-gray-500 font-medium">Click to select an order...</span>
                    ) : (
                      (() => {
                        const order = orders.find(o => o._id === selectedOrder);
                        if (!order) return <span className="text-gray-500 font-medium">Select an order...</span>;
                        const dateStr = new Date(order.createdAt).toLocaleDateString("en-PK", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                        const itemsStr = order.items?.map(i => i.name).join(", ") || "Unknown Items";
                        return (
                          <div className="flex-1 w-full text-left pr-4">
                            <div className="flex justify-between items-start mb-1 gap-2">
                              <span className="font-bold text-gray-800 tracking-wide text-sm bg-white px-2 py-0.5 rounded border border-gray-200 shadow-sm">
                                {order.orderNumber || "Old Order"}
                              </span>
                              <span className="text-xs font-medium text-gray-500">{dateStr}</span>
                            </div>
                            <div className="text-sm text-gray-700 font-medium line-clamp-1">{itemsStr}</div>
                          </div>
                        );
                      })()
                    )}
                    <FiChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {/* Dropdown Body */}
                  {isDropdownOpen && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden flex flex-col">
                      <div className="p-3 border-b border-gray-100 bg-gray-50">
                        <div className="relative">
                          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search ID, Cook, or Items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-sm w-full"
                          />
                        </div>
                      </div>

                      <div className="max-h-72 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                        {filteredOrders.length === 0 ? (
                          <p className="text-sm text-gray-500 py-4 text-center">
                            No orders match your search.
                          </p>
                        ) : (
                          filteredOrders.map((order) => {
                            const isSelected = selectedOrder === order._id;
                            const dateStr = new Date(order.createdAt).toLocaleDateString("en-PK", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                            const itemsStr = order.items?.map(i => i.name).join(", ") || "Unknown Items";
                            const cookName = order.cook?.name || "Unknown Cook";

                            return (
                              <div
                                key={order._id}
                                onClick={() => {
                                  if (order.hasComplaint) {
                                    toast.error("You have already filed a complaint against this order.");
                                    return;
                                  }
                                  setSelectedOrder(order._id);
                                  setIsDropdownOpen(false);
                                }}
                                className={`relative p-3 rounded-lg border transition-all ${order.hasComplaint
                                    ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                                    : isSelected
                                      ? 'border-orange-500 bg-orange-50 cursor-pointer'
                                      : 'border-gray-100 bg-white hover:border-orange-300 hover:bg-orange-50/30 shadow-sm cursor-pointer'
                                  }`}
                              >
                                <div className="flex justify-between items-start mb-1.5 gap-4">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-bold tracking-wide text-xs uppercase px-2.5 py-1 rounded border shadow-sm ${order.hasComplaint ? 'bg-gray-200 text-gray-500 border-gray-300' : 'bg-white text-gray-800 border-gray-200'}`}>
                                      {order.orderNumber || "Old Order"}
                                    </span>
                                    {order.hasComplaint && (
                                      <span className="text-xs font-bold text-white bg-red-500 px-2.5 py-0.5 rounded-full shadow-sm tracking-wide">
                                        Already Complained
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] font-medium text-gray-500 text-right">
                                    {dateStr}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-700 font-medium mb-1 line-clamp-1">
                                  {itemsStr}
                                </div>
                                <div className="flex justify-between items-end mt-1.5">
                                  <span className="text-xs text-gray-500">
                                    Cook: <span className="font-medium text-gray-700">{cookName}</span>
                                  </span>
                                  <span className="font-bold text-gray-900 text-sm">
                                    Rs. {order.totalAmount}
                                  </span>
                                </div>

                                {isSelected && (
                                  <span className="absolute -top-1.5 -right-1.5 bg-white rounded-full">
                                    <FiCheckCircle className="w-5 h-5 text-orange-500 fill-white border-2 border-white rounded-full" />
                                  </span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Complaint Type as Cards */}
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
                <FiAlertCircle className="w-4 h-4 text-orange-500" />
                What went wrong? <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {COMPLAINT_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() => setType(ct.value)}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${type === ct.value
                        ? "border-orange-500 bg-orange-50 shadow-sm"
                        : "border-gray-200 hover:border-orange-300 hover:bg-orange-50/30"
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0">{ct.icon}</span>
                      <div>
                        <p className={`font-semibold text-sm ${type === ct.value ? "text-orange-700" : "text-gray-800"}`}>
                          {ct.label}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{ct.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Description + Evidence */}
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 space-y-5">
              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Describe the issue <span className="text-red-400">*</span>
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Include specific details like what happened, when, and how it affected you.
                </p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="E.g., I ordered Biryani but received Pasta instead. The packaging was also damaged..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none text-sm"
                  required
                />
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-gray-400">Minimum 10 characters</p>
                  <p className={`text-xs ${description.length > 900 ? "text-orange-500 font-medium" : "text-gray-400"}`}>
                    {description.length}/1000
                  </p>
                </div>
              </div>

              {/* Proof Images */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Proof Images
                </label>
                <p className="text-xs text-gray-400 mb-3">
                  Optional — photos help us resolve issues faster (max 5, JPG/PNG under 5MB)
                </p>

                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {images.map((img, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={img.preview}
                          alt={`Proof ${i + 1}`}
                          className="w-full h-24 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <FiX className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {images.length < 5 && (
                  <label className="flex flex-col items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 transition-colors">
                    <FiUpload className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-gray-500 font-medium">
                      Click to upload images
                    </span>
                    <span className="text-xs text-gray-400">
                      {images.length}/5 uploaded
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      multiple
                      onChange={handleImageAdd}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <FiAlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-800">Before submitting</p>
                <p className="text-xs text-orange-600 mt-0.5">
                  • You can file only one complaint per order<br />
                  • Our admin team typically responds within 24-48 hours<br />
                  • False complaints may result in a warning on your account
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || uploading || !selectedOrder || !type || description.trim().length < 10}
              className="w-full py-3.5 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Uploading images...
                </>
              ) : submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Complaint"
              )}
            </button>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default FileComplaint;
