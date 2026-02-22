import React, { useState } from 'react';
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
import { Card } from '../components/Card';
import { FormInput } from '../components/FormInput';
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
  { value: 'nap', label: 'Nap', icon: 'moon', color: '#8B5CF6' },
  { value: 'wake', label: 'Wake', icon: 'sunny', color: '#F97316' },
  { value: 'sleep', label: 'Sleep', icon: 'bed', color: '#6366F1' },
  { value: 'play', label: 'Play', icon: 'football', color: '#EC4899' },
  { value: 'walk', label: 'Walk', icon: 'walk', color: '#14B8A6' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal', color: '#64748B' },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
  } = useData();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [eventType, setEventType] = useState<ScheduleEventType>('feeding');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>(DAYS);
  const [notes, setNotes] = useState('');
  const [linkedMealId, setLinkedMealId] = useState<string | undefined>(undefined);

  const petEvents = scheduleEvents
    .filter((e) => e.petId === selectedPetId)
    .sort((a, b) => a.time.localeCompare(b.time));

  const petMeals = meals.filter((m) => m.petId === selectedPetId);

  const resetForm = () => {
    setEventType('feeding');
    setTitle('');
    setTime('');
    setSelectedDays(DAYS);
    setNotes('');
    setLinkedMealId(undefined);
    setEditingEvent(null);
  };

  const openAddModal = () => {
    resetForm();
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
    setModalVisible(true);
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    if (!time.match(/^\d{1,2}:\d{2}$/)) {
      Alert.alert('Invalid Time', 'Please enter time in HH:MM format (e.g., 08:30).');
      return;
    }

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

  const formatTime = (t: string): string => {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  };

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
        <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
          <Ionicons name="add-circle" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <PetSelector onAddPet={() => navigation.navigate('HomeTab', { screen: 'AddPet' })} />

      {petEvents.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No Schedule Yet"
          subtitle={`Add ${selectedPet.name}'s daily routine - feeding times, potty breaks, naps, and more.`}
          actionLabel="Add Event"
          onAction={openAddModal}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {petEvents.map((event) => {
            const typeInfo = getEventTypeInfo(event.type);
            const linkedMeal = event.linkedMealId
              ? meals.find((m) => m.id === event.linkedMealId)
              : null;

            return (
              <TouchableOpacity
                key={event.id}
                activeOpacity={0.7}
                onPress={() => openEditModal(event.id)}
                onLongPress={() => handleDelete(event.id)}
              >
                <Card>
                  <View style={styles.eventRow}>
                    <View
                      style={[
                        styles.eventIcon,
                        { backgroundColor: typeInfo.color + '20' },
                      ]}
                    >
                      <Ionicons
                        name={typeInfo.icon}
                        size={20}
                        color={typeInfo.color}
                      />
                    </View>
                    <View style={styles.eventInfo}>
                      <Text
                        style={[styles.eventTitle, { color: theme.colors.text }]}
                      >
                        {event.title}
                      </Text>
                      <Text
                        style={[
                          styles.eventTime,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {formatTime(event.time)} \u2022{' '}
                        {event.days.length === 7
                          ? 'Every day'
                          : event.days.join(', ')}
                      </Text>
                      {linkedMeal && (
                        <TouchableOpacity
                          onPress={() =>
                            navigation.navigate('MealsTab')
                          }
                          style={[
                            styles.linkedMealBadge,
                            { backgroundColor: theme.colors.primaryLight },
                          ]}
                        >
                          <Ionicons
                            name="restaurant-outline"
                            size={12}
                            color={theme.colors.primary}
                          />
                          <Text
                            style={[
                              styles.linkedMealText,
                              { color: theme.colors.primary },
                            ]}
                          >
                            {linkedMeal.name}
                          </Text>
                        </TouchableOpacity>
                      )}
                      {event.notes && (
                        <Text
                          style={[
                            styles.eventNotes,
                            { color: theme.colors.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {event.notes}
                        </Text>
                      )}
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={theme.colors.textSecondary}
                    />
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

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

            <FormInput
              label="Time (HH:MM)"
              value={time}
              onChangeText={setTime}
              placeholder="08:30"
              keyboardType="numbers-and-punctuation"
            />

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
  addButton: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    flex: 1,
    marginLeft: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  eventTime: {
    fontSize: 13,
    marginTop: 2,
  },
  eventNotes: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  linkedMealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    gap: 4,
  },
  linkedMealText: {
    fontSize: 12,
    fontWeight: '600',
  },
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
