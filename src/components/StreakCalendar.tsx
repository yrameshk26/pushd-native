import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StreakCalendarProps {
  activeDates: string[]; // ISO date strings e.g. "2026-03-10"
  weeks?: number;
}

const CELL_SIZE = 14;
const CELL_GAP = 3;
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short' });
}

export function StreakCalendar({ activeDates, weeks = 16 }: StreakCalendarProps) {
  const activeSet = useMemo(() => new Set(activeDates.map((d) => d.slice(0, 10))), [activeDates]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayKey = toDateKey(today);

  // Build grid: weeks columns x 7 rows (Mon-Sun)
  const grid = useMemo(() => {
    const currentMonday = getMondayOfWeek(today);
    const startMonday = new Date(currentMonday);
    startMonday.setDate(startMonday.getDate() - (weeks - 1) * 7);

    const columns: { date: Date; key: string }[][] = [];
    let monthLabels: { weekIndex: number; label: string }[] = [];
    let lastMonth = -1;

    for (let w = 0; w < weeks; w++) {
      const column: { date: Date; key: string }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(startMonday);
        date.setDate(startMonday.getDate() + w * 7 + d);
        column.push({ date, key: toDateKey(date) });
      }
      columns.push(column);

      // Track month changes for labels — use Monday of the week
      const monthOfWeek = column[0].date.getMonth();
      if (monthOfWeek !== lastMonth) {
        monthLabels.push({ weekIndex: w, label: getMonthLabel(column[0].date) });
        lastMonth = monthOfWeek;
      }
    }

    return { columns, monthLabels };
  }, [today, weeks]);

  return (
    <View style={styles.container}>
      {/* Month labels row */}
      <View style={styles.monthRow}>
        {grid.monthLabels.map(({ weekIndex, label }) => (
          <View
            key={`month-${weekIndex}-${label}`}
            style={[
              styles.monthLabelContainer,
              { left: weekIndex * (CELL_SIZE + CELL_GAP) },
            ]}
          >
            <Text style={styles.monthLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Grid body */}
      <View style={styles.gridBody}>
        {/* Day-of-week labels */}
        <View style={styles.dayLabelsCol}>
          {DAY_LABELS.map((label, i) => (
            <View key={i} style={styles.dayLabelCell}>
              {/* Only show M, W, F to save space */}
              {(i === 0 || i === 2 || i === 4) && (
                <Text style={styles.dayLabel}>{label}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Calendar columns */}
        <View style={styles.columnsRow}>
          {grid.columns.map((column, wIdx) => (
            <View key={wIdx} style={styles.column}>
              {column.map(({ date, key }) => {
                const isActive = activeSet.has(key);
                const isToday = key === todayKey;
                const isFuture = date > today;

                return (
                  <View
                    key={key}
                    style={[
                      styles.cell,
                      isActive && styles.cellActive,
                      isToday && !isActive && styles.cellToday,
                      isFuture && styles.cellFuture,
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  monthRow: {
    position: 'relative',
    height: 18,
    marginLeft: 22, // offset for day labels
  },
  monthLabelContainer: {
    position: 'absolute',
    top: 0,
  },
  monthLabel: {
    color: '#718FAF',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'DMSans-SemiBold',
  },
  gridBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dayLabelsCol: {
    width: 18,
    flexDirection: 'column',
    gap: CELL_GAP,
    paddingTop: 0,
  },
  dayLabelCell: {
    height: CELL_SIZE,
    justifyContent: 'center',
  },
  dayLabel: {
    color: '#4A6080',
    fontSize: 9,
    fontFamily: 'DMSans-Regular',
  },
  columnsRow: {
    flexDirection: 'row',
    gap: CELL_GAP,
    flexWrap: 'nowrap',
  },
  column: {
    flexDirection: 'column',
    gap: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 3,
    backgroundColor: '#111D36',
  },
  cellActive: {
    backgroundColor: '#3B82F6',
  },
  cellToday: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
  },
  cellFuture: {
    backgroundColor: '#060C1B',
    opacity: 0.5,
  },
});
