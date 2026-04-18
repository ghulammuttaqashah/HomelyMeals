import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  label: { type: String, default: "Home" }, // Home, Work, Other
  houseNo: { type: String, default: "" }, // Optional in DB, validated in frontend
  street: { type: String, required: [true, "Street information is required."] },
  city: { type: String, default: "Sukkur" },
  postalCode: { type: String, default: "65200" },
  landmark: { type: String, default: "" }, // Optional landmark/nearby place
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  contact: { type: String, required: true },
  password: { type: String, required: true },
  addresses: { type: [addressSchema], default: [] },
  registrationDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["active", "suspended"],
    default: "active"
  },
  statusReason: { type: String, default: "" },
  warningsCount: { type: Number, default: 0 },
}, { timestamps: true });

export const Customer = mongoose.model("Customer", customerSchema);
