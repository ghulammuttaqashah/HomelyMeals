# Dashboard Implementation

## Overview
Customer dashboard displays meals from approved cooks with search, filter, and sort functionality. Fetches meals from backend `/api/customer/meals` endpoint.

## How It Works
1. **Authentication Check**: Dashboard redirects to login if user not authenticated
2. **Fetch Meals**: GET `/api/customer/meals` returns meals from active & approved cooks only
3. **Display**: Shows meals in responsive grid with search bar and category/price filters
4. **Real-time Filter**: Client-side filtering by search query, category, and price sorting

## Backend Integration
- **Endpoint**: `GET /api/customer/meals`
- **Returns**: Array of meals with `{mealId, name, description, price, category, availability, itemImage, cookName}`
- **Filter**: Backend filters out meals from suspended/unapproved cooks
- **Sort**: Backend sorts by `createdAt` (newest first)

## Features
- Search by name/description/category
- Filter by category (All, Main Course, Beverages, Starter, Other)
- Sort by price (Low to High, High to Low) or name (A-Z)
- Responsive meal cards with image, price, rating, "Order Now" button

## Navigation Flow
- **Signup** → OTP Verify → Dashboard (auto-login after verification)
- **Login** → Dashboard
- **Logout** → Landing Page
- **Dashboard** → Protected (requires authentication)
