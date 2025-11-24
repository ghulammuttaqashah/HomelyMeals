// src/components/auth/SignupPage.jsx
// Updated: Fixed OTP messages, added resend OTP with 30s cooldown, neutral contact validation, back to home link
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { User, ChefHat, Eye, EyeOff } from "lucide-react";

import { requestSignupOtp, verifySignupOtp } from "../../api/customer.api";

export function SignupPage() {
  const navigate = useNavigate();

  const [stage, setStage] = useState(1);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    contact: "",
    houseNo: "",
    street: "",
    city: "Sukkur",
    postalCode: "65200",
  });

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateContact = (contact) => {
    // Pakistani phone number: +92XXXXXXXXXX (11 digits after +92) or 03XXXXXXXXX (10 digits starting with 03)
    const cleaned = contact.replace(/\s+/g, "");
    const plus92Pattern = /^\+92\d{10}$/;
    const zero3Pattern = /^03\d{9}$/;
    return plus92Pattern.test(cleaned) || zero3Pattern.test(cleaned);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.email || !validateEmail(form.email)) {
      newErrors.email = "Please enter a valid email address.";
    }
    
    if (!form.contact || !validateContact(form.contact)) {
      newErrors.contact = "Please enter a valid phone number.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // SEND OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setMessage("");

    const payload = {
      name: form.name,
      email: form.email,
      contact: form.contact,
      password: form.password,
      address: {
        houseNo: form.houseNo,
        street: form.street,
        city: form.city,
        postalCode: form.postalCode,
      },
    };

    try {
      const res = await requestSignupOtp(payload);
      setMessage(`OTP has been sent to your email: ${form.email}`);
      setStage(2);
      setResendCooldown(30);
    } catch (err) {
      setMessage(err.response?.data?.message || "Error sending OTP");
    } finally {
      setLoading(false);
    }
  };

  // VERIFY OTP
  const handleVerifyOtp = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await verifySignupOtp({
        email: form.email,
        otp,
      });

      setMessage("🎉 Congratulations — your account has been created successfully.");
      setStage(3);
    } catch (err) {
      setMessage("Invalid or expired OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // RESEND OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    setMessage("");

    const payload = {
      name: form.name,
      email: form.email,
      contact: form.contact,
      password: form.password,
      address: {
        houseNo: form.houseNo,
        street: form.street,
        city: form.city,
        postalCode: form.postalCode,
      },
    };

    try {
      const res = await requestSignupOtp(payload);
      setMessage(`OTP has been sent to your email: ${form.email}`);
      setResendCooldown(30);
    } catch (err) {
      setMessage(err.response?.data?.message || "Error resending OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="customer" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="customer">
                  <User className="w-4 h-4 mr-2" />
                  Customer
                </TabsTrigger>
                <TabsTrigger value="cook">
                  <ChefHat className="w-4 h-4 mr-2" />
                  Cook
                </TabsTrigger>
              </TabsList>

              {/* CUSTOMER SIGNUP */}
              <TabsContent value="customer">
                {stage === 1 && (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    {message && (
                      <p className="text-center text-red-600">{message}</p>
                    )}

                    <div className="space-y-2">
                      <Label>Name <span className="text-red-600">*</span></Label>
                      <Input
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Email <span className="text-red-600">*</span></Label>
                      <Input
                        type="email"
                        placeholder="example@gmail.com"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        required
                      />
                      {errors.email && (
                        <p className="text-sm text-red-600">{errors.email}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Password <span className="text-red-600">*</span></Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={(e) => update("password", e.target.value)}
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Contact <span className="text-red-600">*</span></Label>
                      <Input
                        value={form.contact}
                        onChange={(e) => update("contact", e.target.value)}
                        required
                      />
                      {errors.contact && (
                        <p className="text-sm text-red-600">{errors.contact}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>House No</Label>
                      <Input
                        value={form.houseNo}
                        onChange={(e) => update("houseNo", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Street <span className="text-red-600">*</span></Label>
                      <Input
                        value={form.street}
                        onChange={(e) => update("street", e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>City <span className="text-red-600">*</span></Label>
                      <Input
                        value={form.city}
                        onChange={(e) => update("city", e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Postal Code <span className="text-red-600">*</span></Label>
                      <Input
                        value={form.postalCode}
                        onChange={(e) => update("postalCode", e.target.value)}
                        required
                      />
                    </div>

                    <Button className="w-full bg-orange-600" disabled={loading}>
                      {loading ? "Sending OTP..." : "Send OTP"}
                    </Button>
                  </form>
                )}

                {stage === 2 && (
                  <div className="space-y-4">
                    {message && (
                      <p className="text-center text-green-600 text-sm">{message}</p>
                    )}

                    <Input
                      placeholder="Enter OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />

                    {message && message.includes("Invalid") && (
                      <p className="text-center text-red-600 text-sm">{message}</p>
                    )}

                    <Button
                      className="w-full bg-orange-600"
                      onClick={handleVerifyOtp}
                      disabled={loading}
                    >
                      {loading ? "Verifying..." : "Verify OTP"}
                    </Button>

                    <div className="flex justify-between">
                      <button
                        className="underline text-sm"
                        onClick={() => {
                          setStage(1);
                          setMessage("");
                        }}
                      >
                        Edit details
                      </button>

                      <button
                        className="underline text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleResendOtp}
                        disabled={loading || resendCooldown > 0}
                      >
                        {resendCooldown > 0 
                          ? `Resend OTP (${resendCooldown}s)` 
                          : "Resend OTP"}
                      </button>
                    </div>
                  </div>
                )}

                {stage === 3 && (
                  <div className="space-y-4 text-center">
                    <h3 className="text-lg font-semibold">Account Created</h3>
                    <p className="text-sm text-gray-700">
                      {message}
                    </p>
                    <Button
                      className="w-full bg-orange-600"
                      onClick={() => navigate("/login")}
                    >
                      Go to Login
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* COOK SIGNUP (COMING SOON) */}
              <TabsContent value="cook">
                <div className="p-6 text-center text-gray-600 space-y-3">
                  <h2 className="text-lg font-semibold">Cook Signup</h2>
                  <p>This customer portal cannot create cook accounts.</p>
                  <p>
                    Please use the dedicated cook app:{" "}
                    <a
                      href="http://localhost:5174/signup"
                      className="text-green-700 underline"
                    >
                      Go to Cook Portal
                    </a>
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-4 text-center space-y-2">
              <button
                onClick={() => navigate("/login")}
                className="text-orange-600 underline"
              >
                Already have an account? Login
              </button>
              <div>
                <button
                  onClick={() => navigate("/")}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Back to Home
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
export default SignupPage;
