import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ChefHat, User } from "lucide-react";

import { customerSignIn } from "../../api/customer.api";
// cookSignIn is not implemented yet, so we skip it

export function LoginPage({ onSwitchToSignup }) {
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPassword, setCustomerPassword] = useState("");
  const [cookEmail, setCookEmail] = useState("");
  const [cookPassword, setCookPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [showCookSignup, setShowCookSignup] = useState(false);

  // -------------------------
  // FIXED LOGIN FUNCTION
  // -------------------------
 const loginUser = async (email, password, role) => {
  setLoading(true);
  setErrorMessage("");

  try {
    let res;

    if (role === "customer") {
      res = await customerSignIn({
        email,
        password,
      });

      console.log("Customer Login Success:", res.data);

      // ⭐ Save logged-in customer
      localStorage.setItem("currentUser", JSON.stringify(res.data.customer));

      // ⭐ Trigger App.jsx to detect login & redirect to dashboard
      window.location.reload();
    } 
    else {
      console.warn("Cook login API is not implemented yet.");
      setErrorMessage("Cook login is not available yet.");
    }

  } catch (err) {
    console.log("Login Error:", err.response?.data);
    setErrorMessage(err.response?.data?.message || "Invalid credentials");
  }

  setLoading(false);
};


  // -------------------------
  // FIXED SUBMIT HANDLERS
  // -------------------------
  const handleCustomerLogin = (e) => {
    e.preventDefault();
    loginUser(customerEmail, customerPassword, "customer");
  };

  const handleCookLogin = (e) => {
    e.preventDefault();
    loginUser(cookEmail, cookPassword, "cook"); // Will show “not implemented”
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">

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

        {!showCookSignup && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-orange-600 mb-2">Homely Meals</h1>
              <p className="text-gray-600">Delicious home-cooked meals, delivered to you</p>
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
                      onClick={onSwitchToSignup}
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
