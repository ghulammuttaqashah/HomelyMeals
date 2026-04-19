/**
 * Utility to clear delivery cache from localStorage
 * Use this if you're experiencing stale delivery range data
 */

export const clearDeliveryCache = () => {
  try {
    localStorage.removeItem('deliveryCache');
    console.log('✅ Delivery cache cleared');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear delivery cache:', error);
    return false;
  }
};

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  window.clearDeliveryCache = clearDeliveryCache;
}

export default clearDeliveryCache;
