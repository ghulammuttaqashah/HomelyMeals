import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Button from "../components/Button";
import { FiTrash2, FiMinus, FiPlus, FiShoppingCart, FiArrowLeft } from "react-icons/fi";

const Cart = () => {
  const navigate = useNavigate();
  const { cart, updateQuantity, removeFromCart, clearCart, getCartTotals } = useCart();
  const { itemCount, subtotal } = getCartTotals();

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="flex-grow flex items-center justify-center p-4 sm:p-6">
          <div className="text-center max-w-md mx-auto">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-orange-100 rounded-full blur-3xl opacity-30 animate-pulse"></div>
              <FiShoppingCart className="w-20 h-20 sm:w-24 sm:h-24 mx-auto text-gray-300 relative z-10" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
            <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8">
              Start exploring delicious home-cooked meals from talented local cooks!
            </p>
            <Button 
              onClick={() => navigate("/dashboard")} 
              variant="primary"
              className="px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base shadow-lg hover:shadow-xl transition-all"
            >
              <span className="flex items-center gap-2">
                <FiShoppingCart className="w-4 h-4" />
                Browse Cooks
              </span>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-grow container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-5xl">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 sm:gap-2 text-gray-600 hover:text-orange-600 mb-4 sm:mb-5 transition-all hover:gap-3 group"
        >
          <FiArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm sm:text-base font-medium">Continue Shopping</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-1">Your Cart</h1>
            <p className="text-xs sm:text-sm text-gray-500">{itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart</p>
          </div>
          <button
            onClick={clearCart}
            className="flex items-center gap-1.5 text-red-500 hover:text-red-600 text-xs sm:text-sm font-medium hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto"
          >
            <FiTrash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Clear Cart
          </button>
        </div>

        {/* Cook Info */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-orange-200 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-700" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-orange-600 font-medium">Ordering from</p>
              <p className="text-sm sm:text-base text-orange-800 font-semibold">{cart.cookName}</p>
            </div>
          </div>
        </div>

        {/* Cart Items */}
        <div className="bg-white rounded-xl shadow-md mb-6 overflow-hidden border border-gray-100">
          {cart.items.map((item, index) => (
            <div
              key={item.mealId}
              className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 lg:p-5 transition-colors hover:bg-gray-50 ${
                index !== cart.items.length - 1 ? "border-b border-gray-100" : ""
              }`}
            >
              {/* Item Image */}
              <div className="w-full sm:w-20 lg:w-24 h-40 sm:h-20 lg:h-24 flex-shrink-0 rounded-xl overflow-hidden shadow-sm">
                <img
                  src={item.imageUrl || "/placeholder-meal.png"}
                  alt={item.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Item Details */}
              <div className="flex-grow w-full sm:w-auto">
                <h3 className="font-semibold text-gray-800 text-sm sm:text-base lg:text-lg mb-1">{item.name}</h3>
                <div className="flex items-center gap-2">
                  <p className="text-orange-600 font-bold text-sm sm:text-base">Rs. {item.price}</p>
                  <span className="text-xs text-gray-400">per item</span>
                </div>
              </div>

              {/* Quantity Controls & Actions */}
              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 sm:gap-4">
                {/* Quantity Controls */}
                <div className="flex items-center gap-2 sm:gap-3 bg-gray-50 rounded-xl p-1.5 sm:p-2 border border-gray-200">
                  <button
                    onClick={() => updateQuantity(item.mealId, item.quantity - 1)}
                    className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-white hover:bg-orange-100 hover:text-orange-600 transition-all shadow-sm active:scale-95"
                    aria-label="Decrease quantity"
                  >
                    <FiMinus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <span className="w-8 sm:w-10 text-center font-bold text-sm sm:text-base">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.mealId, item.quantity + 1)}
                    className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-white hover:bg-orange-100 hover:text-orange-600 transition-all shadow-sm active:scale-95"
                    aria-label="Increase quantity"
                  >
                    <FiPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>

                {/* Item Total */}
                <div className="text-right min-w-[70px] sm:min-w-[80px]">
                  <p className="text-xs text-gray-500 mb-0.5">Total</p>
                  <p className="font-bold text-gray-900 text-sm sm:text-base lg:text-lg">
                    Rs. {item.price * item.quantity}
                  </p>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeFromCart(item.mealId)}
                  className="text-red-500 hover:text-white hover:bg-red-500 p-2 rounded-lg transition-all active:scale-95"
                  aria-label="Remove item"
                >
                  <FiTrash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Cart Summary */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-5 lg:p-6 border border-gray-100 sticky bottom-4 sm:static">
          <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4 pb-3 border-b border-gray-200">
            Order Summary
          </h3>
          
          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600">Items ({itemCount})</span>
              <span className="font-semibold text-sm sm:text-base text-gray-800">Rs. {subtotal}</span>
            </div>
            
            <div className="flex justify-between items-center pb-4 border-b border-gray-200">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m-4 0v1a1 1 0 001 1h2m8-2a2 2 0 104 0m-4 0a2 2 0 114 0m-4 0v1a1 1 0 001 1h2" />
                </svg>
                <span className="text-sm sm:text-base text-gray-600">Delivery Fee</span>
              </div>
              <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                At checkout
              </span>
            </div>
            
            <div className="flex justify-between items-center pt-2">
              <span className="text-base sm:text-lg font-bold text-gray-800">Subtotal</span>
              <span className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600">Rs. {subtotal}</span>
            </div>
          </div>

          <Button
            onClick={() => navigate("/checkout")}
            variant="primary"
            className="w-full py-3 sm:py-3.5 text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <span className="flex items-center justify-center gap-2">
              Proceed to Checkout
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </Button>
          
          <p className="text-xs text-center text-gray-500 mt-3">
            Taxes and delivery charges will be calculated at checkout
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cart;
