import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { Card } from '../components/Card';
import { PetSelector } from '../components/PetSelector';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';

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

export function HomeScreen({ navigation }: any) {
  const { theme, toggleTheme, isDark } = useTheme();
  const { pets, selectedPet, scheduleEvents, meals, medications } = useData();

  const petSchedule = scheduleEvents.filter(
    (e) => e.petId === selectedPet?.id
  );
  const petMeals = meals.filter((m) => m.petId === selectedPet?.id);
  const petMeds = medications.filter((m) => m.petId === selectedPet?.id);

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

  if (pets.length === 0) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.headerBar}>
          <Text style={[styles.appTitle, { color: theme.colors.primary }]}>
            my.Companion
          </Text>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
            <Ionicons
              name={isDark ? 'sunny' : 'moon'}
              size={22}
              color={theme.colors.text}
            />
          </TouchableOpacity>
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
      <View style={styles.headerBar}>
        <Text style={[styles.appTitle, { color: theme.colors.primary }]}>
          my.Companion
        </Text>
        <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
          <Ionicons
            name={isDark ? 'sunny' : 'moon'}
            size={22}
            color={theme.colors.text}
          />
        </TouchableOpacity>
      </View>

      <PetSelector onAddPet={() => navigation.navigate('AddPet')} />

      {selectedPet && (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Pet Profile Card */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate('EditPet', { petId: selectedPet.id })
            }
          >
            <Card style={styles.profileCard}>
              <View style={styles.profileRow}>
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
                      size={36}
                      color={theme.colors.primary}
                    />
                  </View>
                )}
                <View style={styles.profileInfo}>
                  <Text
                    style={[styles.petName, { color: theme.colors.text }]}
                  >
                    {selectedPet.name}
                  </Text>
                  <Text
                    style={[
                      styles.petDetail,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {selectedPet.type.charAt(0).toUpperCase() +
                      selectedPet.type.slice(1)}{' '}
                    {selectedPet.breed ? `\u2022 ${selectedPet.breed}` : ''}
                  </Text>
                  {selectedPet.weight && (
                    <Text
                      style={[
                        styles.petDetail,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {selectedPet.weight} {selectedPet.weightUnit}
                    </Text>
                  )}
                  {selectedPet.personality ? (
                    <View style={styles.personalityRow}>
                      {selectedPet.personality.split(',').map((tag) => tag.trim()).filter(Boolean).map((tag) => (
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
                  ) : null}
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </View>
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
  themeToggle: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileCard: {
    marginTop: 8,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  profilePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  petName: {
    fontSize: 22,
    fontWeight: '700',
  },
  petDetail: {
    fontSize: 14,
    marginTop: 2,
  },
  personalityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
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
