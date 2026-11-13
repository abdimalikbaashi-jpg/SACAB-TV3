# SACAB TV – Streaming Application

Premium black & golden-yellow streaming app with Firebase, admin dashboard, ads management, and bilingual support (Somali / English).

## Quick Start

1. Open `index.html` via a local server (or host on Firebase Hosting / Netlify).
2. Register with email: **abdimalikbaashi@gmail.com** → becomes Super Admin automatically.
3. Open `/admin/` to manage content and ads.

## Firebase Setup Required

### 1. Authentication
- Enable **Email/Password** in Firebase Console → Authentication → Sign-in method.

### 2. Realtime Database Rules (paste in Firebase Console)

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && (auth.uid == $uid || root.child('admins').child(auth.uid).exists())",
        ".write": "auth != null && (auth.uid == $uid || root.child('admins').child(auth.uid).val() === 'super')"
      }
    },
    "admins": {
      ".read": "auth != null && root.child('admins').child(auth.uid).exists()",
      ".write": "auth != null && root.child('admins').child(auth.uid).val() === 'super'"
    },
    "content": {
      ".read": true,
      ".write": "auth != null && root.child('admins').child(auth.uid).exists()"
    },
    "favorites": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid"
      }
    },
    "watchHistory": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid"
      }
    },
    "ads": {
      ".read": true,
      ".write": "auth != null && root.child('admins').child(auth.uid).exists()"
    },
    "appSettings": {
      ".read": true,
      ".write": "auth != null && root.child('admins').child(auth.uid).val() === 'super'"
    }
  }
}
```

### 3. Storage Rules (for future file uploads)

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && 
        firestore.get(/databases/(default)/documents/admins/$(request.auth.uid)).data != null;
    }
  }
}
```

(Adjust Storage rules to use Realtime Database claims if preferred.)

## Features

- **Users:** Register, login, password reset, profile, language (SO/EN)
- **Content:** Movies, Anime, K-Drama, Series + episodes
- **Player:** Play/pause, seek, fullscreen, resume position
- **Favorites & Watch History**
- **Admin:** Content CRUD, users overview, ads (AdSense/Adsterra/custom), editors
- **Ads placements:** Home top, home mid, detail page, player tag

## Super Admin

Email: `abdimalikbaashi@gmail.com`  
On first login/register with this email, Super Admin role is written to `admins/{uid}`.

## Ads

Admin → Advertisements:
1. Choose network (AdSense / Adsterra / Custom)
2. Paste Publisher ID and optional global script
3. Enable placements and paste image URL + link, or HTML/network code
4. Save – ads appear in the app immediately

## Structure

```
sacab-tv-app/
├── index.html          # Main app
├── css/app.css
├── js/
│   ├── firebase-config.js
│   ├── i18n.js
│   └── app.js
├── admin/
│   ├── index.html
│   ├── admin.css
│   └── admin.js
└── assets/logo.png
```

## Notes

- OTP email/SMS requires Firebase Cloud Functions + email provider / Phone Auth setup. Structure is ready; enable in Firebase Console when you configure billing/providers.
- Video playback supports direct MP4 and HLS (m3u8) URLs in modern browsers.
- Host the folder on HTTPS for best Firebase Auth and fullscreen experience.
