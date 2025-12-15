# Expo SDK Upgrade Guide

This guide explains how to upgrade your Expo project to any SDK version, including the workflow, steps, and important considerations.

## ✅ Current Status

Your project has been successfully upgraded from **SDK 53** to **SDK 54**.

## 📋 General Workflow for Upgrading Expo SDK

### Step 1: Update Expo CLI (Optional but Recommended)

Ensure you have the latest version of Expo CLI:

```bash
npm install -g expo-cli@latest
```

Or use npx (recommended):
```bash
npx expo-cli@latest --version
```

### Step 2: Review Release Notes

**IMPORTANT:** Always read the release notes for the SDK version you're upgrading to:
- [Expo SDK 54 Release Notes](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
- [Expo SDK Changelog](https://github.com/expo/expo/blob/main/CHANGELOG.md)

This helps you understand:
- Breaking changes
- Deprecated features
- New features
- Migration requirements

### Step 3: Update the Expo SDK Package

Update the main Expo package in `package.json`:

```json
{
  "dependencies": {
    "expo": "~54.0.0"  // Replace with your target SDK version
  }
}
```

Or use npm/yarn:
```bash
npm install expo@^54.0.0
# or
yarn add expo@^54.0.0
```

### Step 4: Upgrade All Dependencies

This is the **most important step**. Expo provides a command that automatically upgrades all packages to versions compatible with your SDK:

```bash
npx expo install --fix
```

**If you encounter peer dependency conflicts**, use:
```bash
npx expo install --fix -- --legacy-peer-deps
```

This command will:
- Check all Expo-related packages
- Update them to SDK-compatible versions
- Update React Native and React versions if needed
- Update TypeScript and other dev dependencies

### Step 5: Install Missing Peer Dependencies

After upgrading, check for missing peer dependencies:

```bash
npx expo-doctor
```

If any are missing, install them:
```bash
npx expo install <package-name>
```

### Step 6: Verify the Upgrade

Run expo-doctor to check for issues:

```bash
npx expo-doctor
```

This will check:
- Package compatibility
- Missing dependencies
- Configuration issues
- Common setup problems

### Step 7: Update Native Projects (If Applicable)

#### For Projects with Native Code:

**If using Continuous Native Generation (CNG):**
- Delete the `android` and `ios` directories if they exist
- They will be regenerated automatically on the next build

**If using Bare Workflow or Ejected Projects:**
- **iOS:** Run `npx pod-install` in the `ios` directory
- **Android:** May require updating Gradle files and dependencies
- Consult the [Native Project Upgrade Helper](https://docs.expo.dev/bare/upgrade/) for detailed guidance

#### For Expo Go (Managed Workflow):
- No native project updates needed
- Just ensure your Expo Go app matches the SDK version

### Step 8: Test Your Application

After upgrading, thoroughly test your app:

1. **Start the development server:**
   ```bash
   npm start
   # or
   npx expo start
   ```

2. **Test on different platforms:**
   - iOS (Expo Go or simulator)
   - Android (Expo Go or emulator)
   - Web (if applicable)

3. **Check for:**
   - Runtime errors
   - Deprecated API warnings
   - Performance issues
   - Breaking changes in your code

### Step 9: Update Your Code (If Needed)

Based on the release notes, you may need to:

1. **Update deprecated APIs:**
   - Replace deprecated functions with new ones
   - Update import paths if changed
   - Modify component props if API changed

2. **Handle breaking changes:**
   - Review migration guides
   - Update custom native code if applicable
   - Update third-party libraries

3. **Test custom configurations:**
   - Check `app.json` or `app.config.js` for deprecated options
   - Update plugin configurations
   - Verify environment variables

## 🔧 Specific Changes for SDK 53 → SDK 54 Upgrade

### Package Version Updates

The following packages were updated in your project:

| Package | Old Version | New Version |
|---------|------------|-------------|
| expo | ~53.0.20 | ~54.0.29 |
| react-native | 0.79.5 | 0.81.5 |
| react | 19.0.0 | 19.1.0 |
| react-dom | 19.0.0 | 19.1.0 |
| expo-router | ~5.1.4 | ~6.0.19 |
| react-native-reanimated | ~3.17.4 | ~4.1.1 |
| expo-image | ~2.4.0 | ~3.0.11 |
| expo-notifications | ~0.31.4 | ~0.32.15 |
| And 20+ more packages... |

### New Dependencies Added

- `react-native-worklets` - Required peer dependency for react-native-reanimated

### Important Notes

1. **React Native Reanimated 4.x:**
   - Major version update with potential API changes
   - Ensure your animations still work correctly
   - Check [Reanimated 4 migration guide](https://docs.swmansion.com/react-native-reanimated/docs/migration/)

2. **Expo Router 6.x:**
   - Check for routing changes
   - Verify navigation still works as expected

3. **Expo Image 3.x:**
   - May have API changes
   - Test image loading and caching

## 🚨 Common Issues and Solutions

### Issue 1: Peer Dependency Conflicts

**Error:** `ERESOLVE could not resolve`

**Solution:**
```bash
npx expo install --fix -- --legacy-peer-deps
```

### Issue 2: Missing Native Modules

**Error:** Module not found or native module errors

**Solution:**
1. Clear cache: `npx expo start -c`
2. Reinstall: `rm -rf node_modules && npm install`
3. For native projects: Rebuild native code

### Issue 3: TypeScript Errors

**Error:** Type errors after upgrade

**Solution:**
1. Update TypeScript: `npx expo install typescript`
2. Update type definitions: `npm install --save-dev @types/react@latest`
3. Clear TypeScript cache: Delete `*.tsbuildinfo` files

### Issue 4: Metro Bundler Errors

**Error:** Bundling failures or cache issues

**Solution:**
```bash
# Clear Metro cache
npx expo start -c

# Or reset completely
rm -rf node_modules
npm install
npx expo start -c
```

### Issue 5: Expo Go Version Mismatch

**Error:** "Project is incompatible with this version of Expo Go"

**Solution:**
- Upgrade your project to match Expo Go SDK version, OR
- Install matching Expo Go version from the app store

## 📝 Pre-Upgrade Checklist

Before upgrading, make sure to:

- [ ] **Backup your project** (commit to git)
- [ ] **Read the release notes** for breaking changes
- [ ] **Check third-party library compatibility**
- [ ] **Review your custom native code** (if applicable)
- [ ] **Test current version** to establish baseline
- [ ] **Note any deprecated warnings** in current version

## 📝 Post-Upgrade Checklist

After upgrading, verify:

- [ ] All dependencies installed successfully
- [ ] `npx expo-doctor` passes all checks
- [ ] App starts without errors
- [ ] All screens render correctly
- [ ] Navigation works properly
- [ ] API calls function correctly
- [ ] No console warnings/errors
- [ ] Test on all target platforms

## 🔄 Upgrade Command Summary

Here's a quick reference for upgrading:

```bash
# 1. Update Expo SDK
npm install expo@^<SDK_VERSION>

# 2. Fix all dependencies
npx expo install --fix -- --legacy-peer-deps

# 3. Install missing peer dependencies (if any)
npx expo install <missing-package>

# 4. Verify upgrade
npx expo-doctor

# 5. Clear cache and restart
npx expo start -c
```

## 📚 Additional Resources

- [Expo SDK Upgrade Walkthrough](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
- [Expo Release Notes](https://docs.expo.dev/versions/latest/)
- [React Native Upgrade Helper](https://react-native-community.github.io/upgrade-helper/)
- [Expo Forums](https://forums.expo.dev/)
- [Expo Discord](https://chat.expo.dev/)

## 🎯 Quick Reference: SDK Versions

| SDK Version | React Native | React | Release Date |
|-------------|--------------|-------|--------------|
| SDK 54 | 0.81.5 | 19.1.0 | Latest |
| SDK 53 | 0.79.5 | 19.0.0 | Previous |
| SDK 52 | 0.76.x | 18.x | Older |

## ⚠️ Important Reminders

1. **Always test thoroughly** after upgrading
2. **Read release notes** before upgrading
3. **Backup your project** before major upgrades
4. **Upgrade incrementally** if jumping multiple SDK versions
5. **Check third-party libraries** for compatibility
6. **Update your CI/CD** if using automated builds

---

**Last Updated:** After SDK 53 → SDK 54 upgrade
**Project:** Setuna App
**Status:** ✅ Successfully upgraded to SDK 54

