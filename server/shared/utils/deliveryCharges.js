import DeliveryCharges from "../../modules/admin/models/deliveryCharges.model.js";

/**
 * Calculate delivery charges based on distance
 * @param {number} distanceKm - Distance in kilometers
 * @returns {Promise<number>} - Delivery charges amount (rounded to nearest integer)
 */
export const calculateDeliveryCharges = async (distanceKm) => {
  try {
    const settings = await DeliveryCharges.getSettings();
    
    if (!settings) {
      // Default rate if no settings configured
      return Math.round(distanceKm * 20); // Rs 20 per km default, rounded
    }

    const calculatedCharge = distanceKm * settings.pricePerKm;
    
    // Apply minimum charge if calculated is less, then round
    const finalCharge = Math.max(calculatedCharge, settings.minimumCharge || 0);
    
    // Round to nearest integer (no decimals)
    return Math.round(finalCharge);
  } catch (error) {
    console.error("Error calculating delivery charges:", error);
    // Fallback to default rate
    return Math.round(distanceKm * 20);
  }
};

/**
 * Get current delivery charge settings
 * @returns {Promise<Object>} - Delivery charge settings
 */
export const getDeliveryChargeSettings = async () => {
  const settings = await DeliveryCharges.getSettings();
  return settings || { pricePerKm: 20, minimumCharge: 0 };
};
