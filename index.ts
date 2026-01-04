import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { enableFreeze } from 'react-native-screens';
import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';

import App from './App';

// Disable react-native-screens freeze to avoid Suspense/Freeze crash on some devices
enableFreeze(false);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Register TrackPlayer service for background/remote controls
try {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	TrackPlayer.registerPlaybackService(() => require('./src/player/service').PlaybackService);
} catch {}
