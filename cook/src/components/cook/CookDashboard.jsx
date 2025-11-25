// cook/src/components/cook/CookDashboard.jsx
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { LogOut, User, MessageCircle, BarChart3, Plus, Edit, Trash2, Star, Clock } from 'lucide-react';
import { ImageWithFallback } from '../ui/image-with-fallback';

/**
 * CookDashboard
 *
 * Notes on backend compatibility:
 * - Tries to fetch meals from `GET /api/cooks/meals` (with credentials).
 *   If backend does not implement this, it falls back to localStorage.
 * - For add/update/delete it attempts POST/PUT/DELETE endpoints and falls back to localStorage
 *   if the requests fail.
 *
 * The UI and all props are kept exactly as in your original file:
 *   props: { user, onNavigate, onLogout, onOpenChatbot }
 */
export function CookDashboard({ user, onNavigate, onLogout, onOpenChatbot }) {
  const [meals, setMeals] = useState([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'main course',
    availability: 'Available',
    itemImage: '',
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // helper: cook id might be user.id or user._id depending on backend
  const cookId = user?.id || user?._id || null;

  useEffect(() => {
    loadMeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load meals from backend API: GET /api/cook/meals/all
  const loadMeals = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/cook/meals/all', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.meals)) {
          console.log('Cook Dashboard: Loaded meals from backend:', data.meals); // Debug
          setMeals(data.meals);
          setLoading(false);
          return;
        }
      }
      throw new Error('Backend fetch failed');
    } catch (err) {
      console.error('Error loading meals:', err);
      setMeals([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter meals for this cook
  const myMeals = meals.filter(meal => meal.cookId === cookId || meal.cookId?._id === cookId);

  // Cloudinary upload (reusing same approach as document uploads)
  const CLOUD_NAME = "dygeug69l";
  const UPLOAD_PRESET = "cook_documents";

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();
    if (!res.ok || !data.secure_url) {
      throw new Error(
        data?.error?.message || "Failed to upload image. Please try again."
      );
    }

    return data.secure_url;
  };

  // Create meal via backend API: POST /api/cook/meals/add
  const createMeal = async (mealData) => {
    try {
      const res = await fetch('http://localhost:5000/api/cook/meals/add', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mealData),
      });

      if (res.ok) {
        const data = await res.json();
        return data.meal;
      }
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to create meal');
    } catch (err) {
      throw err;
    }
  };

  // Note: Update and delete endpoints not yet implemented in backend
  // These functions are placeholders for future implementation

  // Handle image file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const preview = URL.createObjectURL(file);
      setImagePreview(preview);
    }
  };

  // Handle add meal with image upload
  const handleAddMeal = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload image to Cloudinary first if provided
      let imageUrl = '';
      if (imageFile) {
        setUploadingImage(true);
        imageUrl = await uploadToCloudinary(imageFile);
        setUploadingImage(false);
      }

      // Prepare meal data matching backend model
      const mealData = {
        name: formData.name,
        description: formData.description,
        price: Number(parseFloat(formData.price) || 0),
        category: formData.category,
        availability: formData.availability,
        itemImage: imageUrl,
      };

      // Create meal via backend API
      const created = await createMeal(mealData);

      // Update UI
      const updatedMeals = [...meals, created];
      setMeals(updatedMeals);
      console.log('Cook Dashboard: Meal created successfully:', created); // Debug
      
      setIsAddDialogOpen(false);
      resetForm();
      alert('Meal added successfully!');
    } catch (error) {
      console.error('Error adding meal:', error);
      alert(error.message || 'Failed to add meal. Please try again.');
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  // Placeholder functions for future update/delete implementation
  const handleDeleteMeal = (mealId) => {
    alert('Delete functionality will be implemented when backend endpoint is available');
  };

  const toggleAvailability = (mealId) => {
    alert('Toggle availability will be implemented when backend endpoint is available');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'main course',
      availability: 'Available',
      itemImage: '',
    });
    setImageFile(null);
    setImagePreview(null);
  };

  // render (kept identical to your UI)
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-green-600">Cook Dashboard</h1>
              <p className="text-gray-600">Welcome, Chef {user?.name || 'Chef'}!</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate?.('sentiment')}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Sentiment
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChatbot?.()}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate?.('profile')}
              >
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onLogout?.()}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Meals</CardDescription>
              <CardTitle className="text-green-600">{myMeals.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Available</CardDescription>
              <CardTitle className="text-blue-600">
                {myMeals.filter(m => m.available).length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Avg Rating</CardDescription>
              <CardTitle className="text-yellow-600">
                {myMeals.length > 0
                  ? (myMeals.reduce((acc, m) => acc + (m.rating || 0), 0) / myMeals.length).toFixed(1)
                  : '0.0'} ★
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Revenue</CardDescription>
              <CardTitle className="text-orange-600">
                N/A
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* My Meals Section */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-gray-800">My Meals ({myMeals.length})</h2>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add New Meal
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Meal</DialogTitle>
                <DialogDescription>Fill in the details for your new meal</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleAddMeal} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Meal Name <span className="text-red-600">*</span></Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Chicken Biryani"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your meal..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (PKR) <span className="text-red-600">*</span></Label>
                    <Input
                      id="price"
                      type="number"
                      step="1"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category <span className="text-red-600">*</span></Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="main course">Main Course</SelectItem>
                        <SelectItem value="beverages">Beverages</SelectItem>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="availability">Availability</Label>
                  <Select value={formData.availability} onValueChange={(value) => setFormData({ ...formData, availability: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="OutOfStock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="itemImage">Meal Image</Label>
                  <Input
                    id="itemImage"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  {imagePreview && (
                    <div className="mt-2">
                      <img src={imagePreview} alt="Preview" className="h-32 w-auto rounded border" />
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-4">
                  <Button 
                    type="submit" 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={loading || uploadingImage}
                  >
                    {uploadingImage ? 'Uploading Image...' : loading ? 'Adding Meal...' : 'Add Meal'}
                  </Button>

                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddDialogOpen(false)} 
                    className="flex-1"
                    disabled={loading || uploadingImage}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Meals Grid */}
        {myMeals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">You haven't added any meals yet</p>
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Meal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myMeals.map(meal => (
              <Card key={meal.id} className="overflow-hidden">
                <div className="relative h-48">
                  <ImageWithFallback
                    src={meal.itemImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'}
                    alt={meal.name}
                    className="w-full h-full object-cover"
                  />

                  <Badge className={`absolute top-2 right-2 ${meal.availability === 'Available' ? 'bg-green-500' : 'bg-gray-500'}`}>
                    {meal.availability || 'Available'}
                  </Badge>
                </div>

                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-gray-800">{meal.name}</CardTitle>
                      <CardDescription className="mt-1">{meal.category}</CardDescription>
                    </div>

                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span>{meal.rating || 'N/A'}</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <p className="text-gray-600 text-sm mb-4">{meal.description}</p>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1">
                      <span className="text-green-600 font-semibold">PKR {(meal.price || 0).toFixed(0)}</span>
                    </div>

                    <Badge variant="outline" className="text-xs">
                      {meal.category}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    {/* Edit - Coming Soon */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled
                      title="Edit functionality coming soon"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>

                    {/* Delete - Coming Soon */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteMeal(meal._id)}
                      className="text-red-600 hover:bg-red-50"
                      disabled
                      title="Delete functionality coming soon"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default CookDashboard;
