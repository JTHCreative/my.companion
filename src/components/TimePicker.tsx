import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const PERIODS = ['AM', 'PM'] as const;

interface TimePickerProps {
  value: string; // "HH:MM" in 24h format
  onChange: (time: string) => void;
}

function to12h(time24: string): { hour: number; minute: number; period: 'AM' | 'PM' } {
  const [h, m] = (time24 || '08:00').split(':').map(Number);
  const hour24 = isNaN(h) ? 8 : h;
  const minute = isNaN(m) ? 0 : m;
  const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
  const hour = hour24 % 12 || 12;
  return { hour, minute, period };
}

function to24h(hour: number, minute: number, period: 'AM' | 'PM'): string {
  let h = hour % 12;
  if (period === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function WheelColumn({
  items,
  selectedIndex,
  onSelect,
  formatItem,
}: {
  items: number[] | readonly string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  formatItem?: (item: number | string) => string;
}) {
  const { theme } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const isUserScrolling = useRef(false);

  useEffect(() => {
    if (!isUserScrolling.current) {
      scrollRef.current?.scrollTo({
        y: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
    }
  }, [selectedIndex]);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      isUserScrolling.current = false;
      const y = e.nativeEvent.contentOffset.y;
      const index = Math.round(y / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(index, items.length - 1));
      if (clamped !== selectedIndex) {
        onSelect(clamped);
      }
    },
    [items.length, selectedIndex, onSelect],
  );

  const handleScrollBegin = useCallback(() => {
    isUserScrolling.current = true;
  }, []);

  const display = (item: number | string) =>
    formatItem ? formatItem(item) : typeof item === 'number' ? String(item) : item;

  // padding so first/last items can scroll to center
  const padCount = Math.floor(VISIBLE_ITEMS / 2);

  return (
    <View style={[wheelStyles.column, { height: PICKER_HEIGHT }]}>
      {/* highlight band behind the center slot */}
      <View
        style={[
          wheelStyles.highlight,
          {
            top: padCount * ITEM_HEIGHT,
            backgroundColor: theme.colors.primary + '18',
            borderColor: theme.colors.primary + '40',
          },
        ]}
        pointerEvents="none"
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        onScrollBeginDrag={handleScrollBegin}
        contentContainerStyle={{
          paddingVertical: padCount * ITEM_HEIGHT,
        }}
      >
        {(items as (number | string)[]).map((item, i) => {
          const isSelected = i === selectedIndex;
          return (
            <TouchableOpacity
              key={i}
              activeOpacity={0.6}
              onPress={() => {
                onSelect(i);
                scrollRef.current?.scrollTo({
                  y: i * ITEM_HEIGHT,
                  animated: true,
                });
              }}
              style={[wheelStyles.item, { height: ITEM_HEIGHT }]}
            >
              <Text
                style={[
                  wheelStyles.itemText,
                  {
                    color: isSelected ? theme.colors.text : theme.colors.textSecondary + '80',
                    fontWeight: isSelected ? '700' : '400',
                    fontSize: isSelected ? 20 : 16,
                  },
                ]}
              >
                {display(item)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function TimePicker({ value, onChange }: TimePickerProps) {
  const { theme } = useTheme();
  const { hour, minute, period } = to12h(value);

  const hourIndex = HOURS.indexOf(hour);
  // snap to nearest 5-min increment
  const nearestMinute = Math.round(minute / 5) * 5 % 60;
  const minuteIndex = MINUTES.indexOf(nearestMinute);
  const periodIndex = PERIODS.indexOf(period);

  const update = (h: number, m: number, p: 'AM' | 'PM') => {
    onChange(to24h(h, m, p));
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Time</Text>
      <View style={[styles.pickerRow, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
        <WheelColumn
          items={HOURS}
          selectedIndex={hourIndex >= 0 ? hourIndex : 0}
          onSelect={(i) => update(HOURS[i], MINUTES[minuteIndex >= 0 ? minuteIndex : 0], period)}
          formatItem={(v) => String(v)}
        />
        <Text style={[styles.colon, { color: theme.colors.text }]}>:</Text>
        <WheelColumn
          items={MINUTES}
          selectedIndex={minuteIndex >= 0 ? minuteIndex : 0}
          onSelect={(i) => update(HOURS[hourIndex >= 0 ? hourIndex : 0], MINUTES[i], period)}
          formatItem={(v) => String(v).padStart(2, '0')}
        />
        <WheelColumn
          items={PERIODS}
          selectedIndex={periodIndex >= 0 ? periodIndex : 0}
          onSelect={(i) => update(HOURS[hourIndex >= 0 ? hourIndex : 0], MINUTES[minuteIndex >= 0 ? minuteIndex : 0], PERIODS[i])}
        />
      </View>
    </View>
  );
}

const wheelStyles = StyleSheet.create({
  column: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  highlight: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: ITEM_HEIGHT,
    borderRadius: 10,
    borderWidth: 1,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    textAlign: 'center',
  },
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  colon: {
    fontSize: 22,
    fontWeight: '700',
    marginHorizontal: 2,
  },
});
