// modules/admin/models/admin.model.js
import mongoose from "mongoose";


const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  twoFactorEnabled: { type: Boolean, default: true },
  lastLogin: { type: Date }
});

// Hash password before save (for manual insert or update)


export const Admin = mongoose.model("Admin", adminSchema);