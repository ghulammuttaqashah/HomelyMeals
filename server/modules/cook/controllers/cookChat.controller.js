import mongoose from "mongoose";
import { Chat } from "../../../shared/models/chat.model.js";
import { Customer } from "../../customer/models/customer.model.js";
import { emitToCustomer } from "../../../shared/utils/socket.js";
import { sendPushNotification } from "../../../shared/utils/push.js";

/**
 * Get all chats for the cook (only chats where customer has messaged)
 */
export const getCookChats = async (req, res) => {
  try {
    const cookId = req.user._id;

    const chats = await Chat.find({
      cookId,
      "messages.0": { $exists: true }
    })
      .populate("customerId", "name email")
      .sort({ "lastMessage.createdAt": -1 });

    // Filter out chats where customer was deleted
    const validChats = chats.filter(chat => chat.customerId);

    res.json({
      success: true,
      chats: validChats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get chats"
    });
  }
};

/**
 * Get messages for a specific chat with a customer
 */
export const getChatMessages = async (req, res) => {
  try {
    const cookId = req.user._id;
    const { customerId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const chat = await Chat.findOne({ customerId, cookId })
      .populate("customerId", "name email");

    // No chat exists yet — return empty messages (not an error)
    if (!chat) {
      return res.json({
        success: true,
        messages: [],
        chat: null,
        pagination: {
          currentPage: 1,
          hasMore: false
        }
      });
    }

    // Mark customer's messages as read
    let updated = false;
    chat.messages.forEach(msg => {
      if (msg.senderType === "Customer" && !msg.read) {
        msg.read = true;
        msg.readAt = new Date();
        updated = true;
      }
    });

    if (updated) {
      chat.cookUnread = 0;
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
        customerId: chat.customerId,
        cookUnread: chat.cookUnread
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
 * Send a message to a customer
 */
export const sendMessage = async (req, res) => {
  try {
    const cookId = req.user._id;
    const { customerId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message content is required"
      });
    }

    // Verify the customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    // Find existing chat or create a new one
    let chat = await Chat.findOne({ customerId, cookId });

    if (!chat) {
      chat = new Chat({
        customerId,
        cookId,
        messages: [],
        cookUnread: 0,
        customerUnread: 0
      });
    }

    const message = {
      senderId: cookId,
      senderType: "Cook",
      content: content.trim(),
      read: false
    };

    chat.messages.push(message);
    chat.lastMessage = {
      content: content.trim(),
      senderId: cookId,
      senderType: "Cook",
      createdAt: new Date()
    };
    chat.customerUnread += 1;

    await chat.save();

    // Get the newly added message
    const newMessage = chat.messages[chat.messages.length - 1];

    // Emit real-time event to customer
    emitToCustomer(customerId.toString(), "new_message", {
      chatId: chat._id,
      message: newMessage,
      cookId: cookId.toString(),
      customerUnread: chat.customerUnread
    });

    // Notify Customer via Push 
    if (customer && customer.pushSubscription) {
      // Find the cook to get their name for the notification
      const currentCook = await import("../../cook/models/cook.model.js").then(m => m.Cook.findById(cookId));
      const cookName = currentCook ? currentCook.name : "Your Cook";
      
      await sendPushNotification(customer.pushSubscription, {
        title: `New Message from ${cookName}`,
        body: content.trim(),
        url: `/chats/${cookId.toString()}`,
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
 * Get unread message count for cook
 */
export const getUnreadCount = async (req, res) => {
  try {
    const cookId = req.user._id;

    const result = await Chat.aggregate([
      { $match: { cookId: new mongoose.Types.ObjectId(cookId) } },
      { $group: { _id: null, total: { $sum: "$cookUnread" } } }
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
