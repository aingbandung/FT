# Family Locator (React + Vite + Leaflet)

Ported from Android Kotlin/Jetpack Compose to a high-performance modern React web application.

## Features
- **Authentication**: Sign in and Sign up with email, password, and display name.
- **Circle Management**: Create a new circle (generates a 6-character code) or join an existing family circle via invite code.
- **Live Map**: Real-time family member locations rendered on OpenStreetMap via Leaflet, featuring custom user avatars, SOS alert highlights, and recency indicators.
- **Places (Geofences)**: Add places at the map center with custom name and radius (in meters); visualize circle overlays and delete places.
- **Geofenced Alerts**: Automatic enter/leave boundary detection with notifications and alert feed.
- **Location History**: Route tracking and calendar date picker per member with start/end time markers, bounding box fit, and detailed waypoints.
- **Location Sharing & SOS**: Live browser Geolocation tracking with movement delta thresholding and instant emergency SOS broadcast.

## Development
- `npm run dev`: Starts the Vite development server on `0.0.0.0:3000`.
- `npm run build`: Type-checks and creates a production build in `dist/`.
