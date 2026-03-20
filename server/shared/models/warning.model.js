import mongoose from "mongoose";

const warningSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  userType: {
    type: String,
    enum: ["customer", "cook"],
    required: true,
  },
  complaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Complaint",
    required: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for fetching warning history
warningSchema.index({ userId: 1, createdAt: -1 });

export const Warning = mongoose.model("Warning", warningSchema);
