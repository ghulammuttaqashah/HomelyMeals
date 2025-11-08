import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  contact: { type: String, required: true },
  password: { type: String, required: true },
  address: {
    houseNo: { type: String, required: false },
    street: { type: String, required: [true,"street information is required."] },
    city: { type: String, default: "Sukkur" },
    postalCode: { type: String, default: "65200"}
  },
  registrationDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["active", "suspended"],
    default: "active"
  },
  statusReason: { type: String, default: "" }
}, { timestamps: true });

export const Customer = mongoose.model("Customer", customerSchema);
