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
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-grow flex items-center justify-center p-4">
          <div className="text-center">
            <FiShoppingCart className="w-24 h-24 mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">Start exploring delicious home-cooked meals!</p>
            <Button onClick={() => navigate("/dashboard")} variant="primary">
              Browse Cooks
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-6 max-w-4xl">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-orange-600 mb-4 transition-colors"
        >
          <FiArrowLeft className="w-5 h-5" />
          <span>Continue Shopping</span>
        </button>

        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Your Cart</h1>
          <button
            onClick={clearCart}
            className="text-red-500 hover:text-red-600 text-xs sm:text-sm font-medium"
          >
            Clear Cart
          </button>
        </div>

        {/* Cook Info */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-orange-700">
            <span className="font-medium">Ordering from:</span> {cart.cookName}
          </p>
        </div>

        {/* Cart Items */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          {cart.items.map((item, index) => (
            <div
              key={item.mealId}
              className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 ${
                index !== cart.items.length - 1 ? "border-b" : ""
              }`}
            >
              {/* Item Image */}
              <div className="w-full sm:w-20 h-32 sm:h-20 flex-shrink-0">
                <img
                  src={item.imageUrl || "/placeholder-meal.png"}
                  alt={item.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>

              {/* Item Details */}
              <div className="flex-grow w-full sm:w-auto">
                <h3 className="font-medium text-gray-800 text-sm sm:text-base">{item.name}</h3>
                <p className="text-orange-600 font-semibold text-sm sm:text-base">Rs. {item.price}</p>
              </div>

              {/* Quantity Controls - Mobile: Full width, Desktop: Inline */}
              <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-3 sm:gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.mealId, item.quantity - 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <FiMinus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.mealId, item.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <FiPlus className="w-4 h-4" />
                  </button>
                </div>

                {/* Item Total */}
                <div className="text-right sm:w-20">
                  <p className="font-semibold text-gray-800 text-sm sm:text-base">
                    Rs. {item.price * item.quantity}
                  </p>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeFromCart(item.mealId)}
                  className="text-red-500 hover:text-red-600 p-2"
                >
                  <FiTrash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Cart Summary */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Items ({itemCount})</span>
            <span className="font-medium">Rs. {subtotal}</span>
          </div>
          <div className="flex justify-between items-center mb-4 pb-4 border-b">
            <span className="text-gray-600">Delivery Fee</span>
            <span className="text-sm text-gray-500">Calculated at checkout</span>
          </div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold">Subtotal</span>
            <span className="text-lg font-bold text-orange-600">Rs. {subtotal}</span>
          </div>
          <Button
            onClick={() => navigate("/checkout")}
            variant="primary"
            className="w-full"
          >
            Proceed to Checkout
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cart;
