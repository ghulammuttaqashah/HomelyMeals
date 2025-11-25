import express from "express";
import { 
  getCooksWithSubmittedDocs,
  approveDocument,
  rejectDocument,
  approveAllDocuments,
  getCookDocumentsById
} from "../controllers/cookDocuments.controller.js";

const router = express.Router();

// Get all cooks who submitted documents
router.get("/submitted", getCooksWithSubmittedDocs);

// Get documents of specific cook
router.get("/:cookId", getCookDocumentsById);

// Approve single document
router.patch("/:cookId/approve", approveDocument);

// Reject single document
router.patch("/:cookId/reject", rejectDocument);

// Approve all
router.patch("/:cookId/approve-all", approveAllDocuments);

export default router;
