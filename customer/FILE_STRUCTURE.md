# Complete File Structure & Content Guide

## 📁 Project Structure

```
customer/ (Vite React Project)
├── public/
│   └── vite.svg
├── src/
│   ├── api/                     # API Layer
│   │   ├── auth.js              # Authentication endpoints
│   │   └── axios.js             # Axios instance + interceptors
│   ├── assets/
│   │   └── react.svg
│   ├── components/              # Reusable UI Components
│   │   ├── Button.jsx           # Button with variants (primary, secondary, outline)
│   │   ├── Card.jsx             # Card wrapper component
│   │   ├── Container.jsx        # Max-width container (7xl)
│   │   ├── Footer.jsx           # Footer with copyright
│   │   ├── FormInput.jsx        # Form input with label, error, icon
│   │   ├── Header.jsx           # Header with auth state & navigation
│   │   ├── Loader.jsx           # Loading spinner (sm, md, lg)
│   │   └── MealCard.jsx         # Meal card with image, price, rating
│   ├── context/                 # React Context
│   │   └── AuthContext.jsx      # Auth state management
│   ├── pages/                   # Page Components
│   │   ├── Landing.jsx          # Landing page with meals
│   │   ├── Login.jsx            # Login page
│   │   ├── Signup.jsx           # Signup with validation
│   │   └── VerifyOtp.jsx        # OTP verification
│   ├── utils/                   # Utilities
│   │   └── constants.js         # App constants
│   ├── App.jsx                  # Main app with routing
│   ├── index.css                # Global styles + Tailwind + animations
│   └── main.jsx                 # Entry point (Vite)
├── .env                         # Environment variables
├── .env.example                 # Environment template
├── .gitignore
├── eslint.config.js
├── FILE_STRUCTURE.md            # This file
├── index.html                   # HTML entry (Vite)
├── MIGRATION.md                 # Migration documentation
├── package.json
├── postcss.config.js
├── README.md
├── tailwind.config.js
└── vite.config.js
```

## 📄 File Purposes

### Root Configuration Files

**index.html**
- Vite entry point
- Contains root div for React
- Links to main.jsx

**vite.config.js**
- Vite configuration
- React plugin setup

**tailwind.config.js**
- Tailwind CSS configuration
- Content paths for purging

**postcss.config.js**
- PostCSS configuration
- Tailwind and Autoprefixer plugins

**package.json**
- Dependencies and scripts
- Vite, React, Router, Toast, Axios

**.env**
- Environment variables
- `VITE_API_BASE_URL=http://localhost:5000`

### Source Files

#### Entry Point

**src/main.jsx**
- React app entry point
- Renders App component
- Imports global CSS

**src/App.jsx**
- Main app component
- BrowserRouter setup
- Routes configuration
- AuthProvider wrapper
- Toaster component

**src/index.css**
- Tailwind directives
- Custom animations (fadeIn, slideIn, zoomIn)
- Global styles

#### API Layer

**src/api/axios.js**
- Axios instance creation
- Base URL from env
- `withCredentials: true` for cookies
- Response interceptor for 401 handling
- Unauthorized handler setup

**src/api/auth.js**
- `signupRequest()` - POST /api/customer/signup/request
- `verifySignupOtp()` - POST /api/customer/signup/verify
- `resendSignupOtp()` - POST /api/customer/signup/resend
- `signin()` - POST /api/customer/signin
- `signout()` - POST /api/customer/signout

#### Context

**src/context/AuthContext.jsx**
- Authentication state management
- Customer data
- Pending email for OTP
- Signup data storage
- Auth methods (signup, verify, login, logout)
- Session storage integration
- Navigation after auth actions

#### Components

**src/components/Header.jsx**
- Top navigation bar
- Logo (clickable to home)
- Auth state display
- "Join as Customer" button (when logged out)
- "Join as Cook" button (opens cook portal)
- Welcome message + Sign Out (when logged in)

**src/components/Footer.jsx**
- Bottom footer
- App name and tagline
- Copyright year
- Version number

**src/components/Container.jsx**
- Max-width wrapper (7xl)
- Horizontal padding
- Centers content

**src/components/Button.jsx**
- Reusable button component
- Variants: primary, secondary, outline
- Sizes: sm, md, lg
- Tailwind styling

**src/components/Card.jsx**
- Simple card wrapper
- Border, shadow, rounded corners
- White background

**src/components/MealCard.jsx**
- Displays meal information
- Image (aspect-video)
- Name and price
- Description (line-clamp-2)
- Rating with star icon
- "Order Now" button

