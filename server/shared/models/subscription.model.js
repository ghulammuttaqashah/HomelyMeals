import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    cook_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cook",
      required: true,
    },
    plan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    start_date: { type: Date },
    end_date: { type: Date },
    status: {
      type: String,
      enum: ["active", "expired", "pending"],
      default: "pending",
    },
    stripe_payment_intent_id: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

subscriptionSchema.index({ cook_id: 1, status: 1, createdAt: -1 });
subscriptionSchema.index({ plan_id: 1, status: 1 });

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
