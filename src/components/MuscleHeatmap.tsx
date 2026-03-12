import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface MuscleHeatmapProps {
  muscleData: Record<string, number>; // muscle name → intensity 0-1
}

// Front body muscle regions: top, left as % of container, width/height as % of container
interface MuscleRegion {
  muscle: string;
  label: string;
  topPct: number;
  leftPct: number;
  widthPct: number;
  heightPct: number;
}

const FRONT_REGIONS: MuscleRegion[] = [
  { muscle: 'CHEST',       label: 'Chest',       topPct: 22, leftPct: 22, widthPct: 56, heightPct: 16 },
  { muscle: 'FRONT_DELTS', label: 'Delts',       topPct: 18, leftPct: 8,  widthPct: 14, heightPct: 12 },
  { muscle: 'FRONT_DELTS', label: 'Delts',       topPct: 18, leftPct: 78, widthPct: 14, heightPct: 12 },
  { muscle: 'BICEPS',      label: 'Biceps',      topPct: 32, leftPct: 6,  widthPct: 12, heightPct: 18 },
  { muscle: 'BICEPS',      label: 'Biceps',      topPct: 32, leftPct: 82, widthPct: 12, heightPct: 18 },
  { muscle: 'ABS',         label: 'Abs',         topPct: 40, leftPct: 30, widthPct: 40, heightPct: 22 },
  { muscle: 'QUADS',       label: 'Quads',       topPct: 64, leftPct: 20, widthPct: 24, heightPct: 24 },
  { muscle: 'QUADS',       label: 'Quads',       topPct: 64, leftPct: 56, widthPct: 24, heightPct: 24 },
];

const BACK_REGIONS: MuscleRegion[] = [
  { muscle: 'TRAPS',       label: 'Traps',       topPct: 10, leftPct: 28, widthPct: 44, heightPct: 12 },
  { muscle: 'REAR_DELTS',  label: 'Rear Delts',  topPct: 18, leftPct: 8,  widthPct: 14, heightPct: 10 },
  { muscle: 'REAR_DELTS',  label: 'Rear Delts',  topPct: 18, leftPct: 78, widthPct: 14, heightPct: 10 },
  { muscle: 'LATS',        label: 'Lats',        topPct: 24, leftPct: 18, widthPct: 64, heightPct: 20 },
  { muscle: 'TRICEPS',     label: 'Triceps',     topPct: 32, leftPct: 6,  widthPct: 12, heightPct: 18 },
  { muscle: 'TRICEPS',     label: 'Triceps',     topPct: 32, leftPct: 82, widthPct: 12, heightPct: 18 },
  { muscle: 'GLUTES',      label: 'Glutes',      topPct: 52, leftPct: 22, widthPct: 56, heightPct: 14 },
  { muscle: 'HAMSTRINGS',  label: 'Hamstrings',  topPct: 64, leftPct: 20, widthPct: 24, heightPct: 22 },
  { muscle: 'HAMSTRINGS',  label: 'Hamstrings',  topPct: 64, leftPct: 56, widthPct: 24, heightPct: 22 },
  { muscle: 'CALVES',      label: 'Calves',      topPct: 82, leftPct: 22, widthPct: 20, heightPct: 14 },
  { muscle: 'CALVES',      label: 'Calves',      topPct: 82, leftPct: 58, widthPct: 20, heightPct: 14 },
];

// Canonical key lookup: supports both "CHEST" and "chest", and aliases
const MUSCLE_ALIASES: Record<string, string> = {
  // front
  chest: 'CHEST',
  front_delts: 'FRONT_DELTS',
  front_shoulders: 'FRONT_DELTS',
  shoulders: 'FRONT_DELTS',
  biceps: 'BICEPS',
  abs: 'ABS',
  core: 'ABS',
  quads: 'QUADS',
  // back
  traps: 'TRAPS',
  rear_delts: 'REAR_DELTS',
  rear_shoulders: 'REAR_DELTS',
  lats: 'LATS',
  back: 'LATS',
  triceps: 'TRICEPS',
  glutes: 'GLUTES',
  hamstrings: 'HAMSTRINGS',
  calves: 'CALVES',
};

function resolveKey(raw: string): string {
  const lower = raw.toLowerCase();
  return MUSCLE_ALIASES[lower] ?? raw.toUpperCase();
}

