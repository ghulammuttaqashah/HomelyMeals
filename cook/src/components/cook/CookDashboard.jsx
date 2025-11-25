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
import { LogOut, User, MessageCircle, BarChart3, Plus, Edit, Trash2, Star, Clock, DollarSign } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

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
    category: 'Main Course',
    cuisine: '',
    image: '',
    prepTime: '',
    servings: '1',
  });

  // helper: cook id might be user.id or user._id depending on backend
  const cookId = user?.id || user?._id || null;

  useEffect(() => {
    loadMeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attempt to load meals from backend, fallback to localStorage
  const loadMeals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cooks/meals', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        // expect data.meals (adjust if your API returns different shape)
        if (Array.isArray(data?.meals)) {
          setMeals(data.meals);
          // sync to localStorage too (optional)
          localStorage.setItem('meals', JSON.stringify(data.meals));
          setLoading(false);
          return;
        }
      }
      // If not ok / endpoint doesn't exist, fallback
      throw new Error('Backend fetch failed or not implemented');
    } catch (err) {
      // fallback to localStorage
      const storedMeals = JSON.parse(localStorage.getItem('meals') || '[]');
      setMeals(storedMeals);
    } finally {
      setLoading(false);
    }
  };

  // Filter meals for this cook
  const myMeals = meals.filter(meal => meal.cookId === cookId);

  // Utility: try backend then fallback to localStorage for create
  const createMeal = async (newMeal) => {
    try {
      const res = await fetch('/api/cooks/meals', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMeal),
      });

      if (res.ok) {
        const data = await res.json();
        // expect backend returns created meal
        return data.meal || newMeal;
      }
      throw new Error('Create endpoint returned error');
    } catch (err) {
      // fallback - persist locally
      const existing = JSON.parse(localStorage.getItem('meals') || '[]');
      const updated = [...existing, newMeal];
      localStorage.setItem('meals', JSON.stringify(updated));
      return newMeal;
    }
  };

  const updateMealBackend = async (updatedMeal) => {
    try {
      const res = await fetch(`/api/cooks/meals/${updatedMeal.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedMeal),
      });

      if (res.ok) {
        const data = await res.json();
        return data.meal || updatedMeal;
      }
      throw new Error('Update endpoint returned error');
    } catch (err) {
      // fallback
      const existing = JSON.parse(localStorage.getItem('meals') || '[]');
      const updated = existing.map(m => (m.id === updatedMeal.id ? updatedMeal : m));
      localStorage.setItem('meals', JSON.stringify(updated));
      return updatedMeal;
    }
  };

  const deleteMealBackend = async (mealId) => {
    try {
      const res = await fetch(`/api/cooks/meals/${mealId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) return true;
      throw new Error('Delete endpoint returned error');
    } catch (err) {
      const existing = JSON.parse(localStorage.getItem('meals') || '[]');
      const updated = existing.filter(m => m.id !== mealId);
      localStorage.setItem('meals', JSON.stringify(updated));
      return true;
    }
  };

  // Handlers (preserve your UI behavior)
  const handleAddMeal = async (e) => {
    e.preventDefault();

    const newMeal = {
      id: Date.now().toString(),
      cookId,
      cookName: user?.name || 'Chef',
      name: formData.name,
      description: formData.description,
      price: Number(parseFloat(formData.price) || 0),
      category: formData.category,
      cuisine: formData.cuisine,
      image: formData.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
      rating: 0,
      prepTime: formData.prepTime,
      servings: parseInt(formData.servings) || 1,
      available: true,
    };

    // try backend, otherwise local
    const created = await createMeal(newMeal);

    // update UI
    const updatedMeals = [...meals, created];
    setMeals(updatedMeals);
    localStorage.setItem('meals', JSON.stringify(updatedMeals)); // keep local copy
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleUpdateMeal = async (e) => {
    e.preventDefault();
    if (!editingMeal) return;

    const updatedMeal = {
      ...editingMeal,
      name: formData.name,
      description: formData.description,
      price: Number(parseFloat(formData.price) || 0),
      category: formData.category,
      cuisine: formData.cuisine,
      image: formData.image || editingMeal.image,
      prepTime: formData.prepTime,
      servings: parseInt(formData.servings) || 1,
    };

    const resultMeal = await updateMealBackend(updatedMeal);

    const updatedMeals = meals.map(m => (m.id === resultMeal.id ? resultMeal : m));
    setMeals(updatedMeals);
    localStorage.setItem('meals', JSON.stringify(updatedMeals));
    setEditingMeal(null);
    resetForm();
  };

  const handleDeleteMeal = async (mealId) => {
    if (!confirm('Are you sure you want to delete this meal?')) return;
    await deleteMealBackend(mealId);
    const updatedMeals = meals.filter(m => m.id !== mealId);
    setMeals(updatedMeals);
    localStorage.setItem('meals', JSON.stringify(updatedMeals));
  };

  const toggleAvailability = async (mealId) => {
    const updatedMeals = meals.map(m =>
      m.id === mealId ? { ...m, available: !m.available } : m
    );

    // optimistic update locally
    setMeals(updatedMeals);
    localStorage.setItem('meals', JSON.stringify(updatedMeals));

    // try updating backend (PUT)
    const target = updatedMeals.find(m => m.id === mealId);
    try {
      await updateMealBackend(target);
    } catch (err) {
      // already persisted locally as fallback
    }
  };

  const startEditing = (meal) => {
    setEditingMeal(meal);
    setFormData({
      name: meal.name || '',
      description: meal.description || '',
      price: (meal.price ?? '').toString(),
      category: meal.category || 'Main Course',
      cuisine: meal.cuisine || '',
      image: meal.image || '',
      prepTime: meal.prepTime || '',
      servings: (meal.servings ?? 1).toString(),
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'Main Course',
      cuisine: '',
      image: '',
      prepTime: '',
      servings: '1',
    });
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
                ${myMeals.reduce((acc, m) => acc + (m.price || 0), 0).toFixed(2)}
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
                  <Label htmlFor="name">Meal Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="servings">Servings</Label>
                    <Input
                      id="servings"
                      type="number"
                      value={formData.servings}
                      onChange={(e) => setFormData({ ...formData, servings: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Appetizer">Appetizer</SelectItem>
                        <SelectItem value="Main Course">Main Course</SelectItem>
                        <SelectItem value="Dessert">Dessert</SelectItem>
                        <SelectItem value="Beverage">Beverage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cuisine">Cuisine</Label>
                    <Input
                      id="cuisine"
                      value={formData.cuisine}
                      onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })}
                      placeholder="e.g., Italian, Indian, Thai"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prepTime">Prep Time</Label>
                  <Input
                    id="prepTime"
                    value={formData.prepTime}
                    onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })}
                    placeholder="e.g., 30 mins"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image">Image URL (Optional)</Label>
                  <Input
                    id="image"
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                    Add Meal
                  </Button>

                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1">
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
                    src={meal.image}
                    alt={meal.name}
                    className="w-full h-full object-cover"
                  />

                  <Badge className={`absolute top-2 right-2 ${meal.available ? 'bg-green-500' : 'bg-gray-500'}`}>
                    {meal.available ? 'Available' : 'Unavailable'}
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

                  <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {meal.prepTime}
                    </div>
                    <div>{meal.servings} {meal.servings === 1 ? 'serving' : 'servings'}</div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <span className="text-green-600">{(meal.price || 0).toFixed(2)}</span>
                    </div>

                    <Badge variant="outline" className="text-xs">
                      {meal.cuisine}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    {/* EDIT */}
                    <Dialog open={editingMeal?.id === meal.id} onOpenChange={(open) => !open && setEditingMeal(null)}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => startEditing(meal)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </DialogTrigger>

                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Meal</DialogTitle>
                          <DialogDescription>Update your meal details</DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleUpdateMeal} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-name">Meal Name</Label>
                            <Input
                              id="edit-name"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea
                              id="edit-description"
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              required
                              rows={3}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-price">Price ($)</Label>
                              <Input
                                id="edit-price"
                                type="number"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="edit-servings">Servings</Label>
                              <Input
                                id="edit-servings"
                                type="number"
                                value={formData.servings}
                                onChange={(e) => setFormData({ ...formData, servings: e.target.value })}
                                required
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-category">Category</Label>
                              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Appetizer">Appetizer</SelectItem>
                                  <SelectItem value="Main Course">Main Course</SelectItem>
                                  <SelectItem value="Dessert">Dessert</SelectItem>
                                  <SelectItem value="Beverage">Beverage</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="edit-cuisine">Cuisine</Label>
                              <Input
                                id="edit-cuisine"
                                value={formData.cuisine}
                                onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })}
                                required
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="edit-prepTime">Prep Time</Label>
                            <Input
                              id="edit-prepTime"
                              value={formData.prepTime}
                              onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })}
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="edit-image">Image URL</Label>
                            <Input
                              id="edit-image"
                              type="url"
                              value={formData.image}
                              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                            />
                          </div>

                          <div className="flex gap-4 pt-4">
                            <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                              Update Meal
                            </Button>

                            <Button type="button" variant="outline" onClick={() => setEditingMeal(null)} className="flex-1">
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>

                    {/* Toggle Availability */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAvailability(meal.id)}
                      className={meal.available ? '' : 'bg-gray-100'}
                    >
                      {meal.available ? 'Hide' : 'Show'}
                    </Button>

                    {/* Delete */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteMeal(meal.id)}
                      className="text-red-600 hover:bg-red-50"
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
