import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { placeOrder } from "../api/orders";
import { getCookDeliveryInfo, getDeliverySettings } from "../api/meals";
import { createPaymentIntent, confirmPayment } from "../api/payments";
import { calculateDistance, calculateDeliveryCharges, isWithinDeliveryRange } from "../utils/distance";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Button from "../components/Button";
import Loader from "../components/Loader";
import FormInput from "../components/FormInput";
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
          <div className="mt-4 rounded-lg border border-gray-300 p-3 bg-white">
            <CardElement options={cardElementOptions} />
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
        disabled={submitting || !deliveryInfo?.isWithinRange}
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
  const [selectedAddressId, setSelectedAddressId] = useState(defaultAddress?._id || null);
  const [cookInfo, setCookInfo] = useState(null);
  const [deliverySettings, setDeliverySettings] = useState({ pricePerKm: 20, minimumCharge: 0 });
  const [specialInstructions, setSpecialInstructions] = useState("");

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
        const { distance, duration } = await calculateDistance(
          { latitude: cookInfo.latitude, longitude: cookInfo.longitude },
          { latitude: deliveryAddress.latitude, longitude: deliveryAddress.longitude }
        );
        const deliveryCharges = calculateDeliveryCharges(distance, deliverySettings);
        const withinRange = isWithinDeliveryRange(distance, cookInfo.maxDeliveryDistance);

        setDeliveryInfo({ distance, deliveryCharges, estimatedTime: duration, isWithinRange: withinRange, maxDeliveryDistance: cookInfo.maxDeliveryDistance });
        if (!withinRange) {
          setDeliveryError(`Delivery not available. Distance (${distance.toFixed(1)} km) exceeds cook's delivery range (${cookInfo.maxDeliveryDistance} km)`);
        }
      } catch (error) {
        setDeliveryError("Could not calculate delivery. Please try again.");
        setDeliveryInfo(null);
      } finally {
        setCalculating(false);
      }
    };

    const timer = setTimeout(calculateDeliveryInfoFn, 300);
    return () => clearTimeout(timer);
  }, [cookInfo, deliveryAddress.latitude, deliveryAddress.longitude, deliverySettings]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation is not supported"); return; }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDeliveryAddress((prev) => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        setLoading(false);
        toast.success("Location updated");
      },
      () => { toast.error("Could not get your location."); setLoading(false); },
      { enableHighAccuracy: true }
    );
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

        <h1 className="text-2xl font-bold text-gray-800 mb-6">Checkout</h1>

        {cart.items.length > 0 && !cart.cookId && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">Cart Data Outdated</h3>
                <p className="text-sm text-red-600 mt-1">Please clear your cart and add items again.</p>
                <button type="button" onClick={() => { clearCart(); navigate("/dashboard"); }} className="mt-2 text-sm font-medium text-red-700 underline">
                  Clear Cart & Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="md:col-span-2 space-y-6">
            {/* Delivery Address */}
            <div className="bg-white rounded-lg shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <FiMapPin className="w-5 h-5 text-orange-600" />
                <h2 className="text-lg font-semibold">Delivery Address</h2>
              </div>

              {customer?.addresses?.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Saved Address</label>
                  <div className="space-y-2">
                    {customer.addresses.map((addr) => (
                      <label key={addr._id} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${selectedAddressId === addr._id ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-orange-300"}`}>
                        <input type="radio" name="savedAddress" value={addr._id} checked={selectedAddressId === addr._id}
                          onChange={() => { setSelectedAddressId(addr._id); setDeliveryAddress({ houseNo: addr.houseNo || "", street: addr.street || "", city: addr.city || "", postalCode: addr.postalCode || "", latitude: addr.latitude || null, longitude: addr.longitude || null }); }}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{addr.label || "Address"}</span>
                            {addr.isDefault && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">Default</span>}
                            {addr.latitude && addr.longitude && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">📍 GPS</span>}
                          </div>
                          <p className="text-sm text-gray-600">{[addr.houseNo, addr.street, addr.city].filter(Boolean).join(", ")}</p>
                        </div>
                      </label>
                    ))}
                    <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${selectedAddressId === "new" ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-orange-300"}`}>
                      <input type="radio" name="savedAddress" value="new" checked={selectedAddressId === "new"}
                        onChange={() => { setSelectedAddressId("new"); setDeliveryAddress({ houseNo: "", street: "", city: "", postalCode: "", latitude: null, longitude: null }); }}
                      />
                      <span className="font-medium text-gray-700">+ Use a different address</span>
                    </label>
                  </div>

                  {selectedAddressId && selectedAddressId !== "new" && (!deliveryAddress.latitude || !deliveryAddress.longitude) && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                      <span className="text-sm text-gray-600">Set your delivery location</span>
                      <Button type="button" variant="primary" onClick={getCurrentLocation} disabled={loading} className="text-sm">
                        {loading ? "Getting..." : "📍 Use Current Location"}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {(!customer?.addresses?.length || selectedAddressId === "new") && (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <FormInput label="House/Flat No." name="houseNo" value={deliveryAddress.houseNo} onChange={handleAddressChange} placeholder="e.g., 12-A" />
                    <FormInput label="Street *" name="street" value={deliveryAddress.street} onChange={handleAddressChange} placeholder="Street name" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <FormInput label="City" name="city" value={deliveryAddress.city} onChange={handleAddressChange} placeholder="City" />
                    <FormInput label="Postal Code" name="postalCode" value={deliveryAddress.postalCode} onChange={handleAddressChange} placeholder="Postal code" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      {deliveryAddress.latitude && deliveryAddress.longitude
                        ? `Location set: ${deliveryAddress.latitude.toFixed(4)}, ${deliveryAddress.longitude.toFixed(4)}`
                        : "Location not set"}
                    </p>
                    <Button type="button" variant="outline" onClick={getCurrentLocation} disabled={loading} className="text-sm">
                      {loading ? "Getting..." : "Use Current Location"}
                    </Button>
                  </div>
                </>
              )}

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

          {/* Right Column - Order Summary */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-5 sticky top-4">
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

              {!deliveryInfo && !calculating && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                  <p className="font-medium mb-1">⚠️ Cannot place order:</p>
                  {!cookInfo && <p>• Cook delivery info not loaded</p>}
                  {cookInfo && (!cookInfo.latitude || !cookInfo.longitude) && <p>• Cook has no GPS coordinates set</p>}
                  {(!deliveryAddress.latitude || !deliveryAddress.longitude) && <p>• Your delivery location is not set</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
