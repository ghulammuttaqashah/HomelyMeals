// src/components/common/SentimentAnalysis.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

export function SentimentAnalysis({ user }) {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const mockReviews = [
      // (same mock reviews as before)
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
          <Button variant="ghost" onClick={() => navigate('/customer/dashboard')} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-purple-600">Sentiment Analysis</h1>
          <p className="text-gray-600">Customer feedback and sentiment insights</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ...rest of the UI (unchanged) */}
      </main>
    </div>
  );
}
