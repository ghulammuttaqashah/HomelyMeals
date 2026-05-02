import { Customer } from "../models/customer.model.js";
import { OTPVerification } from "../../../shared/models/otp.model.js";
import { generateOtp } from "../../../shared/utils/generateOtp.js";
import { sendEmail } from "../../../shared/utils/sendEmail.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../../../shared/config/env.js";
import { isValidEmail } from "../../../shared/utils/validateEmail.js";
import { verifyEmailAPI } from "../../../shared/utils/verifyEmailAPI.js";

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
      await sendEmail(email, "Your OTP Code", `Your OTP for customer account signup is ${otpCode}`);
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

    // Create customer account with initial address in addresses array
    const initialAddress = address ? {
      label: address.label || "Home",
      houseNo: address.houseNo || "",
      street: address.street,
      city: address.city || "Sukkur",
      postalCode: address.postalCode || "65200",
      landmark: address.landmark || "",
      latitude: address.latitude || null,
      longitude: address.longitude || null,
      isDefault: true,
    } : null;

    const customer = new Customer({
      name,
      email,
      contact,
      password,
      addresses: initialAddress ? [initialAddress] : [],
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
      return res.status(404).json({ message: "Account not found with this email" });

    if (customer.status !== "active") {
      return res.status(403).json({
        message: `Account is ${customer.status}`,
        reason: customer.statusReason
      });
    }

    const isPasswordValid = await bcrypt.compare(password, customer.password);
    if (!isPasswordValid)
      return res.status(401).json({ message: "Incorrect password" });

    // Generate JWT
    const token = jwt.sign({ id: customer._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });

    // Send token as HTTP-only cookie with customer-specific name
    res.cookie("customerToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.status(200).json({
      message: "Sign-in successful",
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        contact: customer.contact,
        addresses: customer.addresses
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
        addresses: customer.addresses,
        status: customer.status,
        hasPushSubscription: !!customer.pushSubscription, // Add this flag for frontend
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
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });

    return res.status(200).json({ message: "Sign-out successful" });
  } catch (error) {
    console.error("SignOut Error:", error);
    return res.status(500).json({ message: "Server error" });
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

/**
 * FORGOT PASSWORD - Step 1: Request OTP
 */
export const forgotPasswordRequest = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if customer exists
    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    // Delete any existing forgot password OTPs for this email
    await OTPVerification.deleteMany({ email, purpose: "customer-forgot-password" });

    // Generate OTP
    const otpCode = generateOtp();
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Save OTP entry
    const otpEntry = new OTPVerification({
      email,
      otpCode,
      purpose: "customer-forgot-password",
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
      await OTPVerification.deleteOne({ email, purpose: "customer-forgot-password" });
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
      purpose: "customer-forgot-password",
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
      purpose: "customer-forgot-password",
      isVerified: true,
    });

    if (!otpEntry) {
      return res.status(400).json({
        message: "Please verify OTP first before resetting password",
      });
    }

    // Find customer and update password
    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    customer.password = hashedPassword;
    await customer.save();

    // Delete the OTP entry after successful password reset
    await OTPVerification.deleteMany({ email, purpose: "customer-forgot-password" });

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

    // Check if customer exists
    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    // Check if there's a pending forgot password OTP
    const existingOtp = await OTPVerification.findOne({
      email,
      purpose: "customer-forgot-password",
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
 * Update Customer Profile (name, contact)
 */
export const updateProfile = async (req, res) => {
  const { name, contact } = req.body;

  try {
    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (name) customer.name = name;
    if (contact) customer.contact = contact;

    await customer.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        contact: customer.contact,
        addresses: customer.addresses,
        status: customer.status,
      },
    });
  } catch (err) {
    console.error("Update Profile Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Add New Address
 */
export const addAddress = async (req, res) => {
  const { label, houseNo, street, city, postalCode, latitude, longitude, isDefault } = req.body;

  try {
    if (!street) {
      return res.status(400).json({ message: "Street is required" });
    }

    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      customer.addresses.forEach(addr => addr.isDefault = false);
    }

    // If this is the first address, make it default
    const shouldBeDefault = isDefault || customer.addresses.length === 0;

    const newAddress = {
      label: label || "Home",
      houseNo: houseNo || "",
      street,
      city: city || "Sukkur",
      postalCode: postalCode || "65200",
      latitude: latitude || null,
      longitude: longitude || null,
      isDefault: shouldBeDefault,
    };

    customer.addresses.push(newAddress);
    await customer.save();

    return res.status(201).json({
      message: "Address added successfully",
      addresses: customer.addresses,
    });
  } catch (err) {
    console.error("Add Address Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Update Address
 */
export const updateAddress = async (req, res) => {
  const { addressId } = req.params;
  const { label, houseNo, street, city, postalCode, latitude, longitude, isDefault } = req.body;

  try {
    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const address = customer.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    // If setting as default, unset other defaults
    if (isDefault && !address.isDefault) {
      customer.addresses.forEach(addr => addr.isDefault = false);
    }

    // Update fields
    if (label !== undefined) address.label = label;
    if (houseNo !== undefined) address.houseNo = houseNo;
    if (street !== undefined) address.street = street;
    if (city !== undefined) address.city = city;
    if (postalCode !== undefined) address.postalCode = postalCode;
    if (latitude !== undefined) address.latitude = latitude;
    if (longitude !== undefined) address.longitude = longitude;
    if (isDefault !== undefined) address.isDefault = isDefault;

    await customer.save();

    return res.status(200).json({
      message: "Address updated successfully",
      addresses: customer.addresses,
    });
  } catch (err) {
    console.error("Update Address Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Delete Address
 */
export const deleteAddress = async (req, res) => {
  const { addressId } = req.params;

  try {
    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const address = customer.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    const wasDefault = address.isDefault;
    customer.addresses.pull(addressId);

    // If deleted address was default and there are other addresses, make first one default
    if (wasDefault && customer.addresses.length > 0) {
      customer.addresses[0].isDefault = true;
    }

    await customer.save();

    return res.status(200).json({
      message: "Address deleted successfully",
      addresses: customer.addresses,
    });
  } catch (err) {
    console.error("Delete Address Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Set Default Address
 */
export const setDefaultAddress = async (req, res) => {
  const { addressId } = req.params;

  try {
    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const address = customer.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    // Unset all defaults and set this one
    customer.addresses.forEach(addr => addr.isDefault = false);
    address.isDefault = true;

    await customer.save();

    return res.status(200).json({
      message: "Default address updated",
      addresses: customer.addresses,
    });
  } catch (err) {
    console.error("Set Default Address Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Subscribe to Push Notifications
 */
export const subscribeToPush = async (req, res) => {
  try {
    const { subscription } = req.body;
    
    console.log('[Customer Push Subscribe] Request received from user:', req.user._id);
    console.log('[Customer Push Subscribe] Subscription data:', JSON.stringify(subscription, null, 2));
    
    if (!subscription) {
      console.error('[Customer Push Subscribe] No subscription object provided');
      return res.status(400).json({ message: "Subscription object is required" });
    }

    if (!subscription.endpoint) {
      console.error('[Customer Push Subscribe] Subscription missing endpoint');
      return res.status(400).json({ message: "Subscription must have an endpoint" });
    }

    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      console.error('[Customer Push Subscribe] Customer not found:', req.user._id);
      return res.status(404).json({ message: "Customer not found" });
    }

    customer.pushSubscription = subscription;
    await customer.save();
    
    console.log('[Customer Push Subscribe] ✅ Successfully saved subscription for customer:', customer.name, customer._id);

    return res.status(200).json({ message: "Subscribed successfully" });
  } catch (error) {
    console.error("[Customer Push Subscribe] Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
