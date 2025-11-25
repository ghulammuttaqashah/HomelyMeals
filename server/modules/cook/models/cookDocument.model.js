import mongoose from "mongoose";

const cookDocumentSchema = new mongoose.Schema(
  {
    cookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cook",
      required: true,
    },

    /** REQUIRED DOCUMENTS */
    cnicFront: {
      url: { type: String, default: null },
      status: {
        type: String,
        enum: ["not_submitted", "submitted", "approved", "rejected"],
        default: "not_submitted",
      },
      uploadedAt: { type: Date, default: null },
      rejectedReason: { type: String, default: null },
    },

    cnicBack: {
      url: { type: String, default: null },
      status: {
        type: String,
        enum: ["not_submitted", "submitted", "approved", "rejected"],
        default: "not_submitted",
      },
      uploadedAt: { type: Date, default: null },
      rejectedReason: { type: String, default: null },
    },

    /** KITCHEN PHOTOS (MULTIPLE) */
    kitchenPhotos: [
      {
        url: String,
        status: {
          type: String,
          enum: ["not_submitted", "submitted", "approved", "rejected"],
          default: "not_submitted",
        },
        uploadedAt: { type: Date, default: null },
        rejectedReason: { type: String, default: null },
      },
    ],

    /** OPTIONAL DOCUMENTS */
    sfaLicense: {
      url: { type: String, default: null },
      status: {
        type: String,
        enum: ["not_submitted", "submitted", "approved", "rejected"],
        default: "not_submitted",
      },
      uploadedAt: { type: Date, default: null },
      rejectedReason: { type: String, default: null },
    },

    other: {
      url: { type: String, default: null },
      status: {
        type: String,
        enum: ["not_submitted", "submitted", "approved", "rejected"],
        default: "not_submitted",
      },
      uploadedAt: { type: Date, default: null },
      rejectedReason: { type: String, default: null },
    },

    /** ADMIN VERIFICATION */
    verifiedByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const CookDocument = mongoose.model("CookDocument", cookDocumentSchema);
