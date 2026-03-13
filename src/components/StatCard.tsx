import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  value: string | number;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
}

export function StatCard({ value, label, icon, color = '#3B82F6' }: Props) {
  return (
    <View style={styles.card}>
      {icon && (
        <View style={[styles.iconWrap, { backgroundColor: color + '22' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
      )}
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0B1326',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#162540',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'BarlowCondensed-ExtraBold',
    marginBottom: 4,
  },
  label: {
    color: '#718FAF',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'DMSans-Medium',
  },
});
