import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 1 },
    duration: { type: Number, required: true, min: 1 }, // days
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

planSchema.index({ name: 1 }, { unique: true });
planSchema.index({ status: 1, createdAt: -1 });

export const Plan = mongoose.model("Plan", planSchema);
