// src/components/auth/LoginPage.jsx
import React, { useState } from "react";
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

import { cookSignIn } from "../../api/cook.api";

function LoginPage() {
  const navigate = useNavigate();

  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPassword, setCustomerPassword] = useState("");

  const [cookEmail, setCookEmail] = useState("");
  const [cookPassword, setCookPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleCustomerLogin = (e) => {
    e.preventDefault();
    window.location.href = "http://localhost:5173"; // 🔥 SWITCH TO CUSTOMER APP
  };

  const handleCookLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const payload = { email: cookEmail, password: cookPassword };
      const res = await cookSignIn(payload);

      if (res?.data?.cook) {
        const cook = res.data.cook;
        localStorage.setItem("cook", JSON.stringify(cook));

        if (
          cook.verificationStatus === "not_started" ||
          cook.verificationStatus === "pending" ||
          cook.verificationStatus === "rejected"
        ) {
          navigate("/cook/document-upload");
        } else if (cook.verificationStatus === "approved") {
          navigate("/cook/dashboard");
        } else {
          navigate("/cook/document-upload");
        }

        return;
      }

      setErrorMessage(res?.data?.message || "Unexpected login response");
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || "Cook login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
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
              <p className="text-red-600 text-center mb-4">{errorMessage}</p>
            )}

            <Tabs defaultValue="customer" className="w-full">
              <TabsList className="grid w-full grid-cols-2">

                {/* 🔥 SWITCH APP ON CLICK */}
                <TabsTrigger
                  value="customer"
                  onClick={() => (window.location.href = "http://localhost:5173")}
                >
                  <User className="w-4 h-4 mr-2" />
                  Customer
                </TabsTrigger>

                <TabsTrigger value="cook">
                  <ChefHat className="w-4 h-4 mr-2" />
                  Cook
                </TabsTrigger>
              </TabsList>

              <TabsContent value="customer">
                <form onSubmit={handleCustomerLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer-email">Email</Label>
                    <Input
                      id="customer-email"
                      type="email"
                      placeholder="customer@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer-password">Password</Label>
                    <Input
                      id="customer-password"
                      type="password"
                      placeholder="••••••••"
                      value={customerPassword}
                      onChange={(e) => setCustomerPassword(e.target.value)}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    Login as Customer
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="cook">
                <form onSubmit={handleCookLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cook-email">Email</Label>
                    <Input
                      id="cook-email"
                      type="email"
                      placeholder="cook@example.com"
                      value={cookEmail}
                      onChange={(e) => setCookEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cook-password">Password</Label>
                    <Input
                      id="cook-password"
                      type="password"
                      placeholder="••••••••"
                      value={cookPassword}
                      onChange={(e) => setCookPassword(e.target.value)}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={loading}
                  >
                    {loading ? "Please wait..." : "Login as Cook"}
                  </Button>
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
      </div>
    </div>
  );
}

export default LoginPage;
