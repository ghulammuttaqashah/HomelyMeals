import DeliveryCharges from "../models/deliveryCharges.model.js";

export const createOrUpdateDeliveryCharges = async (req, res) => {
  try {
    const { pricePerKm, minimumCharge, maxDeliveryDistance } = req.body;

    // Use upsert to avoid race conditions with delete-then-create
    const settings = await DeliveryCharges.findOneAndUpdate(
      {},
      {
        pricePerKm: pricePerKm ?? 20,
        minimumCharge: minimumCharge ?? 0,
        maxDeliveryDistance: maxDeliveryDistance ?? null,
        isActive: true
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      message: "Delivery charges updated successfully",
      settings
    });
  } catch (error) {
    console.error("Error updating delivery charges:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getDeliveryCharges = async (req, res) => {
  try {
    const settings = await DeliveryCharges.findOne();
    
    if (!settings) {
      return res.status(404).json({ message: "Delivery charges not configured. Please configure delivery charges in admin settings." });
    }

    res.status(200).json({ settings });
  } catch (error) {
    console.error("Error fetching delivery charges:", error);
    res.status(500).json({ message: "Server error" });
  }
};