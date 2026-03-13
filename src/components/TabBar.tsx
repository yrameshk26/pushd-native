import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { usePathname, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = [
  { name: 'Home',     icon: 'grid-outline' as const,       activeIcon: 'grid' as const,        route: '/(app)/dashboard' },
  { name: 'Routines', icon: 'book-outline' as const,       activeIcon: 'book' as const,        route: '/(app)/routines' },
  { name: 'Social',   icon: 'people-outline' as const,     activeIcon: 'people' as const,      route: '/(app)/social' },
  { name: 'Meals',    icon: 'restaurant-outline' as const, activeIcon: 'restaurant' as const,  route: '/(app)/meals' },
  { name: 'Profile',  icon: 'person-outline' as const,     activeIcon: 'person' as const,      route: '/(app)/profile' },
];

function getActiveTab(pathname: string): string {
  if (pathname.includes('/dashboard')) return '/(app)/dashboard';
  if (pathname.includes('/routines')) return '/(app)/routines';
  if (pathname.includes('/social')) return '/(app)/social';
  if (pathname.includes('/meals')) return '/(app)/meals';
  if (pathname.includes('/profile')) return '/(app)/profile';
  if (pathname.includes('/workout')) return '/(app)/dashboard';
  if (pathname.includes('/exercises')) return '/(app)/routines';
  if (pathname.includes('/programs')) return '/(app)/routines';
  if (pathname.includes('/progress')) return '/(app)/profile';
  if (pathname.includes('/tools')) return '/(app)/profile';
  if (pathname.includes('/nutrition')) return '/(app)/meals';
  return '/(app)/dashboard';
}

export default function TabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const activeRoute = getActiveTab(pathname);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || 12 }]}>
      {TABS.map((tab) => {
        const isActive = activeRoute === tab.route;
        return (
          <TouchableOpacity
            key={tab.route}
            style={styles.tab}
            onPress={() => router.replace(tab.route as never)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? tab.activeIcon : tab.icon}
              size={24}
              color={isActive ? '#3B82F6' : '#555'}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  label: {
    fontSize: 10,
    color: '#555',
    fontWeight: '500',
  },
  labelActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
});
