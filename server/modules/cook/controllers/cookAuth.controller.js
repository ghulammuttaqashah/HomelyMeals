import { Cook } from "../models/cook.model.js";
import { OTPVerification } from "../../../shared/models/otp.model.js";
import { generateOtp } from "../../../shared/utils/generateOtp.js";
import { sendEmail } from "../../../shared/utils/sendEmail.js";
import bcrypt from "bcryptjs";
import { isValidEmail } from "../../../shared/utils/validateEmail.js";
import { verifyEmailAPI } from "../../../shared/utils/verifyEmailAPI.js";
import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../../../shared/config/env.js";

/**
 * STEP 1: Request Signup OTP
 */
export const signupRequest = async (req, res) => {
  const { name, email, contact, password, address } = req.body;

  try {
    if (!isValidEmail(email))
      return res.status(400).json({ message: "Invalid email format" });

    const emailCheck = await verifyEmailAPI(email);
    if (!emailCheck.valid) {
      return res.status(400).json({
        message: `Invalid or unreachable email address: ${emailCheck.reason}`,
      });
    }

    const existingCook = await Cook.findOne({ email });
    if (existingCook)
      return res.status(400).json({ message: "Cook already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const otpCode = generateOtp();
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const otpEntry = new OTPVerification({
      email,
      otpCode,
      purpose: "cook-signup",
      expiryTime,
      tempData: { name, contact, password: hashedPassword, address },
    });

    await otpEntry.save();

    try {
      await sendEmail(email, "Your OTP Code", `Your OTP for cook account signup is ${otpCode}`);
    } catch (emailError) {
      await OTPVerification.deleteOne({ email, purpose: "cook-signup" });
      return res
        .status(400)
        .json({ message: "Failed to send OTP. Please check email." });
    }

    return res.status(200).json({
      message: "OTP sent successfully. Please verify to complete signup.",
    });
  } catch (err) {
    console.error("Cook Signup Request Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * STEP 2: Verify OTP & Create Account
 */
export const verifyOtpAndCreateAccount = async (req, res) => {
  const { email, otpCode } = req.body;

  try {
    const otpEntry = await OTPVerification.findOne({
      email,
      otpCode,
      purpose: "cook-signup",
      isVerified: false,
    });

    if (!otpEntry) return res.status(400).json({ message: "Invalid OTP" });
    if (otpEntry.expiryTime < new Date())
      return res.status(400).json({ message: "OTP expired" });

    otpEntry.isVerified = true;
    await otpEntry.save();

    const { name, contact, password, address } = otpEntry.tempData;

    const cook = new Cook({
      name,
      email,
      contact,
      password,
      address,
      verificationStatus: "not_started",
      serviceStatus: "open", // ✔ requested change
      status: "active",
    });

    await cook.save();

    return res.status(201).json({
      message: "Signup successful! Account created.",
      cook: {
        id: cook._id,
        name: cook.name,
        email: cook.email,
        contact: cook.contact,
        address: cook.address,
        verificationStatus: cook.verificationStatus,
        serviceStatus: cook.serviceStatus,
        status: cook.status,
      },
    });
  } catch (err) {
    console.error("Verify Cook OTP Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * STEP 3: Cook Sign-In
 */
export const cookSignin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const cook = await Cook.findOne({ email });
    if (!cook) return res.status(404).json({ message: "Account not found with this email" });

    if (cook.status === "suspended") {
      return res.status(403).json({
        message: `Account is suspended`,
        reason: cook.statusReason || "Contact admin",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, cook.password);
    if (!isPasswordValid)
      return res.status(401).json({ message: "Incorrect password" });

    const token = jwt.sign({ id: cook._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.cookie("cookToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Save latitude/longitude if provided (stored in address.location)
    try {
      const { latitude, longitude } = req.body || {};
      const latNum = latitude !== undefined ? parseFloat(latitude) : NaN;
      const lngNum = longitude !== undefined ? parseFloat(longitude) : NaN;
      if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
        cook.address.location = {
          latitude: latNum,
          longitude: lngNum,
        };
        await cook.save();
      }
    } catch (e) {
      console.error("Failed to save cook location:", e);
    }

    return res.status(200).json({
      message: "Login successful",
      cook: {
        id: cook._id,
        name: cook.name,
        email: cook.email,
        contact: cook.contact,
        address: cook.address,
        verificationStatus: cook.verificationStatus,
        serviceStatus: cook.serviceStatus,
        status: cook.status,
        statusReason: cook.statusReason,
      },
    });
  } catch (err) {
    console.error("Cook Login Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get Current Cook (Protected)
 */
export const getCurrentCook = async (req, res) => {
  try {
    const cook = await Cook.findById(req.user._id).select("-password");
    if (!cook) {
      return res.status(404).json({ message: "Cook not found" });
    }

    return res.status(200).json({
      cook: {
        id: cook._id,
        name: cook.name,
        email: cook.email,
        contact: cook.contact,
        address: cook.address,
        verificationStatus: cook.verificationStatus,
        serviceStatus: cook.serviceStatus,
        status: cook.status,
        statusReason: cook.statusReason,
        maxDeliveryDistance: cook.maxDeliveryDistance,
        location: cook.address?.location, // Location is now part of address
      },
    });
  } catch (err) {
    console.error("Get Current Cook Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * STEP 4: Cook Sign-Out
 */
export const cookSignout = async (req, res) => {
  try {
    res.clearCookie("cookToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    return res.status(200).json({ message: "Sign-out successful" });
  } catch (err) {
    console.error("Cook Logout Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


/**
 * Resend OTP for Cook Signup
 */
export const resendSignupOtp = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if there's a pending OTP for this email
    const existingOtp = await OTPVerification.findOne({
      email,
      purpose: "cook-signup",
      isVerified: false
    });

    if (!existingOtp) {
      return res.status(400).json({ 
        message: "No pending signup found. Please start signup process again." 
      });
    }

    // Generate new OTP
    const otpCode = generateOtp();
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Update existing OTP entry
    existingOtp.otpCode = otpCode;
    existingOtp.expiryTime = expiryTime;
    await existingOtp.save();

    // Send email
    try {
      await sendEmail(email, "Your OTP Code (Resent)", `Your new OTP for signup is ${otpCode}`);
    } catch (emailError) {
      return res.status(400).json({
        message: "Failed to send OTP. Please try again."
      });
    }

    return res.status(200).json({
      message: "OTP resent successfully. Please check your email."
    });
  } catch (err) {
    console.error("Resend Cook OTP Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


/**
 * FORGOT PASSWORD - Step 1: Request OTP
 */
export const forgotPasswordRequest = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if cook exists
    const cook = await Cook.findOne({ email });
    if (!cook) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    // Delete any existing forgot password OTPs for this email
    await OTPVerification.deleteMany({ email, purpose: "cook-forgot-password" });

    // Generate OTP
    const otpCode = generateOtp();
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Save OTP entry
    const otpEntry = new OTPVerification({
      email,
      otpCode,
      purpose: "cook-forgot-password",
      expiryTime,
    });
    await otpEntry.save();

    // Send email
    try {
      await sendEmail(
        email,
        "Password Reset OTP",
        `Your OTP for password reset is: ${otpCode}\n\nThis OTP will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.`
      );
    } catch (emailError) {
      await OTPVerification.deleteOne({ email, purpose: "cook-forgot-password" });
      return res.status(400).json({
        message: "Failed to send OTP. Please try again.",
      });
    }

    return res.status(200).json({
      message: "OTP sent to your email. Please verify to reset password.",
    });
  } catch (err) {
    console.error("Forgot Password Request Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


/**
 * FORGOT PASSWORD - Step 2: Verify OTP
 */
export const verifyForgotPasswordOtp = async (req, res) => {
  const { email, otpCode } = req.body;

  try {
    if (!email || !otpCode) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const otpEntry = await OTPVerification.findOne({
      email,
      otpCode,
      purpose: "cook-forgot-password",
      isVerified: false,
    });

    if (!otpEntry) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (otpEntry.expiryTime < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    // Mark OTP as verified
    otpEntry.isVerified = true;
    await otpEntry.save();

    return res.status(200).json({
      message: "OTP verified successfully. You can now reset your password.",
    });
  } catch (err) {
    console.error("Verify Forgot Password OTP Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


/**
 * FORGOT PASSWORD - Step 3: Reset Password
 */
export const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    if (!email || !newPassword) {
      return res.status(400).json({ message: "Email and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Check if OTP was verified
    const otpEntry = await OTPVerification.findOne({
      email,
      purpose: "cook-forgot-password",
      isVerified: true,
    });

    if (!otpEntry) {
      return res.status(400).json({
        message: "Please verify OTP first before resetting password",
      });
    }

    // Find cook and update password
    const cook = await Cook.findOne({ email });
    if (!cook) {
      return res.status(404).json({ message: "Cook not found" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    cook.password = hashedPassword;
    await cook.save();

    // Delete the OTP entry after successful password reset
    await OTPVerification.deleteMany({ email, purpose: "cook-forgot-password" });

    return res.status(200).json({
      message: "Password reset successful. You can now login with your new password.",
    });
  } catch (err) {
    console.error("Reset Password Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


/**
 * FORGOT PASSWORD - Resend OTP
 */
export const resendForgotPasswordOtp = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if cook exists
    const cook = await Cook.findOne({ email });
    if (!cook) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    // Check if there's a pending forgot password OTP
    const existingOtp = await OTPVerification.findOne({
      email,
      purpose: "cook-forgot-password",
      isVerified: false,
    });

    if (!existingOtp) {
      return res.status(400).json({
        message: "No pending password reset found. Please start the process again.",
      });
    }

    // Generate new OTP
    const otpCode = generateOtp();
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Update existing OTP entry
    existingOtp.otpCode = otpCode;
    existingOtp.expiryTime = expiryTime;
    await existingOtp.save();

    // Send email
    try {
      await sendEmail(
        email,
        "Password Reset OTP (Resent)",
        `Your new OTP for password reset is: ${otpCode}\n\nThis OTP will expire in 10 minutes.`
      );
    } catch (emailError) {
      return res.status(400).json({
        message: "Failed to send OTP. Please try again.",
      });
    }

    return res.status(200).json({
      message: "OTP resent successfully. Please check your email.",
    });
  } catch (err) {
    console.error("Resend Forgot Password OTP Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


/**
 * Toggle Service Status (open/closed)
 */
export const toggleServiceStatus = async (req, res) => {
  try {
    const cook = await Cook.findById(req.user._id);
    if (!cook) {
      return res.status(404).json({ message: "Cook not found" });
    }

    // Toggle between open and closed
    cook.serviceStatus = cook.serviceStatus === "open" ? "closed" : "open";
    await cook.save();

    return res.status(200).json({
      message: `Kitchen is now ${cook.serviceStatus}`,
      serviceStatus: cook.serviceStatus,
    });
  } catch (err) {
    console.error("Toggle Service Status Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


/**
 * Update Cook Profile
 */
export const updateProfile = async (req, res) => {
  try {
    const { name, contact, address, maxDeliveryDistance, latitude, longitude } = req.body;

    const cook = await Cook.findById(req.user._id);
    if (!cook) {
      return res.status(404).json({ message: "Cook not found" });
    }

    // Validate required fields
    if (name !== undefined && name.trim() === "") {
      return res.status(400).json({ message: "Name cannot be empty" });
    }

    if (contact !== undefined && contact.trim() === "") {
      return res.status(400).json({ message: "Contact cannot be empty" });
    }

    // Validate maxDeliveryDistance
    if (maxDeliveryDistance !== undefined) {
      const distance = Number(maxDeliveryDistance);
      if (isNaN(distance) || distance < 1 || distance > 50) {
        return res.status(400).json({ message: "Delivery distance must be between 1 and 50 km" });
      }
      cook.maxDeliveryDistance = distance;
    }

    // Update location if coordinates provided (stored in address.location)
    if (latitude !== undefined && longitude !== undefined) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        cook.address.location = {
          latitude: lat,
          longitude: lng,
        };
      }
    }

    // Update fields if provided
    if (name !== undefined) cook.name = name.trim();
    if (contact !== undefined) cook.contact = contact.trim();

    // Update address fields if provided
    if (address) {
      if (address.houseNo !== undefined) cook.address.houseNo = address.houseNo;
      if (address.street !== undefined) {
        if (address.street.trim() === "") {
          return res.status(400).json({ message: "Street cannot be empty" });
        }
        cook.address.street = address.street.trim();
      }
      if (address.city !== undefined) cook.address.city = address.city.trim();
      if (address.postalCode !== undefined) cook.address.postalCode = address.postalCode.trim();
    }

    await cook.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      cook: {
        id: cook._id,
        name: cook.name,
        email: cook.email,
        contact: cook.contact,
        address: cook.address,
        verificationStatus: cook.verificationStatus,
        serviceStatus: cook.serviceStatus,
        status: cook.status,
        maxDeliveryDistance: cook.maxDeliveryDistance,
        location: cook.address?.location, // Location is now part of address
      },
    });
  } catch (err) {
    console.error("Update Cook Profile Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


/**
 * Change Password
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const cook = await Cook.findById(req.user._id);
    if (!cook) {
      return res.status(404).json({ message: "Cook not found" });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, cook.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash new password and save
    cook.password = await bcrypt.hash(newPassword, 10);
    await cook.save();

    return res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (err) {
    console.error("Change Password Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};