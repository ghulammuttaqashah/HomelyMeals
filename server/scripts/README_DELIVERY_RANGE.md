# Fix Delivery Range Issue

## Problem
The cook's `maxDeliveryDistance` in the database is showing 5 km (default value) instead of the expected 8 km.

## Solution Options

### Option 1: Quick Fix - Update All Cooks to 8 km
```bash
cd server
node scripts/fixDeliveryRange.js all
```

### Option 2: Update Specific Cook
```bash
cd server
node scripts/fixDeliveryRange.js cook@example.com 8
```

### Option 3: Check Current Values First
```bash
cd server
node scripts/checkCooksDeliveryRange.js
```

Then update specific cook:
```bash
node scripts/updateCookDeliveryRange.js cook@example.com 8
```

## Verify the Fix

After running the script, check the server logs when:
1. Customer visits checkout page
2. Look for console logs like:
   ```
   🍳 Cook delivery info: { maxDeliveryDistance: 8 }
   📊 Delivery calculation result: { distance: 5.8, cookMaxDeliveryDistance: 8, isWithinRange: true }
   ```

## Why This Happened

1. The Cook model has a default value of 5 km for `maxDeliveryDistance`
2. When the cook was created, this default was used
3. Even if you tried to update it via the profile page, it might not have saved properly
4. The model previously had a `max: 15` constraint which has now been increased to `max: 50`

## Prevention

Going forward:
- Cooks can update their delivery range from 1-50 km via the Profile page
- The frontend and backend now support up to 50 km delivery range
- The scripts above can be used anytime to bulk update or fix individual cooks
