import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const CLOCK_SIZE = Math.min(Dimensions.get('window').width - 80, 280);
const CLOCK_RADIUS = CLOCK_SIZE / 2;
const NUMBER_RADIUS = CLOCK_RADIUS - 28;
const HAND_LENGTH = NUMBER_RADIUS - 12;

interface TimePickerProps {
  value: string; // "HH:MM" in 24h
  onChange: (time: string) => void;
}

type ClockMode = 'hour' | 'minute';

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

function formatDisplay(time24: string): string {
  const { hour, minute, period } = to12h(time24);
  return `${hour}:${String(minute).padStart(2, '0')} ${period}`;
}

function angleForHour(hour: number): number {
  return ((hour % 12) / 12) * 360;
}

function angleForMinute(minute: number): number {
  return (minute / 60) * 360;
}

function angleFromTouch(x: number, y: number): number {
  // x, y relative to center of clock
  const rad = Math.atan2(x, -y); // 0 at 12 o'clock, clockwise positive
  let deg = (rad * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

function hourFromAngle(angle: number): number {
  const h = Math.round(angle / 30) % 12;
  return h === 0 ? 12 : h;
}

function minuteFromAngle(angle: number): number {
  const m = Math.round(angle / 6) % 60;
  return m;
}

export function TimePicker({ value, onChange }: TimePickerProps) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);

  const { hour, minute, period } = to12h(value);
  const [tempHour, setTempHour] = useState(hour);
  const [tempMinute, setTempMinute] = useState(minute);
  const [tempPeriod, setTempPeriod] = useState<'AM' | 'PM'>(period);
  const [mode, setMode] = useState<ClockMode>('hour');
  const [manualText, setManualText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const clockRef = useRef<View>(null);
  const clockCenter = useRef({ x: 0, y: 0 });

  const openPicker = () => {
    const parsed = to12h(value);
    setTempHour(parsed.hour);
    setTempMinute(parsed.minute);
    setTempPeriod(parsed.period);
    setMode('hour');
    setManualText(`${parsed.hour}:${String(parsed.minute).padStart(2, '0')} ${parsed.period}`);
    setIsEditing(false);
    setOpen(true);
  };

  const confirm = () => {
    onChange(to24h(tempHour, tempMinute, tempPeriod));
    setOpen(false);
  };

  const handleClockTouch = (pageX: number, pageY: number) => {
    const dx = pageX - clockCenter.current.x;
    const dy = pageY - clockCenter.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 15) return; // too close to center

    const angle = angleFromTouch(dx, dy);
    if (mode === 'hour') {
      const h = hourFromAngle(angle);
      setTempHour(h);
      setManualText(`${h}:${String(tempMinute).padStart(2, '0')} ${tempPeriod}`);
    } else {
      const m = minuteFromAngle(angle);
      setTempMinute(m);
      setManualText(`${tempHour}:${String(m).padStart(2, '0')} ${tempPeriod}`);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        handleClockTouch(e.nativeEvent.pageX, e.nativeEvent.pageY);
      },
      onPanResponderMove: (e: GestureResponderEvent, _gs: PanResponderGestureState) => {
        handleClockTouch(e.nativeEvent.pageX, e.nativeEvent.pageY);
      },
      onPanResponderRelease: () => {
        if (mode === 'hour') {
          setMode('minute');
        }
      },
    })
  ).current;

  const onClockLayout = () => {
    clockRef.current?.measureInWindow((x, y, w, h) => {
      clockCenter.current = { x: x + w / 2, y: y + h / 2 };
    });
  };

  const parseManualInput = (text: string) => {
    setManualText(text);
    // Try to parse patterns like "8:30 AM", "8:30AM", "830AM", "8:30 pm"
    const match = text.match(/^(\d{1,2}):?(\d{2})\s*(AM|PM|am|pm|Am|Pm)$/);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const p = match[3].toUpperCase() as 'AM' | 'PM';
      if (h >= 1 && h <= 12 && m >= 0 && m <= 59) {
        setTempHour(h);
        setTempMinute(m);
        setTempPeriod(p);
      }
    }
  };

  const handAngle = mode === 'hour' ? angleForHour(tempHour) : angleForMinute(tempMinute);

  const numbers = mode === 'hour'
    ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const selectedNumber = mode === 'hour' ? tempHour : tempMinute;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Time</Text>
      <TouchableOpacity
        onPress={openPicker}
        activeOpacity={0.7}
        style={[
          styles.field,
          {
            backgroundColor: theme.colors.inputBackground,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Ionicons name="time-outline" size={18} color={theme.colors.textSecondary} />
        <Text style={[styles.fieldText, { color: theme.colors.text }]}>
          {formatDisplay(value)}
        </Text>
        <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={[styles.dialog, { backgroundColor: theme.colors.card }]}>
            {/* Manual input */}
            <View style={styles.manualRow}>
              <TextInput
                style={[
                  styles.manualInput,
                  {
                    backgroundColor: theme.colors.inputBackground,
                    color: theme.colors.text,
                    borderColor: isEditing ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                value={manualText}
                onChangeText={parseManualInput}
                onFocus={() => setIsEditing(true)}
                onBlur={() => setIsEditing(false)}
                placeholder="8:00 AM"
                placeholderTextColor={theme.colors.textSecondary + '80'}
                autoCapitalize="characters"
                returnKeyType="done"
              />
            </View>

            {/* AM/PM toggle */}
            <View style={styles.periodRow}>
              <TouchableOpacity
                style={[
                  styles.periodBtn,
                  styles.periodBtnLeft,
                  {
                    backgroundColor: tempPeriod === 'AM' ? theme.colors.primary : theme.colors.inputBackground,
                    borderColor: tempPeriod === 'AM' ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => {
                  setTempPeriod('AM');
                  setManualText(`${tempHour}:${String(tempMinute).padStart(2, '0')} AM`);
                }}
              >
                <Text style={{ color: tempPeriod === 'AM' ? '#FFF' : theme.colors.text, fontWeight: '700', fontSize: 15 }}>
                  AM
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.periodBtn,
                  styles.periodBtnRight,
                  {
                    backgroundColor: tempPeriod === 'PM' ? theme.colors.primary : theme.colors.inputBackground,
                    borderColor: tempPeriod === 'PM' ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => {
                  setTempPeriod('PM');
                  setManualText(`${tempHour}:${String(tempMinute).padStart(2, '0')} PM`);
                }}
              >
                <Text style={{ color: tempPeriod === 'PM' ? '#FFF' : theme.colors.text, fontWeight: '700', fontSize: 15 }}>
                  PM
                </Text>
              </TouchableOpacity>
            </View>

            {/* Mode tabs */}
            <View style={styles.modeTabs}>
              <TouchableOpacity onPress={() => setMode('hour')}>
                <Text style={[
                  styles.modeTabText,
                  { color: mode === 'hour' ? theme.colors.primary : theme.colors.textSecondary },
                ]}>
                  Hour
                </Text>
              </TouchableOpacity>
              <Text style={{ color: theme.colors.textSecondary }}>  /  </Text>
              <TouchableOpacity onPress={() => setMode('minute')}>
                <Text style={[
                  styles.modeTabText,
                  { color: mode === 'minute' ? theme.colors.primary : theme.colors.textSecondary },
                ]}>
                  Minute
                </Text>
              </TouchableOpacity>
            </View>

            {/* Clock face */}
            <View
              ref={clockRef}
              onLayout={onClockLayout}
              style={[styles.clock, { width: CLOCK_SIZE, height: CLOCK_SIZE, backgroundColor: theme.colors.inputBackground }]}
              {...panResponder.panHandlers}
            >
              {/* Hand */}
              <View
                style={[
                  styles.hand,
                  {
                    height: HAND_LENGTH,
                    backgroundColor: theme.colors.primary,
                    transform: [
                      { translateY: -HAND_LENGTH / 2 },
                      { rotate: `${handAngle}deg` },
                      { translateY: HAND_LENGTH / 2 },
                    ],
                  },
                ]}
              />

              {/* Center dot */}
              <View style={[styles.centerDot, { backgroundColor: theme.colors.primary }]} />

              {/* Selected indicator at end of hand */}
              <View
                style={[
                  styles.selectedDot,
                  {
                    backgroundColor: theme.colors.primary,
                    transform: [
                      {
                        translateX:
                          NUMBER_RADIUS *
                          Math.sin((handAngle * Math.PI) / 180),
                      },
                      {
                        translateY:
                          -NUMBER_RADIUS *
                          Math.cos((handAngle * Math.PI) / 180),
                      },
                    ],
                  },
                ]}
              />

              {/* Numbers */}
              {numbers.map((num, i) => {
                const angle = (i / 12) * 2 * Math.PI - Math.PI / 2 + Math.PI / 2;
                // Position: 12 at top, going clockwise
                const a = ((i * 30) * Math.PI) / 180;
                const x = CLOCK_RADIUS + NUMBER_RADIUS * Math.sin(a) - 16;
                const y = CLOCK_RADIUS - NUMBER_RADIUS * Math.cos(a) - 16;
                const isSelected = num === selectedNumber;

                return (
                  <TouchableOpacity
                    key={num}
                    activeOpacity={0.6}
                    onPress={() => {
                      if (mode === 'hour') {
                        setTempHour(num === 0 ? 12 : num);
                        setManualText(`${num === 0 ? 12 : num}:${String(tempMinute).padStart(2, '0')} ${tempPeriod}`);
                        setMode('minute');
                      } else {
                        setTempMinute(num);
                        setManualText(`${tempHour}:${String(num).padStart(2, '0')} ${tempPeriod}`);
                      }
                    }}
                    style={[
                      styles.numberBtn,
                      { left: x, top: y },
                    ]}
                  >
                    <Text
                      style={[
                        styles.numberText,
                        {
                          color: isSelected ? '#FFFFFF' : theme.colors.text,
                          fontWeight: isSelected ? '800' : '500',
                        },
                      ]}
                    >
                      {mode === 'minute' ? String(num).padStart(2, '0') : num}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.actionBtn}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 16, fontWeight: '600' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirm} style={styles.actionBtn}>
                <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '700' }}>
                  OK
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  fieldText: {
    flex: 1,
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    paddingTop: 20,
    paddingBottom: 12,
    alignItems: 'center',
  },
  manualRow: {
    paddingHorizontal: 20,
    width: '100%',
    marginBottom: 12,
  },
  manualInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
  },
  periodRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  periodBtn: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderWidth: 1,
  },
  periodBtnLeft: {
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderRightWidth: 0,
  },
  periodBtnRight: {
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  modeTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modeTabText: {
    fontSize: 15,
    fontWeight: '700',
  },
  clock: {
    borderRadius: 9999,
    position: 'relative',
    marginBottom: 16,
  },
  hand: {
    position: 'absolute',
    width: 2,
    left: CLOCK_RADIUS - 1,
    top: CLOCK_RADIUS,
    transformOrigin: 'top',
    borderRadius: 1,
  },
  centerDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    left: CLOCK_RADIUS - 4,
    top: CLOCK_RADIUS - 4,
  },
  selectedDot: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    left: CLOCK_RADIUS - 18,
    top: CLOCK_RADIUS - 18,
    zIndex: -1,
  },
  numberBtn: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  numberText: {
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    paddingHorizontal: 12,
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
