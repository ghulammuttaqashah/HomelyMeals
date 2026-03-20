import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { getOrders } from "../api/orders";
import { createComplaint } from "../api/complaints";
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
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const [delivered, cancelled] = await Promise.all([
          getOrders({ status: "completed", limit: 50 }),
          getOrders({ status: "cancelled", limit: 50 }),
        ]);
        const all = [...(delivered.orders || []), ...(cancelled.orders || [])];
        setOrders(all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      } catch (err) {
        console.error("Fetch orders error:", err);
      } finally {
        setLoadingOrders(false);
      }
    };
    fetchOrders();
  }, []);

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

  // Steps for progress indicator
  const completedSteps = [!!selectedOrder, !!type, description.trim().length >= 10].filter(Boolean).length;

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
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < completedSteps
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
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
                <FiPackage className="w-4 h-4 text-orange-500" />
                Select Order <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedOrder}
                onChange={(e) => setSelectedOrder(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-sm"
                required
              >
                <option value="">Choose an order...</option>
                {orders.map((order) => {
                  let itemsStr = order.items?.map(i => i.name).join(", ") || "Items";
                  if (itemsStr.length > 35) itemsStr = itemsStr.substring(0, 35) + "...";
                  const dateStr = new Date(order.createdAt).toLocaleDateString("en-PK", { day: 'numeric', month: 'short' });
                  const cookName = order.cook?.name ? ` (from ${order.cook.name})` : "";
                  
                  return (
                    <option key={order._id} value={order._id}>
                      {dateStr} — {itemsStr}{cookName} — Rs. {order.totalAmount}
                    </option>
                  );
                })}
              </select>
              {orders.length === 0 && (
                <p className="text-sm text-gray-500 mt-2 flex items-center gap-1.5">
                  <FiInfo className="w-4 h-4" />
                  No completed or cancelled orders found
                </p>
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
                    className={`text-left p-4 rounded-lg border-2 transition-all ${
                      type === ct.value
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
