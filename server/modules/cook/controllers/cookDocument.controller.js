import { CookDocument } from "../models/cookDocument.model.js";
import { Cook } from "../models/cook.model.js";

/**
 * Submit Cook Documents
 * Protected route
 */
export const submitDocuments = async (req, res) => {
  const cookId = req.user._id; // from protect middleware
  const { cnicFront, cnicBack, kitchenPhotos, sfaLicense, other, profilePicture } = req.body;

  try {
    // 0️⃣ Verify cook exists
    const cook = await Cook.findById(cookId);
    if (!cook) {
      return res.status(404).json({ message: "Cook not found" });
    }

    // 1️⃣ Validate required documents
    if (!cnicFront || !cnicBack || !profilePicture) {
      return res.status(400).json({
        message: "CNIC front, back, and profile picture are required.",
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

    // Profile Picture
    cookDoc.profilePicture.url = profilePicture;
    cookDoc.profilePicture.status = "submitted";
    cookDoc.profilePicture.uploadedAt = currentTime;

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

    // Also update profilePicture in Cook model (initial upload)
    cook.profilePicture = profilePicture;
    await cook.save();

    // Update cook verificationStatus to pending if not started
    if (cook.verificationStatus === "not_started") {
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

/**
 * Get Cook's Document Status
 * Protected route - Cook can see their own document status
 */
export const getDocumentStatus = async (req, res) => {
  try {
    const cookId = req.user._id;

    const cookDoc = await CookDocument.findOne({ cookId });
    if (!cookDoc) {
      return res.status(404).json({ message: "No documents found" });
    }

    return res.status(200).json({
      message: "Document status retrieved successfully",
      documents: {
        cnicFront: cookDoc.cnicFront,
        cnicBack: cookDoc.cnicBack,
        profilePicture: cookDoc.profilePicture,
        kitchenPhotos: cookDoc.kitchenPhotos,
        sfaLicense: cookDoc.sfaLicense,
        other: cookDoc.other,
      },
    });
  } catch (err) {
    console.error("Get Document Status Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Resubmit Rejected Documents
 * Protected route - Cook can only update rejected documents
 */
export const resubmitDocuments = async (req, res) => {
  try {
    const cookId = req.user._id;
    const updates = req.body; // { cnicFront, cnicBack, profilePicture, kitchenPhotos, etc. }

    const cookDoc = await CookDocument.findOne({ cookId });
    if (!cookDoc) {
      return res.status(404).json({ message: "Documents not found" });
    }

    const cook = await Cook.findById(cookId);
    if (!cook) {
      return res.status(404).json({ message: "Cook not found" });
    }

    const currentTime = new Date();
    let hasUpdates = false;

    // Only allow updating rejected documents
    const fields = ["cnicFront", "cnicBack", "profilePicture", "sfaLicense", "other"];

    fields.forEach((field) => {
      if (updates[field] && cookDoc[field] && cookDoc[field].status === "rejected") {
        cookDoc[field].url = updates[field];
        cookDoc[field].status = "submitted";
        cookDoc[field].uploadedAt = currentTime;
        cookDoc[field].rejectedReason = null;
        hasUpdates = true;

        // Update profile picture in Cook model if it was rejected and resubmitted
        if (field === "profilePicture") {
          cook.profilePicture = updates[field];
        }
      }
    });

    // Handle kitchen photos (array) - replace rejected ones
    if (updates.kitchenPhotos && Array.isArray(updates.kitchenPhotos) && updates.kitchenPhotos.length > 0) {
      // Find rejected kitchen photos
      const rejectedIndices = [];
      cookDoc.kitchenPhotos.forEach((photo, index) => {
        if (photo.status === "rejected") {
          rejectedIndices.push(index);
        }
      });

      // Replace rejected photos with new ones
      updates.kitchenPhotos.forEach((newUrl, idx) => {
        if (rejectedIndices[idx] !== undefined) {
          cookDoc.kitchenPhotos[rejectedIndices[idx]] = {
            url: newUrl,
            status: "submitted",
            uploadedAt: currentTime,
            rejectedReason: null,
          };
          hasUpdates = true;
        }
      });
    }

    if (!hasUpdates) {
      return res.status(400).json({ 
        message: "No rejected documents to update. Only rejected documents can be resubmitted." 
      });
    }

    await cookDoc.save();
    await cook.save();

    // Update cook verification status back to pending
    if (cook.verificationStatus === "rejected") {
      cook.verificationStatus = "pending";
      await cook.save();
    }

    return res.status(200).json({
      message: "Documents resubmitted successfully. Waiting for admin review.",
      cookVerificationStatus: cook.verificationStatus,
      documents: {
        cnicFront: cookDoc.cnicFront,
        cnicBack: cookDoc.cnicBack,
        profilePicture: cookDoc.profilePicture,
        kitchenPhotos: cookDoc.kitchenPhotos,
        sfaLicense: cookDoc.sfaLicense,
        other: cookDoc.other,
      },
    });
  } catch (err) {
    console.error("Resubmit documents error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
