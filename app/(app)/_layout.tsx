import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderTopColor: '#1a1a1a',
          borderTopWidth: 1,
          height: 83,
          paddingBottom: 28,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#555',
      }}
    >
      {/* ── Visible tabs (in order) ─────────────────────────────────── */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: 'Routines',
          tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: 'Social',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: 'Meals',
          tabBarIcon: ({ color, size }) => <Ionicons name="restaurant-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />

      {/* ── Hidden — accessible only via push navigation ─────────────── */}

      {/* Workout */}
      <Tabs.Screen name="workout" options={{ href: null }} />
      <Tabs.Screen name="workout/index" options={{ href: null }} />
      <Tabs.Screen name="workout/active" options={{ href: null }} />
      <Tabs.Screen name="workout/history" options={{ href: null }} />
      <Tabs.Screen name="workout/[id]" options={{ href: null }} />

      {/* Nutrition */}
      <Tabs.Screen name="nutrition" options={{ href: null }} />
      <Tabs.Screen name="nutrition/index" options={{ href: null }} />
      <Tabs.Screen name="nutrition/goals" options={{ href: null }} />
      <Tabs.Screen name="nutrition/log-food" options={{ href: null }} />
      <Tabs.Screen name="nutrition/water" options={{ href: null }} />
      <Tabs.Screen name="nutrition/supplements" options={{ href: null }} />
      <Tabs.Screen name="nutrition/templates" options={{ href: null }} />

      {/* Progress */}
      <Tabs.Screen name="progress" options={{ href: null }} />
      <Tabs.Screen name="progress/index" options={{ href: null }} />
      <Tabs.Screen name="progress/[exerciseId]" options={{ href: null }} />
      <Tabs.Screen name="progress/body" options={{ href: null }} />
      <Tabs.Screen name="progress/volume" options={{ href: null }} />
      <Tabs.Screen name="progress/summary" options={{ href: null }} />
      <Tabs.Screen name="progress/achievements" options={{ href: null }} />
      <Tabs.Screen name="progress/strength-standards" options={{ href: null }} />

      {/* Exercises */}
      <Tabs.Screen name="exercises" options={{ href: null }} />
      <Tabs.Screen name="exercises/index" options={{ href: null }} />
      <Tabs.Screen name="exercises/[id]" options={{ href: null }} />
      <Tabs.Screen name="exercises/create" options={{ href: null }} />
      <Tabs.Screen name="exercises/edit" options={{ href: null }} />

      {/* Routines sub-screens (the index IS the visible tab) */}
      <Tabs.Screen name="routines/create" options={{ href: null }} />
      <Tabs.Screen name="routines/edit" options={{ href: null }} />
      <Tabs.Screen name="routines/[id]" options={{ href: null }} />

      {/* Social sub-screens (the index IS the visible tab) */}
      <Tabs.Screen name="social/feed" options={{ href: null }} />
      <Tabs.Screen name="social/leaderboard" options={{ href: null }} />
      <Tabs.Screen name="social/search" options={{ href: null }} />
      <Tabs.Screen name="social/challenges" options={{ href: null }} />
      <Tabs.Screen name="social/discover" options={{ href: null }} />

      {/* Meals sub-screens (the index IS the visible tab) */}
      <Tabs.Screen name="meals/new" options={{ href: null }} />
      <Tabs.Screen name="meals/[planId]" options={{ href: null }} />
      <Tabs.Screen name="meals/grocery-list" options={{ href: null }} />

      {/* Profile sub-screens (the index IS the visible tab) */}
      <Tabs.Screen name="profile/settings" options={{ href: null }} />
      <Tabs.Screen name="profile/[username]" options={{ href: null }} />

      {/* Coach / AI / Programs / Tools */}
      <Tabs.Screen name="coach" options={{ href: null }} />
      <Tabs.Screen name="ai-planner" options={{ href: null }} />
      <Tabs.Screen name="programs" options={{ href: null }} />
      <Tabs.Screen name="programs/index" options={{ href: null }} />
      <Tabs.Screen name="programs/[id]" options={{ href: null }} />
      <Tabs.Screen name="programs/generate" options={{ href: null }} />
      <Tabs.Screen name="tools" options={{ href: null }} />
      <Tabs.Screen name="tools/index" options={{ href: null }} />
      <Tabs.Screen name="tools/1rm" options={{ href: null }} />
      <Tabs.Screen name="tools/plates" options={{ href: null }} />

      {/* Misc */}
      <Tabs.Screen name="onboarding" options={{ href: null }} />
      <Tabs.Screen name="settings/security" options={{ href: null }} />
    </Tabs>
  );
}
