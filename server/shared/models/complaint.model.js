import mongoose from "mongoose";

// Complaint types per role
export const CUSTOMER_COMPLAINT_TYPES = [
  "Order Not Delivered",
  "Wrong Food Delivered",
  "Food Quality Issue",
  "Payment Issue",
];

export const COOK_COMPLAINT_TYPES = [
  "Customer Didn't Receive Order Even Though I Delivered",
  "Other",
];

const proofSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    complainantType: {
      type: String,
      enum: ["customer", "cook"],
      required: true,
    },
    complainantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "complainantTypeRef",
    },
    complainantTypeRef: {
      type: String,
      enum: ["Customer", "Cook"],
    },
    againstUserId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    type: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    proofUrls: {
      type: [proofSchema],
      default: [],
      validate: {
        validator: (v) => v.length <= 5,
        message: "Maximum 5 proof images allowed",
      },
    },
    // Open response thread between complainant and accused
    responses: [
      {
        senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
        senderRole: { type: String, enum: ["customer", "cook"], required: true },
        senderName: { type: String, default: "" },
        text: { type: String, required: true, trim: true, maxlength: 1000 },
        proofUrls: {
          type: [proofSchema],
          default: [],
          validate: {
            validator: (v) => v.length <= 5,
            message: "Maximum 5 proof images per response",
          },
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "in_progress", "resolved", "rejected"],
      default: "pending",
    },
    adminResponse: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

// One complaint per user per order
complaintSchema.index({ complainantId: 1, orderId: 1 }, { unique: true });

// Efficient queries
complaintSchema.index({ status: 1 });
complaintSchema.index({ orderId: 1 });

// Pre-save: set complainantTypeRef for populate
complaintSchema.pre("save", function (next) {
  if (this.complainantType === "customer") {
    this.complainantTypeRef = "Customer";
  } else {
    this.complainantTypeRef = "Cook";
  }
  next();
});

export const Complaint = mongoose.model("Complaint", complaintSchema);
