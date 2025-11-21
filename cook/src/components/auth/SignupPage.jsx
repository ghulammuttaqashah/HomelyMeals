import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { User, ChefHat } from "lucide-react";

import { requestSignupOtp, verifySignupOtp } from "../../api/customer.api";

export function SignupPage({ onSwitchToLogin }) {
  const [role, setRole] = useState("customer");
  const [stage, setStage] = useState(1);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    contact: "",
    houseNo: "",
    street: "",
    city: "Sukkur",
    postalCode: "",
  });

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const update = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // -----------------------------
// SEND OTP
// -----------------------------
const handleSendOtp = async (e) => {
  e.preventDefault();
  setLoading(true);
  setMessage("");

  // CREATE PAYLOAD IN CORRECT FORMAT
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
    setMessage(res.data.message);
    setStage(2);
  } catch (err) {
    setMessage(err.response?.data?.message || "Error sending OTP");
  } finally {
    setLoading(false);
  }
};


  // -----------------------------
  // VERIFY OTP
  // -----------------------------
  const handleVerifyOtp = async () => {
    setLoading(true);
    setMessage("");

    try {
      // FIX: Backend expects { email, otp }
      const res = await verifySignupOtp({
        email: form.email,
        otp, // FIXED: backend expects "otp", not "otpCode"
      });

      setMessage(res.data.message);

      setTimeout(() => {
        onSwitchToLogin();
      }, 1500);
    } catch (err) {
      setMessage(err.response?.data?.message || "Error verifying OTP");
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
            <Tabs defaultValue="customer" onValueChange={setRole} className="w-full">
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
                      <Label>Name</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input
                        type="password"
                        value={form.password}
                        onChange={(e) => update("password", e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Contact</Label>
                      <Input
                        value={form.contact}
                        onChange={(e) => update("contact", e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>House No</Label>
                      <Input
                        value={form.houseNo}
                        onChange={(e) => update("houseNo", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Street</Label>
                      <Input
                        value={form.street}
                        onChange={(e) => update("street", e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        value={form.city}
                        onChange={(e) => update("city", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Postal Code</Label>
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
                    <p className="text-center text-gray-700">
                      OTP sent to <strong>{form.email}</strong>
                    </p>

                    <Input
                      placeholder="Enter OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />

                    <Button
                      className="w-full bg-orange-600"
                      onClick={handleVerifyOtp}
                      disabled={loading}
                    >
                      {loading ? "Verifying..." : "Verify OTP"}
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* COOK SIGNUP (COMING SOON) */}
              <TabsContent value="cook">
                <div className="p-6 text-center text-gray-600">
                  <h2 className="text-lg font-semibold mb-2">Cook Signup</h2>
                  <p>Cook registration module will be added soon.</p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-4 text-center">
              <button
                onClick={onSwitchToLogin}
                className="text-orange-600 underline"
              >
                Already have an account? Login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
