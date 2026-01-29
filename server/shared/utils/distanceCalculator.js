/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

/**
 * Convert degrees to radians
 * @param {number} degrees
 * @returns {number} radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Check if customer is within cook's delivery range
 * @param {Object} cookLocation - Cook's address.location { latitude, longitude }
 * @param {Object} customerLocation - Customer's location { latitude, longitude }
 * @param {number} maxDeliveryDistance - Maximum delivery distance in km
 * @returns {Object} { withinRange: boolean, distance: number }
 */
export const isWithinDeliveryRange = (cookLocation, customerLocation, maxDeliveryDistance) => {
  if (!cookLocation?.latitude || !cookLocation?.longitude) {
    return { withinRange: false, distance: null, error: "Cook location not available" };
  }

  if (!customerLocation?.latitude || !customerLocation?.longitude) {
    return { withinRange: false, distance: null, error: "Customer location not provided" };
  }

  const { latitude: cookLat, longitude: cookLng } = cookLocation;
  const { latitude: customerLat, longitude: customerLng } = customerLocation;

  const distance = calculateDistance(cookLat, cookLng, customerLat, customerLng);

  return {
    withinRange: distance <= maxDeliveryDistance,
    distance,
    maxAllowed: maxDeliveryDistance,
  };
};
