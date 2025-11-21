import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Smile,
  Meh,
  Frown,
  Star,
  MessageSquare
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';


export function SentimentAnalysis({ user, onBack }) {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const mockReviews = [
      {
        id: '1',
        mealName: 'Chicken Biryani',
        customerName: 'Sarah Johnson',
        rating: 5,
        comment: 'Absolutely delicious! The spices were perfectly balanced and the chicken was so tender.',
        sentiment: 'positive',
        date: '2024-11-15',
      },
      {
        id: '2',
        mealName: 'Pad Thai',
        customerName: 'Michael Chen',
        rating: 4,
        comment: 'Great taste, though I wish there were more peanuts. Overall very satisfied!',
        sentiment: 'positive',
        date: '2024-11-14',
      },
      {
        id: '3',
        mealName: 'Tacos al Pastor',
        customerName: 'Emma Williams',
        rating: 5,
        comment: "Best tacos I've ever had! The pineapple adds such a nice touch.",
        sentiment: 'positive',
        date: '2024-11-13',
      },
      {
        id: '4',
        mealName: 'Vegetable Samosas',
        customerName: 'David Brown',
        rating: 3,
        comment: 'Good flavor but they were a bit cold when they arrived.',
        sentiment: 'neutral',
        date: '2024-11-12',
      },
      {
        id: '5',
        mealName: 'Margherita Pizza',
        customerName: 'Lisa Anderson',
        rating: 5,
        comment: 'Authentic Italian taste! Fresh ingredients and perfect crust.',
        sentiment: 'positive',
        date: '2024-11-11',
      },
      {
        id: '6',
        mealName: 'Mango Sticky Rice',
        customerName: 'James Wilson',
        rating: 4,
        comment: 'Sweet and delicious dessert. Mango was perfectly ripe.',
        sentiment: 'positive',
        date: '2024-11-10',
      },
      {
        id: '7',
        mealName: 'Chicken Biryani',
        customerName: 'Olivia Martinez',
        rating: 2,
        comment: 'Not what I expected. The portion was smaller than described.',
        sentiment: 'negative',
        date: '2024-11-09',
      },
      {
        id: '8',
        mealName: 'Pad Thai',
        customerName: 'Robert Taylor',
        rating: 5,
        comment: 'Incredible! Will definitely order again. Perfect level of spice.',
        sentiment: 'positive',
        date: '2024-11-08',
      },
    ];
    setReviews(mockReviews);
  }, []);

  const sentimentData = [
    {
      name: 'Positive',
      count: reviews.filter(r => r.sentiment === 'positive').length,
      color: '#10b981',
    },
    {
      name: 'Neutral',
      count: reviews.filter(r => r.sentiment === 'neutral').length,
      color: '#f59e0b',
    },
    {
      name: 'Negative',
      count: reviews.filter(r => r.sentiment === 'negative').length,
      color: '#ef4444',
    },
  ];

  const ratingDistribution = [
    { rating: '5 Stars', count: reviews.filter(r => r.rating === 5).length },
    { rating: '4 Stars', count: reviews.filter(r => r.rating === 4).length },
    { rating: '3 Stars', count: reviews.filter(r => r.rating === 3).length },
    { rating: '2 Stars', count: reviews.filter(r => r.rating === 2).length },
    { rating: '1 Star', count: reviews.filter(r => r.rating === 1).length },
  ];

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : '0.0';

  const positivePercentage =
    reviews.length > 0
      ? ((reviews.filter(r => r.sentiment === 'positive').length / reviews.length) * 100).toFixed(0)
      : '0';

  const getSentimentIcon = sentiment => {
    switch (sentiment) {
      case 'positive':
        return <Smile className="w-5 h-5 text-green-600" />;
      case 'neutral':
        return <Meh className="w-5 h-5 text-yellow-600" />;
      case 'negative':
        return <Frown className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getSentimentBadge = sentiment => {
    const colors = {
      positive: 'bg-green-100 text-green-800',
      neutral: 'bg-yellow-100 text-yellow-800',
      negative: 'bg-red-100 text-red-800',
    };
    return colors[sentiment] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button variant="ghost" onClick={onBack} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-purple-600">Sentiment Analysis</h1>
          <p className="text-gray-600">Customer feedback and sentiment insights</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Reviews</CardDescription>
              <CardTitle className="text-purple-600">{reviews.length}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Average Rating</CardDescription>
              <CardTitle className="flex items-center gap-1 text-yellow-600">
                {avgRating} <Star className="w-5 h-5 fill-current" />
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Positive Sentiment</CardDescription>
              <CardTitle className="flex items-center gap-1 text-green-600">
                <TrendingUp className="w-5 h-5" />
                {positivePercentage}%
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Response Rate</CardDescription>
              <CardTitle className="text-blue-600">95%</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Sentiment Distribution</CardTitle>
              <CardDescription>Overall customer sentiment breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rating Distribution</CardTitle>
              <CardDescription>Number of reviews per rating</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ratingDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rating" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Reviews */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Recent Reviews
            </CardTitle>
            <CardDescription>Latest customer feedback</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {reviews.map(review => (
                <div key={review.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p>{review.customerName}</p>
                        <Badge variant="outline" className="text-xs">
                          {review.mealName}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-yellow-500">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${i < review.rating ? 'fill-current' : ''}`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-500">{review.date}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getSentimentIcon(review.sentiment)}
                      <Badge className={getSentimentBadge(review.sentiment)}>
                        {review.sentiment}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-gray-700 mt-2">{review.comment}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Insights */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
            <CardDescription>AI-powered sentiment analysis insights</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">

              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600 mt-1" />
                <div>
                  <p className="text-green-900">Positive Trend</p>
                  <p className="text-sm text-green-700">
                    {positivePercentage}% of recent reviews are positive. Customers particularly love the
                    authenticity and flavor of your meals.
                  </p>
                </div>
              </div>

              {sentimentData.find(s => s.name === 'Negative').count > 0 && (
                <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-yellow-600 mt-1" />
                  <div>
                    <p className="text-yellow-900">Area for Improvement</p>
                    <p className="text-sm text-yellow-700">
                      Some customers mentioned portion sizes and delivery temperature. Consider
                      reviewing these aspects to improve satisfaction.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <Star className="w-5 h-5 text-blue-600 mt-1" />
                <div>
                  <p className="text-blue-900">Top Rated Items</p>
                  <p className="text-sm text-blue-700">
                    Tacos al Pastor and Margherita Pizza are your highest-rated dishes with
                    consistent 5-star reviews.
                  </p>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
