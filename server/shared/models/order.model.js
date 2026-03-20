import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  mealId: { type: mongoose.Schema.Types.ObjectId, ref: "Meal", required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  itemImage: { type: String },
}, { _id: false });

const deliveryAddressSchema = new mongoose.Schema({
  label: { type: String },
  houseNo: { type: String },
  street: { type: String, required: true },
  city: { type: String, required: true },
  postalCode: { type: String },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
}, { _id: false });

const orderSchema = new mongoose.Schema(
  {
    // Auto-generated order number for display
    orderNumber: { type: String, unique: true },

    // References
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    cookId: { type: mongoose.Schema.Types.ObjectId, ref: "Cook", required: true },

    // Order Items
    items: { type: [orderItemSchema], required: true },

    // Pricing
    subtotal: { type: Number, required: true },
    deliveryCharges: { type: Number, required: true },
    totalAmount: { type: Number, required: true },

    // Delivery Info
    deliveryAddress: { type: deliveryAddressSchema, required: true },
    distance: { type: Number, required: true }, // in km
    estimatedTime: { type: Number }, // in minutes
    deliveryNote: { type: String }, // cook's note

    // Payment
    paymentMethod: {
      type: String,
      enum: ["cod"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "verification_pending", "verified", "rejected", "paid"],
      default: "unpaid",
    },
    paymentProof: { type: String }, // Cloudinary URL
    paymentRejectionReason: { type: String },
    paymentRejectionCount: { type: Number, default: 0 },

    // Order Status
    status: {
      type: String,
      enum: [
        "confirmed",
        "preparing",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      default: "confirmed",
    },
    rejectionReason: { type: String }, // cook rejection reason
    cancellationReason: { type: String },
    cancelledBy: {
      type: String,
      enum: ["customer", "cook", "system", "admin"],
    },

    // Cancellation Request (customer requests, cook decides)
    cancellationRequest: {
      status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
      },
      reason: { type: String },
      requestedAt: { type: Date },
      respondedAt: { type: Date },
      cookResponse: { type: String }, // cook's response message
    },

    // Timestamps for status changes
    paymentDeadline: { type: Date }, // 10 min after confirmation for online payment
    confirmedAt: { type: Date },
    preparingAt: { type: Date },
    outForDeliveryAt: { type: Date },
    estimatedDeliveryAt: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

// Pre-save hook to generate order number
orderSchema.pre("save", async function (next) {
  if (this.isNew && !this.orderNumber) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

    // Count orders created today
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const count = await mongoose.model("Order").countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    this.orderNumber = `ORD-${dateStr}-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

// Index for efficient queries
orderSchema.index({ customerId: 1, status: 1 });
orderSchema.index({ cookId: 1, status: 1 });

export const Order = mongoose.model("Order", orderSchema);
