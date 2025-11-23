// src/components/auth/LoginPage.jsx
import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ChefHat, User } from "lucide-react";

import { customerSignIn } from "../../api/customer.api";
import { AuthContext } from "../../contexts/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPassword, setCustomerPassword] = useState("");
  const [cookEmail, setCookEmail] = useState("");
  const [cookPassword, setCookPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showCookSignup, setShowCookSignup] = useState(false);

  // -------------------------
  // LOGIN FUNCTION (FIXED)
  // -------------------------
  const loginUser = async (email, password, role) => {
    setLoading(true);
    setErrorMessage("");

    try {
      if (role === "customer") {
        // FIXED: use AuthContext login(email, password)
        await login(email, password);

        // Redirect
        navigate("/customer/dashboard");
      }

      if (role === "cook") {
  const response = await cookSignIn(email, password);

  // Save token if needed
  localStorage.setItem("cookToken", response.data.token);

  // Navigate to cook dashboard
  navigate("/cook/dashboard");
}

    } catch (err) {
      console.log("Login Error:", err?.response?.data || err);
      setErrorMessage(err?.response?.data?.message || "Invalid credentials");
    }

    setLoading(false);
  };

  // -------------------------
  // SUBMIT HANDLERS
  // -------------------------
  const handleCustomerLogin = (e) => {
    e.preventDefault();
    loginUser(customerEmail, customerPassword, "customer");
  };

  const handleCookLogin = (e) => {
    e.preventDefault();
    loginUser(cookEmail, cookPassword, "cook");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* COOK SIGNUP PLACEHOLDER */}
        {showCookSignup && (
          <div className="text-center p-10 bg-white shadow rounded-lg">
            <h1 className="text-2xl font-bold mb-4">Cook Signup (Coming Soon)</h1>
            <p className="text-gray-600">This page will be added later.</p>

            <button
              className="mt-6 text-orange-600 underline"
              onClick={() => setShowCookSignup(false)}
            >
              Back to Login
            </button>
          </div>
        )}

        {/* MAIN LOGIN UI */}
        {!showCookSignup && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-orange-600 mb-2">Homely Meals</h1>
              <p className="text-gray-600">
                Delicious home-cooked meals, delivered to you
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>Login to your account</CardDescription>
              </CardHeader>

              <CardContent>
                {errorMessage && (
                  <p className="text-red-600 text-center mb-4">
                    {errorMessage}
                  </p>
                )}

                <Tabs defaultValue="customer" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="customer">
                      <User className="w-4 h-4 mr-2" /> Customer
                    </TabsTrigger>

                    <TabsTrigger value="cook">
                      <ChefHat className="w-4 h-4 mr-2" /> Cook
                    </TabsTrigger>
                  </TabsList>

                  {/* CUSTOMER LOGIN */}
                  <TabsContent value="customer">
                    <form onSubmit={handleCustomerLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          placeholder="customer@example.com"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Password</Label>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          value={customerPassword}
                          onChange={(e) => setCustomerPassword(e.target.value)}
                          required
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-orange-600 hover:bg-orange-700"
                      >
                        {loading ? "Please wait..." : "Login as Customer"}
                      </Button>
                    </form>
                  </TabsContent>

                  {/* COOK LOGIN */}
                  <TabsContent value="cook">
                    <form onSubmit={handleCookLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          placeholder="cook@example.com"
                          value={cookEmail}
                          onChange={(e) => setCookEmail(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Password</Label>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          value={cookPassword}
                          onChange={(e) => setCookPassword(e.target.value)}
                          required
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {loading ? "Please wait..." : "Login as Cook"}
                      </Button>

                      <button
                        type="button"
                        onClick={() => setShowCookSignup(true)}
                        className="text-green-700 text-sm underline mt-2 w-full"
                      >
                        Cook doesn’t have an account? Sign up
                      </button>
                    </form>
                  </TabsContent>
                </Tabs>

                <div className="mt-6 text-center">
                  <p className="text-gray-600">
                    Don't have an account?{" "}
                    <button
                      onClick={() => navigate("/signup")}
                      className="text-orange-600 hover:underline"
                    >
                      Sign up
                    </button>
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
