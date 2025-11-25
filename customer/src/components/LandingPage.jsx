// src/components/LandingPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Star, Clock, ChefHat, Search } from 'lucide-react';
import { ImageWithFallback } from './ui/image-with-fallback';

export function LandingPage() {
  const navigate = useNavigate();

  const [meals, setMeals] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('price-low');

  useEffect(() => {
    // Load meals from database via API (public endpoint)
    const loadMealsFromAPI = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/customer/meals', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Landing Page: Loaded meals from API:', data); // Debug
          if (data.success && Array.isArray(data.meals)) {
            setMeals(data.meals);
          } else {
            console.log('Landing Page: Invalid response format'); // Debug
            setMeals([]);
          }
        } else {
          console.error('Landing Page: Failed to load meals, status:', response.status);
          setMeals([]);
        }
      } catch (error) {
        console.error('Landing Page: Error loading meals:', error);
        setMeals([]);
      }
    };
    
    loadMealsFromAPI();
  }, []);

  const filteredMeals = meals
    .filter(meal => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        meal.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meal.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meal.category?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Category filter
      const matchesCategory = categoryFilter === 'all' || meal.category === categoryFilter;
      
      // Availability filter
      const isAvailable = meal.availability === 'Available';
      
      return matchesSearch && matchesCategory && isAvailable;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return (a.price || 0) - (b.price || 0);
        case 'price-high':
          return (b.price || 0) - (a.price || 0);
        default:
          return (a.price || 0) - (b.price || 0);
      }
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-orange-600">Homely Meals</h1>
              <p className="text-gray-600">Delicious home-cooked meals, delivered to you</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/login')}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Login
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/signup')}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Signup
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Available Meals</CardDescription>
              <CardTitle className="text-orange-600">N/A</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active Cooks</CardDescription>
              <CardTitle className="text-green-600">N/A</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Avg Rating</CardDescription>
              <CardTitle className="text-yellow-600">N/A</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Filter Meals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search meals by name, description, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-2 block">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="main course">Main Course</SelectItem>
                    <SelectItem value="beverages">Beverages</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-2 block">Sort By Price</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price-low">Price (Low to High)</SelectItem>
                    <SelectItem value="price-high">Price (High to Low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-6">
          <h2 className="text-gray-800 mb-4">Available Meals ({filteredMeals.length})</h2>
        </div>

        {filteredMeals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No meals found matching your criteria</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMeals.map(meal => (
              <Card key={meal._id || meal.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative h-48">
                  <ImageWithFallback
                    src={meal.itemImage || meal.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'}
                    alt={meal.name}
                    className="w-full h-full object-cover"
                  />
                  <Badge className="absolute top-2 right-2 bg-white text-gray-800">
                    {meal.category}
                  </Badge>
                </div>

                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-gray-800">{meal.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <ChefHat className="w-3 h-3" />
                        {meal.cookName || meal.cookId?.name || 'Unknown Cook'}
                      </CardDescription>
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
                      {meal.prepTime || 'N/A'}
                    </div>
                    <div>
                      {meal.servings ? `${meal.servings} ${meal.servings === 1 ? 'serving' : 'servings'}` : 'N/A'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-green-600 font-semibold">PKR {meal.price.toFixed(0)}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {meal.cuisine}
                    </Badge>
                  </div>

                  <Button className="w-full mt-4 bg-orange-600 hover:bg-orange-700">
                    Order Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}




