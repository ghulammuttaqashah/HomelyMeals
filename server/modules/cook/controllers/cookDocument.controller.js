import { CookDocument } from "../models/cookDocument.model.js";
import { Cook } from "../models/cook.model.js";

/**
 * Submit Cook Documents
 * Protected route
 */
export const submitDocuments = async (req, res) => {
  const cookId = req.user._id; // from protect middleware
  const { cnicFront, cnicBack, kitchenPhotos, sfaLicense, other } = req.body;

  try {
    // 0️⃣ Verify cook exists
    const cook = await Cook.findById(cookId);
    if (!cook) {
      return res.status(404).json({ message: "Cook not found" });
    }

    // 1️⃣ Validate required documents
    if (!cnicFront || !cnicBack) {
      return res.status(400).json({
        message: "Both CNIC front and back are required.",
      });
    }

    if (!Array.isArray(kitchenPhotos) || kitchenPhotos.length === 0) {
      return res.status(400).json({
        message: "At least one kitchen photo is required.",
      });
    }

    // Find or create CookDocument entry for this cook
    let cookDoc = await CookDocument.findOne({ cookId });
    if (!cookDoc) {
      cookDoc = new CookDocument({ cookId });
    }

    const currentTime = new Date();

    // CNIC Front
    cookDoc.cnicFront.url = cnicFront;
    cookDoc.cnicFront.status = "submitted";
    cookDoc.cnicFront.uploadedAt = currentTime;

    // CNIC Back
    cookDoc.cnicBack.url = cnicBack;
    cookDoc.cnicBack.status = "submitted";
    cookDoc.cnicBack.uploadedAt = currentTime;

    // Kitchen Photos → replace completely
    cookDoc.kitchenPhotos = kitchenPhotos.map((url) => ({
      url,
      status: "submitted",
      uploadedAt: currentTime,
    }));

    // SFA License (optional)
    if (sfaLicense) {
      cookDoc.sfaLicense.url = sfaLicense;
      cookDoc.sfaLicense.status = "submitted";
      cookDoc.sfaLicense.uploadedAt = currentTime;
    }

    // Other (optional)
    if (other) {
      cookDoc.other.url = other;
      cookDoc.other.status = "submitted";
      cookDoc.other.uploadedAt = currentTime;
    }

    // Save CookDocument
    await cookDoc.save();

    // Update cook verificationStatus to pending if not started
    if (cook.verificationStatus === "not_started" || cook.verificationStatus === "not_submitted") {
      cook.verificationStatus = "pending";
      await cook.save();
    }

    return res.status(201).json({
      message: "Documents submitted successfully.",
      cookVerificationStatus: cook.verificationStatus,
      cookDocuments: cookDoc,
    });
  } catch (err) {
    console.error("Submit Cook Documents Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
