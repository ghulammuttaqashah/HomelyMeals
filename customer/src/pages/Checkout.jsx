import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { placeOrder } from "../api/orders";
import { getCookDeliveryInfo, getDeliverySettings } from "../api/meals";
import { calculateDistance, calculateDeliveryCharges, isWithinDeliveryRange } from "../utils/distance";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Button from "../components/Button";
import Loader from "../components/Loader";
import FormInput from "../components/FormInput";
import { FiMapPin, FiTruck, FiClock, FiCreditCard, FiArrowLeft, FiAlertCircle } from "react-icons/fi";

const PAYMENT_METHODS = [
  { id: "cod", name: "Cash on Delivery", icon: "💵", available: true },
  { id: "online", name: "Online Payment", icon: "💳", available: false },
];

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, clearCart, getCartTotals } = useCart();
  const { customer } = useAuth();
  const { subtotal } = getCartTotals();

  // Get the default address or first address
  const defaultAddress = customer?.addresses?.find(a => a.isDefault) || customer?.addresses?.[0];

  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [deliveryError, setDeliveryError] = useState(null);
  const [selectedAddressId, setSelectedAddressId] = useState(defaultAddress?._id || null);
  const [cookInfo, setCookInfo] = useState(null);
  const [deliverySettings, setDeliverySettings] = useState({ pricePerKm: 20, minimumCharge: 0 });

  const [deliveryAddress, setDeliveryAddress] = useState({
    houseNo: defaultAddress?.houseNo || "",
    street: defaultAddress?.street || "",
    city: defaultAddress?.city || "",
    postalCode: defaultAddress?.postalCode || "",
    latitude: defaultAddress?.latitude || null,
    longitude: defaultAddress?.longitude || null,
  });

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Redirect if cart is empty or missing cookId
  useEffect(() => {
    if (cart.items.length === 0) {
      navigate("/cart");
    }
    // If cart has items but no cookId, it's corrupted data - clear and redirect
    if (cart.items.length > 0 && !cart.cookId) {
      console.error("Cart is missing cookId - likely old cart data");
      toast.error("Cart data is outdated. Please clear your cart and add items again.", { id: "cart-error" });
    }
  }, [cart.items.length, cart.cookId, navigate]);

  // Fetch cook delivery info and delivery settings on mount
  useEffect(() => {
    const fetchDeliveryData = async () => {
      if (!cart.cookId) {
        return;
      }

      try {
        const [cookData, settingsData] = await Promise.all([
          getCookDeliveryInfo(cart.cookId),
          getDeliverySettings(),
        ]);
        
        setCookInfo(cookData.cook);
        setDeliverySettings(settingsData.settings);
      } catch (error) {
        console.error("Failed to fetch delivery data:", error);
        toast.error("Could not load delivery information");
      }
    };

    fetchDeliveryData();
  }, [cart.cookId]);

  // Calculate delivery using OpenRouteService when address or cook info changes
  useEffect(() => {
    const calculateDeliveryInfoFn = async () => {
      if (!cookInfo || !deliveryAddress.latitude || !deliveryAddress.longitude) {
        setDeliveryInfo(null);
        return;
      }

      if (!cookInfo.latitude || !cookInfo.longitude) {
        setDeliveryError("Cook location not available");
        setDeliveryInfo(null);
        return;
      }

      setCalculating(true);
      setDeliveryError(null);

      try {
        // Calculate distance using OpenRouteService (with Haversine fallback)
        const { distance, duration } = await calculateDistance(
          { latitude: cookInfo.latitude, longitude: cookInfo.longitude },
          { latitude: deliveryAddress.latitude, longitude: deliveryAddress.longitude }
        );

        // Calculate delivery charges
        const deliveryCharges = calculateDeliveryCharges(distance, deliverySettings);

        // Check if within range
        const withinRange = isWithinDeliveryRange(distance, cookInfo.maxDeliveryDistance);

        const info = {
          distance,
          deliveryCharges,
          estimatedTime: duration,
          isWithinRange: withinRange,
          maxDeliveryDistance: cookInfo.maxDeliveryDistance,
        };
        setDeliveryInfo(info);

        if (!withinRange) {
          setDeliveryError(`Delivery not available. Distance (${distance.toFixed(1)} km) exceeds cook's delivery range (${cookInfo.maxDeliveryDistance} km)`);
        }
      } catch (error) {
        console.error("Delivery calculation error:", error);
        setDeliveryError("Could not calculate delivery. Please try again.");
        setDeliveryInfo(null);
      } finally {
        setCalculating(false);
      }
    };

    // Debounce the calculation
    const debounceTimer = setTimeout(calculateDeliveryInfoFn, 300);
    return () => clearTimeout(debounceTimer);
  }, [cookInfo, deliveryAddress.latitude, deliveryAddress.longitude, deliverySettings]);

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDeliveryAddress((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setLoading(false);
        toast.success("Location updated");
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Could not get your location. Please try again.");
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setDeliveryAddress((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate address
    if (!deliveryAddress.street.trim()) {
      toast.error("Please enter your street address");
      return;
    }

    if (!deliveryAddress.latitude || !deliveryAddress.longitude) {
      toast.error("Please set your delivery location");
      return;
    }

    // Validate delivery info
    if (!deliveryInfo || !deliveryInfo.isWithinRange) {
      toast.error("Delivery is not available to your location");
      return;
    }

    setSubmitting(true);

    try {
      const orderData = {
        cookId: cart.cookId,
        items: cart.items.map((item) => ({
          mealId: item.mealId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.imageUrl,
        })),
        deliveryAddress: {
          houseNo: deliveryAddress.houseNo,
          street: deliveryAddress.street,
          city: deliveryAddress.city,
          postalCode: deliveryAddress.postalCode,
          latitude: deliveryAddress.latitude,
          longitude: deliveryAddress.longitude,
        },
        paymentMethod,
        specialInstructions: specialInstructions.trim() || undefined,
      };

      const result = await placeOrder(orderData);
      
      // Get the order ID before clearing cart
      const orderId = result?.order?._id;
      
      clearCart();
      toast.success("Order placed successfully!");
      
      // Navigate to order details page with a slight delay to ensure state updates complete
      setTimeout(() => {
        if (orderId) {
          navigate(`/orders/${orderId}`, { replace: true });
        } else {
          navigate("/orders", { replace: true });
        }
      }, 100);
    } catch (error) {
      console.error("❌ Place order error:", error);
      toast.error(error.response?.data?.message || "Couldn't place your order. Please check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = subtotal + (deliveryInfo?.deliveryCharges || 0);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-6 max-w-4xl">
        {/* Back Button */}
        <button
          onClick={() => navigate("/cart")}
          className="flex items-center gap-2 text-gray-600 hover:text-orange-600 mb-4 transition-colors"
        >
          <FiArrowLeft className="w-5 h-5" />
          <span>Back to Cart</span>
        </button>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">Checkout</h1>

        {/* Cart Data Error Banner */}
        {cart.items.length > 0 && !cart.cookId && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">Cart Data Outdated</h3>
                <p className="text-sm text-red-600 mt-1">
                  Your cart is missing required information. Please go back to the cart, clear it, and add items again.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    clearCart();
                    navigate("/dashboard");
                    toast.success("Cart cleared. Please add items again.");
                  }}
                  className="mt-2 text-sm font-medium text-red-700 hover:text-red-800 underline"
                >
                  Clear Cart & Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Left Column - Form */}
            <div className="md:col-span-2 space-y-6">
              {/* Delivery Address */}
              <div className="bg-white rounded-lg shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FiMapPin className="w-5 h-5 text-orange-600" />
                  <h2 className="text-lg font-semibold">Delivery Address</h2>
                </div>

                {/* Saved Addresses Selector */}
                {customer?.addresses?.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Saved Address
                    </label>
                    <div className="space-y-2">
                      {customer.addresses.map((addr) => (
                        <label
                          key={addr._id}
                          className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedAddressId === addr._id
                              ? "border-orange-500 bg-orange-50"
                              : "border-gray-200 hover:border-orange-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="savedAddress"
                            value={addr._id}
                            checked={selectedAddressId === addr._id}
                            onChange={() => {
                              setSelectedAddressId(addr._id);
                              setDeliveryAddress({
                                houseNo: addr.houseNo || "",
                                street: addr.street || "",
                                city: addr.city || "",
                                postalCode: addr.postalCode || "",
                                latitude: addr.latitude || null,
                                longitude: addr.longitude || null,
                              });
                            }}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{addr.label || "Address"}</span>
                              {addr.isDefault && (
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                                  Default
                                </span>
                              )}
                              {addr.latitude && addr.longitude && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                  📍 GPS
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {[addr.houseNo, addr.street, addr.city].filter(Boolean).join(", ")}
                            </p>
                            {!addr.latitude && !addr.longitude && (
                              <p className="text-xs text-yellow-600 mt-1">⚠️ No GPS coordinates - please update in profile</p>
                            )}
                          </div>
                        </label>
                      ))}
                      <label
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedAddressId === "new"
                            ? "border-orange-500 bg-orange-50"
                            : "border-gray-200 hover:border-orange-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="savedAddress"
                          value="new"
                          checked={selectedAddressId === "new"}
                          onChange={() => {
                            setSelectedAddressId("new");
                            setDeliveryAddress({
                              houseNo: "",
                              street: "",
                              city: "",
                              postalCode: "",
                              latitude: null,
                              longitude: null,
                            });
                          }}
                          className="mt-0"
                        />
                        <span className="font-medium text-gray-700">+ Use a different address</span>
                      </label>
                    </div>

                    {/* Get Current Location for saved address without coordinates */}
                    {selectedAddressId && selectedAddressId !== "new" && (!deliveryAddress.latitude || !deliveryAddress.longitude) && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                        <span className="text-sm text-gray-600">Set your delivery location</span>
                        <Button
                          type="button"
                          variant="primary"
                          onClick={getCurrentLocation}
                          disabled={loading}
                          className="text-sm"
                        >
                          {loading ? "Getting..." : "📍 Use Current Location"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Address Form - show if no saved addresses or "new" selected */}
                {(!customer?.addresses?.length || selectedAddressId === "new") && (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <FormInput
                        label="House/Flat No."
                        name="houseNo"
                        value={deliveryAddress.houseNo}
                        onChange={handleAddressChange}
                        placeholder="e.g., 12-A"
                      />
                      <FormInput
                        label="Street *"
                        name="street"
                        value={deliveryAddress.street}
                        onChange={handleAddressChange}
                        placeholder="Street name"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <FormInput
                        label="City"
                        name="city"
                        value={deliveryAddress.city}
                        onChange={handleAddressChange}
                        placeholder="City"
                      />
                      <FormInput
                        label="Postal Code"
                        name="postalCode"
                        value={deliveryAddress.postalCode}
                        onChange={handleAddressChange}
                        placeholder="Postal code"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">
                          {deliveryAddress.latitude && deliveryAddress.longitude
                            ? `Location set: ${deliveryAddress.latitude.toFixed(4)}, ${deliveryAddress.longitude.toFixed(4)}`
                            : "Location not set"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={getCurrentLocation}
                        disabled={loading}
                        className="text-sm"
                      >
                        {loading ? "Getting..." : "Use Current Location"}
                      </Button>
                    </div>
                  </>
                )}

                {/* Delivery Info or Error */}
                {calculating && (
                  <div className="mt-4 text-center text-gray-500">
                    <div className="animate-spin w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full inline-block mr-2" />
                    Calculating delivery...
                  </div>
                )}

                {deliveryError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-red-600 text-sm">{deliveryError}</p>
                  </div>
                )}

                {deliveryInfo && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <FiTruck className="w-4 h-4 text-green-600" />
                        <span>{deliveryInfo.distance.toFixed(1)} km</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FiClock className="w-4 h-4 text-green-600" />
                        <span>~{deliveryInfo.estimatedTime} mins</span>
                      </div>
                      <div className="ml-auto font-semibold text-green-700">
                        Delivery: Rs. {deliveryInfo.deliveryCharges}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-lg shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FiCreditCard className="w-5 h-5 text-orange-600" />
                  <h2 className="text-lg font-semibold">Payment Method</h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {PAYMENT_METHODS.map((method) => (
                    <label
                      key={method.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg transition-colors relative ${
                        !method.available
                          ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                          : paymentMethod === method.id
                          ? "border-orange-500 bg-orange-50 cursor-pointer"
                          : "border-gray-200 hover:border-orange-300 cursor-pointer"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.id}
                        checked={paymentMethod === method.id}
                        onChange={(e) => method.available && setPaymentMethod(e.target.value)}
                        disabled={!method.available}
                        className="sr-only"
                      />
                      <span className="text-2xl">{method.icon}</span>
                      <div>
                        <span className="font-medium">{method.name}</span>
                        {!method.available && (
                          <p className="text-xs text-gray-500">Coming Soon</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                {paymentMethod !== "cod" && (
                  <p className="mt-3 text-sm text-gray-600 bg-yellow-50 p-2 rounded">
                    Payment details will be shown after order confirmation. You'll have 10 minutes to upload payment proof.
                  </p>
                )}
              </div>

              {/* Special Instructions */}
              <div className="bg-white rounded-lg shadow-sm p-5">
                <h2 className="text-lg font-semibold mb-4">Special Instructions (Optional)</h2>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Any special requests for your order..."
                  className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-5 sticky top-4">
                <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

                {/* Cook Info */}
                <div className="text-sm text-gray-600 mb-4 pb-4 border-b">
                  Ordering from <span className="font-medium text-gray-800">{cart.cookName}</span>
                </div>

                {/* Items */}
                <div className="space-y-3 mb-4 pb-4 border-b max-h-48 overflow-y-auto">
                  {cart.items.map((item) => (
                    <div key={item.mealId} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.name} x {item.quantity}
                      </span>
                      <span className="font-medium">Rs. {item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-2 mb-4 pb-4 border-b">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>Rs. {subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery Fee</span>
                    <span>
                      {calculating
                        ? "..."
                        : deliveryInfo
                        ? `Rs. ${deliveryInfo.deliveryCharges}`
                        : "-"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between text-lg font-bold mb-4">
                  <span>Total</span>
                  <span className="text-orange-600">
                    Rs. {deliveryInfo ? totalAmount : subtotal}
                  </span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={submitting || calculating || !deliveryInfo?.isWithinRange}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Placing Order...
                    </span>
                  ) : (
                    "Place Order"
                  )}
                </Button>

                {deliveryInfo && !deliveryInfo.isWithinRange && (
                  <p className="mt-2 text-xs text-red-500 text-center">
                    Delivery not available to this location
                  </p>
                )}
                
                {/* Show reason for disabled button */}
                {!deliveryInfo && !calculating && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                    <p className="font-medium mb-1">⚠️ Cannot place order:</p>
                    {!cookInfo && <p>• Cook delivery info not loaded</p>}
                    {cookInfo && (!cookInfo.latitude || !cookInfo.longitude) && (
                      <p>• Cook has no GPS coordinates set</p>
                    )}
                    {(!deliveryAddress.latitude || !deliveryAddress.longitude) && (
                      <p>• Your delivery location is not set - click "Use Current Location"</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
