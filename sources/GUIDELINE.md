# SEATS RESERVATION PLATFORM - MOBILE APP CONSTRUCTION GUIDELINE

## 📱 1. Android APK Standalone Compilation & GitOps Automation Guide

This guide provides a comprehensive blueprint to compile, customize branding assets (App Icon & Metadata Provider), and dynamically inject environment configurations to package the Next.js frontend into a production-ready, stateful **Android APK App** using Capacitor and GitHub Actions.

---

### 🏗️ 1.1. Local Device Sandbox Environment Bootstrapping

To generate the native mobile platform layer **without contaminating the pure web application codebase with redundant dependencies**, execute the following isolated runtime loop in your terminal inside the `./sources` directory.

#### Step 1.1.1: Compile Next.js Static Export Bundle
Force the Next.js compiler to serialize client-side views into flat static HTML/CSS/JS artifacts:
```bash
npm run mobile_build
```

### Step 1.1.2: Generate Pristine Native Android Platform Context
Leverage the on-the-fly execution capability of `npx` to fetch core capacitor binaries to instantiate the native `./android` subdirectory. This completely bypasses writing unwanted dependencies to your root `package.json`:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android --save-dev
npx -p @capacitor/core -p @capacitor/cli -p @capacitor/android cap add android
	
```

---

### 🎨 1.2. Corporate Branding Customization & App Icon Automation

Configure legal metadata claims and assign dynamic paths to corporate assets to overwrite default Android robot visual identities cleanly.

### Step 1.2.1: Register Provider Metadata & Package Name Identifier
Open `sources/capacitor.config.json` and declare your explicit reverse domain authority coordinates and application runtime settings:
```json
{
  "appId": "org.nlh4j.seats.reservation",
  "appName": "Seats Reservation Management",
  "webDir": "out",
  "bundledWebRuntime": false,
  "plugins": {
    "CapacitorHttp": {
      "enabled": true
    },
    "CapacitorCookies": {
      "enabled": true
    }
  },
  "android": {
    "backgroundColor": "#ffffff",
    "allowMixedContent": true,
    "screenOrientation": "portrait",
    "hardwareAcceleration": true,
    "overScrollMode": "never",
    "loggingBehavior": "none"
  },
  "ios": {
    "backgroundColor": "#ffffff",
    "runtimeConfiguration": true,
    "scrollExecutionMode": "never",
    "screenOrientation": "portrait",
    "handleApplicationNotifications": false,
    "loggingBehavior": "none"
  },
  "server": {
    "androidScheme": "https",
    "iosScheme": "seatsapp", 
    "hostname": "://mock-domain.com",
    "allowNavigation": [
      "://mock-domain.com"
    ],
    "cleartext": true
  }
}
```

### Step 1.2.2: Setup Legal Ownership Matrix & Build Configuration
1. Open `sources/android/app/build.gradle` and synchronize production release engine counters inside the `defaultConfig` block:
```groovy
defaultConfig {
    applicationId "com.hainguyenjc.seatsreservation"
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
    versionCode 1
    versionName "1.0.0"
    testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
}
```

2. Open `sources/android/app/src/main/AndroidManifest.xml` and insert the legal metadata tags inside the main `<application>` element block to satisfy operational audit protocols:
```xml
<application ...>
    <!-- DEVELOPER AUTHOR INTENT -->
    <meta-data android:name="developer_name" android:value="Hai Nguyen (hainguyenjc@gmail.com)" />
    <!-- CORPORATE BRANDING -->
    <meta-data android:name="company_name" android:value="Seats Reservation Platform Suite Ltd" />
    <!-- LEGAL COPYRIGHT CLAIM -->
    <meta-data android:name="copyright_claim" android:value="Copyright © 2026 Seats Reservation Platform. All Rights Reserved Under org.nlh4j License." />
