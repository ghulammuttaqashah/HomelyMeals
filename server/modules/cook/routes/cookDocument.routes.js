import express from "express";
import { submitDocuments } from "../controllers/cookDocument.controller.js";


const router = express.Router();

// Submit cook documents (CNIC, kitchen photos, license, etc.)
router.post("/submit", submitDocuments);

export default router;