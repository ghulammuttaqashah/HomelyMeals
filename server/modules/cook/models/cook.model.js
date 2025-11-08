// modules/cook/models/cook.model.js
import mongoose from "mongoose";

const cookSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  contact: { type: String, required: true },
  password: { type: String, required: true },
  documentsVerified: { type: Boolean, default: false },
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: [] } // [longitude, latitude]
  },
  serviceStatus: { type: String, enum: ["Resume", "Paused"], default: "Resume" },
  registrationDate: { type: Date, default: Date.now },
  status: { type: String, enum: ["active", "suspended"], default: "active" },
  statusReason: { type: String, default: "" }
}, { timestamps: true });

// Optional geospatial index
cookSchema.index({ location: "2dsphere" });

export const Cook = mongoose.model("Cook", cookSchema);