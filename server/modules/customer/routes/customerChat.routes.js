import express from "express";
import { protect } from "../../../shared/middleware/auth.js";
import {
  getCooksForChat,
  getCustomerChats,
  getOrCreateChat,
  sendMessage,
  getChatMessages,
  getUnreadCount
} from "../controllers/customerChat.controller.js";

const router = express.Router();

// All routes require customer authentication
router.use(protect);

// Get all cooks available for chat
router.get("/cooks", getCooksForChat);

// Get all customer's chats
router.get("/", getCustomerChats);

// Get unread message count
router.get("/unread", getUnreadCount);

// Get or create chat with a cook
router.get("/cook/:cookId", getOrCreateChat);

// Get messages for a specific chat
router.get("/cook/:cookId/messages", getChatMessages);

// Send message to a cook
router.post("/cook/:cookId/message", sendMessage);

export default router;
