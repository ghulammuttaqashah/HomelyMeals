import { Customer } from "../models/customer.model.js";
import { OTPVerification } from "../../../shared/models/otp.model.js";
import { generateOtp } from "../../../shared/utils/generateOtp.js";
import { sendEmail } from "../../../shared/utils/sendEmail.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../../../shared/config/env.js";

/**
 * STEP 1: Request Signup OTP (Account not created yet)
 */
import { isValidEmail } from "../../../shared/utils/validateEmail.js";

export const signupRequest = async (req, res) => {
  const { name, email, contact, password, address } = req.body;

  try {
    // 1️⃣ Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // 2️⃣ Check if customer already exists
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return res.status(400).json({ message: "Customer already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 3️⃣ Generate OTP
    const otpCode = generateOtp();
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 4️⃣ Save OTP + temp data
    const otpEntry = new OTPVerification({
      email,
      otpCode,
      purpose: "signup",
      expiryTime,
      tempData: { name, contact, password: hashedPassword, address }
    });

    await otpEntry.save();

    // 5️⃣ Send OTP email
    try {
      await sendEmail(email, "Your OTP Code", `Your OTP for signup is ${otpCode}`);
    } catch (emailError) {
      // if email fails, cleanup temp OTP entry
      await OTPVerification.deleteOne({ email, purpose: "signup" });
      return res.status(400).json({
        message: "Failed to send OTP. Please check your email address."
      });
    }

    // ✅ Success
    return res.status(200).json({
      message: "OTP sent to email. Please verify to complete signup."
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
  const { email, otpCode } = req.body;

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

    // Send token as HTTP-only cookie
    res.cookie("token", token, {
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
 * STEP 4: Customer Sign-out (Clear Cookie)
 */
export const signOut = async (req, res) => {
  try {
    res.clearCookie("token", {
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
