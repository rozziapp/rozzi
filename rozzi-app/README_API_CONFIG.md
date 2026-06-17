# API Configuration Guide

## 🚀 Automatic IP Detection

The app now automatically detects the correct backend URL and provides fallback options. No more manual IP address updates!

## 🔧 How It Works

1. **Primary URL**: The app tries to use the most appropriate URL based on your platform:
   - iOS Simulator: `localhost:8000`
   - Android Emulator: `10.0.2.2:8000`
   - Physical Device: Automatically detected local IP

2. **Fallback URLs**: If the primary URL fails, the app automatically tries:
   - `localhost:8000`
   - `10.0.2.2:8000` (Android emulator)
   - `127.0.0.1:8000`

3. **Dynamic Testing**: The app tests connectivity to find the best working URL.

## 📱 Platform-Specific Behavior

### iOS Simulator
- Uses `localhost:8000` by default
- Works out of the box with most setups

### Android Emulator
- Uses `10.0.2.2:8000` by default
- This special IP maps to your host machine's localhost

### Physical Devices
- Automatically detects your local network IP
- Falls back to localhost if detection fails

## 🛠️ Troubleshooting

### If you still have connection issues:

1. **Check if your backend is running**:
   ```bash
   cd rozzi-backend
   py manage.py runserver 0.0.0.0:8000
   ```

2. **Test connectivity manually**:
   ```bash
   curl http://localhost:8000/health/
   ```

3. **Find your local IP address**:
   ```bash
   cd rozzi-app
   node scripts/find-local-ip.js
   ```

4. **Check the console logs** in your React Native app for connectivity testing results.

### Common Issues:

- **Backend not running**: Start your Django server first
- **Firewall blocking**: Allow port 8000 in your firewall
- **Wrong network**: Make sure your device is on the same network as your computer

## 🔄 Manual Override (if needed)

If you need to manually override the IP detection:

1. Edit `rozzi-app/utils/env.ts`
2. Modify the `getLocalIPAddress()` function
3. Return your specific IP address

Example:
```typescript
const getLocalIPAddress = (): string => {
  // Force a specific IP address
  return '192.168.1.100'; // Your specific IP
};
```

## 📊 Monitoring

The app logs all connectivity attempts to the console:
- ✅ Working URLs
- ❌ Failed URLs
- 🔄 Fallback attempts
- 🚀 Final selected URL

## 🎯 Best Practices

1. **Always start your backend first** before testing the app
2. **Use the health endpoint** (`/health/`) for testing connectivity
3. **Check console logs** for detailed connectivity information
4. **Restart the app** if you change network configurations

## 🆘 Still Having Issues?

1. Check the console logs for detailed error messages
2. Verify your backend is running and accessible
3. Test with `curl` or a web browser first
4. Ensure your device and computer are on the same network
5. Check firewall and antivirus settings

The new system should handle most connectivity issues automatically, but these steps will help if you need manual troubleshooting.