**src/components/FormInput.jsx**
- Reusable form input
- Label with required indicator
- Input field with validation
- Error message display
- Icon support
- Disabled state

**src/components/Loader.jsx**
- Loading spinner
- Sizes: sm, md, lg
- Orange color (brand)
- Spinning animation

#### Pages

**src/pages/Landing.jsx**
- Home page
- Header component
- Hero section with image
- "Browse Meals" button (scrolls to meals)
- Meals grid (6 placeholder meals)
- Footer component

**src/pages/Login.jsx**
- Login form
- Email and password fields
- Password visibility toggle
- Loading state
- Toast notifications
- Link to signup
- Redirects to home after login

**src/pages/Signup.jsx**
- Signup form with validation
- Personal info: name, email, contact
- Password fields with confirmation
- Address fields: houseNo (optional), street, city (Sukkur), postalCode (65200)
- Client-side validation
- Contact must be numeric
- Sends OTP on submit
- Link to login

**src/pages/VerifyOtp.jsx**
- 6-digit OTP input
- Auto-focus and auto-advance
- Paste support
- Resend OTP button
- Loading states
- Redirects to login after verification

#### Utils

**src/utils/constants.js**
- App name and version
- API base URL
- Route constants
- Color constants

## 🔄 Data Flow

### Signup Flow
1. User fills signup form → `Signup.jsx`
2. Form validation → client-side checks
3. Submit → `signupRequest()` in AuthContext
4. API call → `POST /api/customer/signup/request`
5. OTP sent → email stored in session
6. Navigate to → `VerifyOtp.jsx`
7. Enter OTP → `verifySignupOtp()`
8. API call → `POST /api/customer/signup/verify`
9. Account created → navigate to `Login.jsx`

### Login Flow
1. User enters credentials → `Login.jsx`
2. Submit → `signin()` in AuthContext
3. API call → `POST /api/customer/signin`
4. Cookie set by server → HTTP-only
5. Customer data stored → AuthContext state
6. Navigate to → `Landing.jsx`
7. Header shows → "Welcome, [Name]"

### Logout Flow
1. User clicks "Sign Out" → Header
2. Call → `signout()` in AuthContext
3. API call → `POST /api/customer/signout`
4. Cookie cleared by server
5. State reset → AuthContext
6. Navigate to → `Landing.jsx`

## 🎨 Styling System

### Tailwind Configuration
- Orange-600 as primary brand color
- Gray scale for text and backgrounds
- Responsive breakpoints (sm, md, lg)
- Custom animations in index.css

### Component Patterns
- Consistent spacing (px-4, py-3, gap-3)
- Rounded corners (rounded-lg)
- Shadows (shadow-sm)
- Transitions (transition-colors)
- Focus states (focus:ring-2)
- Hover states (hover:bg-*)

### Color Usage
- Orange-600: Primary actions, brand elements
- Gray-900: Headings
- Gray-700: Body text
- Gray-600: Secondary text
- Gray-300: Borders
- Red-500: Errors
- Yellow-400: Star ratings

## 🔧 Environment Variables

**Required in .env:**
```
VITE_API_BASE_URL=http://localhost:5000
```

**Usage in code:**
```javascript
import.meta.env.VITE_API_BASE_URL
```

## 📦 Dependencies

**Production:**
- react: ^19.2.0
- react-dom: ^19.2.0
- react-router-dom: ^6.x
- react-hot-toast: ^2.x
- axios: ^1.x

**Development:**
- vite: ^7.2.4
- @vitejs/plugin-react: ^5.1.1
- tailwindcss: ^3.4.0
- autoprefixer: ^10.4.22
- postcss: ^8.5.6

## 🚀 Commands

```bash
# Development
npm run dev

# Build
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

## ✅ All Features Included

- [x] Landing page with meal cards
- [x] Signup with OTP verification
- [x] Login with email/password
- [x] Session management with cookies
- [x] Sign out functionality
- [x] Form validation
- [x] Loading states
- [x] Toast notifications
- [x] Responsive design
- [x] Password visibility toggle
- [x] OTP auto-advance
- [x] Paste support for OTP
- [x] Resend OTP
- [x] Error handling
- [x] Protected routes (ready for implementation)
- [x] Smooth scrolling
- [x] Hover effects
- [x] Focus states

## 📝 Notes

- All code migrated from customer-ui (CRA) to customer (Vite)
- No functionality lost in migration
- Environment variables converted to Vite format
- Entry point changed from index.js to main.jsx
- All imports working correctly
- Tailwind CSS fully configured
- React Router working
- API calls working with axios
- Authentication flow complete
- Cookie handling working
- Toast notifications working
- All pages and components rendering correctly
