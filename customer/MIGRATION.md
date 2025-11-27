# Migration from customer-ui (CRA) to customer (Vite)

## Complete Migration Summary

Successfully migrated all code from `customer-ui` (Create React App) to `customer` (Vite) project.

## Folder Structure

```
customer/
├── public/
│   └── vite.svg
├── src/
│   ├── api/
│   │   ├── auth.js              # Auth API endpoints
│   │   └── axios.js             # Axios instance with interceptors
│   ├── components/
│   │   ├── Button.jsx           # Reusable button component
│   │   ├── Card.jsx             # Card wrapper
│   │   ├── Container.jsx        # Max-width container
│   │   ├── Footer.jsx           # Footer component
│   │   ├── FormInput.jsx        # Form input component
│   │   ├── Header.jsx           # Header with auth state
│   │   ├── Loader.jsx           # Loading spinner
│   │   └── MealCard.jsx         # Meal card component
│   ├── context/
│   │   └── AuthContext.jsx      # Authentication context
│   ├── pages/
│   │   ├── Landing.jsx          # Landing page
│   │   ├── Login.jsx            # Login page
│   │   ├── Signup.jsx           # Signup page
│   │   └── VerifyOtp.jsx        # OTP verification page
│   ├── utils/
│   │   └── constants.js         # App constants
│   ├── App.jsx                  # Main app component
│   ├── index.css                # Global styles + Tailwind
│   └── main.jsx                 # Entry point (Vite)
├── .env                         # Environment variables
├── .env.example                 # Environment template
├── .gitignore
├── eslint.config.js
├── index.html                   # HTML entry (Vite)
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── vite.config.js
└── MIGRATION.md                 # This file
```

## Key Changes from CRA to Vite

### 1. Entry Point
- **CRA**: `src/index.js` with `ReactDOM.render()`
- **Vite**: `src/main.jsx` with `ReactDOM.createRoot()`

### 2. Environment Variables
- **CRA**: `process.env.REACT_APP_*`
- **Vite**: `import.meta.env.VITE_*`

**Changed in:**
- `src/api/axios.js`: `import.meta.env.VITE_API_BASE_URL`
- `src/utils/constants.js`: `import.meta.env.VITE_API_BASE_URL`

### 3. HTML Entry
- **CRA**: `public/index.html` with `%PUBLIC_URL%` placeholders
- **Vite**: `index.html` at root with direct script tag

### 4. File Extensions
- All React components use `.jsx` extension (Vite best practice)
- API and utility files use `.js` extension

### 5. Import Statements
- No changes needed - ES6 imports work the same
- Vite handles JSX in `.jsx` files automatically

## Dependencies Installed

```json
{
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^6.x",
    "react-hot-toast": "^2.x",
    "axios": "^1.x"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^5.1.1",
    "autoprefixer": "^10.4.22",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.0",
    "vite": "^7.2.4"
  }
}
```

## Features Migrated

### ✅ Authentication System
- Signup with OTP verification
- Login with email/password
- Session management with cookies
- Sign out functionality

### ✅ Pages
- Landing page with meal cards
- Login page
- Signup page with form validation
- OTP verification page

### ✅ Components
- Header with auth state
- Footer
- Reusable form inputs
- Loading spinner
- Meal cards
- Container wrapper
- Button component
- Card component

### ✅ API Layer
- Axios instance with interceptors
- Cookie handling (`withCredentials: true`)
- Auth endpoints (signup, verify, login, logout)
- Error handling

### ✅ State Management
- AuthContext for global auth state
- Session storage for pending email
- React Router for navigation

### ✅ Styling
- Tailwind CSS fully configured
- Custom animations in index.css
- Responsive design
- Orange-600 brand color

## Environment Setup

### .env File
```
VITE_API_BASE_URL=http://localhost:5000
```

### Backend API Endpoints
- `POST /api/customer/signup/request` - Send OTP
- `POST /api/customer/signup/verify` - Verify OTP & create account
- `POST /api/customer/signup/resend` - Resend OTP
- `POST /api/customer/signin` - Login
- `POST /api/customer/signout` - Logout

## Running the Project

### Development
```bash
cd customer
npm run dev
# Opens on http://localhost:5173 (Vite default)
```

### Build
```bash
npm run build
# Output in dist/ folder
```

### Preview Production Build
```bash
npm run preview
```

## Testing the Migration

1. **Start Backend**: `cd server && npm start`
2. **Start Customer App**: `cd customer && npm run dev`
3. **Test Signup Flow**:
   - Click "Join as Customer"
   - Fill signup form
   - Verify OTP
   - Login with credentials
4. **Test Login Flow**:
   - Go to `/login`
   - Enter email/password
   - Should redirect to landing page
5. **Test Sign Out**:
   - Click "Sign Out" in header
   - Should clear session and redirect

## Verification Checklist

- [x] All files migrated from customer-ui
- [x] Environment variables converted to Vite format
- [x] Entry point updated to main.jsx
- [x] All imports working correctly
- [x] Tailwind CSS configured and working
- [x] React Router working
- [x] API calls working with axios
- [x] Authentication flow working
- [x] Cookie handling working
- [x] Toast notifications working
- [x] All pages rendering correctly
- [x] All components rendering correctly
- [x] Form validation working
- [x] OTP verification working
- [x] Responsive design working

## No Breaking Changes

All functionality from customer-ui has been preserved:
- Same UI/UX
- Same component structure
- Same API integration
- Same authentication flow
- Same routing
- Same styling

The only changes are internal (CRA → Vite) and do not affect functionality.

## Notes

- Vite is significantly faster than CRA for development
- Hot Module Replacement (HMR) is instant
- Build times are much faster
- No ejecting needed - Vite config is simple and accessible
- All admin-ui patterns maintained (axios, toast, routing, cookies)
