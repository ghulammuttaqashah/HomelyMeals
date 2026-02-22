import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: { 
      type: mongoose.Schema.Types.ObjectId, 
      required: true,
      refPath: "senderType"
    },
    senderType: { 
      type: String, 
      enum: ["Customer", "Cook"], 
      required: true 
    },
    content: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 1000
    },
    read: { 
      type: Boolean, 
      default: false 
    },
    readAt: { 
      type: Date 
    }
  },
  { timestamps: true }
);

const chatSchema = new mongoose.Schema(
  {
    customerId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Customer", 
      required: true 
    },
    cookId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Cook", 
      required: true 
    },
    messages: [messageSchema],
    lastMessage: {
      content: { type: String },
      senderId: { type: mongoose.Schema.Types.ObjectId },
      senderType: { type: String, enum: ["Customer", "Cook"] },
      createdAt: { type: Date }
    },
    // Track unread counts for each party
    customerUnread: { type: Number, default: 0 },
    cookUnread: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Compound index for unique chat between customer and cook
chatSchema.index({ customerId: 1, cookId: 1 }, { unique: true });

// Index for efficient queries
chatSchema.index({ "lastMessage.createdAt": -1 });

export const Chat = mongoose.model("Chat", chatSchema);
