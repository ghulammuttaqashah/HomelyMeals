# PWA Installation Fixes

## Issues Fixed

### 1. **Removed `crossorigin` from manifest link**
**Problem:** The `crossorigin="use-credentials"` attribute on the manifest link can cause issues with PWA installation, especially on mobile.

**Fixed in:**
- `customer/index.html`
- `cook/index.html`

### 2. **Added maskable icon support**
**Problem:** Icons weren't marked as maskable, which is required for better Android adaptive icon support.

**Fixed in:**
- `customer/public/manifest.json`
- `cook/public/manifest.json`

Changed from:
```json
"purpose": "any"
```

To:
```json
"purpose": "any maskable"
```

### 3. **Enhanced PWA logging**
**Problem:** Insufficient logging made it hard to debug installation issues.

**Fixed in:**
- `customer/src/utils/usePWA.js`

Added console logs for:
- `beforeinstallprompt` event firing
- App installation success
- Service worker ready state
- Install outcome (accepted/dismissed)

## How to Test PWA Installation

### **Desktop (Chrome/Edge)**

1. **Clear browser data** (important!):
   ```
   Chrome Settings → Privacy → Clear browsing data
   - Cached images and files
   - Site settings
   ```

2. **Restart dev server**:
   ```bash
   # Stop current server (Ctrl+C)
   cd customer  # or cook
   npm run dev
   ```

3. **Open in browser**: `http://localhost:5173` (customer) or `http://localhost:5174` (cook)

4. **Check console** for PWA logs:
   ```
   [PWA] beforeinstallprompt event fired
   [PWA] Service worker ready
   ```

5. **Look for install prompt**:
   - Popup should appear after ~1.5 seconds
   - OR click install button in address bar (if available)
   - OR check Header for install button

6. **Click "Install App"** and accept the prompt

### **Mobile (Android Chrome)**

1. **Requirements**:
   - ✅ HTTPS (or localhost via USB debugging)
   - ✅ Valid manifest.json
   - ✅ Service worker registered
   - ✅ Icons (192x192 and 512x512)

2. **Test with HTTPS** (required for mobile):
   
   **Option A: Deploy to Vercel/Netlify**
   - Automatic HTTPS
   - Best for real testing
   
   **Option B: Use ngrok**
   ```bash
   # Install ngrok
   npm install -g ngrok
   
   # Expose customer app
   ngrok http 5173
   
   # Open the https:// URL on your phone
   ```

3. **Install on mobile**:
   - Open the HTTPS URL in Chrome
   - Wait for popup OR
   - Tap menu (⋮) → "Install app" or "Add to Home screen"

### **Mobile (iOS Safari)**

⚠️ **Note:** iOS has limited PWA support and NO `beforeinstallprompt` event.

1. Open in Safari
2. Tap Share button (□↑)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"

The cook app shows iOS-specific instructions automatically.

## Common Issues & Solutions

### Issue 1: "Install button doesn't appear"

**Causes:**
- Browser already thinks app is installed
- `beforeinstallprompt` event not firing
- PWA criteria not met

**Solutions:**
1. **Uninstall existing PWA**:
   - Desktop: chrome://apps → Right-click → Remove
   - Mobile: Long-press app icon → Uninstall

2. **Clear browser data**:
   - Settings → Privacy → Clear browsing data
   - Check "Site settings" and "Cached images"

3. **Check console** for `[PWA] beforeinstallprompt event fired`
   - If missing, PWA criteria not met

4. **Verify PWA criteria**:
   - Open DevTools → Application → Manifest
   - Check for errors
   - Verify all icons load
   - Check Service Worker is registered

### Issue 2: "Install prompt appears but nothing happens"

**Cause:** The `deferredPrompt` is null or invalid.

**Solution:**
1. Check console for errors
2. Refresh page (Ctrl+R)
3. Try clicking install button in address bar instead

### Issue 3: "Works on desktop but not mobile"

**Cause:** Mobile requires HTTPS (except localhost via USB).

**Solution:**
1. Deploy to production with HTTPS, OR
2. Use ngrok for local testing with HTTPS

### Issue 4: "Manifest not found (404)"

**Cause:** Manifest file not in public folder or wrong path.

**Solution:**
1. Verify file exists: `customer/public/manifest.json`
2. Check browser Network tab for 404 errors
3. Restart dev server

### Issue 5: "Icons not loading"

**Cause:** Icon files missing or wrong path.

**Solution:**
1. Verify files exist:
   - `customer/public/customer+admin.png`
   - `cook/public/cook.png`
2. Check browser Network tab
3. Verify icon sizes (should be at least 192x192)

## Verification Checklist

### Desktop Testing
- [ ] Clear browser cache
- [ ] Restart dev server
- [ ] Open app in browser
- [ ] See `[PWA] beforeinstallprompt event fired` in console
- [ ] Install popup appears after ~1.5 seconds
- [ ] Click "Install App" button
- [ ] App installs successfully
- [ ] App appears in chrome://apps
- [ ] App opens in standalone window

### Mobile Testing (Android)
- [ ] App deployed with HTTPS
- [ ] Open app in Chrome mobile
- [ ] Install prompt appears OR menu shows "Install app"
- [ ] Install app
- [ ] App appears on home screen
- [ ] App opens in standalone mode (no browser UI)
- [ ] App icon looks correct

### PWA Criteria (Chrome DevTools)
- [ ] Open DevTools → Application → Manifest
- [ ] No manifest errors
- [ ] All icons load (check URLs)
- [ ] Service Worker registered and active
- [ ] HTTPS (or localhost)
- [ ] start_url is valid

## Testing Commands

```bash
# Customer app
cd customer
npm run dev
# Open: http://localhost:5173

# Cook app  
cd cook
npm run dev
# Open: http://localhost:5174

# Check if manifest is accessible
curl http://localhost:5173/manifest.json
curl http://localhost:5174/manifest.json

# Check if icons are accessible
curl -I http://localhost:5173/customer+admin.png
curl -I http://localhost:5174/cook.png
```

## Debug Console Commands

Open browser console and run:

```javascript
// Check if beforeinstallprompt was captured
console.log('Install prompt:', window.__pwaInstallPrompt)

// Check if already installed
console.log('Standalone mode:', window.matchMedia('(display-mode: standalone)').matches)

// Check service worker
navigator.serviceWorker.getRegistrations().then(regs => console.log('SW registrations:', regs))

// Check manifest
fetch('/manifest.json').then(r => r.json()).then(m => console.log('Manifest:', m))
```

## Production Deployment Notes

When deploying to production:

1. **Ensure HTTPS** - Required for PWA on mobile
2. **Update start_url** - Should match your domain
3. **Update scope** - Should match your app's base path
4. **Test on real devices** - Emulators don't always match real behavior
5. **Monitor install rates** - Track how many users install

## Files Modified

1. `customer/index.html` - Removed crossorigin attribute
2. `cook/index.html` - Removed crossorigin attribute
3. `customer/public/manifest.json` - Added maskable purpose
4. `cook/public/manifest.json` - Added maskable purpose
5. `customer/src/utils/usePWA.js` - Enhanced logging
