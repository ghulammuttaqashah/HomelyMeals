import { createContext, useContext, useState, useEffect, useCallback } from "react";

const CartContext = createContext(null);

const CART_STORAGE_KEY = "homelymeals_cart";

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    // Initialize cart from localStorage
    try {
      const storedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (storedCart) {
        return JSON.parse(storedCart);
      }
    } catch (error) {
      console.error("Error loading cart from storage:", error);
    }
    return {
      cookId: null,
      cookName: null,
      items: [],
    };
  });

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error("Error saving cart to storage:", error);
    }
  }, [cart]);

  /**
   * Add item to cart
   * @param {Object} item - { mealId, name, price, imageUrl, quantity }
   * @param {Object} cook - { _id, name }
   */
  const addToCart = useCallback((item, cook) => {
    setCart((prevCart) => {
      // If cart has items from different cook, prevent adding
      if (prevCart.cookId && prevCart.cookId !== cook._id) {
        return prevCart; // Return unchanged - component should handle this case
      }

      const existingItemIndex = prevCart.items.findIndex(
        (i) => i.mealId === item.mealId
      );

      let newItems;
      if (existingItemIndex >= 0) {
        // Update quantity if item exists
        newItems = prevCart.items.map((i, index) =>
          index === existingItemIndex
            ? { ...i, quantity: i.quantity + (item.quantity || 1) }
            : i
        );
      } else {
        // Add new item
        newItems = [
          ...prevCart.items,
          {
            mealId: item.mealId,
            name: item.name,
            price: item.price,
            imageUrl: item.imageUrl,
            quantity: item.quantity || 1,
          },
        ];
      }

      return {
        cookId: cook._id,
        cookName: cook.name,
        items: newItems,
      };
    });
  }, []);

  /**
   * Check if adding from a different cook
   */
  const canAddFromCook = useCallback(
    (cookId) => {
      return !cart.cookId || cart.cookId === cookId || cart.items.length === 0;
    },
    [cart.cookId, cart.items.length]
  );

  /**
   * Update item quantity
   */
  const updateQuantity = useCallback((mealId, quantity) => {
    setCart((prevCart) => {
      if (quantity <= 0) {
        // Remove item if quantity is 0 or less
        const newItems = prevCart.items.filter((i) => i.mealId !== mealId);
        if (newItems.length === 0) {
          return { cookId: null, cookName: null, items: [] };
        }
        return { ...prevCart, items: newItems };
      }

      return {
        ...prevCart,
        items: prevCart.items.map((i) =>
          i.mealId === mealId ? { ...i, quantity } : i
        ),
      };
    });
  }, []);

  /**
   * Remove item from cart
   */
  const removeFromCart = useCallback((mealId) => {
    setCart((prevCart) => {
      const newItems = prevCart.items.filter((i) => i.mealId !== mealId);
      if (newItems.length === 0) {
        return { cookId: null, cookName: null, items: [] };
      }
      return { ...prevCart, items: newItems };
    });
  }, []);

  /**
   * Clear entire cart
   */
  const clearCart = useCallback(() => {
    setCart({ cookId: null, cookName: null, items: [] });
  }, []);

  /**
   * Set cart from a previous order (for reordering)
   * @param {Object} order - { cook: { _id, name }, items: [{ mealId, name, price, itemImage, quantity }] }
   */
  const setCartFromOrder = useCallback((order) => {
    const cartItems = order.items.map((item) => ({
      mealId: item.mealId,
      name: item.name,
      price: item.price,
      imageUrl: item.itemImage || item.imageUrl,
      quantity: item.quantity,
    }));

    setCart({
      cookId: order.cook._id,
      cookName: order.cook.name,
      items: cartItems,
    });
  }, []);

  /**
   * Get cart totals
   */
  const getCartTotals = useCallback(() => {
    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    return { itemCount, subtotal };
  }, [cart.items]);

  const value = {
    cart,
    addToCart,
    canAddFromCook,
    updateQuantity,
    removeFromCart,
    clearCart,
    setCartFromOrder,
    getCartTotals,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

export default CartContext;
