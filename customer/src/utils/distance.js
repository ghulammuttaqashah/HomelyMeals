// OpenRouteService API for distance calculation
// NOTE: Direct API calls from frontend cause CORS errors
// The backend handles distance calculation via /api/customer/orders/calculate-delivery
// This function now uses Haversine formula as a simple fallback for UI preview

/**
 * Calculate driving distance using Haversine formula
 * For accurate distance, the backend uses OpenRouteService API
 * @param {Object} from - { latitude, longitude }
 * @param {Object} to - { latitude, longitude }
 * @returns {Promise<{ distance: number, duration: number }>}
 */
export const calculateDistance = async (from, to) => {
  // Use Haversine formula to avoid CORS issues
  // Backend will calculate accurate distance when order is placed
  console.log("📍 Calculating distance using Haversine formula (frontend preview)");
  return calculateHaversineDistance(from, to);
};

/**
 * Fallback: Calculate straight-line distance using Haversine formula
 * @param {Object} from - { latitude, longitude }
 * @param {Object} to - { latitude, longitude }
 * @returns {{ distance: number, duration: number }}
 */
export const calculateHaversineDistance = (from, to) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.latitude)) *
      Math.cos(toRad(to.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = parseFloat((R * c).toFixed(2));

  // Estimate duration: ~3 min per km for city driving
  const duration = Math.ceil(distance * 3);

  return { distance, duration };
};

const toRad = (deg) => deg * (Math.PI / 180);

/**
 * Calculate delivery charges based on distance and settings
 * @param {number} distanceKm - Distance in kilometers
 * @param {Object} settings - { pricePerKm, minimumCharge }
 * @returns {number} - Delivery charges amount
 */
export const calculateDeliveryCharges = (distanceKm, settings) => {
  const calculatedCharge = distanceKm * (settings?.pricePerKm || 20);
  return Math.max(Math.ceil(calculatedCharge), settings?.minimumCharge || 0);
};

/**
 * Check if distance is within cook's delivery range
 * @param {number} distance - Distance in km
 * @param {number} maxRange - Cook's max delivery range in km
 * @returns {boolean}
 */
export const isWithinDeliveryRange = (distance, maxRange) => {
  return distance <= (maxRange || 10);
};
