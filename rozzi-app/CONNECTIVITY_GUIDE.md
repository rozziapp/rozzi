# 🔗 Connectivity Guide - Permanent Solution for Expo Go Issues

This guide explains the new automatic connectivity system that permanently fixes the issue where your Expo app can't connect to the backend after restarting the project.

## 🚀 What This System Does

The new connectivity system automatically:

1. **Detects your local IP address** - No more hardcoded IP addresses
2. **Tests multiple backend URLs** - Automatically finds the working one
3. **Caches working URLs** - Remembers successful connections
4. **Auto-retries failed requests** - Switches to working URLs automatically
5. **Monitors connection health** - Continuously checks backend availability

## 🛠️ How to Use

### 1. Automatic Setup (Recommended)

The system is already integrated into your app and will work automatically. When you start your app:

- It automatically detects your network configuration
- Tests multiple possible backend URLs
- Caches the working URL for future use
- Monitors connectivity continuously

### 2. Manual IP Update (If Needed)

If you want to manually update your IP address, run:

```bash
cd rozzi-app
node scripts/update-local-ip.js
```

This script will:
- Find your current local IP address
- Update the configuration automatically
- Show you all available network interfaces

### 3. Manual Connectivity Refresh

You can manually refresh connectivity from anywhere in your app:

```typescript
import { refreshConnectivity } from '@/utils/connectivity';

// Force a connectivity refresh
await refreshConnectivity();
```

## 📱 Adding Connectivity Status to Your Screens

You can add a connectivity status indicator to any screen:

```typescript
import ConnectivityStatus from '@/components/ConnectivityStatus';

// Simple status indicator
<ConnectivityStatus />

// Detailed status with refresh button
<ConnectivityStatus showDetails={true} />
```

## 🔧 How It Works

### 1. **Automatic IP Detection**
- Detects your platform (iOS/Android)
- Uses appropriate default URLs for each platform
- Falls back to common network IP ranges

### 2. **Smart URL Testing**
- Tests multiple possible backend URLs simultaneously
- Measures response times for each URL
- Automatically selects the fastest working URL

### 3. **Intelligent Caching**
- Stores working URLs in AsyncStorage
- Refreshes cached URLs every 30 seconds
- Falls back to cached URLs when network changes

### 4. **Automatic Retry & Fallback**
- When a request fails, automatically tries alternative URLs
- Switches to working URLs seamlessly
- Maintains app functionality even during network changes

## 🎯 Supported Backend URLs

The system automatically tests these URLs in order of preference:

1. **Platform-specific defaults:**
   - iOS Simulator: `localhost:8000/api`
   - Android Emulator: `10.0.2.2:8000/api`
   - Physical Device: Your local network IP

2. **Common network ranges:**
   - `192.168.1.x:8000/api`
   - `192.168.0.x:8000/api`
   - `10.0.0.x:8000/api`

3. **Fallback URLs:**
   - `127.0.0.1:8000/api`
   - Previously cached working URLs

## 📊 Monitoring & Debugging

### Console Logs

The system provides detailed console logs:

```
🚀 Starting connectivity initialization...
🔍 Testing backend connectivity...
🔗 http://192.168.1.100:8000/api: ✅ (45ms)
🔗 http://localhost:8000/api: ❌ (5000ms) - timeout
✅ Found working backend URL: http://192.168.1.100:8000/api
💾 Cached working backend URL: http://192.168.1.100:8000/api
```

### Connection Statistics

You can get connection statistics:

```typescript
import { getConnectionStats } from '@/utils/startupConnectivity';

const stats = await getConnectionStats();
console.log('Connection stats:', stats);
```

## 🚨 Troubleshooting

### Issue: Still can't connect after restart

**Solution:** Run the IP update script:
```bash
node scripts/update-local-ip.js
```

### Issue: Backend not accessible

**Check:**
1. Is your Django backend running? (`python manage.py runserver 0.0.0.0:8000`)
2. Is your firewall blocking port 8000?
3. Are you on the same network as your backend?

### Issue: App shows "Disconnected" status

**Solution:** 
1. Tap the refresh button in the connectivity status component
2. Check if your backend is running
3. Verify your network connection

## 🔄 Network Changes

When you change networks (e.g., switch WiFi networks):

1. **Automatic Detection:** The system detects network changes
2. **URL Refresh:** Automatically tests new network configuration
3. **Seamless Switch:** Switches to working URLs without app restart
4. **Cache Update:** Updates cached URLs for the new network

## 📱 Platform-Specific Behavior

### iOS Simulator
- Uses `localhost:8000/api`
- Works with local backend only

### Android Emulator
- Uses `10.0.2.2:8000/api`
- Works with local backend only

### Physical Device
- Automatically detects your local network IP
- Works with backend on same network
- Supports multiple network configurations

## 🎉 Benefits

✅ **No more manual IP configuration**
✅ **Automatic network detection**
✅ **Seamless network switching**
✅ **Improved app reliability**
✅ **Better user experience**
✅ **Reduced development friction**

## 🔧 Advanced Configuration

### Custom Network Ranges

You can add custom network ranges in `utils/env.ts`:

```typescript
const commonIPs = [
  '192.168.1.100',
  '192.168.1.101',
  '10.0.0.100',
  // Add your custom IPs here
  '192.168.2.100',
];
```

### Connection Timeouts

Adjust timeouts in `utils/env.ts`:

```typescript
development: {
  TIMEOUT: 10000,        // 10 seconds
  MAX_RETRIES: 3,        // 3 retry attempts
}
```

## 🚀 Getting Started

1. **Restart your app** - The system will initialize automatically
2. **Check console logs** - Verify connectivity is working
3. **Add status component** - Optional: add connectivity status to your screens
4. **Test network changes** - Switch WiFi networks to see automatic detection

## 📞 Support

If you encounter issues:

1. Check the console logs for error messages
2. Verify your backend is running and accessible
3. Run the IP update script: `node scripts/update-local-ip.js`
4. Check your network configuration

---

**🎯 The connectivity system is now fully automatic and will permanently solve your Expo Go connection issues!**
