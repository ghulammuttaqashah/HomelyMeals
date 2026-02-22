import express from "express";
import { protect } from "../../../shared/middleware/auth.js";
import {
  getCookChats,
  getChatMessages,
  sendMessage,
  getUnreadCount
} from "../controllers/cookChat.controller.js";

const router = express.Router();

// All routes require cook authentication
router.use(protect);

// Get all cook's chats
router.get("/", getCookChats);

// Get unread message count
router.get("/unread", getUnreadCount);

// Get messages for a specific chat
router.get("/customer/:customerId/messages", getChatMessages);

// Send message to a customer
router.post("/customer/:customerId/message", sendMessage);

export default router;
