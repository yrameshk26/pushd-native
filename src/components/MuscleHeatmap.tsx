import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableWithoutFeedback } from 'react-native';

export interface MuscleHeatmapProps {
  muscleData: Record<string, number>; // muscle key → intensity 0–1 (already normalized)
}

// Original SVG canvas: 848 × 1264
const IMG_W = 848;
const IMG_H = 1264;

interface Region {
  muscle: string;
  // cx, cy = centre; rx, ry = radii in the 848×1264 space
  cx: number; cy: number; rx: number; ry: number;
}

const FRONT_REGIONS: Region[] = [
  { muscle: 'CHEST',     cx: 424, cy: 315, rx: 135, ry: 65  },
  { muscle: 'SHOULDERS', cx: 212, cy: 262, rx: 68,  ry: 48  },
  { muscle: 'SHOULDERS', cx: 636, cy: 262, rx: 68,  ry: 48  },
  { muscle: 'BICEPS',    cx: 175, cy: 422, rx: 48,  ry: 72  },
  { muscle: 'BICEPS',    cx: 673, cy: 422, rx: 48,  ry: 72  },
  { muscle: 'FOREARMS',  cx: 158, cy: 568, rx: 40,  ry: 62  },
  { muscle: 'FOREARMS',  cx: 690, cy: 568, rx: 40,  ry: 62  },
  { muscle: 'CORE',      cx: 424, cy: 488, rx: 88,  ry: 105 },
  { muscle: 'QUADS',     cx: 330, cy: 782, rx: 78,  ry: 118 },
  { muscle: 'QUADS',     cx: 518, cy: 782, rx: 78,  ry: 118 },
];

const BACK_REGIONS: Region[] = [
  { muscle: 'BACK',       cx: 424, cy: 355, rx: 155, ry: 138 },
  { muscle: 'SHOULDERS',  cx: 210, cy: 252, rx: 68,  ry: 48  },
  { muscle: 'SHOULDERS',  cx: 638, cy: 252, rx: 68,  ry: 48  },
  { muscle: 'TRICEPS',    cx: 173, cy: 418, rx: 42,  ry: 68  },
  { muscle: 'TRICEPS',    cx: 675, cy: 418, rx: 42,  ry: 68  },
  { muscle: 'FOREARMS',   cx: 155, cy: 562, rx: 38,  ry: 62  },
  { muscle: 'FOREARMS',   cx: 693, cy: 562, rx: 38,  ry: 62  },
  { muscle: 'GLUTES',     cx: 424, cy: 645, rx: 135, ry: 68  },
  { muscle: 'HAMSTRINGS', cx: 326, cy: 808, rx: 75,  ry: 115 },
  { muscle: 'HAMSTRINGS', cx: 522, cy: 808, rx: 75,  ry: 115 },
  { muscle: 'CALVES',     cx: 315, cy: 988, rx: 52,  ry: 88  },
  { muscle: 'CALVES',     cx: 533, cy: 988, rx: 52,  ry: 88  },
];

const MUSCLE_LABELS: Record<string, string> = {
  CHEST: 'Chest', SHOULDERS: 'Shoulders', BICEPS: 'Biceps', FOREARMS: 'Forearms',
  CORE: 'Core', QUADS: 'Quads', BACK: 'Back', TRICEPS: 'Triceps',
  GLUTES: 'Glutes', HAMSTRINGS: 'Hamstrings', CALVES: 'Calves',
};

// Canonical key lookup
const MUSCLE_ALIASES: Record<string, string> = {
  chest: 'CHEST', shoulders: 'SHOULDERS', front_delts: 'SHOULDERS', rear_delts: 'SHOULDERS',
  biceps: 'BICEPS', forearms: 'FOREARMS', core: 'CORE', abs: 'CORE',
  quads: 'QUADS', back: 'BACK', lats: 'BACK', traps: 'BACK',
  triceps: 'TRICEPS', glutes: 'GLUTES', hamstrings: 'HAMSTRINGS', calves: 'CALVES',
};

function resolveKey(raw: string): string {
  return MUSCLE_ALIASES[raw.toLowerCase()] ?? raw.toUpperCase();
}

function heatColor(intensity: number): string {
  if (intensity <= 0) return 'transparent';
  const r = Math.round(30  + intensity * (80  - 30));
  const g = Math.round(100 + intensity * (200 - 100));
  const b = Math.round(220 + intensity * (255 - 220));
  return `rgb(${r},${g},${b})`;
}

function heatOpacity(intensity: number): number {
  if (intensity <= 0) return 0;
  return 0.18 + intensity * 0.62;
}

// Convert SVG ellipse coords to percentage-based style for absolute positioning
function regionToStyle(r: Region) {
  return {
    left:   `${((r.cx - r.rx) / IMG_W) * 100}%` as unknown as number,
    top:    `${((r.cy - r.ry) / IMG_H) * 100}%` as unknown as number,
    width:  `${((r.rx * 2)   / IMG_W) * 100}%` as unknown as number,
    height: `${((r.ry * 2)   / IMG_H) * 100}%` as unknown as number,
  };
}

interface BodyViewProps {
  imageUrl: string;
  regions: Region[];
  resolvedData: Record<string, number>;
  title: string;
  onPressRegion: (muscle: string) => void;
}

