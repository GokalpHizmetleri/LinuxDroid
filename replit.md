# LinuxDroid

A hacker-themed Android app that lets users deploy Linux distributions inside Termux on Android. Built with Expo React Native.

## Architecture

- **Frontend**: Expo Router (React Native), ShareTechMono monospace font, dark terminal aesthetic
- **Backend**: Express.js on port 5000, provides APK registry and distro configuration

## Screens

1. **Setup** (`/setup`) - Checks for Termux and NetHunter KeX installation. Downloads APKs from server if not installed. Shows terminal-style boot log.
2. **Distros** (`/distros`) - Lists all available Linux distributions with distro icons, version info, mode availability chips.
3. **Launch** (`/launch`) - Configure and launch selected distro in CLI Only or Desktop Environment mode. Shows proot-distro command preview and opens Termux.

## Features

- APK check via `Linking.canOpenURL` with package URIs
- APK download via `expo-file-system` with progress tracking
- APK install via `expo-intent-launcher` (Android only)
- 7 Linux distros: Ubuntu, Debian, Manjaro, Kali Linux, Fedora, Arch Linux (beta), Alpine
- CLI Only and Desktop Environment modes per distro
- Terminal-style animated log output
- Animated distro cards with per-distro accent colors
- Termux command generation for each distro/mode combo

## API Endpoints

- `GET /api/apks` - Returns APK registry (Termux + NetHunter KeX)
- `GET /api/apks/:id` - Returns specific APK info
- `GET /api/distros` - Returns all distros with config
- `GET /api/distros/:id` - Returns specific distro

## Theme

- Background: #0a0a0a (near black)
- Accent: #00ff41 (matrix green)
- Cyan: #00e5ff
- Amber: #ffb700
- Red: #ff3a3a
- Purple: #c084fc
- Font: ShareTechMono_400Regular (monospace, hacker aesthetic)

## Development

- Frontend runs on port 8081 (Expo)
- Backend runs on port 5000 (Express)
- Hot module reloading enabled - no restart needed for frontend changes
- Restart "Start Backend" only after server/routes changes
