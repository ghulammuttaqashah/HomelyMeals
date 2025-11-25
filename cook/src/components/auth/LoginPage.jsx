// src/components/auth/LoginPage.jsx  (COOK APP)
// Dedicated cook authentication with clear routing + customer portal handoff
import React, { useState } from "react";
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
import { useAuth } from "../../contexts/AuthContext";

function LoginPage() {
  const navigate = useNavigate();
  const { user, login, resolveCookRoute } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const redirectBasedOnStatus = (profile) => {
    const target = resolveCookRoute(
      profile?.verificationStatus ?? profile?.verificationStatusNormalized
    );
    navigate(target, { replace: true });
  };

  if (user) {
    return (
      <Navigate
        to={resolveCookRoute(
          user.verificationStatus ?? user.verificationStatusNormalized
        )}
        replace
      />
    );
  }

  const handleCookLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const cook = await login(email, password);
      if (!cook) {
        setErrorMessage("Unable to load profile. Please try again.");
        return;
      }

      setSuccessMessage("Login successful! Redirecting...");

      setTimeout(() => {
        redirectBasedOnStatus(cook);
      }, 700);
    } catch (err) {
      const errorData = err?.response?.data;
      
      // Check for suspended account (403 status)
      if (err?.response?.status === 403) {
        const reason = errorData?.reason || "Please contact support for more information.";
        setErrorMessage(`Account is suspended. Reason: ${reason}`);
        console.log("Login blocked: Cook account suspended");
      } else if (
        errorData?.message?.toLowerCase().includes("not found") ||
        errorData?.message?.toLowerCase().includes("does not exist")
      ) {
        setErrorMessage("No account found with this email. Please sign up first.");
        console.log("Login failed: Cook account not found");
      } else if (errorData?.message?.toLowerCase().includes("suspended")) {
        const reason = errorData?.reason || "Please contact support for more information.";
        setErrorMessage(`Account is suspended. Reason: ${reason}`);
        console.log("Login blocked: Cook account suspended");
      } else {
        setErrorMessage("Incorrect email or password. Please try again.");
        console.log("Login failed: Invalid credentials");
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
            <CardDescription>Login to your cook portal</CardDescription>
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

            <Tabs defaultValue="cook" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
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
                <div className="space-y-3 py-8 text-center text-sm text-gray-600">
                  <p>This portal is only for cooks.</p>
                  <p>
                    Looking for the customer experience?
                    <br />
                    <a
                      href="http://localhost:5174/login"
                      className="text-orange-600 underline"
                    >
                      Go to Customer Portal
                    </a>
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="cook">
                <form onSubmit={handleCookLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cook-email">Email</Label>
                    <Input
                      id="cook-email"
                      type="email"
                      placeholder="example@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cook-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="cook-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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

            <div className="mt-6 text-center space-y-2">
              <p className="text-gray-600">
                Don't have an account?{" "}
                <button
                  onClick={() => navigate("/signup")}
                  className="text-green-700 hover:underline"
                >
                  Sign up
                </button>
              </p>
              <button
                onClick={() => (window.location.href = "http://localhost:5174/")}
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
