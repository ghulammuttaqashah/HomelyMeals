import mongoose from "mongoose";
import { Chat } from "../../../shared/models/chat.model.js";
import { Cook } from "../../cook/models/cook.model.js";
import { Customer } from "../models/customer.model.js";
import { emitToCook } from "../../../shared/utils/socket.js";
import { sendPushNotification } from "../../../shared/utils/push.js";

/**
 * Get all cooks the customer can chat with (all approved/active cooks)
 */
export const getCooksForChat = async (req, res) => {
  try {
    const cooks = await Cook.find({
      verificationStatus: "approved",
      status: "active"
    })
      .select("name email address.city")
      .sort({ name: 1 });

    res.json({
      success: true,
      cooks
    });
  } catch (error) {
    console.error("Get cooks for chat error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get cooks"
    });
  }
};

/**
 * Get all chats for the customer
 */
export const getCustomerChats = async (req, res) => {
  try {
    const customerId = req.user._id;

    const chats = await Chat.find({ customerId })
      .populate("cookId", "name email")
      .sort({ "lastMessage.createdAt": -1 });

    res.json({
      success: true,
      chats
    });
  } catch (error) {
    console.error("Get customer chats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get chats"
    });
  }
};

/**
 * Get or create a chat with a cook
 */
export const getOrCreateChat = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { cookId } = req.params;

    // Verify the authenticated user is an actual customer
    const customerExists = await Customer.findById(customerId);
    if (!customerExists) {
      return res.status(403).json({
        success: false,
        message: "Invalid customer account"
      });
    }

    // Verify cook exists and is active
    const cook = await Cook.findOne({
      _id: cookId,
      verificationStatus: "approved",
      status: "active"
    });

    if (!cook) {
      return res.status(404).json({
        success: false,
        message: "Cook not found or not available"
      });
    }

    // Find or create chat
    let chat = await Chat.findOne({ customerId, cookId });

    if (!chat) {
      chat = await Chat.create({
        customerId,
        cookId,
        messages: []
      });
    }

    // Populate cook details
    await chat.populate("cookId", "name email");

    res.json({
      success: true,
      chat
    });
  } catch (error) {
    console.error("Get or create chat error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get chat"
    });
  }
};

/**
 * Send a message to a cook
 */
export const sendMessage = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { cookId } = req.params;
    const { content } = req.body;

    // Verify the authenticated user is an actual customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(403).json({
        success: false,
        message: "Invalid customer account"
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message content is required"
      });
    }

    // Ensure customer is not messaging themselves (cookId must differ from customerId)
    if (customerId.toString() === cookId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Cannot send message to yourself"
      });
    }

    // Find or create chat
    let chat = await Chat.findOne({ customerId, cookId });

    if (!chat) {
      // Verify cook exists
      const cook = await Cook.findOne({
        _id: cookId,
        verificationStatus: "approved",
        status: "active"
      });

      if (!cook) {
        return res.status(404).json({
          success: false,
          message: "Cook not found or not available"
        });
      }

      chat = await Chat.create({
        customerId,
        cookId,
        messages: []
      });
    }

    const message = {
      senderId: customerId,
      senderType: "Customer",
      content: content.trim(),
      read: false
    };

    chat.messages.push(message);
    chat.lastMessage = {
      content: content.trim(),
      senderId: customerId,
      senderType: "Customer",
      createdAt: new Date()
    };
    chat.cookUnread += 1;

    await chat.save();

    // Get the newly added message
    const newMessage = chat.messages[chat.messages.length - 1];

    // Emit real-time event to cook
    emitToCook(cookId.toString(), "new_message", {
      chatId: chat._id,
      message: newMessage,
      customerId: customerId.toString(),
      cookUnread: chat.cookUnread
    });

    const cookForPush = await Cook.findById(cookId);
    if (cookForPush && cookForPush.pushSubscription) {
      await sendPushNotification(cookForPush.pushSubscription, {
        title: `New Message from ${customer.name}`,
        body: content.trim(),
        url: `/chats/${customerId.toString()}`,
      });
    }

    res.json({
      success: true,
      message: newMessage
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message"
    });
  }
};

/**
 * Get messages for a specific chat
 */
export const getChatMessages = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { cookId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const chat = await Chat.findOne({ customerId, cookId })
      .populate("cookId", "name email");

    if (!chat) {
      return res.json({
        success: true,
        messages: [],
        chat: null
      });
    }

    // Mark cook's messages as read
    let updated = false;
    chat.messages.forEach(msg => {
      if (msg.senderType === "Cook" && !msg.read) {
        msg.read = true;
        msg.readAt = new Date();
        updated = true;
      }
    });

    if (updated) {
      chat.customerUnread = 0;
      await chat.save();
    }

    // Paginate messages (most recent first)
    const startIndex = Math.max(0, chat.messages.length - page * limit);
    const endIndex = chat.messages.length - (page - 1) * limit;
    const messages = chat.messages.slice(startIndex, endIndex);

    res.json({
      success: true,
      messages,
      chat: {
        _id: chat._id,
        cookId: chat.cookId,
        customerUnread: chat.customerUnread
      },
      pagination: {
        currentPage: parseInt(page),
        hasMore: startIndex > 0
      }
    });
  } catch (error) {
    console.error("Get chat messages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get messages"
    });
  }
};

/**
 * Get unread message count for customer
 */
export const getUnreadCount = async (req, res) => {
  try {
    const customerId = req.user._id;

    const result = await Chat.aggregate([
      { $match: { customerId: new mongoose.Types.ObjectId(customerId) } },
      { $group: { _id: null, total: { $sum: "$customerUnread" } } }
    ]);

    const unreadCount = result[0]?.total || 0;

    res.json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get unread count"
    });
  }
};
