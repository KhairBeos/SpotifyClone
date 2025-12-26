import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import LibraryScreen from '../screens/LibraryScreen';
import ArtistsScreen from '../screens/ArtistsScreen';
import NowPlayingScreen from '../screens/NowPlayingScreen';
import AlbumScreen from '../screens/AlbumScreen';
import PlaylistScreen from '../screens/PlaylistScreen';
import ArtistScreen from '../screens/ArtistScreen';
import QueueScreen from '../screens/QueueScreen';
import { MiniPlayer } from '../components/MiniPlayer';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: '#A7A7A7',
        tabBarIcon: ({ color, size }) => {
          let iconName = 'albums';
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Search') iconName = 'search';
          else if (route.name === 'Artists') iconName = 'people';
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Artists" component={ArtistsScreen} />
      <Tab.Screen name="Your Library" component={LibraryScreen} options={{ tabBarLabel: 'Library' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Navigator screenOptions={{ animation: 'fade' as any }}>
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="NowPlaying" component={NowPlayingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Album" component={AlbumScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Playlist" component={PlaylistScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Artist" component={ArtistScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Queue" component={QueueScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
      <MiniPlayer />
    </View>
  );
}
