import mongoose from "mongoose";

const deliveryChargesSchema = new mongoose.Schema(
  {
    pricePerKm: {
      type: Number,
      required: true,
      min: 0,
    },
    minimumCharge: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    maxDeliveryDistance: {
      type: Number,
      default: null, // null means no limit
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one delivery charges document exists (singleton pattern)
deliveryChargesSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  return settings;
};

const DeliveryCharges = mongoose.model("DeliveryCharges", deliveryChargesSchema);

export default DeliveryCharges;
