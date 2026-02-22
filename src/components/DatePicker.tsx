import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface DatePickerProps {
  label: string;
  value: string; // MM/DD/YYYY or empty
  onChange: (date: string) => void;
  placeholder?: string;
  optional?: boolean;
}

function parseDate(value: string): { month: number; day: number; year: number } | null {
  const parts = value.split('/');
  if (parts.length !== 3) return null;
  const [m, d, y] = parts.map(Number);
  if (!m || !d || !y || m < 1 || m > 12 || d < 1 || d > 31 || y < 1900) return null;
  return { month: m, day: d, year: y };
}

function formatDate(month: number, day: number, year: number): string {
  return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(month: number, year: number): number {
  return new Date(year, month - 1, 1).getDay();
}

export function DatePicker({ label, value, onChange, placeholder, optional }: DatePickerProps) {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const parsed = parseDate(value);
  const now = new Date();

  const [viewMonth, setViewMonth] = useState(parsed?.month || (now.getMonth() + 1));
  const [viewYear, setViewYear] = useState(parsed?.year || now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(parsed?.day || null);
  const [selectedMonth, setSelectedMonth] = useState<number>(parsed?.month || (now.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<number>(parsed?.year || now.getFullYear());

  const openModal = () => {
    const p = parseDate(value);
    if (p) {
      setViewMonth(p.month);
      setViewYear(p.year);
      setSelectedDay(p.day);
      setSelectedMonth(p.month);
      setSelectedYear(p.year);
    } else {
      const today = new Date();
      setViewMonth(today.getMonth() + 1);
      setViewYear(today.getFullYear());
      setSelectedDay(null);
      setSelectedMonth(today.getMonth() + 1);
      setSelectedYear(today.getFullYear());
    }
    setModalVisible(true);
  };

  const goToPrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleDayPress = (day: number) => {
    setSelectedDay(day);
    setSelectedMonth(viewMonth);
    setSelectedYear(viewYear);
  };

  const handleConfirm = () => {
    if (selectedDay) {
      onChange(formatDate(selectedMonth, selectedDay, selectedYear));
    }
    setModalVisible(false);
  };

  const handleClear = () => {
    onChange('');
    setModalVisible(false);
  };

  const calendarGrid = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewMonth, viewYear);
    const firstDay = getFirstDayOfWeek(viewMonth, viewYear);
    const rows: (number | null)[][] = [];
    let currentRow: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
      currentRow.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      currentRow.push(day);
      if (currentRow.length === 7) {
        rows.push(currentRow);
        currentRow = [];
      }
    }

    if (currentRow.length > 0) {
      while (currentRow.length < 7) {
        currentRow.push(null);
      }
      rows.push(currentRow);
    }

    return rows;
  }, [viewMonth, viewYear]);

  const isSelected = (day: number) =>
    day === selectedDay && viewMonth === selectedMonth && viewYear === selectedYear;

  const isToday = (day: number) =>
    day === now.getDate() && viewMonth === (now.getMonth() + 1) && viewYear === now.getFullYear();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
        {label}
      </Text>
      <TouchableOpacity
        style={[
          styles.inputButton,
          {
            backgroundColor: theme.colors.inputBackground,
            borderColor: theme.colors.border,
          },
        ]}
        onPress={openModal}
        activeOpacity={0.7}
      >
        <Ionicons
          name="calendar-outline"
          size={18}
          color={value ? theme.colors.primary : theme.colors.tabBarInactive}
          style={{ marginRight: 8 }}
        />
        <Text
          style={[
            styles.inputText,
            { color: value ? theme.colors.text : theme.colors.tabBarInactive },
          ]}
        >
          {value || placeholder || 'Select date'}
        </Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.overlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            {/* Header with month/year navigation */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={goToPrevMonth} style={styles.navBtn}>
                <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={[styles.monthYearText, { color: theme.colors.text }]}>
                {MONTH_NAMES[viewMonth - 1]} {viewYear}
              </Text>
              <TouchableOpacity onPress={goToNextMonth} style={styles.navBtn}>
                <Ionicons name="chevron-forward" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Day-of-week headers */}
            <View style={styles.dayHeaderRow}>
              {DAY_HEADERS.map((d) => (
                <View key={d} style={styles.dayCell}>
                  <Text style={[styles.dayHeaderText, { color: theme.colors.textSecondary }]}>
                    {d}
                  </Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            {calendarGrid.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.dayRow}>
                {row.map((day, colIdx) => (
                  <View key={colIdx} style={styles.dayCell}>
                    {day !== null ? (
                      <TouchableOpacity
                        onPress={() => handleDayPress(day)}
                        style={[
                          styles.dayCellBtn,
                          isSelected(day) && { backgroundColor: theme.colors.primary },
                          isToday(day) && !isSelected(day) && { borderWidth: 1.5, borderColor: theme.colors.primary },
                        ]}
                        activeOpacity={0.6}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            { color: theme.colors.text },
                            isSelected(day) && { color: '#FFFFFF', fontWeight: '700' },
                            isToday(day) && !isSelected(day) && { color: theme.colors.primary, fontWeight: '700' },
                          ]}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
              </View>
            ))}

            {/* Footer buttons */}
            <View style={styles.footer}>
              {optional ? (
                <TouchableOpacity onPress={handleClear} style={styles.footerBtn}>
                  <Text style={{ color: theme.colors.danger, fontSize: 15, fontWeight: '600' }}>
                    Clear
                  </Text>
                </TouchableOpacity>
              ) : (
                <View />
              )}
              <View style={styles.footerRight}>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={[styles.footerBtn, { marginRight: 12 }]}
                >
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 15, fontWeight: '600' }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleConfirm}
                  style={[
                    styles.confirmBtn,
                    {
                      backgroundColor: selectedDay ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  disabled={!selectedDay}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
                    Confirm
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const CELL_SIZE = 40;

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputText: {
    fontSize: 16,
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: {
    padding: 6,
  },
  monthYearText: {
    fontSize: 17,
    fontWeight: '700',
  },
  dayHeaderRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: CELL_SIZE,
  },
  dayHeaderText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dayCellBtn: {
    width: CELL_SIZE - 4,
    height: CELL_SIZE - 4,
    borderRadius: (CELL_SIZE - 4) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 15,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  confirmBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
});
