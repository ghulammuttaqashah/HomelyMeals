# Meal Management Feature - Implementation Documentation

## Overview
This document describes the implementation of the meal creation and display feature connecting the Cook and Customer frontends with the backend API.

## Backend API Details

### Model Schema (server/modules/cook/models/cookMeal.model.js)
```javascript
{
  cookId: ObjectId (required, ref: "Cook"),
  name: String (required, trim),
  description: String (default: ""),
  price: Number (required),
  category: String (required, enum: ["main course", "beverages", "starter", "other"]),
  availability: String (enum: ["Available", "OutOfStock"], default: "Available"),
  itemImage: String (image URL, default: "")
}
```

### API Endpoints
- **POST** `http://localhost:5000/api/cook/meals/add` - Create a new meal (requires authentication)
- **GET** `http://localhost:5000/api/cook/meals/all` - Get all meals for logged-in cook (requires authentication)

### Authentication
- Both endpoints require JWT cookie authentication via `protect` middleware
- Cook ID is extracted from `req.user._id`

## Frontend Implementation

### Files Modified

#### Cook Module
1. **cook/src/components/cook/CookDashboard.jsx**
   - Updated to use backend API endpoints
   - Added Cloudinary image upload (reusing document upload credentials)
   - Form fields match backend model exactly
   - localStorage sync for customer frontend access

### Key Features

#### 1. Meal Creation (Cook Dashboard)
- Form fields:
  - Name (required)
  - Description (optional)
  - Price in PKR (required)
  - Category: main course, beverages, starter, other (required)
  - Availability: Available, OutOfStock (default: Available)
  - Image upload via Cloudinary

#### 2. Image Upload
- Uses same Cloudinary configuration as document uploads
- Cloud Name: `dygeug69l`
- Upload Preset: `cook_documents`
- Image uploaded first, then URL sent to backend in `itemImage` field

#### 3. Meal Display (Customer Dashboard)
- Loads meals from localStorage key: `homelymeals_frontend_meals`
- Displays: image, name, description, price (PKR format), category
- Filters to show only available meals

### Data Flow

```
Cook Creates Meal
    ↓
Upload Image to Cloudinary
    ↓
POST to http://localhost:5000/api/cook/meals/add with meal data
    ↓
Backend saves to MongoDB
    ↓
Frontend saves to localStorage (homelymeals_frontend_meals)
    ↓
Customer Dashboard reads from localStorage
    ↓
Displays meals to customers
```

### localStorage Fallback
Since the backend GET endpoint requires authentication and there's no public meals endpoint yet, we use localStorage as a temporary frontend-only solution:
- Key: `homelymeals_frontend_meals`
- Cook dashboard syncs meals after successful creation
- Customer dashboard reads from same key
- This is a temporary solution until a public GET /api/meals endpoint is implemented

## Testing Instructions

### 1. Start the Application
```bash
# Terminal 1 - Backend
cd server
npm start

# Terminal 2 - Cook Frontend
cd cook
npm run dev

# Terminal 3 - Customer Frontend
cd customer
npm run dev
```

### 2. Test Meal Creation
1. Open Cook app (http://localhost:5174)
2. Login as a cook
3. Navigate to dashboard
4. Click "Add New Meal"
5. Fill in all required fields:
   - Meal Name
   - Price (PKR)
   - Category
   - Upload an image (optional)
6. Click "Add Meal"
7. Verify success message
8. Check browser DevTools → Application → LocalStorage → `homelymeals_frontend_meals`

### 3. Test Meal Display
1. Open Customer app (http://localhost:5173)
2. Login as a customer
3. Navigate to dashboard
4. Verify the meal appears in the meal list
5. Check that image, name, price (PKR format), and category are displayed correctly

## Future Enhancements

### Backend Endpoints Needed
1. **GET** `/api/meals` - Public endpoint to fetch all available meals
2. **PUT** `/api/cooks/meals/:id` - Update meal
3. **DELETE** `/api/cooks/meals/:id` - Delete meal
4. **PATCH** `/api/cooks/meals/:id/availability` - Toggle availability

### Frontend Features
1. Edit meal functionality (currently disabled)
2. Delete meal functionality (currently disabled)
3. Toggle availability (currently disabled)
4. Direct backend API call for customer dashboard (when public endpoint available)
5. Real-time updates
6. Meal search and filtering

## Notes
- All prices displayed in PKR format (no $ signs)
- Image upload uses same Cloudinary setup as document verification
- Edit/Delete buttons are disabled pending backend endpoint implementation
- Customer dashboard uses localStorage fallback until public API is available
- No backend or admin-ui files were modified
- UI styling matches existing cook/customer design patterns
