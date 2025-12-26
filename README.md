# SpotifyClone (Expo + TypeScript + Zustand)

A learning project that mimics Spotify's UI/UX as closely as possible without using proprietary assets. Built with Expo, TypeScript, React Navigation, Zustand, and expo-av.

## Stack
- Expo SDK 54 (React Native 0.81)
- TypeScript
- React Navigation (tabs + native stack)
- Zustand (player + library state)
- expo-av (audio playback)
- react-native-reanimated, gesture-handler, screens, safe-area
- @expo/vector-icons

## Run
```pwsh
# From project root
yarn start
# then press: a (Android), w (Web), or scan QR with Expo Go
```

## Features (current)
- Spotify-like dark theme and bottom tabs
- Mini player with play/pause
- Basic audio playback using expo-av

## Roadmap
- Full-screen player with progress + scrubbing
- Library, Album, Artist, Playlist screens with mock data
- Search screen with categories and results
- Background/lock screen controls where supported by Expo
- Queue controls (next/prev, repeat, shuffle)

## Notes
- This project avoids copying Spotify's proprietary fonts, icons, and images. Visuals are approximations.
- No Spotify APIs or DRM content are used. A demo public sample track is preloaded.

## Project structure
```
src/
  components/     # Mini player, reusable UI
  navigation/     # Root navigators
  screens/        # Home, Search, Library, NowPlaying
  store/          # Zustand stores (player)
  theme/          # Colors, tokens
```

## License
For educational purposes only. Replace demo assets with your own content.
