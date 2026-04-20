import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { placeOrder, calculateDeliveryInfo, cancelUnpaidOrder } from "../api/orders";
import { getCookDeliveryInfo } from "../api/meals";
import { createPaymentIntent, confirmPayment } from "../api/payments";
import { clearDeliveryCache } from "../utils/clearDeliveryCache";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Button from "../components/Button";
import Loader from "../components/Loader";
import { FiMapPin, FiTruck, FiClock, FiCreditCard, FiArrowLeft, FiAlertCircle } from "react-icons/fi";

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

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
  const [cardComplete, setCardComplete] = useState(false);
  const [showCardPolicyModal, setShowCardPolicyModal] = useState(false);
  const [cardPolicyAccepted, setCardPolicyAccepted] = useState(false);

  const cookAcceptsCard = cookInfo?.isOnlinePaymentEnabled && cookInfo?.stripeAccountId;
  const totalAmount = subtotal + (deliveryInfo?.deliveryCharges || 0);

  const handlePaymentMethodChange = (method) => {
    if (method === "card" && !cardPolicyAccepted) {
      setShowCardPolicyModal(true);
    } else {
      setPaymentMethod(method);
    }
  };

  const acceptCardPolicy = () => {
    setCardPolicyAccepted(true);
    setPaymentMethod("card");
    setShowCardPolicyModal(false);
  };

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

    // Validate card is filled before submitting
    if (paymentMethod === "card") {
      if (!stripe || !elements) {
        toast.error("Stripe is not loaded. Please refresh and try again.");
        return;
      }
      if (!cardComplete) {
        toast.error("Please complete your card details before placing the order.");
        return;
      }
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
        let paymentSucceeded = false;
        try {
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
          } else if (paymentIntent?.status === "succeeded") {
            await confirmPayment(orderId, paymentIntentId);
            paymentSucceeded = true;
            toast.success("Payment successful! Order placed.");
          } else {
            toast.error("Payment did not complete. Please try again.");
          }
        } catch (paymentError) {
          toast.error(paymentError.response?.data?.message || "Payment failed. Please try again.");
        }

        if (!paymentSucceeded) {
          // Clean up the orphaned order so it doesn't appear in cook's queue
          try {
            await cancelUnpaidOrder(orderId);
          } catch (_) {
            // best-effort cleanup, don't surface this error
          }
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
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      {/* Payment Method */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-5 lg:p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
            <FiCreditCard className="w-4 h-4 text-orange-600" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-gray-800">Payment Method</h2>
        </div>

        <div className="space-y-3">
          {/* Cash on Delivery */}
          <label
            className={`flex items-center gap-3 p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all ${
              paymentMethod === "cod"
                ? "border-orange-500 bg-orange-50 shadow-sm"
                : "border-gray-200 hover:border-orange-300 hover:bg-gray-50"
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
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xl sm:text-2xl">💵</span>
            </div>
            <div className="flex-1">
              <span className="font-semibold text-gray-900 text-sm sm:text-base">Cash on Delivery</span>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5">Pay when your order arrives</p>
            </div>
            {paymentMethod === "cod" && (
              <span className="text-orange-600">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </label>

          {/* Card Payment */}
          <label
            className={`flex items-center gap-3 p-3 sm:p-4 border-2 rounded-xl transition-all ${
              !cookAcceptsCard
                ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                : paymentMethod === "card"
                ? "border-orange-500 bg-orange-50 cursor-pointer shadow-sm"
                : "border-gray-200 hover:border-orange-300 hover:bg-gray-50 cursor-pointer"
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="card"
              checked={paymentMethod === "card"}
              onChange={() => cookAcceptsCard && handlePaymentMethodChange("card")}
              disabled={!cookAcceptsCard}
              className="sr-only"
            />
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xl sm:text-2xl">💳</span>
            </div>
            <div className="flex-1">
              <span className="font-semibold text-gray-900 text-sm sm:text-base">Pay with Card</span>
              {!cookAcceptsCard ? (
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5">Not available for this cook</p>
              ) : (
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5">Secure payment via Stripe</p>
              )}
            </div>
            {paymentMethod === "card" && cookAcceptsCard && (
              <span className="text-orange-600">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </label>
        </div>

        {/* Stripe Card Element */}
        {paymentMethod === "card" && cookAcceptsCard && hasStripe && (
          <div className="mt-4 rounded-xl border-2 border-gray-300 p-3 sm:p-4 bg-white relative min-h-[44px] focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-200 transition-all">
            {!cardReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-white rounded-xl z-10">
                <div className="animate-spin w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full" />
              </div>
            )}
            <CardElement 
              options={cardElementOptions} 
              onReady={() => setCardReady(true)}
              onChange={(e) => setCardComplete(e.complete)}
            />
          </div>
        )}

        {!hasStripe && paymentMethod === "card" && cookAcceptsCard && (
          <p className="mt-3 text-xs sm:text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
            <span className="font-semibold">Stripe not configured:</span> Add VITE_STRIPE_PUBLISHABLE_KEY to customer .env
          </p>
        )}
      </div>

      {/* Place Order Button */}
      <Button
        type="submit"
        variant="primary"
        className="w-full py-3 sm:py-3.5 text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl transition-all"
        disabled={submitting || !deliveryInfo?.isWithinRange || (paymentMethod === "card" && (!cardReady || !cardComplete))}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <div className="animate-spin w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full" />
            {paymentMethod === "card" ? "Processing Payment..." : "Placing Order..."}
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            {paymentMethod === "card" ? `Pay Rs. ${Math.round(totalAmount)}` : `Place Order · Rs. ${Math.round(totalAmount)}`}
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        )}
      </Button>

      {deliveryInfo && !deliveryInfo.isWithinRange && (
        <p className="text-xs sm:text-sm text-red-500 text-center bg-red-50 py-2 px-3 rounded-lg border border-red-200">
          Delivery not available to this location
        </p>
      )}

      {/* Card Payment Policy Modal */}
      {showCardPolicyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FiAlertCircle className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Card Payment Policy</h3>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-yellow-800 mb-2">⚠️ Important Notice</p>
                <ul className="text-sm text-yellow-700 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600 mt-0.5">•</span>
                    <span><strong>No Cancellations:</strong> Online payment orders cannot be cancelled once placed.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600 mt-0.5">•</span>
                    <span><strong>Refund Process:</strong> For refund requests, contact support at <a href="mailto:homelymeals4@gmail.com" className="underline font-medium">homelymeals4@gmail.com</a></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600 mt-0.5">•</span>
                    <span><strong>Secure Payment:</strong> Your payment is processed securely via Stripe.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-green-800 mb-2">✅ Why Card Payment?</p>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Instant order confirmation</li>
                  <li>• No need for cash handling</li>
                  <li>• Secure and convenient</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowCardPolicyModal(false);
                  setPaymentMethod("cod");
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={acceptCardPolicy}
                variant="primary"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                I Understand
              </Button>
            </div>
          </div>
        </div>
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
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [tempLocation, setTempLocation] = useState(null);
  const [customAddressForm, setCustomAddressForm] = useState({
    label: "Home",
    houseNo: "",
    street: "",
    city: "",
    postalCode: "",
    landmark: "",
  });
  const [showCheckoutCloseConfirm, setShowCheckoutCloseConfirm] = useState(false);

  // Search state for checkout modal
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
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
        console.log("🍳 Fetched cook delivery info:", {
          cookId: cookData.cook.cookId,
          name: cookData.cook.name,
          maxDeliveryDistance: cookData.cook.maxDeliveryDistance,
          hasLocation: !!(cookData.cook.latitude && cookData.cook.longitude)
        });
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
        console.log("⏸️ Skipping delivery calculation:", {
          hasCookInfo: !!cookInfo,
          hasLat: !!deliveryAddress.latitude,
          hasLng: !!deliveryAddress.longitude,
          lat: deliveryAddress.latitude,
          lng: deliveryAddress.longitude
        });
        setDeliveryInfo(null);
        return;
      }
      if (!cookInfo.latitude || !cookInfo.longitude) {
        setDeliveryError("Cook location not available");
        setDeliveryInfo(null);
        return;
      }

      // Create cache key based on cook, customer coordinates, AND cook's max delivery distance
      // This ensures cache is invalidated when cook updates their delivery range
      const cacheKey = `${cart.cookId}_${cookInfo.latitude.toFixed(4)}_${cookInfo.longitude.toFixed(4)}_${deliveryAddress.latitude.toFixed(4)}_${deliveryAddress.longitude.toFixed(4)}_${cookInfo.maxDeliveryDistance}`;
      
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
        console.log("🔄 Calculating delivery info (not cached):", {
          cookId: cart.cookId,
          cookMaxDeliveryDistance: cookInfo.maxDeliveryDistance,
          customerLat: deliveryAddress.latitude,
          customerLng: deliveryAddress.longitude
        });

        // Call backend API to calculate distance using OpenRouteService
        const result = await calculateDeliveryInfo(cart.cookId, {
          latitude: deliveryAddress.latitude,
          longitude: deliveryAddress.longitude,
        });

        console.log("📊 Backend calculation result:", {
          distance: result.distance,
          maxDeliveryDistance: result.maxDeliveryDistance,
          isWithinRange: result.isWithinRange
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
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        // Store temp location immediately so map shows up
        setTempLocation({ latitude: lat, longitude: lon });
        setShowAddressModal(true);
        setSearchQuery('');
        setSearchResults([]);
        setShowSearchResults(false);

        // Reverse geocode to auto-fill address form
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`
          );
          const data = await res.json();
          const addr = data.address || {};
          const displayParts = (data.display_name || '').split(',').map(p => p.trim());

          const street =
            addr.road || addr.street || addr.pedestrian || addr.footway ||
            addr.path || displayParts[0] || '';
          const city =
            addr.city || addr.town || addr.village || addr.municipality ||
            addr.county || addr.state_district || displayParts[displayParts.length - 3] || '';
          const postalCode = addr.postcode || '';

          setCustomAddressForm(prev => ({
            ...prev,
            street,
            city,
            postalCode,
          }));
          if (street || city) {
            toast.success('📍 Location detected! Address auto-filled.');
          }
        } catch (err) {
          console.error('Reverse geocode error:', err);
          // Don't block the user — they can fill in manually
        }

        setLoading(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Could not get your location. Please enable location access.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Search for places using Nominatim
  const searchPlaces = async (query) => {
    if (!query || query.trim().length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&extratags=1`
      );
      const data = await response.json();
      console.log('Search results:', data);
      setSearchResults(data || []);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery && showAddressModal) {
        searchPlaces(searchQuery);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, showAddressModal]);

  // Handle selecting a search result
  const handleSelectPlace = (place) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    
    console.log('Selected place:', place);
    
    // Extract address components with better fallbacks
    const addr = place.address || {};
    const displayParts = place.display_name ? place.display_name.split(',').map(p => p.trim()) : [];
    
    // Try to get street/road name
    let street = addr.road || addr.street || addr.pedestrian || addr.footway || addr.path || '';
    
    // If no street found, use the first part of display name
    if (!street && displayParts.length > 0) {
      street = displayParts[0];
    }
    
    // Get city with multiple fallbacks
    const city = addr.city || addr.town || addr.village || addr.municipality || 
                 addr.county || addr.state_district || displayParts[displayParts.length - 3] || '';
    
    // Get postal code
    const postalCode = addr.postcode || '';
    
    console.log('Extracted address:', { street, city, postalCode, lat, lon });
    
    setCustomAddressForm((prev) => ({
      ...prev,
      street: street,
      city: city,
      postalCode: postalCode,
    }));
    
    setTempLocation({ latitude: lat, longitude: lon });
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    toast.success('✅ Location selected! Address fields auto-filled.');
  };

  const handleCustomAddressSubmit = (e) => {
    e.preventDefault();
    
    if (!customAddressForm.houseNo.trim()) {
      toast.error("House/Flat No. is required");
      return;
    }
    
    if (!customAddressForm.street.trim() || !customAddressForm.city.trim() || 
        !customAddressForm.postalCode.trim()) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!tempLocation) {
      toast.error("GPS location is required. Please use 'Use My Location' or search for a place.");
      return;
    }

    setDeliveryAddress({
      ...customAddressForm,
      latitude: tempLocation.latitude,
      longitude: tempLocation.longitude,
    });
    setUsingCustomLocation(true);
    setShowAddressModal(false);
    toast.success("Location and address updated successfully");
  };

  const handleAddressFormChange = (e) => {
    const { name, value } = e.target;
    setCustomAddressForm(prev => ({ ...prev, [name]: value }));
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
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-grow container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-6xl">
        <button 
          onClick={() => navigate("/cart")} 
          className="flex items-center gap-1.5 sm:gap-2 text-gray-600 hover:text-orange-600 mb-4 sm:mb-5 transition-all hover:gap-3 group"
        >
          <FiArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm sm:text-base font-medium">Back to Cart</span>
        </button>

        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-1">Checkout</h1>
          <p className="text-xs sm:text-sm text-gray-500">Complete your order details</p>
        </div>

        {cart.items.length > 0 && !cart.cookId && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm">
            <div className="flex items-start gap-2 sm:gap-3">
              <FiAlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-800 text-sm sm:text-base mb-1">Cart Data Outdated</h3>
                <p className="text-xs sm:text-sm text-red-600 mb-2">Please clear your cart and add items again.</p>
                <button 
                  type="button" 
                  onClick={() => { clearCart(); navigate("/dashboard"); }} 
                  className="text-xs sm:text-sm font-medium text-red-700 hover:text-red-800 underline hover:no-underline transition-all"
                >
                  Clear Cart & Go to Dashboard →
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
          {/* Right Column - Order Summary (shows first on mobile) */}
          <div className="md:col-span-1 order-first md:order-last">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-5 lg:p-6 md:sticky md:top-4">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-4 pb-3 border-b border-gray-200">Order Summary</h2>
              
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 mb-4 pb-4 border-b border-gray-100 bg-orange-50 -mx-4 sm:-mx-5 lg:-mx-6 px-4 sm:px-5 lg:px-6 py-3">
                <svg className="w-4 h-4 text-orange-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <span>Ordering from <span className="font-semibold text-gray-800">{cart.cookName}</span></span>
              </div>
              
              <div className="space-y-2.5 mb-4 pb-4 border-b border-gray-100 max-h-48 overflow-y-auto">
                {cart.items.map((item) => (
                  <div key={item.mealId} className="flex justify-between items-start gap-3 text-xs sm:text-sm">
                    <div className="flex-1">
                      <span className="text-gray-700 font-medium">{item.name}</span>
                      <span className="text-gray-400 ml-1.5">× {item.quantity}</span>
                    </div>
                    <span className="font-semibold text-gray-800 whitespace-nowrap">Rs. {item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
              
              <div className="space-y-2.5 mb-4 pb-4 border-b border-gray-200">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold text-gray-800">Rs. {subtotal}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-1.5">
                    <FiTruck className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-600">Delivery Fee</span>
                  </div>
                  <span className="font-semibold text-gray-800">
                    {calculating ? (
                      <span className="flex items-center gap-1.5">
                        <div className="w-3 h-3 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs">Calculating...</span>
                      </span>
                    ) : deliveryInfo ? `Rs. ${Math.round(deliveryInfo.deliveryCharges)}` : (
                      <span className="text-xs text-gray-400">Pending</span>
                    )}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-5">
                <span className="text-base sm:text-lg font-bold text-gray-800">Total</span>
                <span className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600">
                  Rs. {deliveryInfo ? Math.round(totalAmount) : subtotal}
                </span>
              </div>

              {cookInfo?.isOnlinePaymentEnabled && (
                <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs sm:text-sm font-semibold text-green-700">Card Payment Available</p>
                  </div>
                  <p className="text-xs sm:text-sm text-green-600">This cook accepts secure online payments</p>
                </div>
              )}

              {!deliveryInfo && !calculating && cookInfoLoaded && (deliveryAddress.latitude && deliveryAddress.longitude) && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-xs font-semibold text-amber-700 mb-1">Delivery Calculation Pending</p>
                      {!cookInfo && <p className="text-xs text-amber-600">• Cook delivery info not loaded</p>}
                      {cookInfo && (!cookInfo.latitude || !cookInfo.longitude) && <p className="text-xs text-amber-600">• Cook has no GPS coordinates set</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Left Column - Delivery + Instructions + Payment */}
          <div className="md:col-span-2 space-y-4 sm:space-y-6 order-last md:order-first">
            {/* Delivery Address */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-5 lg:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <FiMapPin className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-gray-800">Delivery Address</h2>
              </div>

              {/* Show selected address */}
              <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-900 text-sm sm:text-base">
                      {usingCustomLocation ? "Current Location" : (defaultAddress?.label || "Delivery Address")}
                    </span>
                    {!usingCustomLocation && defaultAddress?.isDefault && (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                        Default
                      </span>
                    )}
                    {usingCustomLocation && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        Custom
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-3 leading-relaxed">
                    {usingCustomLocation 
                      ? `${deliveryAddress.houseNo}, ${deliveryAddress.street}, ${deliveryAddress.city}, ${deliveryAddress.postalCode}`
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
                    <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-2 py-1.5 rounded-lg w-fit">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      <span className="font-medium">GPS: {deliveryAddress.latitude.toFixed(4)}, {deliveryAddress.longitude.toFixed(4)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-2 py-1.5 rounded-lg w-fit">
                      <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                      <span className="font-medium">GPS location required</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Use My Location Button - Always visible */}
              <div className="mt-4 space-y-2.5">
                <Button
                  type="button"
                  variant="primary"
                  onClick={getCurrentLocation}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
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
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Reset to Saved Address</span>
                  </Button>
                )}

                <p className="text-xs sm:text-sm text-gray-600 text-center leading-relaxed px-2">
                  {deliveryAddress.latitude && deliveryAddress.longitude 
                    ? usingCustomLocation 
                      ? "Using custom location for delivery calculation"
                      : "Click above to use your current location instead"
                    : "We need your GPS location to calculate delivery distance"}
                </p>
              </div>

              {calculating && (
                <div className="mt-4 flex items-center justify-center gap-2 text-gray-600 bg-gray-50 py-3 rounded-lg">
                  <div className="animate-spin w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full" />
                  <span className="text-sm font-medium">Calculating delivery...</span>
                </div>
              )}
              
              {deliveryError && (
                <div className="mt-4 p-3 sm:p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-2 sm:gap-3 shadow-sm">
                  <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-600 text-xs sm:text-sm leading-relaxed">{deliveryError}</p>
                </div>
              )}
              
              {deliveryInfo && (
                <div className="mt-4 p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-sm">
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-1.5">
                      <FiTruck className="w-4 h-4 text-green-600" />
                      <span className="font-semibold text-green-700">{deliveryInfo.distance.toFixed(1)} km</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FiClock className="w-4 h-4 text-green-600" />
                      <span className="font-semibold text-green-700">~{deliveryInfo.estimatedTime} mins</span>
                    </div>
                    <div className="ml-auto font-bold text-green-700 text-sm sm:text-base">
                      Delivery: Rs. {Math.round(deliveryInfo.deliveryCharges)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Special Instructions */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-5 lg:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-gray-800">Special Instructions</h2>
                <span className="text-xs sm:text-sm text-gray-500 font-medium ml-auto">(Optional)</span>
              </div>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Any special requests for your order? (e.g., extra spicy, no onions, contactless delivery...)"
                className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm sm:text-base bg-gray-50 focus:bg-white transition-colors"
                rows={3}
              />
              <p className="text-xs sm:text-sm text-gray-600 mt-2">Let the cook know if you have any special requirements</p>
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

        {/* Address Details Modal */}
        {showAddressModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col">

              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 rounded-t-2xl">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-800">Delivery Location</h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Set your exact delivery address for this order</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCheckoutCloseConfirm(true)}
                  className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="overflow-y-auto flex-1">
              <form onSubmit={handleCustomAddressSubmit} className="p-4 sm:p-5 space-y-3 sm:space-y-4">

                {/* Search Bar */}
                <div className="relative">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                    Search for a Place or Landmark
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                      placeholder="e.g., Sukkur IBA University, Jinnah Hospital..."
                      className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-2.5 pr-10 text-xs sm:text-sm focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
                    />
                    {isSearching ? (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="h-5 w-5 animate-spin text-orange-500" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                    ) : (
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )}
                  </div>

                  {showSearchResults && searchResults.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-xl max-h-48 sm:max-h-56 overflow-y-auto">
                      {searchResults.map((result, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSelectPlace(result)}
                          className="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-orange-50 border-b border-gray-50 last:border-b-0 transition-colors"
                        >
                          <div className="flex items-start gap-2 sm:gap-3">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{result.display_name.split(',')[0]}</p>
                              <p className="text-xs text-gray-400 truncate">{result.display_name}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {showSearchResults && searchQuery && searchResults.length === 0 && !isSearching && (
                    <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg p-4 text-center">
                      <p className="text-sm text-gray-500">No results found. Try a different term.</p>
                    </div>
                  )}
                  <p className="mt-1.5 text-xs text-gray-400">Type 3+ characters to search universities, hospitals, landmarks</p>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-gray-200" />
                  <span className="text-xs text-gray-400 font-medium">OR SET ON MAP</span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>

                {/* Map */}
                {tempLocation && (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <label className="text-xs sm:text-sm font-semibold text-gray-700">Your Location on Map</label>
                      <button
                        type="button"
                        onClick={getCurrentLocation}
                        disabled={loading}
                        className="flex items-center gap-1 sm:gap-1.5 rounded-lg bg-orange-600 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50 transition-colors self-start sm:self-auto"
                      >
                        {loading ? (
                          <>
                            <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Detecting...
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            Update Location
                          </>
                        )}
                      </button>
                    </div>
                    <div className="w-full h-48 sm:h-56 rounded-xl overflow-hidden border-2 border-green-400">
                      <MapContainer
                        center={[tempLocation.latitude, tempLocation.longitude]}
                        zoom={16}
                        style={{ height: "100%", width: "100%" }}
                        scrollWheelZoom={false}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={[tempLocation.latitude, tempLocation.longitude]}>
                          <Popup>Your delivery location</Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                    <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span>
                      GPS: {tempLocation.latitude.toFixed(5)}, {tempLocation.longitude.toFixed(5)}
                    </p>
                  </div>
                )}

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-gray-200" />
                  <span className="text-xs text-gray-400 font-medium">ADDRESS DETAILS</span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>

                {/* Address Label */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Address Label *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Home", "Work", "Other"].map((labelOption) => (
                      <button
                        key={labelOption}
                        type="button"
                        onClick={() => handleAddressFormChange({ target: { name: 'label', value: labelOption } })}
                        className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 rounded-xl border-2 text-xs sm:text-sm font-medium transition-all ${
                          customAddressForm.label === labelOption
                            ? "border-orange-500 bg-orange-50 text-orange-700"
                            : "border-gray-200 text-gray-600 hover:border-orange-300"
                        }`}
                      >
                        {labelOption === "Home" && (
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                          </svg>
                        )}
                        {labelOption === "Work" && (
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                          </svg>
                        )}
                        {labelOption === "Other" && (
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                        )}
                        {labelOption}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">House/Flat No. *</label>
                    <input type="text" name="houseNo" value={customAddressForm.houseNo} onChange={handleAddressFormChange}
                      placeholder="e.g., 12-A" required
                      className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-200 focus:border-orange-500 text-xs sm:text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Street *</label>
                    <input type="text" name="street" value={customAddressForm.street} onChange={handleAddressFormChange}
                      placeholder="Street name" required
                      className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-200 focus:border-orange-500 text-xs sm:text-sm outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1">Landmark / Nearby Place <span className="text-gray-400">(Optional)</span></label>
                  <input type="text" name="landmark" value={customAddressForm.landmark} onChange={handleAddressFormChange}
                    placeholder="e.g., Near City Mall, Behind Jinnah Hospital"
                    className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-200 focus:border-orange-500 text-xs sm:text-sm outline-none" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">City *</label>
                    <input type="text" name="city" value={customAddressForm.city} onChange={handleAddressFormChange}
                      placeholder="City" required
                      className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-200 focus:border-orange-500 text-xs sm:text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Postal Code *</label>
                    <input type="text" name="postalCode" value={customAddressForm.postalCode} onChange={handleAddressFormChange}
                      placeholder="Postal code" required
                      className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-200 focus:border-orange-500 text-xs sm:text-sm outline-none" />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-2 sm:gap-3 pt-2 pb-1">
                  <Button type="button" variant="outline" onClick={() => setShowCheckoutCloseConfirm(true)} className="flex-1 text-xs sm:text-sm">
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" className="flex-1 text-xs sm:text-sm">
                    Confirm Address
                  </Button>
                </div>
              </form>
              </div>
            </div>
          </div>
        )}

        {/* Checkout Close Confirmation */}
        {showCheckoutCloseConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-4 sm:p-6">
              <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-100 mx-auto mb-3 sm:mb-4">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 text-center mb-1">Discard Location?</h3>
              <p className="text-xs sm:text-sm text-gray-500 text-center mb-4 sm:mb-5">
                Your default saved address will be used for delivery instead.
              </p>
              <div className="flex gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setShowCheckoutCloseConfirm(false)}
                  className="flex-1 rounded-xl border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Keep Editing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCheckoutCloseConfirm(false);
                    setShowAddressModal(false);
                    setTempLocation(null);
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowSearchResults(false);
                    setCustomAddressForm({ label: "Home", houseNo: "", street: "", city: "", postalCode: "", landmark: "" });
                  }}
                  className="flex-1 rounded-xl bg-red-500 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-red-600 transition-colors"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
