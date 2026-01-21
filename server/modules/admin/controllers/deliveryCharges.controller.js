import DeliveryCharges from "../models/deliveryCharges.model.js";

// Get delivery charges settings
export const getDeliveryCharges = async (req, res) => {
  try {
    const settings = await DeliveryCharges.getSettings();

    if (!settings) {
      return res.status(200).json({
        message: "No delivery charges configured yet",
        settings: null,
      });
    }

    return res.status(200).json({
      message: "Delivery charges retrieved successfully",
      settings,
    });
  } catch (error) {
    console.error("Get delivery charges error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Create delivery charges settings (only if not exists)
export const createDeliveryCharges = async (req, res) => {
  try {
    const existingSettings = await DeliveryCharges.getSettings();

    if (existingSettings) {
      return res.status(400).json({
        message: "Delivery charges already exist. Use update instead.",
      });
    }

    const { pricePerKm, minimumCharge, maxDeliveryDistance } = req.body;

    if (!pricePerKm || pricePerKm <= 0) {
      return res.status(400).json({
        message: "Price per km is required and must be greater than 0",
      });
    }

    const settings = await DeliveryCharges.create({
      pricePerKm,
      minimumCharge: minimumCharge || 0,
      maxDeliveryDistance: maxDeliveryDistance || null,
    });

    return res.status(201).json({
      message: "Delivery charges created successfully",
      settings,
    });
  } catch (error) {
    console.error("Create delivery charges error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update delivery charges settings
export const updateDeliveryCharges = async (req, res) => {
  try {
    const settings = await DeliveryCharges.getSettings();

    if (!settings) {
      return res.status(404).json({
        message: "Delivery charges not found. Create them first.",
      });
    }

    const { pricePerKm, minimumCharge, maxDeliveryDistance, isActive } = req.body;

    if (pricePerKm !== undefined) {
      if (pricePerKm <= 0) {
        return res.status(400).json({
          message: "Price per km must be greater than 0",
        });
      }
      settings.pricePerKm = pricePerKm;
    }

    if (minimumCharge !== undefined) settings.minimumCharge = minimumCharge;
    if (maxDeliveryDistance !== undefined) settings.maxDeliveryDistance = maxDeliveryDistance;
    if (isActive !== undefined) settings.isActive = isActive;

    await settings.save();

    return res.status(200).json({
      message: "Delivery charges updated successfully",
      settings,
    });
  } catch (error) {
    console.error("Update delivery charges error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete all delivery charges settings
export const deleteDeliveryCharges = async (req, res) => {
  try {
    const result = await DeliveryCharges.deleteOne({});

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "No delivery charges found to delete",
      });
    }

    return res.status(200).json({
      message: "Delivery charges deleted successfully",
    });
  } catch (error) {
    console.error("Delete delivery charges error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
