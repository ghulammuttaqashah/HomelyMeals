import mongoose from "mongoose";

const cookSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  contact: { type: String, required: true },
  password: { type: String, required: true },
  address: {
    houseNo: { type: String, required: false },
    street: { type: String, required: [true, "Street information is required."] },
    city: { type: String, default: "Sukkur" },
    postalCode: { type: String, default: "65200" }
  },
  documentVerified: { type: Boolean, default: false },
  serviceStatus: { type: String, enum: ["open", "closed"], default: "closed" },
  registrationDate: { type: Date, default: Date.now },
  status: { type: String, enum: ["active", "suspended"], default: "active" },
  statusReason: { type: String, default: "" }
}, { timestamps: true });

export const Cook = mongoose.model("Cook", cookSchema);
