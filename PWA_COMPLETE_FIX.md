# Complete PWA Installation Fix

## Critical Issues Fixed

### 1. **Manifest Configuration**
- Added `"id": "/"` field (required for proper PWA identity)
- Added `"prefer_related_applications": false` (prevents Play Store redirect)
- Separated `any` and `maskable` icon purposes (was causing icon issues)
- Fixed icon sizes in shortcuts (192x192 instead of 96x96)
- Removed empty `screenshots` array

### 2. **Service Worker Message Handling**
- Added proper `message` event listener for SKIP_WAITING
- Added comments explaining skipWaiting and clients.claim

### 3. **Icon Configuration**
- Proper icon purpose separation (any vs maskable)
- Correct size declarations

## **COMPLETE RESET PROCEDURE** (Do this first!)

### Step 1: Uninstall Existing PWAs

**Desktop:**
1. Go to `chrome://apps`
2. Right-click on "Homely Meals" or "HM Cook"
3. Click "Remove from Chrome"
4. Confirm removal

**Mobile:**
1. Long-press the app icon on home screen
2. Tap "Uninstall" or "Remove"
3. Confirm

### Step 2: Clear ALL Browser Data

**Desktop Chrome:**
1. Open `chrome://settings/clearBrowserData`
2. Select "All time"
3. Check ALL boxes:
   - Browsing history
   - Cookies and other site data
   - Cached images and files
   - **Site settings** (IMPORTANT!)
4. Click "Clear data"

**Mobile Chrome:**
1. Chrome menu (⋮) → Settings → Privacy → Clear browsing data
2. Select "All time"
3. Check all boxes
4. Clear data

### Step 3: Unregister Service Workers

**Desktop:**
1. Open DevTools (F12)
2. Go to Application tab
3. Click "Service Workers" in left sidebar
4. Click "Unregister" for all Homely Meals workers
5. Click "Clear storage" → "Clear site data"

**Mobile:**
1. Open `chrome://serviceworker-internals/`
2. Find Homely Meals entries
3. Click "Unregister"

### Step 4: Restart Everything

1. **Close ALL browser tabs**
2. **Close browser completely**
3. **Stop dev servers** (Ctrl+C)
4. **Restart dev servers:**
   ```bash
   cd customer
   npm run dev
   
   # In another terminal
   cd cook
   npm run dev
   ```
5. **Open browser in incognito/private mode** (for clean test)

## **Fresh Installation Test**

### Desktop Installation:

1. Open `http://localhost:5173` (customer) or `http://localhost:5174` (cook)

2. **Check Console** (F12) - You should see:
   ```
   SW registered: ServiceWorkerRegistration
   [Service Worker] Installing...
   [Service Worker] Caching static assets
   [Service Worker] Activating...
   [PWA] Service worker ready
   [PWA] beforeinstallprompt event fired
   ```

3. **Wait 1.5 seconds** - Install popup should appear

4. **Alternative:** Look for install icon in address bar (⊕ or ⬇)

5. **Click "Install App"**

6. **Verify Installation:**
   - App opens in standalone window (no browser UI)
   - Check `chrome://apps` - app should be listed
   - App icon should be visible and clear

### Mobile Installation (HTTPS Required):

**Option A: Deploy to Production**
```bash
# Deploy customer app
cd customer
vercel --prod

# Deploy cook app
cd cook
vercel --prod
```

**Option B: Local Testing with ngrok**
```bash
# Install ngrok
npm install -g ngrok

# Expose customer app
ngrok http 5173

# You'll get: https://abc123.ngrok.io
# Open this URL on your phone
```

**On Mobile:**
1. Open the HTTPS URL in Chrome
2. Wait for install prompt OR
3. Tap menu (⋮) → "Install app" or "Add to Home screen"
4. Tap "Install"
5. **Check notification permission** - should be asked automatically

## **Verification Checklist**

### Before Installation:
- [ ] All old PWAs uninstalled
- [ ] Browser data cleared (including site settings)
- [ ] Service workers unregistered
- [ ] Dev servers restarted
- [ ] Browser restarted

### During Installation:
- [ ] Console shows `[PWA] beforeinstallprompt event fired`
- [ ] Install popup appears OR install icon in address bar
- [ ] Clicking install shows browser's native install dialog
- [ ] Installation completes without errors

