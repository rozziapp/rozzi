warning: in the working copy of 'rozzi-app/android/app/src/main/AndroidManifest.xml', LF will be replaced by CRLF the next time Git touches it
[1mdiff --git a/rozzi-app/android/app/src/main/AndroidManifest.xml b/rozzi-app/android/app/src/main/AndroidManifest.xml[m
[1mindex 5f937520..a74dea30 100644[m
[1m--- a/rozzi-app/android/app/src/main/AndroidManifest.xml[m
[1m+++ b/rozzi-app/android/app/src/main/AndroidManifest.xml[m
[36m@@ -1,9 +1,8 @@[m
[31m-<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">[m
[32m+[m[32m<manifest xmlns:android="http://schemas.android.com/apk/res/android">[m
   <uses-permission android:name="android.permission.INTERNET"/>[m
[31m-  <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>[m
[31m-  <uses-permission android:name="android.permission.RECORD_AUDIO"/>[m
   <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>[m
   <uses-permission android:name="android.permission.VIBRATE"/>[m
[32m+[m[32m  <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>[m
   <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>[m
   <queries>[m
     <intent>[m
[36m@@ -12,23 +11,17 @@[m
       <data android:scheme="https"/>[m
     </intent>[m
   </queries>[m
[31m-  <application android:name=".MainApplication" android:label="@string/app_name" android:icon="@mipmap/ic_launcher" android:roundIcon="@mipmap/ic_launcher_round" android:allowBackup="true" android:theme="@style/AppTheme" android:supportsRtl="true" android:enableOnBackInvokedCallback="false">[m
[31m-    <meta-data android:name="expo.modules.updates.ENABLED" android:value="true"/>[m
[31m-    <meta-data android:name="expo.modules.updates.EXPO_RUNTIME_VERSION" android:value="@string/expo_runtime_version"/>[m
[31m-    <meta-data android:name="expo.modules.updates.EXPO_UPDATES_CHECK_ON_LAUNCH" android:value="ALWAYS"/>[m
[31m-    <meta-data android:name="expo.modules.updates.EXPO_UPDATES_LAUNCH_WAIT_MS" android:value="0"/>[m
[31m-    <meta-data android:name="expo.modules.updates.EXPO_UPDATE_URL" android:value="https://u.expo.dev/d44c93f6-7ee8-4c78-ba2d-fc89ee6abf55"/>[m
[31m-    <activity android:name=".MainActivity" android:configChanges="keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode" android:launchMode="singleTask" android:windowSoftInputMode="adjustResize" android:theme="@style/Theme.App.SplashScreen" android:exported="true" android:screenOrientation="portrait">[m
[32m+[m[32m  <application android:name=".MainApplication" android:label="@string/app_name" android:icon="@mipmap/ic_launcher" android:roundIcon="@mipmap/ic_launcher_round" android:allowBackup="false" android:theme="@style/AppTheme" android:supportsRtl="true">[m
[32m+[m[32m    <activity android:name=".MainActivity" android:configChanges="keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode" android:launchMode="singleTask" android:windowSoftInputMode="adjustResize" android:theme="@style/Theme.App.SplashScreen" android:exported="true">[m
       <intent-filter>[m
         <action android:name="android.intent.action.MAIN"/>[m
         <category android:name="android.intent.category.LAUNCHER"/>[m
       </intent-filter>[m
[31m-      <intent-filter>[m
[31m-        <action android:name="android.intent.action.VIEW"/>[m
[31m-        <category android:name="android.intent.category.DEFAULT"/>[m
[31m-        <category android:name="android.intent.category.BROWSABLE"/>[m
[31m-        <data android:scheme="rozziapp"/>[m
[31m-      </intent-filter>[m
     </activity>[m
[32m+[m[32m    <meta-data android:name="expo.modules.updates.ENABLED" android:value="true"/>[m
[32m+[m[32m    <meta-data android:name="expo.modules.updates.EXPO_UPDATES_CHECK_ON_LAUNCH" android:value="ALWAYS"/>[m
[32m+[m[32m    <meta-data android:name="expo.modules.updates.EXPO_UPDATES_LAUNCH_WAIT_MS" android:value="0"/>[m
[32m+[m[32m    <meta-data android:name="expo.modules.updates.EXPO_UPDATE_URL" android:value="https://u.expo.dev/d44c93f6-7ee8-4c78-ba2d-fc89ee6abf55"/>[m
[32m+[m[32m    <meta-data android:name="expo.modules.updates.EXPO_RUNTIME_VERSION" android:value="@string/expo_runtime_version"/>[m
   </application>[m
 </manifest>[m
\ No newline at end of file[m
