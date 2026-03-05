import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { generateId } from '../utils/generateId';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { FormInput } from '../components/FormInput';
import { TimePicker } from '../components/TimePicker';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { PetAvatarHeader } from '../components/PetAvatarHeader';
import { useNotifications } from '../context/NotificationContext';
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
  const insets = useSafeAreaInsets();
  const {
    selectedPet,
    selectedPetId,
    scheduleEvents,
    addScheduleEvent,
    updateScheduleEvent,
    deleteScheduleEvent,
    meals,
    medications,
    isOwner,
  } = useData();
  const { prefs: notifPrefs, permissionStatus, requestPermissions } = useNotifications();

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
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [detailEvent, setDetailEvent] = useState<string | null>(null);

  const petEvents = useMemo(
    () => scheduleEvents
      .filter((e) => e.petId === selectedPetId)
      .sort((a, b) => a.time.localeCompare(b.time)),
    [scheduleEvents, selectedPetId]
  );

  const petMeals = useMemo(
    () => meals.filter((m) => m.petId === selectedPetId),
    [meals, selectedPetId]
  );
  const petMedications = useMemo(
    () => medications.filter((m) => m.petId === selectedPetId),
    [medications, selectedPetId]
  );

  // O(1) lookup maps for linked items
  const mealMap = useMemo(
    () => new Map(petMeals.map((m) => [m.id, m])),
    [petMeals]
  );
  const medMap = useMemo(
    () => new Map(petMedications.map((m) => [m.id, m])),
    [petMedications]
  );

  // Group events by hour for the timeline
  const eventsByHour = useMemo(() => {
    const map = new Map<number, typeof petEvents>();
    for (const event of petEvents) {
      const hour = parseInt(event.time.split(':')[0], 10);
      const existing = map.get(hour) || [];
      existing.push(event);
      map.set(hour, existing);
    }
    return map;
  }, [petEvents]);

  const resetForm = () => {
    setEventType('feeding');
    setTitle('');
    setTime('08:00');
    setSelectedDays(DAYS);
    setNotes('');
    setLinkedMealId(undefined);
    setLinkedMedicationId(undefined);
    setNotificationEnabled(true);
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
    setNotificationEnabled(event.notificationEnabled !== false);
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

      const eventData: Record<string, any> = {
        id: editingEvent || generateId(),
        petId: selectedPetId!,
        type: eventType,
        title: eventTitle,
        time: time.padStart(5, '0'),
        days: selectedDays,
        notificationEnabled,
      };
      if (notes.trim()) eventData.notes = notes.trim();
      if (eventType === 'feeding' && linkedMealId) eventData.linkedMealId = linkedMealId;
      if (eventType === 'medication' && linkedMedicationId) eventData.linkedMedicationId = linkedMedicationId;

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

  const handleToggleEventNotification = async (eventId: string) => {
    const event = scheduleEvents.find((e) => e.id === eventId);
    if (!event) return;

    const newValue = event.notificationEnabled === false;

    // If enabling, ensure permissions are granted
    if (newValue && permissionStatus !== 'granted') {
      const granted = await requestPermissions();
      if (!granted) return;
    }

    await updateScheduleEvent({ ...event, notificationEnabled: newValue });
  };

  const getEventTypeInfo = (type: string) =>
    EVENT_TYPES.find((t) => t.value === type) || EVENT_TYPES[EVENT_TYPES.length - 1];

  if (!selectedPet) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <PetAvatarHeader
          title="Schedule"
          onAddPet={() => navigation.navigate('AddPetChoice')}
        />
        <View style={{ flex: 1, paddingBottom: 80 }}>
          <EmptyState
            icon="calendar"
            title="No Pet Selected"
            subtitle="Add a pet first to manage their schedule."
            actionLabel="Add Pet"
            onAction={() => navigation.navigate('AddPetChoice')}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <PetAvatarHeader
        title="Schedule"
        onAddPet={() => navigation.navigate('AddPetChoice')}
      />

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
                if (!hasEvents && isOwner) {
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
                        const linkedMeal = event.linkedMealId ? mealMap.get(event.linkedMealId) : undefined;
                        const linkedMed = event.linkedMedicationId ? medMap.get(event.linkedMedicationId) : undefined;
                        return (
                          <TouchableOpacity
                            key={event.id}
                            activeOpacity={0.7}
                            onPress={() => setDetailEvent(event.id)}
                            onLongPress={isOwner ? () => openEditModal(event.id) : undefined}
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
                              {linkedMeal && (
                                <Text style={[styles.eventChipLinked, { color: typeInfo.color }]} numberOfLines={1}>
                                  {linkedMeal.name}
                                </Text>
                              )}
                              {linkedMed && (
                                <Text style={[styles.eventChipLinked, { color: typeInfo.color }]} numberOfLines={1}>
                                  {linkedMed.name}{linkedMed.dosage ? ` \u2022 ${linkedMed.dosage}` : ''}
                                </Text>
                              )}
                              <Text style={[styles.eventChipTime, { color: theme.colors.textSecondary }]}>
                                {formatTime(event.time)}
                                {event.days.length < 7 ? ` \u2022 ${event.days.join(', ')}` : ''}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => handleToggleEventNotification(event.id)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              style={styles.eventBellBtn}
                            >
                              <Ionicons
                                name={event.notificationEnabled !== false ? 'notifications' : 'notifications-off-outline'}
                                size={16}
                                color={event.notificationEnabled !== false ? typeInfo.color : theme.colors.textSecondary + '80'}
                              />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {isOwner && (
                      <TouchableOpacity
                        style={[styles.slotAddBtn, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary + '30' }]}
                        onPress={() => openAddModalAtHour(hour)}
                        activeOpacity={0.6}
                      >
                        <Ionicons name="add" size={18} color={theme.colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <View style={styles.emptySlot}>
                    {isOwner && <Ionicons name="add" size={16} color={theme.colors.textSecondary + '60'} />}
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
          behavior="padding"
        >
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border, paddingTop: insets.top + 16 }]}>
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
            keyboardShouldPersistTaps="handled"
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

            {/* Notification Toggle */}
            <TouchableOpacity
              onPress={() => setNotificationEnabled((prev) => !prev)}
              activeOpacity={0.7}
              style={[
                styles.notifToggleRow,
                {
                  backgroundColor: theme.colors.inputBackground,
                  borderColor: notificationEnabled ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <View style={styles.notifToggleLabel}>
                <Ionicons
                  name={notificationEnabled ? 'notifications' : 'notifications-off-outline'}
                  size={20}
                  color={notificationEnabled ? theme.colors.primary : theme.colors.textSecondary}
                />
                <View>
                  <Text style={[styles.notifToggleText, { color: theme.colors.text }]}>
                    Notification
                  </Text>
                  <Text style={[styles.notifToggleHint, { color: theme.colors.textSecondary }]}>
                    {notificationEnabled ? 'Reminder will be sent before this event' : 'No reminder for this event'}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.notifTogglePill,
                  { backgroundColor: notificationEnabled ? theme.colors.primary : theme.colors.border },
                ]}
              >
                <View
                  style={[
                    styles.notifToggleKnob,
                    notificationEnabled ? styles.notifToggleKnobOn : styles.notifToggleKnobOff,
                  ]}
                />
              </View>
            </TouchableOpacity>

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

            <View style={{ height: 40 + insets.bottom }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Event Detail Modal */}
      <Modal
        visible={detailEvent !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setDetailEvent(null)}
      >
        <TouchableOpacity
          style={styles.detailOverlay}
          activeOpacity={1}
          onPress={() => setDetailEvent(null)}
        >
          <View
            style={[styles.detailSheet, { backgroundColor: theme.colors.background }]}
            onStartShouldSetResponder={() => true}
          >
            {(() => {
              const event = scheduleEvents.find((e) => e.id === detailEvent);
              if (!event) return null;
              const typeInfo = getEventTypeInfo(event.type);
              const linkedMeal = event.linkedMealId ? mealMap.get(event.linkedMealId) : undefined;
              const linkedMed = event.linkedMedicationId ? medMap.get(event.linkedMedicationId) : undefined;

              return (
                <>
                  {/* Header */}
                  <View style={styles.detailHeader}>
                    <View style={[styles.detailIconBadge, { backgroundColor: typeInfo.color + '20' }]}>
                      <Ionicons name={typeInfo.icon} size={22} color={typeInfo.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.detailTitle, { color: theme.colors.text }]}>
                        {event.title}
                      </Text>
                      <Text style={[styles.detailSubtitle, { color: theme.colors.textSecondary }]}>
                        {formatTime(event.time)}
                        {event.days.length < 7 ? `  •  ${event.days.join(', ')}` : '  •  Every day'}
                      </Text>
                    </View>
                  </View>

                  {event.notes ? (
                    <Text style={[styles.detailNotes, { color: theme.colors.textSecondary }]}>
                      {event.notes}
                    </Text>
                  ) : null}

                  {/* Linked Meal Info */}
                  {linkedMeal && (
                    <View style={[styles.detailLinkedCard, { backgroundColor: typeInfo.color + '10', borderColor: typeInfo.color + '30' }]}>
                      <View style={styles.detailLinkedHeader}>
                        <Ionicons name="link" size={14} color={typeInfo.color} />
                        <Text style={[styles.detailLinkedLabel, { color: typeInfo.color }]}>
                          Linked {linkedMeal.type === 'treat' ? 'Treat' : 'Meal'}
                        </Text>
                      </View>
                      <Text style={[styles.detailLinkedName, { color: theme.colors.text }]}>
                        {linkedMeal.name}
                      </Text>
                      {linkedMeal.ingredients && linkedMeal.ingredients.length > 0 && (
                        <View style={styles.detailIngredients}>
                          <Text style={[styles.detailSectionLabel, { color: theme.colors.textSecondary }]}>
                            Ingredients
                          </Text>
                          {linkedMeal.ingredients.map((ing, i) => (
                            <Text key={i} style={[styles.detailIngredientItem, { color: theme.colors.text }]}>
                              •  {ing.name}{ing.quantity ? ` — ${ing.quantity}` : ''}{ing.brand ? ` (${ing.brand})` : ''}
                            </Text>
                          ))}
                        </View>
                      )}
                      {linkedMeal.notes ? (
                        <Text style={[styles.detailLinkedNotes, { color: theme.colors.textSecondary }]}>
                          {linkedMeal.notes}
                        </Text>
                      ) : null}
                    </View>
                  )}

                  {/* Linked Medication Info */}
                  {linkedMed && (
                    <View style={[styles.detailLinkedCard, { backgroundColor: typeInfo.color + '10', borderColor: typeInfo.color + '30' }]}>
                      <View style={styles.detailLinkedHeader}>
                        <Ionicons name="link" size={14} color={typeInfo.color} />
                        <Text style={[styles.detailLinkedLabel, { color: typeInfo.color }]}>
                          Linked Medication
                        </Text>
                      </View>
                      <Text style={[styles.detailLinkedName, { color: theme.colors.text }]}>
                        {linkedMed.name}
                      </Text>
                      {linkedMed.dosage ? (
                        <View style={styles.detailMedRow}>
                          <Text style={[styles.detailSectionLabel, { color: theme.colors.textSecondary }]}>Dosage</Text>
                          <Text style={[styles.detailMedValue, { color: theme.colors.text }]}>{linkedMed.dosage}</Text>
                        </View>
                      ) : null}
                      {linkedMed.frequency ? (
                        <View style={styles.detailMedRow}>
                          <Text style={[styles.detailSectionLabel, { color: theme.colors.textSecondary }]}>Frequency</Text>
                          <Text style={[styles.detailMedValue, { color: theme.colors.text }]}>{linkedMed.frequency}</Text>
                        </View>
                      ) : null}
                      {(linkedMed.startDate || linkedMed.endDate) ? (
                        <View style={styles.detailMedRow}>
                          <Text style={[styles.detailSectionLabel, { color: theme.colors.textSecondary }]}>Period</Text>
                          <Text style={[styles.detailMedValue, { color: theme.colors.text }]}>
                            {linkedMed.startDate || '—'} → {linkedMed.endDate || 'Ongoing'}
                          </Text>
                        </View>
                      ) : null}
                      {linkedMed.notes ? (
                        <Text style={[styles.detailLinkedNotes, { color: theme.colors.textSecondary }]}>
                          {linkedMed.notes}
                        </Text>
                      ) : null}
                    </View>
                  )}

                  {/* No linked item message for feeding/medication without links */}
                  {event.type === 'feeding' && !linkedMeal && (
                    <Text style={[styles.detailNoLink, { color: theme.colors.textSecondary }]}>
                      No meal linked to this event.
                    </Text>
                  )}
                  {event.type === 'medication' && !linkedMed && (
                    <Text style={[styles.detailNoLink, { color: theme.colors.textSecondary }]}>
                      No medication linked to this event.
                    </Text>
                  )}

                  {/* Action buttons */}
                  <View style={styles.detailActions}>
                    {isOwner && (
                      <TouchableOpacity
                        style={[styles.detailEditBtn, { backgroundColor: theme.colors.primary }]}
                        onPress={() => {
                          setDetailEvent(null);
                          openEditModal(event.id);
                        }}
                      >
                        <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.detailEditBtnText}>Edit</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.detailCloseBtn, { backgroundColor: theme.colors.inputBackground }]}
                      onPress={() => setDetailEvent(null)}
                    >
                      <Text style={[styles.detailCloseBtnText, { color: theme.colors.text }]}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  eventChipLinked: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  eventChipTime: {
    fontSize: 11,
    marginTop: 1,
  },
  eventBellBtn: {
    padding: 4,
    alignSelf: 'flex-start',
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
  notifToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  notifToggleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  notifToggleText: {
    fontSize: 15,
    fontWeight: '600',
  },
  notifToggleHint: {
    fontSize: 12,
    marginTop: 1,
  },
  notifTogglePill: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  notifToggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  notifToggleKnobOn: {
    alignSelf: 'flex-end',
  },
  notifToggleKnobOff: {
    alignSelf: 'flex-start',
  },
  deleteBtn: {
    marginTop: 16,
  },
  // Detail modal
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  detailSheet: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  detailIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  detailSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  detailNotes: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  detailLinkedCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  detailLinkedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  detailLinkedLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailLinkedName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  detailIngredients: {
    gap: 3,
    marginBottom: 6,
  },
  detailSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  detailIngredientItem: {
    fontSize: 14,
    paddingLeft: 4,
  },
  detailMedRow: {
    marginBottom: 6,
  },
  detailMedValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailLinkedNotes: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
  },
  detailNoLink: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  detailEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  detailEditBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  detailCloseBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  detailCloseBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
