// src/components/customer/CustomerProfile.jsx
import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { AuthContext } from '../../contexts/AuthContext';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';

import { ArrowLeft, Save } from 'lucide-react';

export function CustomerProfile() {
  const navigate = useNavigate();

  // GET user from context
  const { user } = useContext(AuthContext);

  // SAFETY: user may be null initially → wait until user loads
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        address: user.address || "",
      });
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button variant="ghost" onClick={() => navigate('/customer/dashboard')} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-orange-600">My Profile</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* PROFILE FORM */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>

          <CardContent>
            <form className="space-y-6">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Delivery Address</Label>
                <Textarea
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="flex gap-4">
                <Button type="button" className="flex-1 bg-orange-600 hover:bg-orange-700">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/customer/dashboard')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ACCOUNT DETAILS */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Account Type</CardTitle>
            <CardDescription>Your current account details</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Account Type:</span>
                <span className="capitalize">{user?.type || "customer"}</span>
              </div>

              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Member Since:</span>
                <span>2024</span>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-gray-600">User ID:</span>
                <span className="text-gray-400 text-sm">{user?.id || "N/A"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
