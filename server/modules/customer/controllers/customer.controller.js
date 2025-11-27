
import { Customer } from "../models/customer.model.js";
import { OTPVerification } from "../../../shared/models/otp.model.js";
import { generateOtp } from "../../../shared/utils/generateOtp.js";
import { sendEmail } from "../../../shared/utils/sendEmail.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../../../shared/config/env.js";
import { isValidEmail } from "../../../shared/utils/validateEmail.js";
import { verifyEmailAPI } from "../../../shared/utils/verifyEmailAPI.js"; // ✅ new import

/**
 * STEP 1: Request Signup OTP (Account not created yet)
 */
export const signupRequest = async (req, res) => {
  const { name, email, contact, password, address } = req.body;

  try {
    // 1️⃣ Validate email format first (basic regex)
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // 2️⃣ Verify using AbstractAPI
    const emailCheck = await verifyEmailAPI(email);
    if (!emailCheck.valid) {
      return res.status(400).json({
        message: `Invalid or unreachable email address: ${emailCheck.reason}`
      });
    }

    // 3️⃣ Check if customer already exists
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return res.status(400).json({ message: "Customer already exists" });
    }

    // 4️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5️⃣ Generate OTP
    const otpCode = generateOtp();
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // 6️⃣ Save OTP with temp data
    const otpEntry = new OTPVerification({
      email,
      otpCode,
      purpose: "signup",
      expiryTime,
      tempData: { name, contact, password: hashedPassword, address }
    });
    await otpEntry.save();

    // 7️⃣ Send email safely
    try {
      await sendEmail(email, "Your OTP Code", `Your OTP for signup is ${otpCode}`);
    } catch (emailError) {
      await OTPVerification.deleteOne({ email, purpose: "signup" });
      return res.status(400).json({
        message: "Failed to send OTP. Please check your email address."
      });
    }

    // ✅ Success
    return res.status(200).json({
      message: "OTP sent successfully. Please verify to complete signup."
    });
  } catch (err) {
    console.error("Signup Request Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



/**
 * STEP 2: Verify OTP & Create Account
 */
export const verifyOtpAndCreateAccount = async (req, res) => {
  const { email, otp } = req.body;
  const otpCode = otp;

  try {
    const otpEntry = await OTPVerification.findOne({
      email,
      otpCode,
      purpose: "signup",
      isVerified: false
    });

    if (!otpEntry) return res.status(400).json({ message: "Invalid OTP" });
    if (otpEntry.expiryTime < new Date())
      return res.status(400).json({ message: "OTP expired" });

    otpEntry.isVerified = true;
    await otpEntry.save();

    const { name, contact, password, address } = otpEntry.tempData;

    // Create customer account
    const customer = new Customer({
      name,
      email,
      contact,
      password,
      address
    });

    await customer.save();

    return res.status(201).json({
      message: "Signup successful! Account created.",
      customerId: customer._id
    });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * STEP 3: Customer Sign-in (Using Cookie)
 */
export const signIn = async (req, res) => {
  const { email, password } = req.body;

  try {
    const customer = await Customer.findOne({ email });
    if (!customer)
      return res.status(400).json({ message: "Invalid credentials" });

    if (customer.status !== "active") {
      return res.status(403).json({
        message: `Account is ${customer.status}`,
        reason: customer.statusReason
      });
    }

    const isPasswordValid = await bcrypt.compare(password, customer.password);
    if (!isPasswordValid)
      return res.status(400).json({ message: "Invalid credentials" });

    // Generate JWT
    const token = jwt.sign({ id: customer._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });

    // Send token as HTTP-only cookie with customer-specific name
    res.cookie("customerToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.status(200).json({
      message: "Sign-in successful",
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        contact: customer.contact,
        address: customer.address
      }
    });
  } catch (error) {
    console.error("SignIn Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get Current Customer (Protected)
 */
export const getCurrentCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id).select("-password");
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    return res.status(200).json({
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        contact: customer.contact,
        address: customer.address,
        status: customer.status,
      },
    });
  } catch (err) {
    console.error("Get Current Customer Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * STEP 4: Customer Sign-out (Clear Cookie)
 */
export const signOut = async (req, res) => {
  try {
    res.clearCookie("customerToken", {
      httpOnly: true,
      sameSite: "Strict",
      secure: process.env.NODE_ENV === "production"
    });

    return res.status(200).json({ message: "Sign-out successful" });
  } catch (error) {
    console.error("SignOut Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


import Meal from "../../cook/models/cookMeal.model.js";
import {Cook} from "../../cook/models/cook.model.js";

// Get all meals for customers (with cook name)
export const getAllMealsForCustomer = async (req, res) => {
  try {
    // Populate cook info (name and status)
    const meals = await Meal.find()
      .populate({
        path: "cookId",
        select: "name status verificationStatus",
      })
      .sort({ createdAt: -1 });

    // Filter out meals from suspended or non-approved cooks
    const formatted = meals
      .filter(m => {
        // Only show meals from active and approved cooks
        return m.cookId && 
               m.cookId.status === "active" && 
               m.cookId.verificationStatus === "approved";
      })
      .map(m => ({
        mealId: m._id,
        name: m.name,
        description: m.description,
        price: m.price,
        category: m.category,
        availability: m.availability,
        itemImage: m.itemImage,
        cookName: m.cookId?.name || "Unknown Cook",
        createdAt: m.createdAt,
      }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      meals: formatted
    });
  } catch (error) {
    console.error("Get meals error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meals",
    });
  }
};


/**
 * Resend OTP for Customer Signup
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
      purpose: "signup",
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
    console.error("Resend OTP Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
