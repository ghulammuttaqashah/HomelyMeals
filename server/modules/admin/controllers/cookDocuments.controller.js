
import { CookDocument } from "../../cook/models/cookDocument.model.js";
import { Cook } from "../../cook/models/cook.model.js";

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

    const result = docs.map((doc) => ({
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
    } else {
      if (target.status === "approved") {
        return res.status(400).json({ message: "Document already approved" });
      }

      target.status = "approved";
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

    // overall cook status → rejected
    await Cook.findByIdAndUpdate(cookId, { verificationStatus: "rejected" });

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
        target.forEach((item) => (item.status = "approved"));
      } else {
        if (target) target.status = "approved";
      }
    });

    doc.verifiedByAdmin = req.user._id;
doc.verifiedAt = new Date();

    await doc.save();
    await updateCookVerificationStatus(cookId);

    return res.status(200).json({
      message: "All documents approved",
      document: doc,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


const updateCookVerificationStatus = async (cookId) => {
  const doc = await CookDocument.findOne({ cookId });
  if (!doc) return;

  const allDocs = [
    doc.cnicFront,
    doc.cnicBack,
    doc.sfaLicense,
    doc.other,
    ...doc.kitchenPhotos,
  ].filter(Boolean);

  const statuses = allDocs.map((d) => d.status);

  if (statuses.every((s) => s === "not_submitted")) {
    await Cook.findByIdAndUpdate(cookId, { verificationStatus: "not_submitted" });
    return;
  }

  if (statuses.includes("rejected")) {
    await Cook.findByIdAndUpdate(cookId, { verificationStatus: "rejected" });
    return;
  }

  if (statuses.includes("submitted")) {
    await Cook.findByIdAndUpdate(cookId, { verificationStatus: "pending" });
    return;
  }

  if (statuses.every((s) => s === "approved")) {
    await Cook.findByIdAndUpdate(cookId, { verificationStatus: "approved" });
  }
};
