# Family Locator (Android APK)

Real-time family location sharing, geofenced place alerts, and travel history powered by OpenStreetMap (osmdroid) and Firebase.

## Features
- **Live Tab**: Real-time family member tracking on OpenStreetMap with avatar pins, recency timestamps, and emergency SOS alerts.
- **Places (Geofences) Tab**: Add zones at the map center (+) with customizable radii (in meters); automatic enter/leave detection.
- **History Tab**: Member selector chips, date picker, route polyline visualization, and start/end waypoint markers.
- **Alerts Tab**: Feed of arrival and departure events with timestamps.
- **Background Sharing**: Runs via Android foreground service with notification controls.

## How to Get the APK File

### Method 1: Automatic Download from GitHub Actions
1. Push this code to your GitHub repository (branch `main`).
2. Go to **Actions** in your GitHub repository and select the latest **Build APK** workflow run.
3. Scroll down to the **Artifacts** section at the bottom of the page.
4. Click **`FamilyLocator-debug-apk`** to download the zip containing your `app-debug.apk`.
5. Extract and install the APK on your Android phone!

### Method 2: GitHub Releases (Automatic on Tag)
Whenever you tag a version, GitHub Actions will automatically attach the APK directly to the release:
```bash
git tag v1.0.0
git push --tags
```
Then download the `.apk` directly from your repo's **Releases** tab.

### Method 3: Build in Android Studio
1. Open this repository in Android Studio.
2. Select **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
3. When finished, click **locate** to find `app-debug.apk`.
