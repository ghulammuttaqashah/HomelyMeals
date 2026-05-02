// modules/admin/controllers/settings.controller.js
import { Settings } from "../models/settings.model.js";

// Get default profile image URL
export const getDefaultProfileImage = async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: 'default_profile_image' });
    
    if (!setting) {
      return res.status(404).json({ 
        message: "Default profile image not set",
        defaultImageUrl: null
      });
    }

    res.status(200).json({ 
      defaultImageUrl: setting.value,
      updatedAt: setting.updatedAt
    });
  } catch (error) {
    console.error("Error fetching default profile image:", error);
    res.status(500).json({ message: "Failed to fetch default profile image" });
  }
};

// Update or create default profile image
export const updateDefaultProfileImage = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const adminId = req.user._id; // Changed from req.admin._id

    if (!imageUrl || !imageUrl.trim()) {
      return res.status(400).json({ message: "Image URL is required" });
    }

    // Validate URL format (basic check)
    try {
      new URL(imageUrl);
    } catch (err) {
      return res.status(400).json({ message: "Invalid image URL format" });
    }

    const setting = await Settings.findOneAndUpdate(
      { key: 'default_profile_image' },
      { 
        value: imageUrl.trim(),
        updatedBy: adminId,
        updatedAt: new Date()
      },
      { 
        new: true, 
        upsert: true,
        runValidators: true
      }
    ).populate('updatedBy', 'name email');

    res.status(200).json({ 
      message: "Default profile image updated successfully",
      defaultImageUrl: setting.value,
      updatedAt: setting.updatedAt,
      updatedBy: setting.updatedBy
    });
  } catch (error) {
    console.error("Error updating default profile image:", error);
    res.status(500).json({ message: "Failed to update default profile image" });
  }
};

// Delete default profile image
export const deleteDefaultProfileImage = async (req, res) => {
  try {
    const setting = await Settings.findOneAndDelete({ key: 'default_profile_image' });

    if (!setting) {
      return res.status(404).json({ message: "Default profile image not found" });
    }

    res.status(200).json({ 
      message: "Default profile image deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting default profile image:", error);
    res.status(500).json({ message: "Failed to delete default profile image" });
  }
};

// Get all settings (for future expansion)
export const getAllSettings = async (req, res) => {
  try {
    const settings = await Settings.find().populate('updatedBy', 'name email');
    
    res.status(200).json({ 
      settings: settings.map(s => ({
        key: s.key,
        value: s.value,
        updatedAt: s.updatedAt,
        updatedBy: s.updatedBy
      }))
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ message: "Failed to fetch settings" });
  }
};