### After Installation:
- [ ] App appears in chrome://apps (desktop)
- [ ] App appears on home screen (mobile)
- [ ] App icon is clear and visible (not blurry)
- [ ] Opening app shows standalone mode (no browser UI)
- [ ] App asks for notification permission
- [ ] Notifications work when tested

## **Common Problems & Solutions**

### Problem 1: "Install prompt never appears"

**Cause:** Browser thinks app is already installed or PWA criteria not met

**Solution:**
```javascript
// Open console and check:
console.log('Install prompt:', window.__pwaInstallPrompt)
// Should show: BeforeInstallPromptEvent object

// If null, check:
console.log('Already installed:', window.matchMedia('(display-mode: standalone)').matches)
// Should be: false

// Check manifest:
fetch('/manifest.json').then(r => r.json()).then(console.log)
// Should show valid manifest with all fields
```

**If still null:**
1. Open DevTools → Application → Manifest
2. Check for errors (red text)
3. Verify all icons load (click icon URLs)
4. Check Service Worker is "activated and running"

### Problem 2: "App installs but icon is blurry/wrong"

**Cause:** Icon file issues or browser cache

**Solution:**
1. Verify icon files exist and are PNG format
2. Check icon file sizes (should be at least 192x192px)
3. Clear browser cache again
4. Uninstall and reinstall app

### Problem 3: "App doesn't ask for notification permission"

**Cause:** Permission already denied or app not in standalone mode

**Solution:**
1. Check if app is truly installed (standalone mode)
2. Go to browser settings → Site settings → Notifications
3. Find your localhost URL
4. Change from "Block" to "Ask" or "Allow"
5. Uninstall and reinstall app

### Problem 4: "Works on desktop but not mobile"

**Cause:** Mobile requires HTTPS

**Solution:**
- Deploy to production with HTTPS, OR
- Use ngrok for local HTTPS testing
- HTTP only works on desktop localhost

### Problem 5: "Redirects to Play Store"

**Cause:** `prefer_related_applications` was true or missing

**Solution:**
- Already fixed in manifest.json
- Set to `false` explicitly
- Clear cache and reinstall

## **Debug Commands**

### Check PWA Status:
```javascript
// In browser console:

// 1. Check install prompt
console.log('Install prompt:', window.__pwaInstallPrompt)

// 2. Check if installed
console.log('Standalone:', window.matchMedia('(display-mode: standalone)').matches)

// 3. Check service worker
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('SW count:', regs.length)
  regs.forEach(reg => console.log('SW scope:', reg.scope))
})

// 4. Check manifest
fetch('/manifest.json')
  .then(r => r.json())
  .then(m => console.log('Manifest:', m))
  .catch(e => console.error('Manifest error:', e))

// 5. Check notification permission
console.log('Notification permission:', Notification.permission)
```

### Force Reinstall:
```javascript
// Unregister all service workers
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister())
  console.log('All SW unregistered')
  location.reload()
})
```

## **Production Deployment Checklist**

When deploying to production:

- [ ] Update `start_url` if using subdirectory
- [ ] Update `scope` to match deployment path
- [ ] Ensure HTTPS is enabled
- [ ] Test on real Android device
- [ ] Test on real iOS device (limited support)
- [ ] Verify icons load from production URL
- [ ] Test notification permission flow
- [ ] Test actual push notifications
- [ ] Monitor install analytics

## **Files Modified**

1. ✅ `customer/public/manifest.json` - Fixed icon configuration, added id and prefer_related_applications
2. ✅ `cook/public/manifest.json` - Fixed icon configuration, added id and prefer_related_applications
3. ✅ `customer/public/sw.js` - Added message event listener
4. ✅ `cook/public/sw.js` - Added message event listener

## **Next Steps**

1. **Follow the COMPLETE RESET PROCEDURE above**
2. **Test on desktop first** - should work perfectly
3. **Deploy to production** for mobile testing
4. **Test on real mobile device** with HTTPS

The PWA should now:
- ✅ Install properly with clear icon
- ✅ Show as standalone app
- ✅ Ask for notification permission
- ✅ Work offline
- ✅ Receive push notifications
