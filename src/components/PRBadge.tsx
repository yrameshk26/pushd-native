import { View, Text, StyleSheet } from 'react-native';

interface Props {
  size?: 'sm' | 'md';
}

export function PRBadge({ size = 'sm' }: Props) {
  const isSmall = size === 'sm';
  return (
    <View style={[styles.badge, isSmall ? styles.badgeSm : styles.badgeMd]}>
      <Text style={[styles.text, isSmall ? styles.textSm : styles.textMd]}>PR</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#F59E0B',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSm: {
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeMd: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  text: {
    color: '#000',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textSm: {
    fontSize: 10,
  },
  textMd: {
    fontSize: 13,
  },
});
