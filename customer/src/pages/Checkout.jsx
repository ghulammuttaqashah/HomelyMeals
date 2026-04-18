import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { placeOrder, calculateDeliveryInfo } from "../api/orders";
import { getCookDeliveryInfo } from "../api/meals";
import { createPaymentIntent, confirmPayment } from "../api/payments";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Button from "../components/Button";
import Loader from "../components/Loader";
import { FiMapPin, FiTruck, FiClock, FiCreditCard, FiArrowLeft, FiAlertCircle } from "react-icons/fi";

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

const cardElementOptions = {
  style: {
    base: {
      fontSize: "16px",
      color: "#1f2937",
      "::placeholder": { color: "#9ca3af" },
    },
    invalid: { color: "#dc2626" },
  },
};

// Inner checkout form that has access to Stripe hooks (only when wrapped in Elements)
const CheckoutForm = ({ cookInfo, deliveryInfo, deliveryAddress, cart, subtotal, specialInstructions, onSuccess, hasStripe = false }) => {
  const stripe = hasStripe ? useStripe() : null;
  const elements = hasStripe ? useElements() : null;
  const { customer } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [submitting, setSubmitting] = useState(false);
  const [cardReady, setCardReady] = useState(false);

  const cookAcceptsCard = cookInfo?.isOnlinePaymentEnabled && cookInfo?.stripeAccountId;
  const totalAmount = subtotal + (deliveryInfo?.deliveryCharges || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!deliveryAddress.street?.trim()) {
      toast.error("Please enter your street address");
      return;
    }
    if (!deliveryAddress.latitude || !deliveryAddress.longitude) {
      toast.error("Please set your delivery location");
      return;
    }
    if (!deliveryInfo?.isWithinRange) {
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
        paymentMethod: paymentMethod === "card" ? "card" : "cod",
        specialInstructions: specialInstructions?.trim() || undefined,
      };

      const result = await placeOrder(orderData);
      const orderId = result?.order?._id;

      // Handle card payment flow
      if (paymentMethod === "card" && orderId) {
        if (!stripe || !elements) {
          toast.error("Stripe is not loaded. Please refresh and try again.");
          setSubmitting(false);
          return;
        }

        // Create payment intent
        const intentData = await createPaymentIntent(orderId, cart.cookId, totalAmount);
        const { clientSecret, paymentIntentId } = intentData;

        // Confirm card payment
        const cardElement = elements.getElement(CardElement);
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: customer?.name || "Customer",
              email: customer?.email || undefined,
            },
          },
        });

        if (error) {
          toast.error(error.message || "Payment failed. Please try again.");
          setSubmitting(false);
          return;
        }

        if (paymentIntent?.status === "succeeded") {
          await confirmPayment(orderId, paymentIntentId);
          toast.success("Payment successful! Order placed.");
        } else {
          toast.error("Payment did not complete. Please try again.");
          setSubmitting(false);
          return;
        }
      } else {
        toast.success("Order placed successfully!");
      }

      onSuccess(orderId);
    } catch (error) {
      console.error("Place order error:", error);
      toast.error(error.response?.data?.message || "Couldn't place your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Method */}
      <div className="bg-white rounded-lg shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <FiCreditCard className="w-5 h-5 text-orange-600" />
          <h2 className="text-lg font-semibold">Payment Method</h2>
        </div>

        <div className="space-y-3">
          {/* Cash on Delivery */}
          <label
            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
              paymentMethod === "cod"
                ? "border-orange-500 bg-orange-50"
                : "border-gray-200 hover:border-orange-300"
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="cod"
              checked={paymentMethod === "cod"}
              onChange={() => setPaymentMethod("cod")}
              className="sr-only"
            />
            <span className="text-2xl">💵</span>
            <div>
              <span className="font-medium text-gray-900">Cash on Delivery</span>
              <p className="text-xs text-gray-500">Pay when your order arrives</p>
            </div>
            {paymentMethod === "cod" && (
              <span className="ml-auto text-orange-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </label>

          {/* Card Payment */}
          <label
            className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
              !cookAcceptsCard
                ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                : paymentMethod === "card"
                ? "border-orange-500 bg-orange-50 cursor-pointer"
                : "border-gray-200 hover:border-orange-300 cursor-pointer"
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="card"
              checked={paymentMethod === "card"}
              onChange={() => cookAcceptsCard && setPaymentMethod("card")}
              disabled={!cookAcceptsCard}
              className="sr-only"
            />
            <span className="text-2xl">💳</span>
            <div className="flex-1">
              <span className="font-medium text-gray-900">Pay with Card</span>
              {!cookAcceptsCard ? (
                <p className="text-xs text-gray-500">Not available for this cook</p>
              ) : (
                <p className="text-xs text-gray-500">Secure payment via Stripe</p>
              )}
            </div>
            {paymentMethod === "card" && cookAcceptsCard && (
              <span className="ml-auto text-orange-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </label>
        </div>

        {/* Stripe Card Element */}
        {paymentMethod === "card" && cookAcceptsCard && hasStripe && (
          <div className="mt-4 rounded-lg border border-gray-300 p-3 bg-white relative min-h-[44px]">
            {!cardReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-white rounded-lg z-10">
                <div className="animate-spin w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full" />
              </div>
            )}
            <CardElement 
              options={cardElementOptions} 
              onReady={() => setCardReady(true)} 
            />
          </div>
        )}

        {!hasStripe && paymentMethod === "card" && cookAcceptsCard && (
          <p className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
            Stripe is not configured. Add VITE_STRIPE_PUBLISHABLE_KEY to customer .env
          </p>
        )}
      </div>

      {/* Place Order Button */}
      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={submitting || !deliveryInfo?.isWithinRange || (paymentMethod === "card" && !cardReady)}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            {paymentMethod === "card" ? "Processing Payment..." : "Placing Order..."}
          </span>
        ) : (
          `Place Order${paymentMethod === "card" ? ` · Rs. ${totalAmount}` : ""}`
        )}
      </Button>

      {deliveryInfo && !deliveryInfo.isWithinRange && (
        <p className="text-xs text-red-500 text-center">
          Delivery not available to this location
        </p>
      )}
    </form>
  );
};

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, clearCart, getCartTotals } = useCart();
  const { customer } = useAuth();
  const { subtotal } = getCartTotals();

  const defaultAddress = customer?.addresses?.find((a) => a.isDefault) || customer?.addresses?.[0];

  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [deliveryError, setDeliveryError] = useState(null);
  const [cookInfo, setCookInfo] = useState(null);
  const [cookInfoLoaded, setCookInfoLoaded] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [usingCustomLocation, setUsingCustomLocation] = useState(false);
  const [deliveryCache, setDeliveryCache] = useState(() => {
    // Load cache from localStorage on mount
    try {
      const cached = localStorage.getItem('deliveryCache');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });

  const [deliveryAddress, setDeliveryAddress] = useState({
    houseNo: defaultAddress?.houseNo || "",
    street: defaultAddress?.street || "",
    city: defaultAddress?.city || "",
    postalCode: defaultAddress?.postalCode || "",
    latitude: defaultAddress?.latitude || null,
    longitude: defaultAddress?.longitude || null,
  });

  useEffect(() => {
    if (cart.items.length === 0) navigate("/cart");
    if (cart.items.length > 0 && !cart.cookId) {
      toast.error("Cart data is outdated. Please clear your cart and add items again.", { id: "cart-error" });
    }
  }, [cart.items.length, cart.cookId, navigate]);

  useEffect(() => {
    const fetchDeliveryData = async () => {
      if (!cart.cookId) return;
      try {
        const cookData = await getCookDeliveryInfo(cart.cookId);
        setCookInfo(cookData.cook);
        setCookInfoLoaded(true);
      } catch (error) {
        console.error("Failed to fetch delivery data:", error);
        toast.error("Could not load delivery information");
        setCookInfoLoaded(true);
      }
    };
    fetchDeliveryData();
  }, [cart.cookId]);

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

      // Create cache key based on cook and customer coordinates
      const cacheKey = `${cart.cookId}_${cookInfo.latitude.toFixed(4)}_${cookInfo.longitude.toFixed(4)}_${deliveryAddress.latitude.toFixed(4)}_${deliveryAddress.longitude.toFixed(4)}`;
      
      // Check if we have cached data for these exact coordinates
      if (deliveryCache[cacheKey]) {
        console.log("📦 Using cached delivery info");
        setDeliveryInfo(deliveryCache[cacheKey]);
        if (!deliveryCache[cacheKey].isWithinRange) {
          setDeliveryError(
            `Delivery not available. Distance (${deliveryCache[cacheKey].distance.toFixed(1)} km) exceeds cook's delivery range (${deliveryCache[cacheKey].maxDeliveryDistance} km)`
          );
        } else {
          setDeliveryError(null);
        }
        return;
      }

      setCalculating(true);
      setDeliveryError(null);

      try {
        // Call backend API to calculate distance using OpenRouteService
        const result = await calculateDeliveryInfo(cart.cookId, {
          latitude: deliveryAddress.latitude,
          longitude: deliveryAddress.longitude,
        });

        const deliveryData = {
          distance: result.distance,
          deliveryCharges: result.deliveryCharges,
          estimatedTime: result.estimatedTime,
          isWithinRange: result.isWithinRange,
          maxDeliveryDistance: result.maxDeliveryDistance,
        };

        setDeliveryInfo(deliveryData);

        // Cache the result
        const newCache = { ...deliveryCache, [cacheKey]: deliveryData };
        setDeliveryCache(newCache);
        
        // Save to localStorage (limit to last 10 entries to avoid bloat)
        try {
          const cacheEntries = Object.entries(newCache);
          const limitedCache = Object.fromEntries(cacheEntries.slice(-10));
          localStorage.setItem('deliveryCache', JSON.stringify(limitedCache));
        } catch (error) {
          console.error("Failed to save cache:", error);
        }

        if (!result.isWithinRange) {
          setDeliveryError(
            `Delivery not available. Distance (${result.distance.toFixed(1)} km) exceeds cook's delivery range (${result.maxDeliveryDistance} km)`
          );
        }
      } catch (error) {
        console.error("Delivery calculation error:", error);
        setDeliveryError(error.response?.data?.message || "Could not calculate delivery. Please try again.");
        setDeliveryInfo(null);
      } finally {
        setCalculating(false);
      }
    };

    const timer = setTimeout(calculateDeliveryInfoFn, 300);
    return () => clearTimeout(timer);
  }, [cookInfo, deliveryAddress.latitude, deliveryAddress.longitude, cart.cookId, deliveryCache]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDeliveryAddress((prev) => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }));
        setUsingCustomLocation(true);
        setLoading(false);
        toast.success("Location updated successfully");
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Could not get your location. Please enable location access.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const resetToSavedAddress = () => {
    if (defaultAddress) {
      setDeliveryAddress({
        houseNo: defaultAddress.houseNo || "",
        street: defaultAddress.street || "",
        city: defaultAddress.city || "",
        postalCode: defaultAddress.postalCode || "",
        latitude: defaultAddress.latitude || null,
        longitude: defaultAddress.longitude || null,
      });
      setUsingCustomLocation(false);
      toast.success("Reset to saved address");
    }
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setDeliveryAddress((prev) => ({ ...prev, [name]: value }));
  };

  const handleOrderSuccess = (orderId) => {
    clearCart();
    setTimeout(() => {
      navigate(orderId ? `/orders/${orderId}` : "/orders", { replace: true });
    }, 100);
  };

  const totalAmount = subtotal + (deliveryInfo?.deliveryCharges || 0);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-6 max-w-4xl">
        <button onClick={() => navigate("/cart")} className="flex items-center gap-2 text-gray-600 hover:text-orange-600 mb-4 transition-colors">
          <FiArrowLeft className="w-5 h-5" />
          <span>Back to Cart</span>
        </button>

        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Checkout</h1>

        {cart.items.length > 0 && !cart.cookId && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2 sm:gap-3">
              <FiAlertCircle className="w-4 sm:w-5 h-4 sm:h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-800 text-sm sm:text-base">Cart Data Outdated</h3>
                <p className="text-xs sm:text-sm text-red-600 mt-1">Please clear your cart and add items again.</p>
                <button type="button" onClick={() => { clearCart(); navigate("/dashboard"); }} className="mt-2 text-xs sm:text-sm font-medium text-red-700 underline">
                  Clear Cart & Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
          {/* Right Column - Order Summary (shows first on mobile) */}
          <div className="md:col-span-1 order-first md:order-last">
            <div className="bg-white rounded-lg shadow-sm p-5 md:sticky md:top-4">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
              <div className="text-sm text-gray-600 mb-4 pb-4 border-b">
                Ordering from <span className="font-medium text-gray-800">{cart.cookName}</span>
              </div>
              <div className="space-y-3 mb-4 pb-4 border-b max-h-48 overflow-y-auto">
                {cart.items.map((item) => (
                  <div key={item.mealId} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.name} x {item.quantity}</span>
                    <span className="font-medium">Rs. {item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2 mb-4 pb-4 border-b">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>Rs. {subtotal}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span>{calculating ? "..." : deliveryInfo ? `Rs. ${deliveryInfo.deliveryCharges}` : "-"}</span>
                </div>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-orange-600">Rs. {deliveryInfo ? totalAmount : subtotal}</span>
              </div>

              {cookInfo?.isOnlinePaymentEnabled && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-700 font-medium">💳 Card payment available</p>
                  <p className="text-xs text-green-600 mt-0.5">This cook accepts online payments</p>
                </div>
              )}

              {!deliveryInfo && !calculating && cookInfoLoaded && (deliveryAddress.latitude && deliveryAddress.longitude) && (
                <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                  <p className="font-medium mb-1">⚠️ Delivery calculation pending</p>
                  {!cookInfo && <p>• Cook delivery info not loaded</p>}
                  {cookInfo && (!cookInfo.latitude || !cookInfo.longitude) && <p>• Cook has no GPS coordinates set</p>}
                </div>
              )}
            </div>
          </div>

          {/* Left Column - Delivery + Instructions + Payment */}
          <div className="md:col-span-2 space-y-4 sm:space-y-6 order-last md:order-first">
            {/* Delivery Address */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <FiMapPin className="w-4 sm:w-5 h-4 sm:h-5 text-orange-600" />
                <h2 className="text-base sm:text-lg font-semibold">Delivery Address</h2>
              </div>

              {/* Show selected address */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-gray-900">
                      {usingCustomLocation ? "Current Location" : (defaultAddress?.label || "Delivery Address")}
                    </span>
                    {!usingCustomLocation && defaultAddress?.isDefault && (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                        Default
                      </span>
                    )}
                    {usingCustomLocation && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        Custom Location
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {usingCustomLocation 
                      ? "Using your current GPS location"
                      : ([
                          deliveryAddress.houseNo,
                          deliveryAddress.street,
                          deliveryAddress.city,
                          deliveryAddress.postalCode,
                        ]
                          .filter(Boolean)
                          .join(", ") || "No address details")}
                  </p>
                  
                  {deliveryAddress.latitude && deliveryAddress.longitude ? (
                    <div className="flex items-center gap-2 text-xs text-green-600">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span>Location set: {deliveryAddress.latitude.toFixed(4)}, {deliveryAddress.longitude.toFixed(4)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-amber-600">
                      <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                      <span>GPS location required for delivery calculation</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Use My Location Button - Always visible */}
              <div className="mt-4 space-y-2">
                <Button
                  type="button"
                  variant="primary"
                  onClick={getCurrentLocation}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Getting your location...</span>
                    </>
                  ) : (
                    <>
                      <FiMapPin className="w-4 h-4" />
                      <span>Use My Current Location</span>
                    </>
                  )}
                </Button>

                {/* Reset to Saved Address Button */}
                {usingCustomLocation && defaultAddress?.latitude && defaultAddress?.longitude && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetToSavedAddress}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <span>↺ Reset to Saved Address</span>
                  </Button>
                )}

                <p className="text-xs text-gray-500 text-center">
                  {deliveryAddress.latitude && deliveryAddress.longitude 
                    ? usingCustomLocation 
                      ? "Using custom location for delivery calculation"
                      : "Click above to use your current location instead"
                    : "We need your GPS location to calculate delivery distance"}
                </p>
              </div>

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
                    <div className="flex items-center gap-1"><FiTruck className="w-4 h-4 text-green-600" /><span>{deliveryInfo.distance.toFixed(1)} km</span></div>
                    <div className="flex items-center gap-1"><FiClock className="w-4 h-4 text-green-600" /><span>~{deliveryInfo.estimatedTime} mins</span></div>
                    <div className="ml-auto font-semibold text-green-700">Delivery: Rs. {deliveryInfo.deliveryCharges}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Special Instructions */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-5">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Special Instructions (Optional)</h2>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Any special requests for your order..."
                className="w-full p-2 sm:p-3 border rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base"
                rows={3}
              />
            </div>

            {/* Payment + Submit (wrapped in Elements) */}
            {stripePromise ? (
              <Elements stripe={stripePromise}>
                <CheckoutForm
                  cookInfo={cookInfo}
                  deliveryInfo={deliveryInfo}
                  deliveryAddress={deliveryAddress}
                  cart={cart}
                  subtotal={subtotal}
                  specialInstructions={specialInstructions}
                  onSuccess={handleOrderSuccess}
                  hasStripe={true}
                />
              </Elements>
            ) : (
              <CheckoutForm
                cookInfo={cookInfo}
                deliveryInfo={deliveryInfo}
                deliveryAddress={deliveryAddress}
                cart={cart}
                subtotal={subtotal}
                specialInstructions={specialInstructions}
                onSuccess={handleOrderSuccess}
                hasStripe={false}
              />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