function intensityToColor(intensity: number): string {
  if (intensity <= 0) return '#1a1a1a';
  // Blend from #1a1a1a (no work) → #6C63FF (heavy work)
  const r = Math.round(0x1a + intensity * (0x6c - 0x1a));
  const g = Math.round(0x1a + intensity * (0x63 - 0x1a));
  const b = Math.round(0x1a + intensity * (0xff - 0x1a));
  return `rgb(${r},${g},${b})`;
}

function intensityToBorder(intensity: number): string {
  if (intensity <= 0) return '#2a2a2a';
  const alpha = Math.round(80 + intensity * 175); // 80..255
  const r = Math.round(0x6c * intensity);
  const g = Math.round(0x63 * intensity);
  const b = Math.round(0xff * intensity);
  return `rgba(${r},${g},${b},${(alpha / 255).toFixed(2)})`;
}

interface BodyViewProps {
  title: string;
  regions: MuscleRegion[];
  resolvedData: Record<string, number>;
}

function BodyView({ title, regions, resolvedData }: BodyViewProps) {
  // De-duplicate label renders: only show label once per muscle (first occurrence)
  const seenMuscles = new Set<string>();

  return (
    <View style={styles.bodyViewContainer}>
      <Text style={styles.bodyViewTitle}>{title}</Text>
      {/* Silhouette background */}
      <View style={styles.silhouette}>
        {/* Head */}
        <View style={styles.silhouetteHead} />
        {/* Torso + limbs block */}
        <View style={styles.silhouetteTorso} />
        {/* Muscle regions */}
        {regions.map((region, idx) => {
          const intensity = resolvedData[region.muscle] ?? 0;
          const bg = intensityToColor(intensity);
          const border = intensityToBorder(intensity);
          const isFirstOccurrence = !seenMuscles.has(region.muscle);
          if (isFirstOccurrence) seenMuscles.add(region.muscle);

          return (
            <View
              key={idx}
              style={[
                styles.muscleRegion,
                {
                  top: `${region.topPct}%` as any,
                  left: `${region.leftPct}%` as any,
                  width: `${region.widthPct}%` as any,
                  height: `${region.heightPct}%` as any,
                  backgroundColor: bg,
                  borderColor: border,
                  opacity: intensity > 0 ? 0.9 : 0.5,
                },
              ]}
            >
              {isFirstOccurrence && (
                <Text style={styles.muscleLabel} numberOfLines={1}>
                  {region.label}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function MuscleHeatmap({ muscleData }: MuscleHeatmapProps) {
  // Normalize incoming keys to canonical form
  const resolvedData: Record<string, number> = {};
  for (const [rawKey, intensity] of Object.entries(muscleData)) {
    const canonical = resolveKey(rawKey);
    resolvedData[canonical] = Math.min(1, Math.max(0, intensity));
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <BodyView title="Front" regions={FRONT_REGIONS} resolvedData={resolvedData} />
        <BodyView title="Back" regions={BACK_REGIONS} resolvedData={resolvedData} />
      </View>
      {/* Legend */}
      <View style={styles.legendRow}>
        <Text style={styles.legendLabel}>Low</Text>
        <View style={styles.legendBar}>
          {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((stop) => (
            <View
              key={stop}
              style={[styles.legendSegment, { backgroundColor: intensityToColor(stop) }]}
            />
          ))}
        </View>
        <Text style={styles.legendLabel}>High</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  bodyViewContainer: {
    flex: 1,
    alignItems: 'center',
  },
  bodyViewTitle: {
    color: '#888',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  silhouette: {
    width: '100%',
    height: 200,
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    position: 'relative',
    overflow: 'hidden',
  },
  silhouetteHead: {
    position: 'absolute',
    width: '18%',
    height: '10%',
    borderRadius: 100,
    backgroundColor: '#222',
    top: '1%',
    left: '41%',
  },
  silhouetteTorso: {
    position: 'absolute',
    width: '50%',
    height: '88%',
    backgroundColor: '#1e1e1e',
    top: '11%',
    left: '25%',
    borderRadius: 8,
  },
  muscleRegion: {
    position: 'absolute',
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muscleLabel: {
    color: '#ccc',
    fontSize: 7,
    fontWeight: '600',
    textAlign: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  legendLabel: {
    color: '#555',
    fontSize: 10,
  },
  legendBar: {
    flex: 1,
    height: 6,
    flexDirection: 'row',
    borderRadius: 3,
    overflow: 'hidden',
  },
  legendSegment: {
    flex: 1,
    height: '100%',
  },
});
