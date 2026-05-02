// modules/admin/models/settings.model.js
import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  key: { 
    type: String, 
    required: true, 
    unique: true,
    enum: ['default_profile_image'] // Can add more settings keys in future
  },
  value: { 
    type: String, 
    required: true 
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

export const Settings = mongoose.model("Settings", settingsSchema);
