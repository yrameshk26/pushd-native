import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0a0a0a', borderTopColor: '#1a1a1a' },
        tabBarActiveTintColor: '#6C63FF',
        tabBarInactiveTintColor: '#555',
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="workout"
        options={{ title: 'Workout', tabBarIcon: ({ color, size }) => <Ionicons name="barbell-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{ title: 'Log', tabBarIcon: ({ color, size }) => <Ionicons name="restaurant-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: 'Progress', tabBarIcon: ({ color, size }) => <Ionicons name="trending-up-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }}
      />
      {/* Hidden from tab bar — accessible via push navigation */}
      <Tabs.Screen name="onboarding" options={{ href: null }} />
      <Tabs.Screen name="routines" options={{ href: null }} />
      <Tabs.Screen name="routines/create" options={{ href: null }} />
      <Tabs.Screen name="routines/edit" options={{ href: null }} />
      <Tabs.Screen name="exercises" options={{ href: null }} />
      <Tabs.Screen name="exercises/edit" options={{ href: null }} />
      <Tabs.Screen name="social" options={{ href: null }} />
      <Tabs.Screen name="coach" options={{ href: null }} />
      <Tabs.Screen name="tools" options={{ href: null }} />
      <Tabs.Screen name="programs" options={{ href: null }} />
      <Tabs.Screen name="ai-planner" options={{ href: null }} />
      <Tabs.Screen name="settings/security" options={{ href: null }} />
      <Tabs.Screen name="programs/generate" options={{ href: null }} />
      <Tabs.Screen name="progress/volume" options={{ href: null }} />
      <Tabs.Screen name="progress/summary" options={{ href: null }} />
      {/* Nutrition sub-screens */}
      <Tabs.Screen name="nutrition/supplements" options={{ href: null }} />
      <Tabs.Screen name="nutrition/templates" options={{ href: null }} />
      {/* Meals library */}
      <Tabs.Screen name="meals" options={{ href: null }} />
      <Tabs.Screen name="meals/new" options={{ href: null }} />
      <Tabs.Screen name="meals/[planId]" options={{ href: null }} />
      <Tabs.Screen name="meals/grocery-list" options={{ href: null }} />
    </Tabs>
  );
}
