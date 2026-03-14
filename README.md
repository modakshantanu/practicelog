# Practice Log

Practice Log is a local-first React app for tracking piano practice sessions.
It runs entirely in the browser and stores data in localStorage.

## Features

- Record practice sessions with a live timer or manual entry.
- Track multiple pieces per session with optional focus area and per-piece duration.
- Edit and delete past sessions, including multi-select delete operations.
- Analyze practice trends by time horizon with breakdown by piece and focus area.
- Reuse past piece and focus-area values through auto-suggestions.

## Tech Stack

- React 19
- TypeScript
- Vite
- ESLint

## Getting Started

Install dependencies:

```bash
npm install
```

Run the app in development mode:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Run lint checks:

```bash
npm run lint
```

## Data Model

Each session stores:

- Start time
- Total duration (minutes)
- Notes
- One or more piece entries

Each piece entry stores:

- Piece name
- Optional focus area
- Optional per-entry duration

Data is persisted using localStorage key:

- piano_practice_sessions_v1

## Architecture Notes

- src/storage.ts handles persistence, sanitization, sorting, and suggestions.
- src/components contains UI modules split by route-style views.
- src/utils/analytics.ts computes dashboard metrics and breakdowns.
- src/utils/time.ts centralizes time parsing/formatting utilities.

## Quality Standards

- Defensive sanitization is applied when loading sessions from localStorage.
- Session lists are kept sorted by start time descending.
- UI actions that delete data require explicit confirmation.

## PWA Support

This project is configured as an installable Progressive Web App (PWA).

- App name: Practice Log
- Install targets: iPhone (Safari), Android (Chrome/Edge), desktop browsers
- Offline strategy: conservative app-shell caching only (no API/runtime data caching)
- Update behavior: quiet update, applied on next launch after service worker refresh

### Install Instructions

- iPhone (Safari): Share -> Add to Home Screen
- Android: browser menu -> Install app (or use in-app install button when available)
- Desktop: use browser install icon in address bar or app menu

### Offline Expectations

- Existing local sessions remain usable offline.
- Create/edit/delete still works offline because data is device-local.
- First load requires a network connection so the app shell can be cached.

### PWA Files

- public/manifest.webmanifest
- public/sw.js
- public/offline.html
- public/pwa-icon-192.png
- public/pwa-icon-512.png
- public/apple-touch-icon.png
