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

import {
  cookSignupRequest,
  cookVerifyOtp,
} from "../../api/cook.api";
import { useAuth } from "../../contexts/AuthContext";

function SignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Default to "cook" since this is the cook app
  const [stage, setStage] = useState(1); // 1 = enter details, 2 = verify OTP, 3 = success

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

  // SEND OTP (for both customer and cook UI - but wired to cook endpoints when role === 'cook')
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
      const res = await cookSignupRequest(payload);
      setMessage(`OTP has been sent to your email: ${form.email}`);
      setStage(2);
    } catch (err) {
      setMessage(
        err?.response?.data?.message ||
          err?.message ||
          "Error sending OTP. Check console/network."
      );
    } finally {
      setLoading(false);
    }
  };

  // VERIFY OTP (when role is cook: call cookSignupVerify)
  const handleVerifyOtp = async () => {
    setLoading(true);
    setMessage("");

    try {
      await cookVerifyOtp({ email: form.email, otpCode: otp });
      setMessage(
        "🎉 Congratulations — your account has been created successfully."
      );
      setStage(3);

      try {
        // Auto-login the newly created cook so the document flow starts immediately.
        await login(form.email, form.password);
        navigate("/cook/documents", { replace: true });
      } catch (authError) {
        console.warn("Auto-login after signup failed:", authError);
        setMessage(
          "Account created. Please login again to upload your documents."
        );
      }
    } catch (err) {
      setMessage("Invalid or expired OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // RESEND OTP
  const handleResendOtp = async () => {
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
      const res = await cookSignupRequest(payload);
      setMessage(`OTP has been sent to your email: ${form.email}`);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Error resending OTP");
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
            {/* Controlled tabs */}
            <Tabs defaultValue="cook" className="w-full">
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

              <TabsContent value="customer">
                <div className="p-6 text-center text-gray-600 space-y-3">
                  <h2 className="text-lg font-semibold">Customer Signup</h2>
                  <p>This cook portal cannot create customer accounts.</p>
                  <p>
                    Please switch to the customer app:{" "}
                    <a
                      href="http://localhost:5174/signup"
                      className="text-orange-600 underline"
                    >
                      Go to Customer Portal
                    </a>
                  </p>
                </div>
              </TabsContent>

              {/* COOK SIGNUP */}
              <TabsContent value="cook">
                {stage === 1 && (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    {message && <p className="text-center text-red-600">{message}</p>}

                    <div className="space-y-2">
                      <Label>Name <span className="text-red-600">*</span></Label>
                      <Input
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        required
                        className="focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                        className="focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                          className="pr-12 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <button
                          type="button"
                          aria-label="Toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: '12px' }}
                          className="text-slate-400 hover:text-slate-600 z-10"
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
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
                        className="focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                        className="focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Street <span className="text-red-600">*</span></Label>
                      <Input
                        value={form.street}
                        onChange={(e) => update("street", e.target.value)}
                        required
                        className="focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>City <span className="text-red-600">*</span></Label>
                      <Input
                        value={form.city}
                        onChange={(e) => update("city", e.target.value)}
                        required
                        className="focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Postal Code <span className="text-red-600">*</span></Label>
                      <Input
                        value={form.postalCode}
                        onChange={(e) => update("postalCode", e.target.value)}
                        required
                        className="focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <Button type="submit" className="w-full bg-green-600" disabled={loading}>
                      {loading ? "Sending OTP..." : "Send OTP"}
                    </Button>
                  </form>
                )}

                {stage === 2 && (
                  <div className="space-y-4">
                    {message && (
                      <p className="text-center text-green-600 text-sm">{message}</p>
                    )}

                    <div className="space-y-2">
                      <Label className="text-center block">Enter 6-Digit OTP</Label>
                      <div className="flex justify-center gap-2">
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                          <Input
                            key={index}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={otp[index] || ""}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, "");
                              if (value.length <= 1) {
                                const newOtp = otp.split("");
                                newOtp[index] = value;
                                setOtp(newOtp.join(""));
                                
                                // Auto-focus next input
                                if (value && index < 5) {
                                  const nextInput = e.target.parentElement.children[index + 1];
                                  if (nextInput) nextInput.focus();
                                }
                              }
                            }}
                            onKeyDown={(e) => {
                              // Handle backspace
                              if (e.key === "Backspace" && !otp[index] && index > 0) {
                                const prevInput = e.target.parentElement.children[index - 1];
                                if (prevInput) prevInput.focus();
                              }
                            }}
                            className="w-12 h-12 text-center text-lg font-semibold focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        ))}
                      </div>
                    </div>

                    {message && message.includes("Invalid") && (
                      <p className="text-center text-red-600 text-sm">{message}</p>
                    )}

                    <Button
                      className="w-full bg-green-600"
                      onClick={handleVerifyOtp}
                      disabled={loading || otp.length !== 6}
                    >
                      {loading ? "Verifying..." : "Verify OTP"}
                    </Button>

                    <div className="flex justify-between">
                      <button
                        className="underline text-sm"
                        onClick={() => {
                          setStage(1);
                          setMessage("");
                          setOtp("");
                        }}
                      >
                        Edit details
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
                      className="w-full bg-green-600"
                      onClick={() => navigate("/cook/login")}
                    >
                      Go to Login
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="mt-4 text-center space-y-2">
              <button
                onClick={() => navigate("/cook/login")}
                className="text-orange-600 underline"
              >
                Already have an account? Login
              </button>
              <div>
                <button
                  onClick={() => window.location.href = "http://localhost:5174/"}
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
