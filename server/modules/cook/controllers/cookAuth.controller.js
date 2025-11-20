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
    // 1️⃣ Validate email
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // 2️⃣ Verify via API
    const emailCheck = await verifyEmailAPI(email);
    if (!emailCheck.valid) {
      return res.status(400).json({
        message: `Invalid or unreachable email address: ${emailCheck.reason}`
      });
    }

    // 3️⃣ Check if cook exists
    const existingCook = await Cook.findOne({ email });
    if (existingCook) {
      return res.status(400).json({ message: "Cook already exists" });
    }

    // 4️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5️⃣ Generate OTP
    const otpCode = generateOtp();
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // 6️⃣ Save OTP + temp data
    const otpEntry = new OTPVerification({
      email,
      otpCode,
      purpose: "cook-signup",
      expiryTime,
      tempData: { name, contact, password: hashedPassword, address }
    });

    await otpEntry.save();

    // 7️⃣ Send OTP email
    try {
      await sendEmail(email, "Your OTP Code", `Your OTP for signup is ${otpCode}`);
    } catch (emailError) {
      await OTPVerification.deleteOne({ email, purpose: "cook-signup" });
      return res.status(400).json({ message: "Failed to send OTP. Please check email." });
    }

    return res.status(200).json({
      message: "OTP sent successfully. Please verify to complete signup."
    });

  } catch (err) {
    console.error("Cook Signup Request Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * STEP 2: Verify OTP & Create Cook Account
 */
/**
 * STEP 2: Verify OTP & Create Cook Account
 */
export const verifyOtpAndCreateAccount = async (req, res) => {
  const { email, otpCode } = req.body;

  try {
    const otpEntry = await OTPVerification.findOne({
      email,
      otpCode,
      purpose: "cook-signup",
      isVerified: false
    });

    if (!otpEntry) return res.status(400).json({ message: "Invalid OTP" });
    if (otpEntry.expiryTime < new Date())
      return res.status(400).json({ message: "OTP expired" });

    otpEntry.isVerified = true;
    await otpEntry.save();

    const { name, contact, password, address } = otpEntry.tempData;

    // Create cook account
    const cook = new Cook({
      name,
      email,
      contact,
      password,
      address,
      serviceStatus: "closed",        // Closed until documents approved
      documentVerified: false,
      status: "active"
    });

    await cook.save();

    // Return minimal info for dashboard
    return res.status(201).json({
      message: "Signup successful! Account created.",
      cook: {
        id: cook._id,
        name: cook.name,
        email: cook.email,
        contact: cook.contact,
        address: cook.address,
        status: cook.status,
        serviceStatus: cook.serviceStatus,
        documentVerified: cook.documentVerified
      }
    });

  } catch (err) {
    console.error("Verify Cook OTP Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};




/**
 * Cook Sign-In
 */
export const cookSignin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const cook = await Cook.findOne({ email });
    if (!cook) return res.status(400).json({ message: "Invalid credentials" });

    // Check if account is suspended
    if (cook.status === "suspended") {
      return res.status(403).json({
        message: `Account is suspended`,
        reason: cook.statusReason || "Contact admin"
      });
    }

    const isPasswordValid = await bcrypt.compare(password, cook.password);
    if (!isPasswordValid)
      return res.status(400).json({ message: "Invalid credentials" });

    // Generate JWT without role
    const token = jwt.sign({ id: cook._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });

    // Set HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Return minimal cook data for dashboard routing
    return res.status(200).json({
      message: "Login successful",
      cook: {
        id: cook._id,
        name: cook.name,
        email: cook.email,
        contact: cook.contact,
        address: cook.address,
        documentVerified: cook.documentVerified,
        serviceStatus: cook.serviceStatus,
        status: cook.status,
        statusReason: cook.statusReason
      }
    });
  } catch (err) {
    console.error("Cook Login Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Cook Sign-Out
 */
export const cookSignout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict"
    });

    return res.status(200).json({ message: "Sign-out successful" });
  } catch (err) {
    console.error("Cook Logout Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

