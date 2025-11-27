
import { CookDocument } from "../../cook/models/cookDocument.model.js";
import { Cook } from "../../cook/models/cook.model.js";
import { sendEmail } from "../../../shared/utils/sendEmail.js";

/**
 * GET ALL COOKS WHO SUBMITTED DOCUMENTS (Admin)
 */
export const getCooksWithSubmittedDocs = async (req, res) => {
  try {
    const docs = await CookDocument.find({
      $or: [
        { "cnicFront.status": "submitted" },
        { "cnicBack.status": "submitted" },
        { "kitchenPhotos.status": "submitted" },
        { "sfaLicense.status": "submitted" },
        { "other.status": "submitted" }
      ]
    })
      .populate("cookId", "name email contact address verificationStatus");

    const result = docs
      .filter((doc) => {
        // Filter out documents where cook was deleted
        if (!doc.cookId) return false;
        
        // Filter out cooks whose verification status is already rejected or approved
        // Only show cooks with pending status
        return doc.cookId.verificationStatus === "pending";
      })
      .map((doc) => ({
        cook: {
          id: doc.cookId._id,
          name: doc.cookId.name,
          email: doc.cookId.email,
          contact: doc.cookId.contact,
          address: doc.cookId.address,
          verificationStatus: doc.cookId.verificationStatus,
        },
        documents: {
          cnicFront: doc.cnicFront,
          cnicBack: doc.cnicBack,
          kitchenPhotos: doc.kitchenPhotos,
          sfaLicense: doc.sfaLicense,
          other: doc.other,
          verifiedByAdmin: doc.verifiedByAdmin,
          verifiedAt: doc.verifiedAt,
        }
      }));

    return res.status(200).json({
      message: "Cooks with submitted documents retrieved successfully.",
      cooks: result,
    });

  } catch (err) {
    console.error("Get Submitted Docs Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


export const getCookDocumentsById = async (req, res) => {
  try {
    const { cookId } = req.params;

    const doc = await CookDocument.findOne({ cookId })
      .populate("cookId", "name email contact address verificationStatus");

    if (!doc) {
      return res.status(404).json({ message: "Documents not found for this cook" });
    }

    if (!doc.cookId) {
      return res.status(404).json({ message: "Cook not found (may have been deleted)" });
    }

    const result = {
      cook: {
        id: doc.cookId._id,
        name: doc.cookId.name,
        email: doc.cookId.email,
        contact: doc.cookId.contact,
        address: doc.cookId.address,
        verificationStatus: doc.cookId.verificationStatus,
      },
      documents: {
        cnicFront: doc.cnicFront,
        cnicBack: doc.cnicBack,
        kitchenPhotos: doc.kitchenPhotos,
        sfaLicense: doc.sfaLicense,
        other: doc.other,
        verifiedByAdmin: doc.verifiedByAdmin,
        verifiedAt: doc.verifiedAt,
      },
    };

    return res.status(200).json({
      message: "Cook documents retrieved successfully.",
      cookDocument: result,
    });

  } catch (err) {
    console.error("Get Cook Documents Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const approveDocument = async (req, res) => {
  try {
    const { cookId } = req.params;
    const { field, index } = req.body;

    if (!field) {
      return res.status(400).json({ message: "Field is required" });
    }

    const doc = await CookDocument.findOne({ cookId });
    if (!doc) return res.status(404).json({ message: "Documents not found for this cook" });

    const target = doc[field];
    if (!target) {
      return res.status(400).json({ message: "Invalid field name" });
    }

    if (Array.isArray(target)) {
      if (index === undefined || index < 0 || index >= target.length) {
        return res.status(400).json({ message: "Invalid or missing index" });
      }

      if (target[index].status === "approved") {
        return res.status(400).json({ message: "Document already approved" });
      }

      target[index].status = "approved";
      target[index].rejectedReason = null; // Clear rejection reason
    } else {
      if (target.status === "approved") {
        return res.status(400).json({ message: "Document already approved" });
      }

      target.status = "approved";
      target.rejectedReason = null; // Clear rejection reason
    }

    // 🔥 FIX: Save admin info
    doc.verifiedByAdmin = req.user._id;
    doc.verifiedAt = new Date();

    await doc.save();

    await updateCookVerificationStatus(cookId);

    return res.status(200).json({
      message: "Document approved successfully",
      document: doc,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


export const rejectDocument = async (req, res) => {
  try {
    const { cookId } = req.params;
    const { field, index, reason } = req.body;

    if (!field) {
      return res.status(400).json({ message: "Field is required" });
    }

    const doc = await CookDocument.findOne({ cookId });
    if (!doc) return res.status(404).json({ message: "Documents not found for this cook" });

    const target = doc[field];
    if (!target) {
      return res.status(400).json({ message: "Invalid field name" });
    }

    if (Array.isArray(target)) {
      if (index === undefined || index < 0 || index >= target.length) {
        return res.status(400).json({ message: "Invalid or missing index" });
      }

      target[index].status = "rejected";
      target[index].rejectedReason = reason || "Not provided";
    } else {
      target.status = "rejected";
      target.rejectedReason = reason || "Not provided";
    }

    // 🔥 FIX: Save admin info
    doc.verifiedByAdmin = req.user._id;
    doc.verifiedAt = new Date();

    await doc.save();

    // Update cook verification status based on document statuses
    await updateCookVerificationStatus(cookId);

    return res.status(200).json({
      message: "Document rejected successfully",
      document: doc,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const approveAllDocuments = async (req, res) => {
  try {
    const { cookId } = req.params;

    const doc = await CookDocument.findOne({ cookId });
    if (!doc) return res.status(404).json({ message: "Documents not found" });

    // Validate that required documents are submitted
    if (!doc.cnicFront || doc.cnicFront.status === "not_submitted") {
      return res.status(400).json({ 
        message: "Cannot approve: CNIC Front is not submitted" 
      });
    }

    if (!doc.cnicBack || doc.cnicBack.status === "not_submitted") {
      return res.status(400).json({ 
        message: "Cannot approve: CNIC Back is not submitted" 
      });
    }

    if (!doc.kitchenPhotos || doc.kitchenPhotos.length === 0 || 
        doc.kitchenPhotos.every(p => p.status === "not_submitted")) {
      return res.status(400).json({ 
        message: "Cannot approve: At least one kitchen photo must be submitted" 
      });
    }

    const fields = [
      "cnicFront",
      "cnicBack",
      "sfaLicense",
      "other",
      "kitchenPhotos",
    ];

    fields.forEach((field) => {
      const target = doc[field];

      if (Array.isArray(target)) {
        target.forEach((item) => {
          if (item.status !== "not_submitted") {
            item.status = "approved";
            item.rejectedReason = null; // Clear any previous rejection reason
          }
        });
      } else {
        if (target && target.status !== "not_submitted") {
          target.status = "approved";
          target.rejectedReason = null; // Clear any previous rejection reason
        }
      }
    });

    doc.verifiedByAdmin = req.user._id;
    doc.verifiedAt = new Date();

    await doc.save();
    await updateCookVerificationStatus(cookId);

    return res.status(200).json({
      message: "All submitted documents approved successfully",
      document: doc,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


const updateCookVerificationStatus = async (cookId) => {
  const doc = await CookDocument.findOne({ cookId });
  if (!doc) return;

  // Get cook info for email
  const cook = await Cook.findById(cookId);
  if (!cook) return;

  const previousStatus = cook.verificationStatus;

  // Define REQUIRED documents (must be submitted and approved)
  const requiredDocs = [
    doc.cnicFront,
    doc.cnicBack,
  ];

  // Kitchen photos: at least one must be approved
  const kitchenPhotos = doc.kitchenPhotos || [];

  // Check if all required docs exist and are submitted
  const allRequiredSubmitted = requiredDocs.every(
    (d) => d && d.status !== "not_submitted"
  );

  const hasKitchenPhoto = kitchenPhotos.length > 0 && 
    kitchenPhotos.some((p) => p.status !== "not_submitted");

  // If nothing is submitted yet
  if (!allRequiredSubmitted && !hasKitchenPhoto) {
    await Cook.findByIdAndUpdate(cookId, { verificationStatus: "not_submitted" });
    return;
  }

  // Check if ANY REQUIRED document is rejected
  const anyRequiredRejected = requiredDocs.some((d) => d && d.status === "rejected");
  const anyKitchenPhotoRejected = kitchenPhotos.some((p) => p.status === "rejected");

  if (anyRequiredRejected || anyKitchenPhotoRejected) {
    await Cook.findByIdAndUpdate(cookId, { verificationStatus: "rejected" });
    
    // Send rejection email if status changed
    if (previousStatus !== "rejected") {
      await sendRejectionEmail(cook, doc);
    }
    return;
  }

  // Check if any REQUIRED document is still pending
  const anyRequiredPending = requiredDocs.some(
    (d) => d && d.status === "submitted"
  );
  const anyKitchenPhotoPending = kitchenPhotos.some((p) => p.status === "submitted");

  if (anyRequiredPending || anyKitchenPhotoPending) {
    await Cook.findByIdAndUpdate(cookId, { verificationStatus: "pending" });
    return;
  }

  // Check if ALL REQUIRED documents are approved
  const allRequiredApproved = requiredDocs.every(
    (d) => d && d.status === "approved"
  );

  const hasApprovedKitchenPhoto = kitchenPhotos.length > 0 && 
    kitchenPhotos.some((p) => p.status === "approved");

  // ✅ APPROVED: All required docs + at least one kitchen photo approved
  if (allRequiredApproved && hasApprovedKitchenPhoto) {
    await Cook.findByIdAndUpdate(cookId, { verificationStatus: "approved" });
    
    // Send approval email if status changed
    if (previousStatus !== "approved") {
      await sendApprovalEmail(cook);
    }
    return;
  }

  // Default to pending if we can't determine
  await Cook.findByIdAndUpdate(cookId, { verificationStatus: "pending" });
};

/**
 * Send approval email to cook
 */
const sendApprovalEmail = async (cook) => {
  try {
    const subject = "🎉 Your Documents Have Been Approved!";
    const text = `Dear ${cook.name},

Congratulations! Your verification documents have been approved by our admin team.

You can now start using your cook account and begin serving customers on Homely Meals platform.

Next Steps:
- Log in to your cook dashboard
- Set up your menu and meal offerings
- Start accepting orders

Thank you for joining Homely Meals!

Best regards,
Homely Meals Team`;

    await sendEmail(cook.email, subject, text);
    console.log(`Approval email sent to ${cook.email}`);
  } catch (error) {
    console.error(`Failed to send approval email to ${cook.email}:`, error.message);
  }
};

/**
 * Send rejection email to cook with reasons
 */
const sendRejectionEmail = async (cook, doc) => {
  try {
    // Collect rejection reasons
    const rejectionReasons = [];

    if (doc.cnicFront?.status === "rejected") {
      rejectionReasons.push(`- CNIC Front: ${doc.cnicFront.rejectedReason || "Not specified"}`);
    }

    if (doc.cnicBack?.status === "rejected") {
      rejectionReasons.push(`- CNIC Back: ${doc.cnicBack.rejectedReason || "Not specified"}`);
    }

    if (doc.sfaLicense?.status === "rejected") {
      rejectionReasons.push(`- SFA License: ${doc.sfaLicense.rejectedReason || "Not specified"}`);
    }

    if (doc.other?.status === "rejected") {
      rejectionReasons.push(`- Other Document: ${doc.other.rejectedReason || "Not specified"}`);
    }

    doc.kitchenPhotos?.forEach((photo, index) => {
      if (photo.status === "rejected") {
        rejectionReasons.push(`- Kitchen Photo ${index + 1}: ${photo.rejectedReason || "Not specified"}`);
      }
    });

    const reasonsText = rejectionReasons.length > 0 
      ? rejectionReasons.join("\n") 
      : "Please check your documents and resubmit.";

    const subject = "Document Verification - Action Required";
    const text = `Dear ${cook.name},

We regret to inform you that some of your verification documents have been rejected by our admin team.

Rejection Reasons:
${reasonsText}

What to do next:
- Log in to your cook account
- Review the rejection reasons carefully
- Upload corrected documents
- Wait for admin review

If you have any questions, please contact our support team.

Best regards,
Homely Meals Team`;

    await sendEmail(cook.email, subject, text);
    console.log(`Rejection email sent to ${cook.email}`);
  } catch (error) {
    console.error(`Failed to send rejection email to ${cook.email}:`, error.message);
  }
};
