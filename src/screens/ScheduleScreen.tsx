import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { generateId } from '../utils/generateId';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { FormInput } from '../components/FormInput';
import { TimePicker } from '../components/TimePicker';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { PetSelector } from '../components/PetSelector';
import { ScheduleEventType } from '../types';

const EVENT_TYPES: {
  value: ScheduleEventType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { value: 'feeding', label: 'Feeding', icon: 'restaurant', color: '#F59E0B' },
  { value: 'potty', label: 'Potty', icon: 'leaf', color: '#22C55E' },
  { value: 'nap', label: 'Nap', icon: 'bed', color: '#8B5CF6' },
  { value: 'wake', label: 'Wake', icon: 'sunny', color: '#F97316' },
  { value: 'sleep', label: 'Bedtime', icon: 'moon', color: '#6366F1' },
  { value: 'play', label: 'Play', icon: 'football', color: '#EC4899' },
  { value: 'walk', label: 'Walk', icon: 'walk', color: '#14B8A6' },
  { value: 'medication', label: 'Medication', icon: 'medkit', color: '#EF4444' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal', color: '#64748B' },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Hours to show in the timeline (5 AM – 11 PM)
const TIMELINE_HOURS = Array.from({ length: 19 }, (_, i) => i + 5);

const SLOT_HEIGHT = 64;

function formatHourLabel(hour24: number): string {
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const h = hour24 % 12 || 12;
  return `${h} ${period}`;
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export function ScheduleScreen({ navigation }: any) {
  const { theme } = useTheme();
  const {
    selectedPet,
    selectedPetId,
    scheduleEvents,
    addScheduleEvent,
    updateScheduleEvent,
    deleteScheduleEvent,
    meals,
    medications,
  } = useData();

  const scrollRef = useRef<ScrollView>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [eventType, setEventType] = useState<ScheduleEventType>('feeding');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('08:00');
  const [selectedDays, setSelectedDays] = useState<string[]>(DAYS);
  const [notes, setNotes] = useState('');
  const [linkedMealId, setLinkedMealId] = useState<string | undefined>(undefined);
  const [linkedMedicationId, setLinkedMedicationId] = useState<string | undefined>(undefined);

  const petEvents = scheduleEvents
    .filter((e) => e.petId === selectedPetId)
    .sort((a, b) => a.time.localeCompare(b.time));

  const petMeals = meals.filter((m) => m.petId === selectedPetId);
  const petMedications = medications.filter((m) => m.petId === selectedPetId);

  // Group events by hour for the timeline
  const eventsByHour = new Map<number, typeof petEvents>();
  for (const event of petEvents) {
    const hour = parseInt(event.time.split(':')[0], 10);
    const existing = eventsByHour.get(hour) || [];
    existing.push(event);
    eventsByHour.set(hour, existing);
  }

  const resetForm = () => {
    setEventType('feeding');
    setTitle('');
    setTime('08:00');
    setSelectedDays(DAYS);
    setNotes('');
    setLinkedMealId(undefined);
    setLinkedMedicationId(undefined);
    setEditingEvent(null);
  };

  const openAddModalAtHour = (hour24: number) => {
    resetForm();
    setTime(`${String(hour24).padStart(2, '0')}:00`);
    setModalVisible(true);
  };

  const openEditModal = (eventId: string) => {
    const event = scheduleEvents.find((e) => e.id === eventId);
    if (!event) return;
    setEditingEvent(eventId);
    setEventType(event.type);
    setTitle(event.title);
    setTime(event.time);
    setSelectedDays(event.days);
    setNotes(event.notes || '');
    setLinkedMealId(event.linkedMealId);
    setLinkedMedicationId(event.linkedMedicationId);
    setModalVisible(true);
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    try {
      const eventTitle =
        title.trim() ||
        EVENT_TYPES.find((t) => t.value === eventType)?.label ||
        'Event';

      const eventData = {
        id: editingEvent || generateId(),
        petId: selectedPetId!,
        type: eventType,
        title: eventTitle,
        time: time.padStart(5, '0'),
        days: selectedDays,
        notes: notes.trim() || undefined,
        linkedMealId: eventType === 'feeding' ? linkedMealId : undefined,
        linkedMedicationId: eventType === 'medication' ? linkedMedicationId : undefined,
      };

      if (editingEvent) {
        await updateScheduleEvent(eventData);
      } else {
        await addScheduleEvent(eventData);
      }

      setModalVisible(false);
      resetForm();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save event.');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteScheduleEvent(id),
      },
    ]);
  };

  const getEventTypeInfo = (type: string) =>
    EVENT_TYPES.find((t) => t.value === type) || EVENT_TYPES[EVENT_TYPES.length - 1];

  if (!selectedPet) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.screenHeader}>
          <Text style={[styles.screenTitle, { color: theme.colors.text }]}>Schedule</Text>
        </View>
        <EmptyState
          icon="calendar"
          title="No Pet Selected"
          subtitle="Add a pet first to manage their schedule."
          actionLabel="Add Pet"
          onAction={() => navigation.navigate('HomeTab', { screen: 'AddPet' })}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.screenHeader}>
        <Text style={[styles.screenTitle, { color: theme.colors.text }]}>Schedule</Text>
      </View>

      <PetSelector onAddPet={() => navigation.navigate('HomeTab', { screen: 'AddPet' })} />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.timelineContent}
      >
        {TIMELINE_HOURS.map((hour) => {
          const hourEvents = eventsByHour.get(hour) || [];
          const hasEvents = hourEvents.length > 0;

          return (
            <TouchableOpacity
              key={hour}
              activeOpacity={0.6}
              onPress={() => {
                if (!hasEvents) {
                  openAddModalAtHour(hour);
                }
              }}
              style={[
                styles.slotRow,
                { borderBottomColor: theme.colors.border + '40' },
              ]}
            >
              {/* Time label */}
              <View style={styles.slotTimeCol}>
                <Text style={[styles.slotTimeText, { color: theme.colors.textSecondary }]}>
                  {formatHourLabel(hour)}
                </Text>
              </View>

              {/* Divider line */}
              <View style={[styles.slotDivider, { backgroundColor: theme.colors.border + '60' }]} />

              {/* Events area */}
              <View style={styles.slotEventsCol}>
                {hasEvents ? (
                  <View style={styles.slotEventsRow}>
                    <View style={{ flex: 1 }}>
                      {hourEvents.map((event) => {
                        const typeInfo = getEventTypeInfo(event.type);
                        return (
                          <TouchableOpacity
                            key={event.id}
                            activeOpacity={0.7}
                            onPress={() => openEditModal(event.id)}
                            onLongPress={() => handleDelete(event.id)}
                            style={[
                              styles.eventChip,
                              {
                                backgroundColor: typeInfo.color + '18',
                                borderLeftColor: typeInfo.color,
                              },
                            ]}
                          >
                            <Ionicons name={typeInfo.icon} size={14} color={typeInfo.color} />
                            <View style={styles.eventChipText}>
                              <Text
                                style={[styles.eventChipTitle, { color: theme.colors.text }]}
                                numberOfLines={1}
                              >
                                {event.title}
                              </Text>
                              <Text style={[styles.eventChipTime, { color: theme.colors.textSecondary }]}>
                                {formatTime(event.time)}
                                {event.days.length < 7 ? ` \u2022 ${event.days.join(', ')}` : ''}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <TouchableOpacity
                      style={[styles.slotAddBtn, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary + '30' }]}
                      onPress={() => openAddModalAtHour(hour)}
                      activeOpacity={0.6}
                    >
                      <Ionicons name="add" size={18} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.emptySlot}>
                    <Ionicons name="add" size={16} color={theme.colors.textSecondary + '60'} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => { setModalVisible(false); resetForm(); }}>
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                resetForm();
              }}
              style={styles.modalHeaderBtn}
            >
              <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {editingEvent ? 'Edit Event' : 'Add Event'}
            </Text>
            <TouchableOpacity onPress={handleSave} style={styles.modalHeaderBtn}>
              <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '700' }}>
                Save
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalBodyContent}
          >
            {/* Event Type Selector */}
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
              Event Type
            </Text>
            <View style={styles.typeGrid}>
              {EVENT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeGridItem,
                    {
                      backgroundColor:
                        eventType === type.value
                          ? type.color + '20'
                          : theme.colors.inputBackground,
                      borderColor:
                        eventType === type.value
                          ? type.color
                          : theme.colors.border,
                    },
                  ]}
                  onPress={() => {
                    setEventType(type.value);
                    if (!title.trim()) setTitle(type.label);
                  }}
                >
                  <Ionicons
                    name={type.icon}
                    size={22}
                    color={eventType === type.value ? type.color : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeGridLabel,
                      {
                        color:
                          eventType === type.value
                            ? type.color
                            : theme.colors.text,
                      },
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FormInput
              label="Title"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Morning Feeding"
            />

            <TimePicker value={time} onChange={setTime} />

            {/* Days Selector */}
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
              Days
            </Text>
            <View style={styles.daysRow}>
              {DAYS.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayChip,
                    {
                      backgroundColor: selectedDays.includes(day)
                        ? theme.colors.primary
                        : theme.colors.inputBackground,
                      borderColor: selectedDays.includes(day)
                        ? theme.colors.primary
                        : theme.colors.border,
                    },
                  ]}
                  onPress={() => toggleDay(day)}
                >
                  <Text
                    style={{
                      color: selectedDays.includes(day) ? '#FFFFFF' : theme.colors.text,
                      fontSize: 13,
                      fontWeight: '600',
                    }}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Linked Meal (for feeding events) */}
            {eventType === 'feeding' && petMeals.length > 0 && (
              <>
                <Text
                  style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}
                >
                  Link to Meal
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.mealLinkScroll}
                  contentContainerStyle={styles.mealLinkContainer}
                >
                  <TouchableOpacity
                    style={[
                      styles.mealLinkChip,
                      {
                        backgroundColor: !linkedMealId
                          ? theme.colors.primary
                          : theme.colors.inputBackground,
                        borderColor: !linkedMealId
                          ? theme.colors.primary
                          : theme.colors.border,
                      },
                    ]}
                    onPress={() => setLinkedMealId(undefined)}
                  >
                    <Text
                      style={{
                        color: !linkedMealId ? '#FFFFFF' : theme.colors.text,
                        fontSize: 14,
                        fontWeight: '600',
                      }}
                    >
                      None
                    </Text>
                  </TouchableOpacity>
                  {petMeals.map((meal) => (
                    <TouchableOpacity
                      key={meal.id}
                      style={[
                        styles.mealLinkChip,
                        {
                          backgroundColor:
                            linkedMealId === meal.id
                              ? theme.colors.primary
                              : theme.colors.inputBackground,
                          borderColor:
                            linkedMealId === meal.id
                              ? theme.colors.primary
                              : theme.colors.border,
                        },
                      ]}
                      onPress={() => setLinkedMealId(meal.id)}
                    >
                      <Text
                        style={{
                          color:
                            linkedMealId === meal.id ? '#FFFFFF' : theme.colors.text,
                          fontSize: 14,
                          fontWeight: '600',
                        }}
                      >
                        {meal.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Linked Medication (for medication events) */}
            {eventType === 'medication' && petMedications.length > 0 && (
              <>
                <Text
                  style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}
                >
                  Link to Medication
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.mealLinkScroll}
                  contentContainerStyle={styles.mealLinkContainer}
                >
                  <TouchableOpacity
                    style={[
                      styles.mealLinkChip,
                      {
                        backgroundColor: !linkedMedicationId
                          ? theme.colors.primary
                          : theme.colors.inputBackground,
                        borderColor: !linkedMedicationId
                          ? theme.colors.primary
                          : theme.colors.border,
                      },
                    ]}
                    onPress={() => setLinkedMedicationId(undefined)}
                  >
                    <Text
                      style={{
                        color: !linkedMedicationId ? '#FFFFFF' : theme.colors.text,
                        fontSize: 14,
                        fontWeight: '600',
                      }}
                    >
                      None
                    </Text>
                  </TouchableOpacity>
                  {petMedications.map((med) => (
                    <TouchableOpacity
                      key={med.id}
                      style={[
                        styles.mealLinkChip,
                        {
                          backgroundColor:
                            linkedMedicationId === med.id
                              ? theme.colors.primary
                              : theme.colors.inputBackground,
                          borderColor:
                            linkedMedicationId === med.id
                              ? theme.colors.primary
                              : theme.colors.border,
                        },
                      ]}
                      onPress={() => setLinkedMedicationId(med.id)}
                    >
                      <Text
                        style={{
                          color:
                            linkedMedicationId === med.id ? '#FFFFFF' : theme.colors.text,
                          fontSize: 14,
                          fontWeight: '600',
                        }}
                      >
                        {med.name}
                      </Text>
                      {med.dosage ? (
                        <Text
                          style={{
                            color:
                              linkedMedicationId === med.id ? '#FFFFFF99' : theme.colors.textSecondary,
                            fontSize: 11,
                            marginTop: 1,
                          }}
                        >
                          {med.dosage}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <FormInput
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional notes"
              multiline
              style={{ height: 80 }}
            />

            {editingEvent && (
              <Button
                title="Delete Event"
                onPress={() => {
                  setModalVisible(false);
                  handleDelete(editingEvent);
                  resetForm();
                }}
                variant="danger"
                style={styles.deleteBtn}
                icon={<Ionicons name="trash" size={18} color="#FFFFFF" />}
              />
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  // Timeline
  timelineContent: {
    paddingTop: 4,
  },
  slotRow: {
    flexDirection: 'row',
    minHeight: SLOT_HEIGHT,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  slotTimeCol: {
    width: 60,
    paddingTop: 12,
    alignItems: 'center',
  },
  slotTimeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  slotDivider: {
    width: 1,
    marginTop: 8,
    marginBottom: 8,
  },
  slotEventsCol: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    justifyContent: 'center',
    gap: 4,
  },
  slotEventsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotAddBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: SLOT_HEIGHT - 12,
  },
  eventChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderLeftWidth: 3,
    gap: 8,
  },
  eventChipText: {
    flex: 1,
  },
  eventChipTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  eventChipTime: {
    fontSize: 11,
    marginTop: 1,
  },
  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  modalHeaderBtn: {
    minWidth: 60,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  typeGridItem: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 75,
    flexBasis: 75,
    flexGrow: 1,
  },
  typeGridLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },
  dayChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  mealLinkScroll: {
    marginBottom: 20,
  },
  mealLinkContainer: {
    gap: 8,
  },
  mealLinkChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  deleteBtn: {
    marginTop: 16,
  },
});
