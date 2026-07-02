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
  "appName": "Seats Reservation by nlh4j",
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
  "server": {
    "androidScheme": "https",
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
    <meta-data android:name="copyright_claim" android:value="Copyright © 2026 Seats Reservation Platform. All Rights Reserved." />
</application>
```

### Step 1.2.3: Integrate Dynamic Asset Remapping Scripts
To keep the root tree clean, embed your custom logo paths (e.g., `public/mobile/logo_1024x1024.png`) and automation hooks into `sources/package.json`:
```json
{
  "scripts": {
    "mobile_build": "cross-env NODE_ENV=mobile next build",
    "mobile_android_generate_assets": "capacitor-assets generate --android --assetPath=.assets/.mobile --android-project=./android"
  },
  "assets": {
    "android": {
      "icon": {
        "sources": [ ".assets/.mobile/logo_1024x1024.png" ]
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
- name: 🔄 Inject Dynamic Server Domains & Sync Layer
  if: success()
  env:
    TARGET_URL: ${{ inputs.target_url }}
  run: |
    echo "Extracting pristine absolute network domain footprints..."
    CLEAN_DOMAIN=$(echo "$TARGET_URL" | awk -F[/:] '{print $4}')
    jq --arg host "$CLEAN_DOMAIN" '.server.hostname = $host | .server.allowNavigation = [$host]' capacitor.config.json > temp.json && mv temp.json capacitor.config.json
    npx cap sync android
    npx cap copy android

- name: ⚙️ Setup Java JDK
  if: success()
  uses: actions/setup-java@v4
  with:
    distribution: 'zulu'
    java-version: '21'
    cache: 'gradle'

- name: 🛡️ Grant permissions for gradlew
  if: success()
  run: chmod +x android/gradlew

- name: 🏗️ Build Android Release APK
  if: success()
  working-directory: ./sources/android
  env:
    ASSEMBLE_DEBUG_BUILD: ${{ inputs.assemble_debug }}
    DEBUG_MODE: ${{ inputs.debug_mode }}
  run: |
    if [ "$DEBUG_MODE" == "true" ] && [ "$ASSEMBLE_DEBUG_BUILD" == "true" ]; then
      ./gradlew assembleDebug --stacktrace --debug
    elif [ "$DEBUG_MODE" != "true" ] && [ "$ASSEMBLE_DEBUG_BUILD" == "true" ]; then
      ./gradlew assembleDebug
    elif [ "$DEBUG_MODE" == "true" ] && [ "$ASSEMBLE_DEBUG_BUILD" != "true" ]; then
      ./gradlew assembleRelease --stacktrace --debug
    else
      ./gradlew assembleRelease
    fi
    if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
      mv app/build/outputs/apk/debug/app-debug.apk app/build/outputs/apk/release/seats-reservation-unsigned-app.apk
    else
      mv app/build/outputs/apk/release/app-release-unsigned.apk app/build/outputs/apk/release/seats-reservation-unsigned-app.apk
    fi

- name: 🔓 Decode Android Keystore Cryptographic Vector safely
  if: success() && inputs.sign == true
  env:
    KEYSTORE_APK: ${{ secrets.KEYSTORE_APK }}
  run: |
    echo -n "$KEYSTORE_APK" | base64 --decode > android/app/build/outputs/apk/release/seats-reservation-signing-key.jks

- name: 📝 Run Native Linux Bash Zipalign & Apksigner Toolchains
  if: success() && inputs.sign == true
  run: |
    cd android/app/build/outputs/apk/release
    SDK_TOOLS_PATH=$(ls -d $ANDROID_HOME/build-tools/* | tail -n 1)
    $SDK_TOOLS_PATH/zipalign -v 4 seats-reservation-unsigned-app.apk seats-reservation-aligned-app.apk
    $SDK_TOOLS_PATH/apksigner sign --ks seats-reservation-signing-key.jks --ks-key-alias "${{ secrets.KEYSTORE_APK_ALIAS }}" --ks-pass pass:"${{ secrets.KEYSTORE_APK_KEYSTORE_PWD }}" --key-pass pass:"${{ secrets.KEYSTORE_APK_KEY_PWD }}" --out seats-reservation-signed.apk seats-reservation-aligned-app.apk

- name: 📤 Upload RELEASED APK Artifact for Download
  if: success() && inputs.sign == true
  uses: actions/upload-artifact@v4
  with:
    name: seats-reservation-app
    path: sources/android/app/build/outputs/apk/release/seats-reservation-signed.apk
    retention-days: 3

- name: 📤 Upload APK Artifact for Download
  if: success() && inputs.sign != true
  uses: actions/upload-artifact@v4
  with:
    name: seats-reservation-unsigned-app
    path: sources/android/app/build/outputs/apk/release/seats-reservation-unsigned-app.apk
    retention-days: 3

- name: 📊 Inject Absolute APK Download Link Into Job Run Summary
  if: always()
  run: |
    RUN_URL="${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
    ARTIFACT_URL="$RUN_URL#artifacts"
    echo "### 📱 NEXT.JS APP MOBILE PRODUCTION BUILDS OUT" >> $GITHUB_STEP_SUMMARY
    echo "🚀 **Android APK Compilation Suite Finished Processing Successfully!**" >> $GITHUB_STEP_SUMMARY
    echo "" >> $GITHUB_STEP_SUMMARY
    echo "| Artifact Name | Build Version | Download Action Link |" >> $GITHUB_STEP_SUMMARY
    echo "| :--- | :--- | :--- |" >> $GITHUB_STEP_SUMMARY
    echo "| 📦 **cinema-seats-reservation-app** | \`${{ github.sha }}\` | [📥 Download Release APK]($ARTIFACT_URL) |" >> $GITHUB_STEP_SUMMARY
```
