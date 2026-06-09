# 🚀 Rozzi Backend Startup Guide

This guide ensures your Django backend works automatically after system restarts, regardless of network changes.

## 🎯 **What This Solves**

- ✅ **Automatic IP detection** - No more manual configuration
- ✅ **System restart resilience** - Works every time you restart your computer
- ✅ **Network change handling** - Automatically adapts to new WiFi networks
- ✅ **Zero configuration needed** - Just run the startup script

## 🛠️ **How to Start Your Backend**

### **Option 1: Windows Batch File (Recommended)**
```bash
# Double-click this file or run from command prompt
start-backend.bat
```

### **Option 2: PowerShell Script**
```bash
# Right-click and "Run with PowerShell" or run from terminal
.\start-backend.ps1
```

### **Option 3: Python Script Directly**
```bash
python startup.py
```

### **Option 4: Manual (Not Recommended)**
```bash
python manage.py runserver 0.0.0.0:8000
```

## 🔧 **What Happens Automatically**

1. **🌐 Network Detection** - Automatically finds your current network IP
2. **⚙️ Django Configuration** - Updates `ALLOWED_HOSTS` with your IP
3. **🚀 Server Startup** - Starts Django with proper network settings
4. **📱 App Connectivity** - Your React Native app connects automatically

## 📱 **For Your React Native App**

Your app will now:
- ✅ **Automatically detect** the correct backend IP
- ✅ **Connect successfully** every time
- ✅ **Handle network changes** without manual intervention
- ✅ **Work after system restarts** without any configuration

## 🔄 **After System Restart**

1. **Navigate to** `setuna-backend` folder
2. **Double-click** `start-backend.bat` (or run any startup script)
3. **Wait for** automatic IP detection and configuration
4. **Start your React Native app** - it will connect automatically!

## 📊 **What You'll See**

```
🔧 Django Backend Startup Script
=================================
✅ Python found and in correct directory
🌐 Detected network IP: 192.168.1.100
✅ Updated Django settings with IP: 192.168.1.100
✅ Django settings updated successfully
🚀 Starting Django development server...
```

## 🚨 **Troubleshooting**

### **Issue: "Python not found"**
- Install Python from [python.org](https://python.org)
- Make sure Python is in your system PATH

### **Issue: "Not in correct directory"**
- Navigate to the `setuna-backend` folder
- Run the startup script from there

### **Issue: App still can't connect**
- Check if Django is running (you should see server logs)
- Verify your phone/emulator is on the same network
- Check firewall settings on your computer

## 🎉 **Benefits**

- **🔄 Zero Configuration** - Works automatically every time
- **🌐 Network Agnostic** - Adapts to any WiFi network
- **💻 System Restart Safe** - No manual setup needed
- **📱 App Always Works** - Your React Native app connects seamlessly

## 📝 **Quick Start Commands**

```bash
# Navigate to backend folder
cd setuna-backend

# Start backend (choose one):
start-backend.bat          # Windows batch file
.\start-backend.ps1        # PowerShell script
python startup.py          # Python script directly
```

---

**🎯 Your backend will now work automatically after every system restart!** 🎉
