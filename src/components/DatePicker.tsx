import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
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

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MIN_YEAR = 1920;
const MAX_YEAR = 2040;
const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i);
const YEAR_ITEM_HEIGHT = 44;

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(month: number, year: number): number {
  return new Date(year, month - 1, 1).getDay();
}

type PickerMode = 'calendar' | 'monthYear';

export function DatePicker({ label, value, onChange, placeholder, optional }: DatePickerProps) {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>('calendar');

  const parsed = parseDate(value);
  const now = new Date();

  const [viewMonth, setViewMonth] = useState(parsed?.month || (now.getMonth() + 1));
  const [viewYear, setViewYear] = useState(parsed?.year || now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(parsed?.day || null);
  const [selectedMonth, setSelectedMonth] = useState<number>(parsed?.month || (now.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<number>(parsed?.year || now.getFullYear());

  // Temporary selections within the month/year picker
  const [tempMonth, setTempMonth] = useState(viewMonth);
  const [tempYear, setTempYear] = useState(viewYear);

  const yearScrollRef = useRef<ScrollView>(null);

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
    setPickerMode('calendar');
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

  const openMonthYearPicker = () => {
    setTempMonth(viewMonth);
    setTempYear(viewYear);
    setPickerMode('monthYear');
  };

  const applyMonthYear = () => {
    setViewMonth(tempMonth);
    setViewYear(tempYear);
    setPickerMode('calendar');
  };

  // Scroll year list to the selected year when month/year picker opens
  useEffect(() => {
    if (pickerMode === 'monthYear' && yearScrollRef.current) {
      const idx = YEARS.indexOf(tempYear);
      if (idx >= 0) {
        // Center the selected year in view (offset by ~3 rows above)
        const offset = Math.max(0, idx * YEAR_ITEM_HEIGHT - YEAR_ITEM_HEIGHT * 3);
        setTimeout(() => {
          yearScrollRef.current?.scrollTo({ y: offset, animated: false });
        }, 50);
      }
    }
  }, [pickerMode, tempYear]);

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

            {pickerMode === 'calendar' ? (
              <>
                {/* Header with month/year navigation */}
                <View style={styles.calendarHeader}>
                  <TouchableOpacity onPress={goToPrevMonth} style={styles.navBtn}>
                    <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={openMonthYearPicker} activeOpacity={0.6} style={styles.monthYearBtn}>
                    <Text style={[styles.monthYearText, { color: theme.colors.primary }]}>
                      {MONTH_NAMES[viewMonth - 1]} {viewYear}
                    </Text>
                    <Ionicons name="caret-down" size={14} color={theme.colors.primary} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
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
              </>
            ) : (
              /* Month & Year picker view */
              <>
                <Text style={[styles.pickerTitle, { color: theme.colors.text }]}>
                  Select Month & Year
                </Text>

                {/* Month grid - 4 columns x 3 rows */}
                <View style={styles.monthGrid}>
                  {MONTH_NAMES_SHORT.map((name, idx) => {
                    const m = idx + 1;
                    const isCurrent = m === tempMonth;
                    return (
                      <TouchableOpacity
                        key={name}
                        onPress={() => setTempMonth(m)}
                        style={[
                          styles.monthCell,
                          isCurrent && { backgroundColor: theme.colors.primary },
                        ]}
                        activeOpacity={0.6}
                      >
                        <Text
                          style={[
                            styles.monthCellText,
                            { color: theme.colors.text },
                            isCurrent && { color: '#FFFFFF', fontWeight: '700' },
                          ]}
                        >
                          {name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Year scroller */}
                <View style={[styles.yearContainer, { borderColor: theme.colors.border }]}>
                  <ScrollView
                    ref={yearScrollRef}
                    showsVerticalScrollIndicator={true}
                    style={styles.yearScroll}
                  >
                    {YEARS.map((y) => {
                      const isCurrent = y === tempYear;
                      const isThisYear = y === now.getFullYear();
                      return (
                        <TouchableOpacity
                          key={y}
                          onPress={() => setTempYear(y)}
                          style={[
                            styles.yearItem,
                            isCurrent && { backgroundColor: theme.colors.primary },
                          ]}
                          activeOpacity={0.6}
                        >
                          <Text
                            style={[
                              styles.yearItemText,
                              { color: theme.colors.text },
                              isCurrent && { color: '#FFFFFF', fontWeight: '700' },
                              isThisYear && !isCurrent && { color: theme.colors.primary, fontWeight: '700' },
                            ]}
                          >
                            {y}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Month/Year picker footer */}
                <View style={styles.footer}>
                  <View />
                  <View style={styles.footerRight}>
                    <TouchableOpacity
                      onPress={() => setPickerMode('calendar')}
                      style={[styles.footerBtn, { marginRight: 12 }]}
                    >
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 15, fontWeight: '600' }}>
                        Back
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={applyMonthYear}
                      style={[styles.confirmBtn, { backgroundColor: theme.colors.primary }]}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

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
  monthYearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
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
  // Month/Year picker styles
  pickerTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  monthCell: {
    width: '25%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  monthCellText: {
    fontSize: 15,
  },
  yearContainer: {
    height: YEAR_ITEM_HEIGHT * 5,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  yearScroll: {
    flex: 1,
  },
  yearItem: {
    height: YEAR_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearItemText: {
    fontSize: 16,
  },
});
