import axios from "axios";

const OPENROUTE_API_KEY = process.env.OPENROUTE_API_KEY;
const OPENROUTE_BASE_URL = "https://api.openrouteservice.org/v2/directions/driving-car";

// Log API key status on module load
console.log("🔑 OpenRouteService API Key loaded:", OPENROUTE_API_KEY ? `${OPENROUTE_API_KEY.substring(0, 10)}...` : "❌ MISSING");

/**
 * Calculate driving distance and duration between two coordinates
 * @param {Object} from - { latitude, longitude }
 * @param {Object} to - { latitude, longitude }
 * @returns {Promise<{ distance: number, duration: number }>} - distance in km, duration in minutes
 */
export const calculateDistance = async (from, to) => {
  try {
    const response = await axios.get(OPENROUTE_BASE_URL, {
      params: {
        api_key: OPENROUTE_API_KEY,
        start: `${from.longitude},${from.latitude}`,
        end: `${to.longitude},${to.latitude}`,
      },
    });

    const feature = response.data.features[0];
    const properties = feature.properties.summary;

    // OpenRouteService returns distance in meters and duration in seconds
    const distanceKm = parseFloat((properties.distance / 1000).toFixed(2));
    const durationMinutes = Math.ceil(properties.duration / 60);

    console.log("✅ OpenRouteService API success!");
    console.log("📍 From:", from);
    console.log("📍 To:", to);
    console.log("🚗 Distance:", distanceKm, "km");
    console.log("⏱️ Duration:", durationMinutes, "minutes");

    return {
      distance: distanceKm,
      duration: durationMinutes,
    };
  } catch (error) {
    console.error("⚠️ OpenRouteService API failed — falling back to Haversine formula");
    console.error("📍 From:", from);
    console.error("📍 To:", to);
    console.error("🔑 API Key present:", !!OPENROUTE_API_KEY);

    if (error.response) {
      console.error("❌ Status:", error.response.status);
      console.error("❌ Response data:", JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error("❌ No response received — possible network issue or timeout");
      console.error("❌ Request details:", error.request?._currentUrl || error.config?.url);
    } else {
      console.error("❌ Error message:", error.message);
    }

    // Fallback to Haversine formula if API fails
    return calculateHaversineDistance(from, to);
  }
};

/**
 * Fallback: Calculate straight-line distance using Haversine formula
 * @param {Object} from - { latitude, longitude }
 * @param {Object} to - { latitude, longitude }
 * @returns {{ distance: number, duration: number }}
 */
const calculateHaversineDistance = (from, to) => {
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
 * Check if distance is within cook's delivery range
 * @param {number} distance - Distance in km
 * @param {number} maxRange - Cook's max delivery range in km
 * @returns {boolean}
 */
export const isWithinDeliveryRange = (distance, maxRange) => {
  return distance <= maxRange;
};

/**
 * Calculate estimated delivery time based on distance
 * Formula: Every 5 km ≈ 10 minutes
 * @param {number} distanceKm - Distance in km
 * @returns {number} - Estimated time in minutes
 */
export const calculateEstimatedDeliveryTime = (distanceKm) => {
  return Math.ceil(distanceKm / 5) * 10;
};
