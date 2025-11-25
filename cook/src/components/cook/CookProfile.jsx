import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Textarea } from "../ui/textarea";
import { ArrowLeft, Save } from "lucide-react";

export function CookProfile({ user, onUpdate, onBack }) {
  const [formData, setFormData] = useState({
    name: user.name || "",
    email: user.email || "",
    contact: user.contact || "",
    address: {
      street: user.address?.street || "",
    },
    bio: user.bio || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(formData); // send correct backend structure
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-orange-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button variant="ghost" onClick={onBack} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-green-600">Cook Profile</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your cook profile details</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* NAME */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name / Business Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              {/* EMAIL */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>

              {/* CONTACT */}
              <div className="space-y-2">
                <Label htmlFor="contact">Phone Number</Label>
                <Input
                  id="contact"
                  type="tel"
                  placeholder="+92 300 0000000"
                  value={formData.contact}
                  onChange={(e) =>
                    setFormData({ ...formData, contact: e.target.value })
                  }
                />
              </div>

              {/* ADDRESS */}
              <div className="space-y-2">
                <Label htmlFor="address">Kitchen Address</Label>
                <Textarea
                  id="address"
                  placeholder="Street, Area, City..."
                  value={formData.address.street}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { street: e.target.value },
                    })
                  }
                  rows={3}
                />
              </div>

              {/* BIO */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio / Description</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell customers about your cooking style, specialties, etc."
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  rows={4}
                />
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex gap-4">
                <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>

                <Button type="button" variant="outline" onClick={onBack} className="flex-1">
                  Cancel
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>

        {/* ACCOUNT INFO */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>Your cook account information</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Account Type:</span>
                <span className="capitalize">{user.type}</span>
              </div>

              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Joined:</span>
                <span>{user.createdAt?.split("T")[0] || "2024"}</span>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-gray-600">Cook ID:</span>
                <span className="text-gray-400 text-sm">{user._id}</span>
              </div>
            </div>
          </CardContent>
        </Card>

      </main>
    </div>
  );
}

export default CookProfile;
