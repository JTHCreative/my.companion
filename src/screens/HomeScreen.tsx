import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';

const PET_TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  dog: 'paw',
  cat: 'paw',
  bird: 'leaf',
  fish: 'water',
  reptile: 'bug',
  rabbit: 'paw',
  hamster: 'paw',
  other: 'paw',
};

function calculateAge(birthday: string): string | null {
  if (!birthday) return null;
  // Expect MM/DD/YYYY
  const parts = birthday.split('/');
  if (parts.length !== 3) return null;
  const [mm, dd, yyyy] = parts.map(Number);
  const birth = new Date(yyyy, mm - 1, dd);
  if (isNaN(birth.getTime())) return null;

  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years >= 1) {
    return years === 1
      ? months > 0
        ? `1 yr ${months} mo`
        : '1 yr'
      : months > 0
        ? `${years} yrs ${months} mo`
        : `${years} yrs`;
  }
  if (months >= 1) return months === 1 ? '1 month' : `${months} months`;
  const days = Math.floor((now.getTime() - birth.getTime()) / 86400000);
  return days <= 1 ? '< 1 month' : `${days} days`;
}

function formatBirthday(birthday: string): string | null {
  if (!birthday) return null;
  const parts = birthday.split('/');
  if (parts.length !== 3) return null;
  const [mm, dd, yyyy] = parts.map(Number);
  const date = new Date(yyyy, mm - 1, dd);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function HomeScreen({ navigation }: any) {
  const { theme, toggleTheme, isDark } = useTheme();
  const { pets, selectedPet, selectedPetId, selectPet, scheduleEvents, meals, medications, vetInfo } = useData();
  const [selectorOpen, setSelectorOpen] = useState(false);

  const petSchedule = scheduleEvents.filter(
    (e) => e.petId === selectedPet?.id
  );
  const petMeals = meals.filter((m) => m.petId === selectedPet?.id);
  const petMeds = medications.filter((m) => m.petId === selectedPet?.id);
  const petVets = vetInfo.filter((v) => v.petId === selectedPet?.id);

  // Sort schedule by time
  const sortedSchedule = [...petSchedule].sort((a, b) =>
    a.time.localeCompare(b.time)
  );

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  const upcomingEvents = sortedSchedule.filter((e) => e.time >= currentTime);
  const nextEvents = upcomingEvents.slice(0, 3);

  const age = selectedPet?.birthday ? calculateAge(selectedPet.birthday) : null;
  const birthdayFormatted = selectedPet?.birthday
    ? formatBirthday(selectedPet.birthday)
    : null;

  const renderHeaderAvatar = () => {
    if (!selectedPet) return null;
    return (
      <TouchableOpacity
        onPress={() => setSelectorOpen(!selectorOpen)}
        activeOpacity={0.7}
        style={[
          styles.headerAvatar,
          {
            borderColor: selectorOpen
              ? theme.colors.primary
              : theme.colors.border,
          },
        ]}
      >
        {selectedPet.profileImage ? (
          <Image
            source={{ uri: selectedPet.profileImage }}
            style={styles.headerAvatarImage}
          />
        ) : (
          <View
            style={[
              styles.headerAvatarImage,
              styles.headerAvatarPlaceholder,
              { backgroundColor: theme.colors.primaryLight },
            ]}
          >
            <Ionicons
              name={PET_TYPE_ICONS[selectedPet.type] || 'paw'}
              size={18}
              color={theme.colors.primary}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderPetSelectorBar = () => {
    if (!selectorOpen) return null;
    return (
      <View
        style={[
          styles.selectorBar,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selectorScroll}
          style={styles.selectorScrollView}
        >
          {pets.map((pet) => {
            const isSelected = pet.id === selectedPetId;
            return (
              <TouchableOpacity
                key={pet.id}
                onPress={() => {
                  selectPet(pet.id);
                  setSelectorOpen(false);
                }}
                activeOpacity={0.7}
                style={styles.selectorItem}
              >
                <View
                  style={[
                    styles.selectorAvatarRing,
                    {
                      borderColor: isSelected
                        ? theme.colors.primary
                        : 'transparent',
                    },
                  ]}
                >
                  {pet.profileImage ? (
                    <Image
                      source={{ uri: pet.profileImage }}
                      style={styles.selectorAvatar}
                    />
                  ) : (
                    <View
                      style={[
                        styles.selectorAvatar,
                        styles.selectorAvatarPlaceholder,
                        { backgroundColor: theme.colors.primaryLight },
                      ]}
                    >
                      <Ionicons
                        name={PET_TYPE_ICONS[pet.type] || 'paw'}
                        size={18}
                        color={theme.colors.primary}
                      />
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.selectorName,
                    {
                      color: isSelected
                        ? theme.colors.primary
                        : theme.colors.text,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {pet.name}
                </Text>
              </TouchableOpacity>
            );
          })}
          {/* Add New Pet */}
          <TouchableOpacity
            onPress={() => {
              setSelectorOpen(false);
              navigation.navigate('AddPet');
            }}
            activeOpacity={0.7}
            style={styles.selectorItem}
          >
            <View
              style={[
                styles.selectorAddButton,
                { borderColor: theme.colors.border },
              ]}
            >
              <Ionicons name="add" size={22} color={theme.colors.primary} />
            </View>
            <Text
              style={[styles.selectorName, { color: theme.colors.textSecondary }]}
            >
              Add
            </Text>
          </TouchableOpacity>
        </ScrollView>
        {/* Settings button */}
        <TouchableOpacity
          onPress={() => {
            setSelectorOpen(false);
            toggleTheme();
          }}
          activeOpacity={0.7}
          style={[
            styles.settingsButton,
            { borderLeftColor: theme.colors.border },
          ]}
        >
          <Ionicons
            name="settings-outline"
            size={22}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    );
  };

  if (pets.length === 0) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.headerBar}>
          <Text style={[styles.appTitle, { color: theme.colors.primary }]}>
            my.Companion
          </Text>
        </View>
        <EmptyState
          icon="paw"
          title="Welcome to my.Companion"
          subtitle="Add your first pet to get started tracking their schedule, meals, and medical info."
          actionLabel="Add Your Pet"
          onAction={() => navigation.navigate('AddPet')}
        />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <View style={styles.headerBar}>
        <Text style={[styles.appTitle, { color: theme.colors.primary }]}>
          my.Companion
        </Text>
        {renderHeaderAvatar()}
      </View>

      {/* Pet Selector Dropdown */}
      {renderPetSelectorBar()}

      {selectedPet && (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Expanded Pet Profile Card */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate('EditPet', { petId: selectedPet.id })
            }
          >
            <Card style={styles.profileCard}>
              {/* Top section: image + name */}
              <View style={styles.profileHeader}>
                {selectedPet.profileImage ? (
                  <Image
                    source={{ uri: selectedPet.profileImage }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View
                    style={[
                      styles.profileImage,
                      styles.profilePlaceholder,
                      { backgroundColor: theme.colors.primaryLight },
                    ]}
                  >
                    <Ionicons
                      name={PET_TYPE_ICONS[selectedPet.type] || 'paw'}
                      size={44}
                      color={theme.colors.primary}
                    />
                  </View>
                )}
                <View style={styles.profileHeaderInfo}>
                  <Text
                    style={[styles.petName, { color: theme.colors.text }]}
                  >
                    {selectedPet.name}
                  </Text>
                  <Text
                    style={[
                      styles.petSubtitle,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {selectedPet.type.charAt(0).toUpperCase() +
                      selectedPet.type.slice(1)}
                    {selectedPet.breed ? ` \u2022 ${selectedPet.breed}` : ''}
                  </Text>
                  {age && (
                    <Text
                      style={[
                        styles.petAge,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {age} old
                    </Text>
                  )}
                </View>
                <Ionicons
                  name="create-outline"
                  size={20}
                  color={theme.colors.textSecondary}
                  style={styles.editIcon}
                />
              </View>

              {/* Detail rows */}
              <View
                style={[
                  styles.profileDetails,
                  { borderTopColor: theme.colors.border },
                ]}
              >
                {birthdayFormatted && (
                  <View style={styles.detailRow}>
                    <View
                      style={[
                        styles.detailIcon,
                        { backgroundColor: theme.colors.primaryLight },
                      ]}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color={theme.colors.primary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Birthday
                    </Text>
                    <Text
                      style={[
                        styles.detailValue,
                        { color: theme.colors.text },
                      ]}
                    >
                      {birthdayFormatted}
                    </Text>
                  </View>
                )}
                {selectedPet.weight ? (
                  <View style={styles.detailRow}>
                    <View
                      style={[
                        styles.detailIcon,
                        { backgroundColor: theme.colors.primaryLight },
                      ]}
                    >
                      <Ionicons
                        name="scale-outline"
                        size={16}
                        color={theme.colors.primary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Weight
                    </Text>
                    <Text
                      style={[
                        styles.detailValue,
                        { color: theme.colors.text },
                      ]}
                    >
                      {selectedPet.weight} {selectedPet.weightUnit}
                    </Text>
                  </View>
                ) : null}
                {petVets.length > 0 && (
                  <View style={styles.detailRow}>
                    <View
                      style={[
                        styles.detailIcon,
                        { backgroundColor: theme.colors.primaryLight },
                      ]}
                    >
                      <Ionicons
                        name="medkit-outline"
                        size={16}
                        color={theme.colors.primary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Vet
                    </Text>
                    <Text
                      style={[
                        styles.detailValue,
                        { color: theme.colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {petVets[0].vetName || petVets[0].clinicName}
                    </Text>
                  </View>
                )}
              </View>

              {/* Personality tags */}
              {selectedPet.personality ? (
                <View
                  style={[
                    styles.personalitySection,
                    { borderTopColor: theme.colors.border },
                  ]}
                >
                  <View style={styles.personalityRow}>
                    {selectedPet.personality
                      .split(',')
                      .map((tag) => tag.trim())
                      .filter(Boolean)
                      .map((tag) => (
                        <View
                          key={tag}
                          style={[
                            styles.personalityBadge,
                            { backgroundColor: theme.colors.primaryLight },
                          ]}
                        >
                          <Text
                            style={[
                              styles.personalityText,
                              { color: theme.colors.primary },
                            ]}
                          >
                            {tag}
                          </Text>
                        </View>
                      ))}
                  </View>
                </View>
              ) : null}
            </Card>
          </TouchableOpacity>

          {/* Quick Stats */}
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={[
                styles.statCard,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
              ]}
              onPress={() => navigation.navigate('ScheduleTab')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="calendar"
                size={24}
                color={theme.colors.primary}
              />
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {petSchedule.length}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Events
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statCard,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
              ]}
              onPress={() => navigation.navigate('MealsTab')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="restaurant"
                size={24}
                color={theme.colors.warning}
              />
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {petMeals.length}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Meals
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statCard,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
              ]}
              onPress={() => navigation.navigate('MedicalTab')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="medkit"
                size={24}
                color={theme.colors.danger}
              />
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {petMeds.length}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Meds
              </Text>
            </TouchableOpacity>
          </View>

          {/* Upcoming Schedule */}
          <Card>
            <View style={styles.sectionHeader}>
              <Text
                style={[styles.sectionTitle, { color: theme.colors.text }]}
              >
                Upcoming Today
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('ScheduleTab')}
              >
                <Text
                  style={[
                    styles.seeAllText,
                    { color: theme.colors.primary },
                  ]}
                >
                  See All
                </Text>
              </TouchableOpacity>
            </View>
            {nextEvents.length > 0 ? (
              nextEvents.map((event) => (
                <View
                  key={event.id}
                  style={[
                    styles.eventRow,
                    { borderBottomColor: theme.colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.eventIcon,
                      { backgroundColor: theme.colors.primaryLight },
                    ]}
                  >
                    <Ionicons
                      name={getScheduleIcon(event.type)}
                      size={18}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.eventInfo}>
                    <Text
                      style={[
                        styles.eventTitle,
                        { color: theme.colors.text },
                      ]}
                    >
                      {event.title}
                    </Text>
                    <Text
                      style={[
                        styles.eventTime,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {formatTime(event.time)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text
                style={[
                  styles.noEventsText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                No more events today
              </Text>
            )}
          </Card>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

function getScheduleIcon(type: string): keyof typeof Ionicons.glyphMap {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    feeding: 'restaurant',
    potty: 'leaf',
    nap: 'moon',
    wake: 'sunny',
    sleep: 'bed',
    play: 'football',
    walk: 'walk',
    other: 'ellipsis-horizontal',
  };
  return icons[type] || 'ellipsis-horizontal';
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    overflow: 'hidden',
  },
  headerAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
  },
  headerAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Pet selector bar */
  selectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  selectorScrollView: {
    flex: 1,
  },
  selectorScroll: {
    paddingHorizontal: 16,
    gap: 16,
    alignItems: 'center',
  },
  selectorItem: {
    alignItems: 'center',
    width: 56,
  },
  selectorAvatarRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  selectorAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorName: {
    fontSize: 11,
    marginTop: 4,
    maxWidth: 56,
    textAlign: 'center',
  },
  selectorAddButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderLeftWidth: 1,
    alignSelf: 'center',
  },

  /* Content */
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  /* Expanded profile card */
  profileCard: {
    marginTop: 8,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  profilePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHeaderInfo: {
    flex: 1,
    marginLeft: 16,
  },
  petName: {
    fontSize: 24,
    fontWeight: '700',
  },
  petSubtitle: {
    fontSize: 15,
    marginTop: 2,
  },
  petAge: {
    fontSize: 14,
    marginTop: 2,
  },
  editIcon: {
    alignSelf: 'flex-start',
    padding: 4,
  },
  profileDetails: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    width: 64,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  personalitySection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  personalityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  personalityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  personalityText: {
    fontSize: 12,
    fontWeight: '600',
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 8,
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },

  /* Schedule section */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  eventIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    flex: 1,
    marginLeft: 12,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  eventTime: {
    fontSize: 13,
    marginTop: 2,
  },
  noEventsText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