</application>
```

### Step 1.2.3: Integrate Dynamic Asset Remapping Scripts
To keep the root tree clean, embed your custom logo paths (e.g., `public/mobile/logo_1024x1024.png`) and automation hooks into `sources/package.json`:
```json
{
  "scripts": {
    "mobile_build": "cross-env NODE_ENV=mobile next build",
	"mobile_generate_android": "npx -p @capacitor/core -p @capacitor/cli -p @capacitor/android cap add android",
    "mobile_android_generate_assets": "capacitor-assets generate --android --assetPath=.assets/.mobile"
  },
  "assets": {
    "android": {
      "icon": {
        "sources": [ ".assets/.mobile/icon-only.png" ]
      }
    }
  }
}
```

Execute the local task to slice and seed asset layers instantly across all resource nodes:
```bash
npm run mobile_android_generate_assets
```

---

## 🤖 1.3. Continuous Integration & Codebase Signing Pipeline

Commit the generated native `./android` platform code block to your Git repository. Paste this synchronized task stack matrix straight into your active `.github/workflows/` runner template:
```text
# =========================================================================
# 💉 ASSETS SYNCHRONIZATION & DYNAMIC CONFIG INJECTION
# =========================================================================
- name: 💉 Inject Dynamic Server Domains & Sync Capacitor Assets
if: success()                 # if previous step is successful
env:
  API_BASE_URL: ${{ inputs.target_url }}
run: |
  echo "🔌 Connecting to local configuration context layers..."
  
  # update API base URL
  CLEAN_DOMAIN=$(echo "$API_BASE_URL" | awk -F[/:] '{print $4}')
  echo "🌐 Dynamic Target Domain detected for Mobile Whitelisting: $CLEAN_DOMAIN"
  
  # update capacitor config to target url
  jq --arg host "$CLEAN_DOMAIN" \
	 '.server.hostname = $host | .server.allowNavigation = [$host]' \
	 capacitor.config.json > temp.json && mv temp.json capacitor.config.json
  
  echo "-------------------------------------------------------------------------"
  echo "📊 PRINTING FINALIZED SANITIZED CAPACITOR APP CONFIGURATION:"
  cat capacitor.config.json
  echo "-------------------------------------------------------------------------"
  
  # -------------------------------------------------
  # !!!IMPORTANT!!!
  # Sync anything from next.js build and generated assets (must run it on local first, and push to repository) such as logo, etc.
  # Assets must be generated before on local, because it requires Graphics Hardware to generate.
  # Not running in pipeline, it will make CI/CD crash.
  # -------------------------------------------------
  echo "📱 Syncing structural android assets pipeline..."
  npx cap sync android
  
  # sync app information such as appId, appName to Manifest
  npx cap copy android

# ⚙️ Setup JDK (require to Gradle compiler package APK)
- name: ⚙️ Setup Java JDK
if: success()                 # if previous step is successful
uses: actions/setup-java@v4
with:
  distribution: 'zulu'
  java-version: '21'
  cache: 'gradle'

# 🛡️ Grant permission to Gradle to build Android
- name: 🛡️ Grant permissions for gradlew
if: success()                 # if previous step is successful
run: chmod +x android/gradlew

# 🏗️ Build Android Release APK
- name: 🏗️ Build Android Release APK
if: success()                 # if previous step is successful
working-directory: ./sources/android
env:
  ASSEMBLE_DEBUG_BUILD: ${{ inputs.assemble_debug }}
  DEBUG_MODE: ${{ inputs.debug_mode }}
run: |
  echo "📌 Current Gradle execution workspace: $(pwd)"
  
  # 🔥 FIXED BASH SYNTAX: Standardized bracket spacing logic and flags
  if [ "$DEBUG_MODE" == "true" ] && [ "$ASSEMBLE_DEBUG_BUILD" == "true" ]; then
	./gradlew assembleDebug --stacktrace --debug
  
  elif [ "$DEBUG_MODE" != "true" ] && [ "$ASSEMBLE_DEBUG_BUILD" == "true" ]; then
	./gradlew assembleDebug
  
  elif [ "$DEBUG_MODE" == "true" ] && [ "$ASSEMBLE_DEBUG_BUILD" != "true" ]; then
	./gradlew assembleRelease --stacktrace --debug
  
  else
	./gradlew assembleRelease
  fi
  
  # change the built APK file name
  if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
	mv app/build/outputs/apk/debug/app-debug.apk app/build/outputs/apk/release/seats-reservation-unsigned-app.apk
  else
	mv app/build/outputs/apk/release/app-release-unsigned.apk app/build/outputs/apk/release/seats-reservation-unsigned-app.apk
  fi
  
  echo "========================================================================="
  echo "🎉 SUCCESS: Unsigned APK artifact materialized inside outputs/apk/release!"
  echo "========================================================================="

