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
      await sendEmail(email, "Your OTP Code", `Your OTP for signup is ${otpCode}`);
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
    if (!cook) return res.status(400).json({ message: "Invalid credentials" });

    if (cook.status === "suspended") {
      return res.status(403).json({
        message: `Account is suspended`,
        reason: cook.statusReason || "Contact admin",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, cook.password);
    if (!isPasswordValid)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: cook._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.cookie("cookToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

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
