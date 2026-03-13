/**
 * Pushd Design System — matches the PWA (pushd.fit) exactly.
 *
 * Colors are derived from the PWA's CSS custom properties (globals.css):
 *   --background:          hsl(222 47% 5%)   → #060C1B
 *   --card:                hsl(222 47% 8%)   → #0B1326
 *   --secondary / muted:   hsl(222 47% 13%)  → #111D36
 *   --accent / border:     hsl(222 47% 16%)  → #162540
 *   --muted-foreground:    hsl(215 20% 55%)  → #718FAF
 *   --primary:             hsl(217 91% 60%)  → #3B82F6
 *   --foreground:          hsl(213 31% 97%)  → #F4F7FC
 */

export const Colors = {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  background: '#060C1B',     // main screen bg  (PWA --background)
  card: '#0B1326',           // card/container   (PWA --card)
  secondary: '#111D36',      // input/muted bg   (PWA --secondary / --muted)
  accent: '#162540',         // border/accent    (PWA --accent / --border / --input)

  // ── Text ─────────────────────────────────────────────────────────────────
  foreground: '#F4F7FC',     // primary text     (PWA --foreground)
  mutedForeground: '#718FAF',// secondary text   (PWA --muted-foreground)
  dimForeground: '#4A6080',  // tertiary/dim text

  // ── Brand / Interactive ───────────────────────────────────────────────────
  primary: '#3B82F6',        // blue accent      (PWA --primary)
  primaryDark: '#2563EB',    // darker blue
  ring: '#3B82F6',           // focus ring       (PWA --ring)

  // ── Status ────────────────────────────────────────────────────────────────
  destructive: '#EF4444',    // error red        (PWA --destructive)
  success: '#22C55E',        // success green
  warning: '#F59E0B',        // warning amber
  warningOrange: '#F97316',  // orange warning

  // ── Borders ───────────────────────────────────────────────────────────────
  border: '#162540',         // card borders     (PWA --border)
  borderLight: '#1A2E4A',    // slightly lighter border variant

  // ── Muscle Groups (matches PWA lib/utils getMuscleGroupColor) ─────────────
  muscle: {
    CHEST:      '#ef4444',
    BACK:       '#3b82f6',
    SHOULDERS:  '#a855f7',
    BICEPS:     '#3b82f6',
    TRICEPS:    '#eab308',
    FOREARMS:   '#84cc16',
    CORE:       '#06b6d4',
    GLUTES:     '#ec4899',
    QUADS:      '#10b981',
    HAMSTRINGS: '#14b8a6',
    CALVES:     '#6366f1',
    FULL_BODY:  '#3b82f6',
    CARDIO:     '#f43f5e',
  },

  // ── Chart palette (matches PWA --chart-1 through --chart-5) ──────────────
  chart: ['#3B82F6', '#22C55E', '#A855F7', '#EC4899', '#EAB308'],
} as const;

export const Typography = {
  // ── Font Families ─────────────────────────────────────────────────────────
  // Loaded in app/_layout.tsx via expo-google-fonts
  display: 'BarlowCondensed',       // heading / display (PWA --font-barlow)
  body: 'DMSans',                   // body / UI text     (PWA --font-dm-sans)

  // ── Sizes ─────────────────────────────────────────────────────────────────
  size: {
    xs:   10,
    sm:   12,
    base: 14,
    md:   16,
    lg:   18,
    xl:   20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
  },

  // ── Weights ───────────────────────────────────────────────────────────────
  weight: {
    regular:   '400',
    medium:    '500',
    semibold:  '600',
    bold:      '700',
    extrabold: '800',
  },
} as const;

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  base: 16,
  lg:  20,
  xl:  24,
  '2xl': 32,
} as const;

export const Radius = {
  sm:   6,
  md:   8,
  lg:   12,
  xl:   16,
  full: 9999,
} as const;
