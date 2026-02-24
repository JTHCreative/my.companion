import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { PetAvatarHeader } from '../components/PetAvatarHeader';

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

const PET_TYPE_COLORS: Record<string, { bg: string; icon: string }> = {
  dog: { bg: '#FEF3C7', icon: '#D97706' },
  cat: { bg: '#EDE9FE', icon: '#7C3AED' },
  bird: { bg: '#DBEAFE', icon: '#2563EB' },
  fish: { bg: '#CFFAFE', icon: '#0891B2' },
  reptile: { bg: '#DCFCE7', icon: '#16A34A' },
  rabbit: { bg: '#FCE7F3', icon: '#DB2777' },
  hamster: { bg: '#FFEDD5', icon: '#EA580C' },
  other: { bg: '#F1F5F9', icon: '#475569' },
};

const DETAIL_ROW_COLORS: Record<string, { bg: string; icon: string }> = {
  birthday: { bg: '#E4F0DF', icon: '#6FA85C' },
  weight: { bg: '#E4F0DF', icon: '#558A42' },
  vet: { bg: '#E4F0DF', icon: '#6FA85C' },
};

function calculateAge(birthday: string): string | null {
  if (!birthday) return null;
  // Expect MM/DD/YYYY
  const dateParts = birthday.split('/');
  if (dateParts.length !== 3) return null;
  const [mm, dd, yyyy] = dateParts.map(Number);
  const birth = new Date(yyyy, mm - 1, dd);
  if (isNaN(birth.getTime())) return null;

  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const segments: string[] = [];
  if (years >= 1) segments.push(years === 1 ? '1 yr' : `${years} yrs`);
  if (months >= 1) segments.push(months === 1 ? '1 mo' : `${months} mo`);
  if (days >= 1) segments.push(days === 1 ? '1 day' : `${days} days`);

  return segments.length > 0 ? segments.join(' ') : '< 1 day';
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
  const { theme } = useTheme();
  const { pets, selectedPet, scheduleEvents, meals, medications, vetInfo } = useData();
  const [detailEvent, setDetailEvent] = useState<string | null>(null);

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

  if (pets.length === 0) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <PetAvatarHeader
          title="my.Companion"
          onAddPet={() => navigation.navigate('AddPet')}
        />
        <EmptyState
          icon="paw"
          title="Welcome to my.Companion"
          subtitle="Add your first pet to get started tracking their schedule, meals, and medical info."
          actionLabel="Add Your Pet"
          onAction={() => navigation.navigate('AddPet')}
        />
        <TouchableOpacity
          style={styles.importLink}
          onPress={() => navigation.navigate('ImportPet')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="cloud-download-outline"
            size={16}
            color={theme.colors.primary}
          />
          <Text style={[styles.importLinkText, { color: theme.colors.primary }]}>
            Import a shared pet
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <PetAvatarHeader
        title="my.Companion"
        onAddPet={() => navigation.navigate('AddPet')}
      />

      {selectedPet && (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Expanded Pet Profile Card */}
          {(() => {
            const typeColor = PET_TYPE_COLORS[selectedPet.type] || PET_TYPE_COLORS.other;
            return (
              <View style={styles.profileCardWrapper}>
                {/* Floating pet type icon on top center border */}
                <View style={styles.floatingIconWrapper}>
                  <View
                    style={[
                      styles.floatingIconCircle,
                      { backgroundColor: typeColor.bg, borderColor: theme.colors.card },
                    ]}
                  >
                    <Ionicons
                      name={PET_TYPE_ICONS[selectedPet.type] || 'paw'}
                      size={26}
                      color={typeColor.icon}
                    />
                  </View>
                </View>

                <Card style={styles.profileCard}>
                  {/* Wavy header background */}
                  <View style={[styles.wavyHeader, { backgroundColor: typeColor.bg }]}>
                    <View style={styles.wavySpacer} />
                    <View style={[styles.waveCurve, { backgroundColor: theme.colors.card }]} />
                  </View>

                  {/* Action buttons – top right over wave */}
                  <View style={styles.profileActions}>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('SharePet')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name="share-outline"
                        size={18}
                        color={typeColor.icon}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate('EditPet', { petId: selectedPet.id })
                      }
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name="create-outline"
                        size={18}
                        color={typeColor.icon}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Centered profile content */}
                  <View style={styles.profileContent}>
                    {selectedPet.profileImage ? (
                      <View style={[styles.profileImageRing, { borderColor: typeColor.icon }]}>
                        <Image
                          source={{ uri: selectedPet.profileImage }}
                          style={styles.profileImage}
                        />
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.profileImageRing,
                          styles.profilePlaceholder,
                          { backgroundColor: typeColor.bg, borderColor: typeColor.icon },
                        ]}
                      >
                        <Ionicons
                          name={PET_TYPE_ICONS[selectedPet.type] || 'paw'}
                          size={44}
                          color={typeColor.icon}
                        />
                      </View>
                    )}

                    <Text style={[styles.petName, { color: theme.colors.text }]}>
                      {selectedPet.name}
                    </Text>

                    {selectedPet.breed ? (
                      <Text style={[styles.petBreed, { color: theme.colors.textSecondary }]}>
                        {selectedPet.breed}
                      </Text>
                    ) : null}

                    {age && (
                      <View style={[styles.ageBadge, { backgroundColor: typeColor.bg }]}>
                        <Text style={[styles.petAge, { color: typeColor.icon }]}>
                          {age} old
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Detail rows — each row is independently clickable */}
                  <View
                    style={[
                      styles.profileDetails,
                      { borderTopColor: theme.colors.border },
                    ]}
                  >
                  {birthdayFormatted && (
                    <TouchableOpacity
                      style={styles.detailRow}
                      activeOpacity={0.6}
                      onPress={() =>
                        navigation.navigate('EditPet', { petId: selectedPet.id })
                      }
                    >
                      <View
                        style={[
                          styles.detailIcon,
                          { backgroundColor: DETAIL_ROW_COLORS.birthday.bg },
                        ]}
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={16}
                          color={DETAIL_ROW_COLORS.birthday.icon}
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
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  )}
                  {selectedPet.weight ? (
                    <TouchableOpacity
                      style={styles.detailRow}
                      activeOpacity={0.6}
                      onPress={() =>
                        navigation.navigate('EditPet', { petId: selectedPet.id })
                      }
                    >
                      <View
                        style={[
                          styles.detailIcon,
                          { backgroundColor: DETAIL_ROW_COLORS.weight.bg },
                        ]}
                      >
                        <Ionicons
                          name="scale-outline"
                          size={16}
                          color={DETAIL_ROW_COLORS.weight.icon}
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
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  ) : null}
                  {petVets.length > 0 && (
                    <TouchableOpacity
                      style={styles.detailRow}
                      activeOpacity={0.6}
                      onPress={() => navigation.navigate('MedicalTab')}
                    >
                      <View
                        style={[
                          styles.detailIcon,
                          { backgroundColor: DETAIL_ROW_COLORS.vet.bg },
                        ]}
                      >
                        <Ionicons
                          name="medkit-outline"
                          size={16}
                          color={DETAIL_ROW_COLORS.vet.icon}
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
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Personality tags — colored by pet type */}
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
                              { backgroundColor: typeColor.bg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.personalityText,
                                { color: typeColor.icon },
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
              </View>
            );
          })()}

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
              nextEvents.map((event) => {
                const typeInfo = EVENT_TYPE_INFO[event.type] || EVENT_TYPE_INFO.other;
                return (
                  <TouchableOpacity
                    key={event.id}
                    activeOpacity={0.6}
                    onPress={() => setDetailEvent(event.id)}
                    style={[
                      styles.eventRow,
                      { borderBottomColor: theme.colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.eventIcon,
                        { backgroundColor: typeInfo.color + '18' },
                      ]}
                    >
                      <Ionicons
                        name={typeInfo.icon}
                        size={18}
                        color={typeInfo.color}
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
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                );
              })
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

          {/* Import Pet Link */}
          <TouchableOpacity
            style={styles.importLink}
            onPress={() => navigation.navigate('ImportPet')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="cloud-download-outline"
              size={16}
              color={theme.colors.primary}
            />
            <Text
              style={[styles.importLinkText, { color: theme.colors.primary }]}
            >
              Import a shared pet
            </Text>
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}

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
            style={[styles.detailSheet, { backgroundColor: theme.colors.card }]}
            onStartShouldSetResponder={() => true}
          >
            {(() => {
              const event = scheduleEvents.find((e) => e.id === detailEvent);
              if (!event) return null;
              const typeInfo = EVENT_TYPE_INFO[event.type] || EVENT_TYPE_INFO.other;
              const linkedMeal = event.linkedMealId
                ? meals.find((m) => m.id === event.linkedMealId)
                : undefined;
              const linkedMed = event.linkedMedicationId
                ? medications.find((m) => m.id === event.linkedMedicationId)
                : undefined;

              return (
                <>
                  {/* Header */}
                  <View style={styles.detailHeader}>
                    <View
                      style={[
                        styles.detailIconBadge,
                        { backgroundColor: typeInfo.color + '20' },
                      ]}
                    >
                      <Ionicons
                        name={typeInfo.icon}
                        size={22}
                        color={typeInfo.color}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.detailTitle,
                          { color: theme.colors.text },
                        ]}
                      >
                        {event.title}
                      </Text>
                      <Text
                        style={[
                          styles.detailSubtitle,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {formatTime(event.time)}
                        {event.days.length < 7
                          ? `  •  ${event.days.join(', ')}`
                          : '  •  Every day'}
                      </Text>
                    </View>
                  </View>

                  {event.notes ? (
                    <Text
                      style={[
                        styles.detailNotes,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {event.notes}
                    </Text>
                  ) : null}

                  {/* Linked Meal */}
                  {linkedMeal && (
                    <View
                      style={[
                        styles.detailLinkedCard,
                        {
                          backgroundColor: typeInfo.color + '10',
                          borderColor: typeInfo.color + '30',
                        },
                      ]}
                    >
                      <View style={styles.detailLinkedHeader}>
                        <Ionicons
                          name="link"
                          size={14}
                          color={typeInfo.color}
                        />
                        <Text
                          style={[
                            styles.detailLinkedLabel,
                            { color: typeInfo.color },
                          ]}
                        >
                          Linked{' '}
                          {linkedMeal.type === 'treat' ? 'Treat' : 'Meal'}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.detailLinkedName,
                          { color: theme.colors.text },
                        ]}
                      >
                        {linkedMeal.name}
                      </Text>
                      {linkedMeal.ingredients &&
                        linkedMeal.ingredients.length > 0 && (
                          <View style={styles.detailIngredients}>
                            <Text
                              style={[
                                styles.detailSectionLabel,
                                { color: theme.colors.textSecondary },
                              ]}
                            >
                              Ingredients
                            </Text>
                            {linkedMeal.ingredients.map((ing, i) => (
                              <Text
                                key={i}
                                style={[
                                  styles.detailIngredientItem,
                                  { color: theme.colors.text },
                                ]}
                              >
                                • {ing.name}
                                {ing.quantity ? ` — ${ing.quantity}` : ''}
                                {ing.brand ? ` (${ing.brand})` : ''}
                              </Text>
                            ))}
                          </View>
                        )}
                      {linkedMeal.notes ? (
                        <Text
                          style={[
                            styles.detailLinkedNotes,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {linkedMeal.notes}
                        </Text>
                      ) : null}
                    </View>
                  )}

                  {/* Linked Medication */}
                  {linkedMed && (
                    <View
                      style={[
                        styles.detailLinkedCard,
                        {
                          backgroundColor: typeInfo.color + '10',
                          borderColor: typeInfo.color + '30',
                        },
                      ]}
                    >
                      <View style={styles.detailLinkedHeader}>
                        <Ionicons
                          name="link"
                          size={14}
                          color={typeInfo.color}
                        />
                        <Text
                          style={[
                            styles.detailLinkedLabel,
                            { color: typeInfo.color },
                          ]}
                        >
                          Linked Medication
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.detailLinkedName,
                          { color: theme.colors.text },
                        ]}
                      >
                        {linkedMed.name}
                      </Text>
                      {linkedMed.dosage ? (
                        <View style={styles.detailMedRow}>
                          <Text
                            style={[
                              styles.detailSectionLabel,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            Dosage
                          </Text>
                          <Text
                            style={[
                              styles.detailMedValue,
                              { color: theme.colors.text },
                            ]}
                          >
                            {linkedMed.dosage}
                          </Text>
                        </View>
                      ) : null}
                      {linkedMed.frequency ? (
                        <View style={styles.detailMedRow}>
                          <Text
                            style={[
                              styles.detailSectionLabel,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            Frequency
                          </Text>
                          <Text
                            style={[
                              styles.detailMedValue,
                              { color: theme.colors.text },
                            ]}
                          >
                            {linkedMed.frequency}
                          </Text>
                        </View>
                      ) : null}
                      {linkedMed.startDate || linkedMed.endDate ? (
                        <View style={styles.detailMedRow}>
                          <Text
                            style={[
                              styles.detailSectionLabel,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            Period
                          </Text>
                          <Text
                            style={[
                              styles.detailMedValue,
                              { color: theme.colors.text },
                            ]}
                          >
                            {linkedMed.startDate || '—'} →{' '}
                            {linkedMed.endDate || 'Ongoing'}
                          </Text>
                        </View>
                      ) : null}
                      {linkedMed.notes ? (
                        <Text
                          style={[
                            styles.detailLinkedNotes,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {linkedMed.notes}
                        </Text>
                      ) : null}
                    </View>
                  )}

                  {/* Close button */}
                  <TouchableOpacity
                    style={[
                      styles.detailCloseBtn,
                      { backgroundColor: theme.colors.inputBackground },
                    ]}
                    onPress={() => setDetailEvent(null)}
                  >
                    <Text
                      style={[
                        styles.detailCloseBtnText,
                        { color: theme.colors.text },
                      ]}
                    >
                      Close
                    </Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const EVENT_TYPE_INFO: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  feeding: { icon: 'restaurant', color: '#F59E0B' },
  potty: { icon: 'leaf', color: '#22C55E' },
  nap: { icon: 'bed', color: '#8B5CF6' },
  wake: { icon: 'sunny', color: '#F97316' },
  sleep: { icon: 'moon', color: '#6366F1' },
  play: { icon: 'football', color: '#EC4899' },
  walk: { icon: 'walk', color: '#14B8A6' },
  medication: { icon: 'medkit', color: '#EF4444' },
  other: { icon: 'ellipsis-horizontal', color: '#64748B' },
};

function getScheduleIcon(type: string): keyof typeof Ionicons.glyphMap {
  return EVENT_TYPE_INFO[type]?.icon || 'ellipsis-horizontal';
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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  /* Expanded profile card */
  profileCardWrapper: {
    position: 'relative',
    marginTop: 28,
  },
  floatingIconWrapper: {
    position: 'absolute',
    top: -22,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  floatingIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    padding: 0,
    overflow: 'hidden',
  },
  wavyHeader: {
    height: 80,
  },
  wavySpacer: {
    height: 50,
  },
  waveCurve: {
    flex: 1,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
  },
  profileActions: {
    position: 'absolute',
    top: 12,
    right: 14,
    flexDirection: 'row',
    gap: 14,
    zIndex: 5,
  },
  profileContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: -4,
  },
  profileImageRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 46,
  },
  profilePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  petName: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
  },
  petBreed: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  ageBadge: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
  },
  petAge: {
    fontSize: 13,
    fontWeight: '600',
  },
  profileDetails: {
    marginTop: 14,
    marginHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    borderTopWidth: 1,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    marginHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
  personalityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  personalityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
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
  /* Detail modal */
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
  detailCloseBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  detailCloseBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },

  importLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  importLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
