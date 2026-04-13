# Console Errors Guide - How to Fix

## 🔴 Current Errors Explained

### 1. ❌ Backend Server Not Running (CRITICAL)

**Error:**
```
GET http://localhost:5000/api/customer/auth/me net::ERR_CONNECTION_REFUSED
```

**Problem:** Your Node.js backend server is NOT running on port 5000.

**Solution:**
```bash
# Navigate to your server directory
cd server

# Start the backend server
npm start
# OR
node server.js
# OR
npm run dev
```

**Expected Result:** Server should start and show:
```
Server running on port 5000
Connected to MongoDB
```

---

### 2. ⚠️ Manifest Icon Warning (Minor - Browser Cache)

**Error:**
```
Error while trying to use the following icon from the Manifest: 
http://localhost:5173/icons/icon.svg
```

**Problem:** Browser cached the old manifest.json that referenced non-existent icons.

**Solution:**
1. **Hard refresh your browser:**
   - Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
   - Mac: `Cmd + Shift + R`

2. **Clear browser cache:**
   - Chrome: DevTools → Application → Clear Storage → Clear site data
   - Firefox: DevTools → Storage → Clear All

3. **Restart Vite dev server:**
   ```bash
   # Stop the server (Ctrl+C)
   # Then restart
   npm run dev
   ```

**Status:** Manifest.json has been fixed to use `/customer.png` instead of non-existent icons.

---

### 3. ⚠️ WebSocket Connection Failed (Vite HMR - Minor)

**Error:**
```
WebSocket connection to 'ws://localhost:5173/?token=...' failed
```

**Problem:** Vite's Hot Module Replacement (HMR) WebSocket connection issue.

**Solution:**
This is usually harmless and happens when:
- Browser DevTools is open before page loads
- Network configuration issues
- Multiple tabs open

**To fix:**
1. Close all browser tabs
2. Restart Vite dev server
3. Open browser again

**Note:** This doesn't affect functionality, only hot reload feature.

---

### 4. ✅ 401 Unauthorized (EXPECTED - Now Handled Silently)

**Error:**
```
GET http://localhost:5000/api/customer/auth/me 401 (Unauthorized)
```

**Status:** This is EXPECTED when user is not logged in.

**What I Fixed:**
- Updated axios interceptor to mark this as expected error
- Updated AuthContext to handle silently
- Error will no longer show in console after backend starts

**This is normal behavior** - the app checks if user is logged in on page load.

---

## ✅ Quick Fix Checklist

### Step 1: Start Backend Server (REQUIRED)
```bash
cd server
npm start
```

### Step 2: Clear Browser Cache
- Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Or clear cache in DevTools

### Step 3: Restart Frontend
```bash
cd customer
npm run dev
```

### Step 4: Verify
- Open http://localhost:5173
- Check console - should be clean now
- Backend should be responding on port 5000

---

## 🎯 Expected Clean Console Output

After following the steps above, you should see:
```
Download the React DevTools for a better development experience
SW registered: http://localhost:5173/
```

**No errors!** ✅

---

## 🔧 If Issues Persist

### Backend Won't Start?
```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000  # Windows
lsof -i :5000                  # Mac/Linux

# Kill the process if needed
# Then restart server
```

### Frontend Issues?
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Database Connection Issues?
- Check MongoDB is running
- Verify connection string in `.env`
- Check MongoDB Atlas whitelist (if using cloud)

---

## 📊 Summary

| Issue | Status | Action Required |
|-------|--------|-----------------|
| Backend not running | ❌ CRITICAL | Start server on port 5000 |
| Manifest icon | ✅ FIXED | Clear browser cache |
| WebSocket HMR | ⚠️ MINOR | Restart dev server |
| 401 on /auth/me | ✅ HANDLED | Will be silent after backend starts |

---

## 🚀 Final Status

Once you start the backend server and clear browser cache:
- ✅ Clean console output
- ✅ No error messages
- ✅ Smooth development experience
- ✅ All features working

**Main action needed: START YOUR BACKEND SERVER!** 🎯