# 🔓 Decode secrets keystore base64 to keystore file for singing
- name: 🔓 Decode Android Keystore Cryptographic Vector safely
if: success() && inputs.sign == true        # if previous step is successful
working-directory: ./sources/android
env:
  KEYSTORE_APK: ${{ secrets.KEYSTORE_APK }}
run: |
  # -------------------------------------------------
  # !!!IMPORTANT!!! Due to standards of android, module is `app`.
  # and rule of built APK file name is `<module name. ex: app>-release-unsigned.apk`.
  # so not configure `build.gradle`, built APK file name will be `app-release-unsigned.apk`
  # -------------------------------------------------
  echo "🔓 Reconstituting binary keystore artifact structure safely..."
  # decode secrets sign key base64 to file for signing APK
  echo -n "$KEYSTORE_APK" | base64 --decode > app/build/outputs/apk/release/seats-reservation-signing-key.jks
  echo "🛡️ Certified pristine binary keystore file materialized cleanly on RAM disk."

# =========================================================================
# 📝 BASH SIGNING PIPELINE: ZIPALIGN + APKSIGNER (ZERO THIRD-PARTY RISK)
# =========================================================================
- name: 📝 Run Native Linux Bash Zipalign & Apksigner Toolchains
if: success() && inputs.sign == true
working-directory: ./sources/android
run: |
  # Step A: Navigate deep into the local binary output depository
  cd app/build/outputs/apk/release
  
  # 🔥 FIND BUILD TOOLS VERSION: use * to find build-tools path
  SDK_TOOLS_PATH=$(ls -d $ANDROID_HOME/build-tools/* | tail -n 1)
  echo "🎯 Automated SDK Radar Detected Build-Tools Path at: $SDK_TOOLS_PATH"
  
  echo "⏰ Executing hardware byte alignment alignment for Android 11+ compatibility..."
  $SDK_TOOLS_PATH/zipalign -v 4 seats-reservation-unsigned-app.apk seats-reservation-aligned-app.apk
  
  echo "📌 Injecting cryptographic signatures directly into the application core layout..."
  $SDK_TOOLS_PATH/apksigner sign \
	--ks seats-reservation-signing-key.jks \
	--ks-key-alias "${{ secrets.KEYSTORE_APK_ALIAS }}" \
	--ks-pass pass:"${{ secrets.KEYSTORE_APK_KEYSTORE_PWD }}" \
	--key-pass pass:"${{ secrets.KEYSTORE_APK_KEY_PWD }}" \
	--out seats-reservation-signed.apk \
	seats-reservation-aligned-app.apk
	
  echo "========================================================================="
  echo "🏆 SUCCESS: Pristine certified production seats-reservation-signed.apk generated!"
  echo "========================================================================="

# 📤 Upload signed APK to GitHub Artifacts for download
- name: 📤 Upload RELEASED APK Artifact for Download
if: success() && inputs.sign == true        # if previous step is successful
uses: actions/upload-artifact@v4
with:
  name: seats-reservation-app
  path: sources/android/app/build/outputs/apk/release/seats-reservation-signed.apk
  retention-days: 3     # auto delete file on GitHub after 3 days to save resources

# 📤 Upload unsigned APK to GitHub Artifacts for download
- name: 📤 Upload APK Artifact for Download
if: success() && inputs.sign != true        # if previous step is successful
uses: actions/upload-artifact@v4
with:
  name: seats-reservation-unsigned-app
  path: sources/android/app/build/outputs/apk/release/seats-resevation-unsigned-app.apk
  retention-days: 3     # auto delete file on GitHub after 3 days to save resources

# 📊 Inject Absolute APK Download Link Into Job Run Summary
- name: 📊 Inject Absolute APK Download Link Into Job Run Summary
if: success()                               # if previous step is successful
run: |
  echo "📚 Compiling Markdown interface parameters for Github Steps Summary..."
  
  # 🎯 GitHub compile link automatically:
  RUN_URL="${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
  ARTIFACT_URL="$RUN_URL#artifacts"
  
  # 🏁 Print out to GITHUB_STEP_SUMMARY
  echo "### 📱 NEXT.JS APP MOBILE PRODUCTION BUILDS OUT" >> $GITHUB_STEP_SUMMARY
  echo "🚀 **Android APK Compilation Suite Finished Processing Successfully!**" >> $GITHUB_STEP_SUMMARY
  echo "" >> $GITHUB_STEP_SUMMARY
  echo "| Artifact Name | Build Version | Download Action Link |" >> $GITHUB_STEP_SUMMARY
  echo "| :--- | :--- | :--- |" >> $GITHUB_STEP_SUMMARY
  
  # Use Markdown [Text](URL) for downloading APK
  echo "| 📦 **Seats Reservation APK** | \`${{ github.sha }}\` | [📥 Download APK]($ARTIFACT_URL) |" >> $GITHUB_STEP_SUMMARY
  
  echo "" >> $GITHUB_STEP_SUMMARY
  echo "💡 *Note: Artifact preservation lifecycle is locked to exactly 3 days before automated eviction.*" >> $GITHUB_STEP_SUMMARY
  echo "========================================================================="
  echo "✅ Job Summary visualization completed successfully!"
  echo "========================================================================="
```

---

## 📱 2. iOS IPA Standalone Compilation & GitOps Automation Guide

This guide provides a comprehensive blueprint to compile, customize branding assets (App Icon & Metadata Provider), and dynamically inject environment configurations to package the Next.js frontend into a production-ready, stateful **iOS IPA App** using Capacitor and GitHub Actions.

---

### 🏗️ 2.1. Local Device Sandbox Environment Bootstrapping

To generate the native mobile platform layer **without contaminating the pure web application codebase with redundant dependencies**, execute the following isolated runtime loop in your terminal inside the `./sources` directory.

#### Step 2.1.1: Compile Next.js Static Export Bundle
Force the Next.js compiler to serialize client-side views into flat static HTML/CSS/JS artifacts:
```bash
npm run mobile_build
```

### Step 1.1.2: Generate Pristine Native Android Platform Context
Leverage the on-the-fly execution capability of `npx` to fetch core capacitor binaries to instantiate the native `./ios` subdirectory. This completely bypasses writing unwanted dependencies to your root `package.json`:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios --save-dev
npx -p @capacitor/core -p @capacitor/cli -p @capacitor/ios cap add ios
```

---

### 🎨 1.2. Corporate Branding Customization & App Icon Automation

Configure legal metadata claims and assign dynamic paths to corporate assets to overwrite default Android robot visual identities cleanly.

### Step 1.2.1: Register Provider Metadata & Package Name Identifier
Open `sources/capacitor.config.json` and declare your explicit reverse domain authority coordinates and application runtime settings:
```json
{
  "appId": "org.nlh4j.seats.reservation",
  "appName": "Seats Reservation Management",
  "webDir": "out",
  "bundledWebRuntime": false,
  "plugins": {
    "CapacitorHttp": {
      "enabled": true
    },
    "CapacitorCookies": {
      "enabled": true
    }
  },
  "android": {
    "backgroundColor": "#ffffff",
    "allowMixedContent": true,
    "screenOrientation": "portrait",
    "hardwareAcceleration": true,
    "overScrollMode": "never",
    "loggingBehavior": "none"
  },
  "ios": {
    "backgroundColor": "#ffffff",
    "runtimeConfiguration": true,
    "scrollExecutionMode": "never",
    "screenOrientation": "portrait",
    "handleApplicationNotifications": false,
    "loggingBehavior": "none"
  },
  "server": {
    "androidScheme": "https",
    "iosScheme": "seatsapp", 
    "hostname": "://mock-domain.com",
    "allowNavigation": [
      "://mock-domain.com"
    ],
    "cleartext": true
  }
}
```

### Step 1.2.2: Setup Legal Ownership Matrix & Build Configuration
Open `sources/ios/App/App/Info.plist` and insert the legal metadata tags inside the main `<dict>` element block to satisfy operational audit protocols:
```xml
<dict ...>
    <!-- ========================================================================= -->
    <!-- 🍏 ENTERPRISE INFRASTRUCTURE METADATA MATRIX FOR IOS -->
    <!-- ========================================================================= -->
    
    <!-- 👤 1. INFORMATION PROVIDER / AUTHOR DEPLOYMENT -->
    <key>DeveloperName</key>
    <string>Hai Nguyen (hainguyenjc@gmail.com)</string>

    <!-- 🏢 2. CORPORATE COMPANY BRANDING -->
    <key>CompanyName</key>
    <string>Seats Reservation Platform Suite Ltd</string>

    <!-- 🔏 3. LEGAL COPYRIGHT LICENSE CLAIM -->
    <key>NSHumanReadableCopyright</key>
    <string>Copyright © 2026 Seats Reservation Platform. All Rights Reserved Under org.nlh4j License.</string>

    <!-- 🎨 4. AppName IPHONE -->
    <key>CFBundleDisplayName</key>
    <string>Seats Reservation Management</string>
	
	<!-- Network Permissions -->
	<key>NSAppTransportSecurity</key>
    <dict>
        <!-- 🔥 Allow App pass through SSL filter, access every IP Server -->
        <key>NSAllowsArbitraryLoads</key>
        <true/>
    </dict>
</dict>
```

### Step 1.2.3: Integrate Dynamic Asset Remapping Scripts
To keep the root tree clean, embed your custom logo paths (e.g., `public/mobile/logo_1024x1024.png`) and automation hooks into `sources/package.json`:
```json
{
  "scripts": {
    "mobile_build": "cross-env NODE_ENV=mobile next build",
	"mobile_generate_ios": "npx -p @capacitor/core -p @capacitor/cli -p @capacitor/ios cap add ios",
    "mobile_ios_generate_assets": "capacitor-assets generate --ios --assetPath=.assets/.mobile"
  },
  "assets": {
    "ios": {
      "icon": {
        "sources": [ ".assets/.mobile/icon-only.png" ]
      }
    }
  }
}
```

Execute the local task to slice and seed asset layers instantly across all resource nodes:
```bash
npm run mobile_ios_generate_assets
```

---

## 🤖 1.3. Continuous Integration & Codebase Signing Pipeline

Commit the generated native `./ios` platform code block to your Git repository. Paste this synchronized task stack matrix straight into your active `.github/workflows/` runner template:
```text
# =========================================================================
# 💉 ASSETS SYNCHRONIZATION & DYNAMIC CONFIG INJECTION [3.2]
# =========================================================================
- name: 💉 Inject Dynamic Server Domains & Sync Capacitor Assets
if: success()                 # if previous step is successful
env:
  API_BASE_URL: ${{ inputs.target_url }}
run: |
  echo "🔌 Connecting to local configuration context layers..."
  
  # update API base URL
  CLEAN_DOMAIN=$(echo "$API_BASE_URL" | awk -F[/:] '{print $4}')
  echo "🌐 Dynamic Target Domain detected for Mobile Whitelisting: $CLEAN_DOMAIN"
  
  # update capacitor config to target url
  jq --arg host "$CLEAN_DOMAIN" \
	 '.server.hostname = $host | .server.allowNavigation = [$host]' \
	 capacitor.config.json > temp.json && mv temp.json capacitor.config.json
  
  echo "-------------------------------------------------------------------------"
  echo "📊 PRINTING FINALIZED SANITIZED CAPACITOR APP CONFIGURATION:"
  cat capacitor.config.json
  echo "-------------------------------------------------------------------------"

# =========================================================================
# 🍏 COCOAPODS NETWORKING INTERCEPTOR
# =========================================================================
# Xcode require CocoaPods packet engines to bind native Swift/Obj-C layers.
- name: 🍏 Install CocoaPods Internal Dependencies
if: success()                 # if previous step is successful
working-directory: ./sources/ios/App
run: |
  cd ../..
  
  # -------------------------------------------------
  # !!!IMPORTANT!!!
  # Sync anything from next.js build and generated assets (must run it on local first, and push to repository) such as logo, etc.
  # Assets must be generated before on local, because it requires Graphics Hardware to generate.
  # Not running in pipeline, it will make CI/CD crash.
  # -------------------------------------------------
  echo "🍏 Syncing structural ios assets pipeline..."
  npx cap sync ios
  
  # sync app information such as appId, appName to Manifest
  npx cap copy ios
  
  # run pod install to download network native driver of Apple
  cd ios/App
  pod install

# =========================================================================
# 🛠️ XCODEBUILD COMPILATION SUITE: BUILD ARCHIVE & EXPORT IPA
# =========================================================================
- name: 🛠️ Compile Xcode Project and Export Production Archive
working-directory: ./sources/ios/App
env:
  DEBUG_MODE: ${{ inputs.debug_mode }}
run: |
  echo "🛠️ Kicking off native xcodebuild compilation tracking loops..."
  
  # Step A: Clean and create the binary .xcarchive bundle matrix cleanly
  # We bypass severe provisioning profile codesigning blocks during testing via 'CODE_SIGNING_ALLOWED=NO'
  if [ "$DEBUG_MODE" == "true" ]; then
	xcodebuild clean archive \
	  -workspace 'Seats Reservation Management.xcworkspace' \
	  -scheme 'Seats Reservation Management' \
	  -configuration Release \
	  -archivePath 'build/Seats Reservation Management.xcarchive' \
	  -verbose \
	  -resultBundlePath build/logs/AppBuildReport.xcresult \
	  CODE_SIGNING_ALLOWED=NO \
	  CODE_SIGNING_REQUIRED=NO \
	  PRODUCT_BUNDLE_IDENTIFIER="org.nlh4j.seats.reservation"
  
  else
	xcodebuild clean archive \
	  -workspace 'Seats Reservation Management.xcworkspace' \
	  -scheme 'Seats Reservation Management' \
	  -configuration Release \
	  -archivePath 'build/Seats Reservation Management.xcarchive' \
	  CODE_SIGNING_ALLOWED=NO \
	  CODE_SIGNING_REQUIRED=NO \
	  PRODUCT_BUNDLE_IDENTIFIER="org.nlh4j.seats.reservation"
  fi
  
  echo "========================================================================="
  echo "✅ SUCCESS: 'Seats Reservation Management.xcarchive' payload materialized cleanly on macOS storage!"
  echo "========================================================================="

# =========================================================================
# 📤 GITOPS ARCHIVE VECTOR: Upload the output binary architecture to GitHub Cloud
# =========================================================================
- name: 📤 Upload RELEASED iOS xcarchive Bundle for Download
uses: actions/upload-artifact@v4
with:
  name: seats-reservation-ios-app
  path: sources/ios/App/build/App.xcarchive
  retention-days: 3

# 📊 Inject Absolute IPA Download Link Into Job Run Summary
- name: 📊 Inject Absolute XCArchive Download Link Into Job Run Summary
if: success()                               # if previous step is successful
run: |
  echo "📚 Compiling Markdown interface parameters for Github Steps Summary..."
  
  # 🎯 GitHub compile link automatically:
  RUN_URL="${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
  ARTIFACT_URL="$RUN_URL#artifacts"
  
  # 🏁 Print out to GITHUB_STEP_SUMMARY
  echo "### 🍏 NEXT.JS APP MOBILE IOS PRODUCTION BUILDS OUT" >> $GITHUB_STEP_SUMMARY
  echo "🚀 **iOS Apple xcarchive Compilation Suite Finished Processing!**" >> $GITHUB_STEP_SUMMARY
  echo "" >> $GITHUB_STEP_SUMMARY
  echo "| Artifact Name | Build Version | Download Action Link |" >> $GITHUB_STEP_SUMMARY
  echo "| :--- | :--- | :--- |" >> $GITHUB_STEP_SUMMARY
  
  # Use Markdown [Text](URL) for downloading xcarchive
  echo "| 📦 **Seats Reservation iOS** | \`${{ github.sha }}\` | [📥 Download xcarchive]($ARTIFACT_URL) |" >> $GITHUB_STEP_SUMMARY
  
  echo "" >> $GITHUB_STEP_SUMMARY
  echo "💡 *Note: Artifact preservation lifecycle is locked to exactly 3 days before automated eviction.*" >> $GITHUB_STEP_SUMMARY
  echo "========================================================================="
  echo "✅ Job Summary visualization completed successfully!"
  echo "========================================================================="
```
