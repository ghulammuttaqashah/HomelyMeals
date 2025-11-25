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
      console.error("Cook login error:", errorData || err);
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
                      href="http://localhost:5173/login"
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
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cook-password">Password</Label>
                    <div className="relative flex items-center">
                      <Input
                        id="cook-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pr-12"
                      />
                      <button
                        type="button"
                        aria-label="Toggle cook password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
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
                onClick={() => (window.location.href = "http://localhost:5173/")}
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
