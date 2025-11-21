import express from "express";
const router = express.Router();

// Test route to verify backend connection
router.get("/test", (req, res) => {
  res.json({ message: "API is working!" });
});

export default router;
