import mongoose from "mongoose";

const cookSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: { type: String, required: true, unique: true },

    contact: { type: String, required: true },

    password: { type: String, required: true },

    address: {
      houseNo: { type: String },
      street: { type: String, required: true },
      city: { type: String, default: "Sukkur" },
      postalCode: { type: String, default: "65200" },
      /** Location coordinates */
      location: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
    },

    /** Document verification flow */
    verificationStatus: {
      type: String,
      enum: ["not_started", "pending", "approved", "rejected"],
      default: "not_started",
    },

    /** Cook can serve customers or not */
    serviceStatus: {
      type: String,
      enum: ["open", "closed"],
      default: "open", // ✔ requested change
    },

    registrationDate: { type: Date, default: Date.now },

    /** Account status */
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },

    statusReason: { type: String, default: "" },

    /** Maximum delivery distance in kilometers */
    maxDeliveryDistance: {
      type: Number,
      default: 5, // Default 5 km
      min: 1,
      max: 50,
    },

    /** Warning count from admin */
    warningsCount: { type: Number, default: 0 },

  },
  { timestamps: true }
);

export const Cook = mongoose.model("Cook", cookSchema);
