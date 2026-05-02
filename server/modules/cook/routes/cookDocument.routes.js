import express from "express";
import { submitDocuments, getDocumentStatus, resubmitDocuments } from "../controllers/cookDocument.controller.js";


const router = express.Router();

// Submit cook documents (CNIC, kitchen photos, license, etc.)
router.post("/submit", submitDocuments);

// Get document status (to check which documents are rejected)
router.get("/status", getDocumentStatus);

// Resubmit rejected documents only
router.put("/resubmit", resubmitDocuments);

export default router;