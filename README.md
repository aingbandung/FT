# Family Locator (Kotlin + Compose + Firebase)

Features: email sign-up/login, create/join a circle via invite code, live map of members
(OpenStreetMap, no Maps API key), background sharing via foreground service, SOS flag,
**places (geofences) with arrive/leave alerts**, and **per-member location history with a calendar**.

Tabs: Live | Places (pan map, tap 'Add place at center') | History (pick member + date) | Alerts.

## Setup
1. Firebase console: create a project, add Android app `com.example.familylocator`.
2. Enable Authentication > Email/Password, and create a Firestore database.
3. Download `google-services.json` into `app/`.
4. Paste `firestore.rules` into Firestore > Rules.
5. Open this folder in Android Studio (it generates the Gradle wrapper), then Run.
6. Install on two phones, sign up on each, create a circle on one, join with the code on the other.

## Notes
- Geofences are checked in the sharing service on each location update (no background-location permission needed). Alerts notify other members whose sharing service is running.
- History is saved when a member moves 20 m or every 2 min. Consider a Firestore TTL policy on `history.ts` to limit storage.

## Next ideas
Battery level, push notifications via FCM + Cloud Functions (alerts when apps are closed), stricter circle-only rules.

## Build APK with GitHub Actions
1. Push this project to a GitHub repo (branch `main`).
2. Make the secret value: `base64 -w0 app/google-services.json` (macOS: `base64 -i app/google-services.json | tr -d '\n'`).
3. Repo > Settings > Secrets and variables > Actions > New secret: name `GOOGLE_SERVICES_JSON`, paste the value.
4. Push (or Actions > Build APK > Run workflow). Download the APK from the run's **Artifacts**.
5. Tag a release (`git tag v1.0 && git push --tags`) to also attach the APK to a GitHub Release.

The APK is a debug build (signed with the debug key), fine for installing on your own phones.
