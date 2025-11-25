// src/components/auth/LoginPage.jsx
// Focused customer portal login with clear cook-portal handoff
import React, { useContext, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
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
import { ChefHat, User, Eye, EyeOff } from "lucide-react";
import { AuthContext } from "../../contexts/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, user } = useContext(AuthContext);

  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPassword, setCustomerPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showCustomerPassword, setShowCustomerPassword] = useState(false);

  if (user) {
    return <Navigate to="/customer/dashboard" replace />;
  }

  const handleCustomerLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await login(customerEmail, customerPassword);
      setSuccessMessage("Login successful! Redirecting...");
      setTimeout(() => navigate("/customer/dashboard", { replace: true }), 800);
    } catch (err) {
      const errorData = err?.response?.data;
      console.error("Customer login error:", errorData || err);
      if (
        errorData?.message?.toLowerCase().includes("not found") ||
        errorData?.message?.toLowerCase().includes("does not exist")
      ) {
        setErrorMessage("No account found with this email. Please sign up first.");
      } else {
        setErrorMessage("Incorrect email or password. Please try again.");
      }
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

            {successMessage && (
              <p className="text-green-600 text-center mb-4">
                {successMessage}
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

              <TabsContent value="customer">
                <form onSubmit={handleCustomerLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="example@gmail.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Password</Label>
                    <div className="relative">
                      <Input
                        type={showCustomerPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={customerPassword}
                        onChange={(e) => setCustomerPassword(e.target.value)}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowCustomerPassword(!showCustomerPassword)
                        }
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showCustomerPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
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

              <TabsContent value="cook">
                <div className="space-y-3 py-8 text-center text-sm text-gray-600">
                  <p>This portal is reserved for customers only.</p>
                  <p>
                    Are you a cook? Use the dedicated portal below:
                    <br />
                    <a
                      href="http://localhost:5174/login"
                      className="text-green-700 underline"
                    >
                      Go to Cook Portal
                    </a>
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center space-y-2">
              <p className="text-gray-600">
                Don't have an account?{" "}
                <button
                  onClick={() => navigate("/signup")}
                  className="text-orange-600 hover:underline"
                >
                  Sign up
                </button>
              </p>
              <button
                onClick={() => navigate("/")}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Back to Home
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default LoginPage;
