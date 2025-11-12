// modules/admin/controllers/admin.controller.js
import { Admin } from "../models/admin.model.js";
import { OTPVerification } from "../../../shared/models/otp.model.js";
import { generateOtp } from "../../../shared/utils/generateOtp.js";
import { sendEmail } from "../../../shared/utils/sendEmail.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../../../shared/config/env.js";

/**
 * STEP 1: Admin Sign-In Request — verify password, send OTP
 */




// TEMP route to create admin (for setup)
export const createAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await Admin.findOne({ email });
    if (existing) return res.status(400).json({ message: "Admin already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = new Admin({
      name,
      email,
      password: hashedPassword,
      twoFactorEnabled: true
    });

    await admin.save();
    res.status(201).json({ message: "Admin created successfully", admin });
  } catch (err) {
    console.error("Admin creation failed:", err);
    res.status(500).json({ message: "Server error" });
  }
};




export const adminSignInRequest = async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: "Invalid credentials" });

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid)
      return res.status(400).json({ message: "Invalid credentials" });

    // Generate OTP
    const otpCode = generateOtp();
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    // Save OTP record
    const otpEntry = new OTPVerification({
      email,
      otpCode,
      purpose: "admin-signin",
      expiryTime
    });
    await otpEntry.save();

    // Send OTP via email
    await sendEmail(email, "Admin Sign-In OTP", `Your OTP is: ${otpCode}`);

    return res
      .status(200)
      .json({ message: "OTP sent to admin email for verification." });
  } catch (err) {
    console.error("Admin Sign-In Request Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * STEP 2: Verify OTP — if valid, create JWT + send cookie
 */
export const verifyAdminSignInOtp = async (req, res) => {
  const { email, otpCode } = req.body;

  try {
    const otpEntry = await OTPVerification.findOne({
      email,
      otpCode,
      purpose: "admin-signin",
      isVerified: false
    });

    if (!otpEntry) return res.status(400).json({ message: "Invalid OTP" });
    if (otpEntry.expiryTime < new Date())
      return res.status(400).json({ message: "OTP expired" });

    otpEntry.isVerified = true;
    await otpEntry.save();

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    // Generate JWT
    const token = jwt.sign({ id: admin._id, role: "admin" }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    return res.status(200).json({
      message: "Admin signed in successfully",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email
      }
    });
  } catch (err) {
    console.error("Verify Admin Sign-In OTP Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * STEP 3: Admin Sign-Out — clear cookie
 */
export const adminSignOut = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "Strict",
      secure: process.env.NODE_ENV === "production"
    });
    return res.status(200).json({ message: "Admin signed out successfully" });
  } catch (err) {
    console.error("Admin Sign-Out Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};