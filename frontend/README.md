# CafeBomBom Frontend

## Requirements

- Node.js 18 LTS (minimum)
- npm
- Expo-compatible environment
  - Android: Android Studio / emulator (optional if you use Expo Go)
  - iOS: Xcode / simulator on macOS (optional if you use Expo Go)
- Modern browser for web development

## Tech Stack

- Expo + React Native + Expo Router
- TypeScript
- Zustand for state management

## Installation (Development)

1. Install dependencies:

```bash
npm install
```

## How To Run

Start Expo dev server:

```bash
npm start
```

Run directly on a platform:

```bash
npm run android
npm run ios
npm run web
```

## Available Commands

| Command | Description |
| --- | --- |
| `npm start` | Start Expo development server |
| `npm run android` | Start app on Android |
| `npm run ios` | Start app on iOS |
| `npm run web` | Start app on web |
| `npm run lint` | Run Expo ESLint configuration |

## Production Build Notes (Expo EAS)

For production builds and distribution, use Expo EAS.

Typical flow:

1. Install EAS CLI globally:

```bash
npm install -g eas-cli
```

2. Login to Expo:

```bash
eas login
```

3. Configure EAS in the project:

```bash
eas build:configure
```

4. Build for a platform:

```bash
eas build --platform android
eas build --platform ios
```

If you also plan to publish web, use your preferred static hosting provider for the Expo web output.

## Testing Status

- No automated test script is currently configured in package scripts.