function BodyView({ imageUrl, regions, resolvedData, title, onPressRegion }: BodyViewProps) {
  return (
    <View style={styles.bodyView}>
      <Text style={styles.bodyTitle}>{title}</Text>
      {/* Container preserving image aspect ratio */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.bodyImage}
          resizeMode="contain"
        />
        {/* Muscle ellipse overlays */}
        {regions.map((r, i) => {
          const intensity = resolvedData[r.muscle] ?? 0;
          if (intensity <= 0) return null;
          const pos = regionToStyle(r);
          const color = heatColor(intensity);
          const opacity = heatOpacity(intensity);
          return (
            <TouchableWithoutFeedback key={i} onPress={() => onPressRegion(r.muscle)}>
              <View
                style={[
                  styles.muscleOverlay,
                  {
                    left:   pos.left,
                    top:    pos.top,
                    width:  pos.width,
                    height: pos.height,
                    backgroundColor: color,
                    opacity,
                  },
                ]}
              />
            </TouchableWithoutFeedback>
          );
        })}
      </View>
    </View>
  );
}

export function MuscleHeatmap({ muscleData }: MuscleHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ label: string; intensity: number } | null>(null);

  // Normalize keys
  const resolvedData: Record<string, number> = {};
  for (const [raw, intensity] of Object.entries(muscleData)) {
    const key = resolveKey(raw);
    resolvedData[key] = Math.min(1, Math.max(0, intensity));
  }

  const totalSets = Object.values(muscleData).length;

  function handlePress(muscle: string) {
    const label = MUSCLE_LABELS[muscle] ?? muscle;
    const intensity = resolvedData[muscle] ?? 0;
    if (tooltip?.label === label) {
      setTooltip(null);
    } else {
      setTooltip({ label, intensity });
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel}>THIS WEEK</Text>
        <View style={styles.totalBadge}>
          <Text style={styles.totalBadgeText}>{totalSets} muscles worked</Text>
        </View>
      </View>

      {/* Tooltip */}
      <View style={styles.tooltipRow}>
        {tooltip ? (
          <View style={styles.tooltipBadge}>
            <Text style={styles.tooltipText}>
              {tooltip.label} — {Math.round(tooltip.intensity * 100)}% intensity
            </Text>
          </View>
        ) : (
          <Text style={styles.tooltipHint}>Tap a muscle to see details</Text>
        )}
      </View>

      {/* Body maps side by side */}
      <View style={styles.row}>
        <BodyView
          title="Front"
          imageUrl="https://pushd.fit/body-front.png"
          regions={FRONT_REGIONS}
          resolvedData={resolvedData}
          onPressRegion={handlePress}
        />
        <BodyView
          title="Back"
          imageUrl="https://pushd.fit/body-back.png"
          regions={BACK_REGIONS}
          resolvedData={resolvedData}
          onPressRegion={handlePress}
        />
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <Text style={styles.legendLabel}>0 sets</Text>
        <View style={styles.legendBar}>
          {[0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0].map((stop) => (
            <View
              key={stop}
              style={[styles.legendSegment, {
                backgroundColor: heatColor(stop),
                opacity: heatOpacity(stop),
              }]}
            />
          ))}
        </View>
        <Text style={styles.legendLabel}>10+ sets</Text>
      </View>

      {/* Active muscle chips */}
      {Object.entries(resolvedData).length > 0 && (
        <View style={styles.chipsRow}>
          {Object.entries(resolvedData)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 6)
            .map(([muscle, intensity]) => (
              <View
                key={muscle}
                style={[styles.chip, {
                  backgroundColor: `rgba(30,100,220,${0.15 + intensity * 0.35})`,
                  borderColor: `rgba(80,200,255,${0.2 + intensity * 0.4})`,
                }]}
              >
                <Text style={[styles.chipText, { color: heatColor(intensity) }]}>
                  {MUSCLE_LABELS[muscle] ?? muscle}
                </Text>
              </View>
            ))}
        </View>
      )}

      {totalSets === 0 && (
        <Text style={styles.emptyText}>
          Complete workouts this week to see your muscle activation map
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerLabel: {
    fontSize: 10, fontWeight: '600', color: '#718FAF', letterSpacing: 1,
    fontFamily: 'BarlowCondensed-SemiBold',
  },
  totalBadge: {
    backgroundColor: 'rgba(59,130,246,0.2)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2,
  },
  totalBadgeText: { fontSize: 10, fontWeight: '600', color: '#93c5fd', fontFamily: 'DMSans-SemiBold' },
  tooltipRow: {
    height: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  tooltipBadge: {
    backgroundColor: 'rgba(59,130,246,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
  },
  tooltipText: { fontSize: 12, fontWeight: '600', color: '#93c5fd', fontFamily: 'DMSans-SemiBold' },
  tooltipHint: { fontSize: 10, color: '#4A6080', fontFamily: 'DMSans-Regular' },
  row: { flexDirection: 'row', gap: 8 },
  bodyView: { flex: 1, alignItems: 'center' },
  bodyTitle: {
    fontSize: 10, fontWeight: '700', color: '#4A6080', letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 4, fontFamily: 'BarlowCondensed-Bold',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: IMG_W / IMG_H,
    backgroundColor: '#060C1B',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  bodyImage: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
  },
  muscleOverlay: {
    position: 'absolute',
    borderRadius: 100,
  },
  legendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 4,
  },
  legendLabel: { fontSize: 10, color: '#4A6080', fontFamily: 'DMSans-Regular' },
  legendBar: {
    flex: 1, height: 6, flexDirection: 'row', borderRadius: 3, overflow: 'hidden',
    backgroundColor: 'rgba(30,100,220,0.1)',
  },
  legendSegment: { flex: 1, height: '100%' },
  chipsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10,
  },
  chip: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1,
  },
  chipText: { fontSize: 10, fontWeight: '600', fontFamily: 'DMSans-SemiBold' },
  emptyText: {
    fontSize: 12, color: '#4A6080', textAlign: 'center', paddingVertical: 8, marginTop: 8,
    fontFamily: 'DMSans-Regular',
  },
});
