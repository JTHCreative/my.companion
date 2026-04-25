import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Linking,
  Platform,
  Alert,
  Dimensions,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { PetAvatarHeader } from '../components/PetAvatarHeader';
import { PetGalleryModal } from '../components/PetGalleryModal';
import { PetImage } from '../components/PetImage';
import { generateId } from '../utils/generateId';

const PET_TYPE_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  dog: 'dog',
  cat: 'cat',
  bird: 'bird',
  fish: 'fish',
  reptile: 'snake',
  rabbit: 'rabbit',
  hamster: 'rodent',
  other: 'paw',
};

const PET_TYPE_COLORS: Record<string, { bg: string; icon: string }> = {
  dog: { bg: '#FFF7E0', icon: '#C8962E' },
  cat: { bg: '#FFF0E5', icon: '#D4732A' },
  bird: { bg: '#F0EAFF', icon: '#7B4EC2' },
  fish: { bg: '#CFFAFE', icon: '#0891B2' },
  reptile: { bg: '#DCFCE7', icon: '#16A34A' },
  rabbit: { bg: '#FDE8F0', icon: '#D94688' },
  hamster: { bg: '#FFE5E5', icon: '#CC3333' },
  other: { bg: '#F1F5F9', icon: '#475569' },
};

const PET_TYPE_COLORS_DARK: Record<string, { bg: string; icon: string }> = {
  dog: { bg: '#3A3425', icon: '#D4A84A' },
  cat: { bg: '#3A2E25', icon: '#D8874A' },
  bird: { bg: '#2E2A3A', icon: '#9B72D4' },
  fish: { bg: '#1F3335', icon: '#3AB8D4' },
  reptile: { bg: '#1F3325', icon: '#3DB864' },
  rabbit: { bg: '#3A2530', icon: '#E06A9C' },
  hamster: { bg: '#3A2525', icon: '#D45555' },
  other: { bg: '#2A2E32', icon: '#7A8899' },
};

const DETAIL_ROW_COLORS: Record<string, { bg: string; icon: string }> = {
  birthday: { bg: '#558A42', icon: '#FFFFFF' },
  weight: { bg: '#558A42', icon: '#FFFFFF' },
  vet: { bg: '#558A42', icon: '#FFFFFF' },
};

const DETAIL_ROW_COLORS_DARK: Record<string, { bg: string; icon: string }> = {
  birthday: { bg: '#3A5230', icon: '#C8DCC0' },
  weight: { bg: '#3A5230', icon: '#C8DCC0' },
  vet: { bg: '#3A5230', icon: '#C8DCC0' },
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const PAGE_PEEK = 10;
const PAGE_GAP = 8;
const PAGE_WIDTH = SCREEN_WIDTH - PAGE_PEEK * 2;
const SNAP_OFFSET = PAGE_WIDTH + PAGE_GAP;
const BOUNCE_MAX = Math.round(PAGE_WIDTH * 0.25);

function handleCallVet(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned) {
    Linking.openURL(`tel:${cleaned}`);
  } else {
    Alert.alert('No Phone Number', 'No phone number is available for this vet.');
  }
}

function handleDirections(address: string) {
  const encoded = encodeURIComponent(address);
  const url = Platform.select({
    ios: `maps:0,0?q=${encoded}`,
    android: `geo:0,0?q=${encoded}`,
  }) || `https://www.google.com/maps/search/?api=1&query=${encoded}`;
  Linking.openURL(url);
}

function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.length === 10) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

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

function calculatePetYears(birthday: string, petType: string): string | null {
  if (!birthday) return null;
  const dateParts = birthday.split('/');
  if (dateParts.length !== 3) return null;
  const [mm, dd, yyyy] = dateParts.map(Number);
  const birth = new Date(yyyy, mm - 1, dd);
  if (isNaN(birth.getTime())) return null;

  const now = new Date();
  const ageInMs = now.getTime() - birth.getTime();
  const ageInYears = ageInMs / (365.25 * 24 * 60 * 60 * 1000);
  if (ageInYears < 0) return null;

  // Dogs: 15 + 9 + 5/yr, Cats: 15 + 9 + 4/yr
  const yearlyRate = petType === 'cat' ? 4 : 5;
  let petYears: number;
  if (ageInYears <= 1) {
    petYears = ageInYears * 15;
  } else if (ageInYears <= 2) {
    petYears = 15 + (ageInYears - 1) * 9;
  } else {
    petYears = 15 + 9 + (ageInYears - 2) * yearlyRate;
  }

  const wholeYears = Math.floor(petYears);
  const months = Math.round((petYears - wholeYears) * 12);

  const segments: string[] = [];
  if (wholeYears >= 1) segments.push(wholeYears === 1 ? '1 yr' : `${wholeYears} yrs`);
  if (months >= 1) segments.push(months === 1 ? '1 mo' : `${months} mo`);

  return segments.length > 0 ? segments.join(' ') : '< 1 yr';
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

function PetPageContent({ pet, navigation, onDetailEvent, onOpenGallery }: { pet: any; navigation: any; onDetailEvent: (id: string) => void; onOpenGallery: () => void }) {
  const { theme } = useTheme();
  const { scheduleEvents, meals, medications, vetInfo, updatePet, isOwner, deletePet } = useData();
  const [showPetYears, setShowPetYears] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  const petSchedule = scheduleEvents.filter((e) => e.petId === pet.id);
  const petMeals = meals.filter((m) => m.petId === pet.id);
  const petMeds = medications.filter((m) => m.petId === pet.id);
  const petVets = vetInfo.filter((v) => v.petId === pet.id);

  const sortedSchedule = [...petSchedule].sort((a, b) => a.time.localeCompare(b.time));
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const upcomingEvents = sortedSchedule.filter((e) => e.time >= currentTime);
  const nextEvents = upcomingEvents.slice(0, 3);

  const age = pet.birthday ? calculateAge(pet.birthday) : null;
  const supportsPetYears = pet.type === 'dog' || pet.type === 'cat';
  const petYearsAge = pet.birthday && supportsPetYears ? calculatePetYears(pet.birthday, pet.type) : null;
  const petYearsLabel = pet.type === 'cat' ? 'cat years' : 'dog years';
  const birthdayFormatted = pet.birthday ? formatBirthday(pet.birthday) : null;

  const colorMap = theme.dark ? PET_TYPE_COLORS_DARK : PET_TYPE_COLORS;
  const typeColor = colorMap[pet.type] || colorMap.other;
  const detailColors = theme.dark ? DETAIL_ROW_COLORS_DARK : DETAIL_ROW_COLORS;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Card style={styles.profileCard}>
        {/* Pet type triangle – top left */}
        <View style={[styles.cornerTriangleLeft, { backgroundColor: typeColor.bg }]} />
        <View style={styles.cornerIconLeft}>
          <MaterialCommunityIcons
            name={PET_TYPE_ICONS[pet.type] || 'paw'}
            size={25}
            color={typeColor.icon}
          />
        </View>

        {/* Edit triangle – top right */}
        <TouchableOpacity
          style={styles.editCornerWrap}
          activeOpacity={0.7}
          onPress={() => {
            if (isOwner) {
              navigation.navigate('EditPet', { petId: pet.id });
            } else {
              Alert.alert('View Only', 'Only the pet owner can edit the profile.');
            }
          }}
        >
          <View style={[styles.cornerTriangleRight, { backgroundColor: isOwner ? (theme.dark ? '#4A7A3A' : theme.colors.primary) : (theme.dark ? '#3A3A3A' : '#B0B0B0') }]} />
          <View style={styles.cornerIconRight}>
            <Ionicons name="create-outline" size={25} color={isOwner ? '#FFFFFF' : (theme.dark ? '#888888' : '#E0E0E0')} />
          </View>
        </TouchableOpacity>

        {/* Centered profile content */}
        <View style={styles.profileContent}>
          <TouchableOpacity activeOpacity={0.7} onPress={onOpenGallery} style={styles.profileImageWrap}>
            {pet.profileImage ? (
              <View style={[styles.profileImageRing, { borderColor: typeColor.icon }]}>
                <PetImage
                  uri={pet.profileImage}
                  petName={pet.name}
                  style={styles.profileImage}
                  fallbackStyle={[styles.profileImage, { backgroundColor: typeColor.bg }]}
                  fallbackFontSize={36}
                  fallbackBg={typeColor.bg}
                  fallbackColor={typeColor.icon}
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
                <MaterialCommunityIcons
                  name={PET_TYPE_ICONS[pet.type] || 'paw'}
                  size={44}
                  color={typeColor.icon}
                />
              </View>
            )}
            <View style={styles.galleryBadge}>
              <Ionicons name="images" size={10} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <Text style={[styles.petName, { color: theme.colors.text }]}>
            {pet.name}
          </Text>

          {pet.breed ? (
            <Text style={[styles.petBreed, { color: theme.colors.textSecondary }]}>
              {pet.breed}
            </Text>
          ) : null}

          {age && (
            <TouchableOpacity
              style={[styles.ageBadge, { backgroundColor: typeColor.bg }]}
              activeOpacity={supportsPetYears ? 0.6 : 1}
              onPress={() => {
                if (supportsPetYears) setShowPetYears((v) => !v);
              }}
            >
              <Text style={[styles.petAge, { color: typeColor.icon }]}>
                {showPetYears && petYearsAge
                  ? `${petYearsAge} in ${petYearsLabel}`
                  : `${age} old`}
              </Text>
            </TouchableOpacity>
          )}

          {/* Share button (owner only) */}
          {isOwner && (
            <TouchableOpacity
              style={[styles.shareButton, { backgroundColor: theme.colors.inputBackground }]}
              onPress={() => navigation.navigate('SharePet')}
              activeOpacity={0.7}
            >
              <Ionicons name="share-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.shareButtonText, { color: theme.colors.textSecondary }]}>
                Share
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Detail rows */}
        <View style={[styles.profileDetails, { borderTopColor: theme.colors.border }]}>
          {birthdayFormatted && (
            <TouchableOpacity
              style={styles.detailRow}
              activeOpacity={isOwner ? 0.6 : 1}
              onPress={isOwner ? () => navigation.navigate('EditPet', { petId: pet.id }) : undefined}
            >
              <View style={[styles.detailIcon, { backgroundColor: detailColors.birthday.bg }]}>
                <Ionicons name="calendar-outline" size={16} color={detailColors.birthday.icon} />
              </View>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Birthday</Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>{birthdayFormatted}</Text>
              {isOwner && <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />}
            </TouchableOpacity>
          )}
          {pet.weight ? (
            <TouchableOpacity
              style={styles.detailRow}
              activeOpacity={isOwner ? 0.6 : 1}
              onPress={isOwner ? () => navigation.navigate('EditPet', { petId: pet.id }) : undefined}
            >
              <View style={[styles.detailIcon, { backgroundColor: detailColors.weight.bg }]}>
                <Ionicons name="scale-outline" size={16} color={detailColors.weight.icon} />
              </View>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Weight</Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {pet.weight} {pet.weightUnit}
              </Text>
              {isOwner && <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />}
            </TouchableOpacity>
          ) : null}
          {petVets.length > 0 && (
            <TouchableOpacity
              style={styles.detailRow}
              activeOpacity={0.6}
              onPress={() => navigation.navigate('MedicalTab')}
            >
              <View style={[styles.detailIcon, { backgroundColor: detailColors.vet.bg }]}>
                <Ionicons name="medkit-outline" size={16} color={detailColors.vet.icon} />
              </View>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Vet</Text>
              <Text
                style={[styles.detailValue, { color: theme.colors.text, flex: 1 }]}
                numberOfLines={1}
              >
                {petVets[0].vetName || petVets[0].clinicName}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Personality tags */}
        {pet.personality ? (
          <View style={[styles.personalitySection, { borderTopColor: theme.colors.border }]}>
            <Text style={[styles.personalitySectionTitle, { color: theme.colors.textSecondary }]}>
              Personality
            </Text>
            <View style={styles.personalityRow}>
              {pet.personality
                .split(',')
                .map((tag: string) => tag.trim())
                .filter(Boolean)
                .map((tag: string) => (
                  <View key={tag} style={[styles.personalityBadge, { backgroundColor: typeColor.bg }]}>
                    <Text style={[styles.personalityText, { color: typeColor.icon }]}>{tag}</Text>
                  </View>
                ))}
            </View>
          </View>
        ) : null}
      </Card>

      {/* Notes Section */}
      <Card style={styles.notesCard}>
        <TouchableOpacity
          style={styles.notesHeader}
          activeOpacity={0.7}
          onPress={() => setNotesExpanded((v) => !v)}
        >
          <View style={styles.notesHeaderLeft}>
            <View style={[styles.notesIconWrap, { backgroundColor: theme.dark ? '#2A3A4A' : '#E8F4FD' }]}>
              <Ionicons name="document-text-outline" size={18} color={theme.dark ? '#7ABADF' : '#3B8BBE'} />
            </View>
            <Text style={[styles.notesTitle, { color: theme.colors.text }]}>Notes</Text>
            {(pet.bulletNotes?.length ?? 0) > 0 && (
              <View style={[styles.notesCountBadge, { backgroundColor: theme.dark ? '#2A3A4A' : '#E8F4FD' }]}>
                <Text style={[styles.notesCountText, { color: theme.dark ? '#7ABADF' : '#3B8BBE' }]}>
                  {pet.bulletNotes.length}
                </Text>
              </View>
            )}
          </View>
          <Ionicons
            name={notesExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>

        {notesExpanded && (
          <View style={[styles.notesBody, { borderTopColor: theme.colors.border }]}>
            {(pet.bulletNotes ?? []).length === 0 ? (
              <Text style={[styles.notesEmptyText, { color: theme.colors.textSecondary }]}>
                Add a note below and it will appear here.
              </Text>
            ) : (
              (pet.bulletNotes ?? []).map((note: { id: string; text: string }) => (
                <View key={note.id} style={styles.noteItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={theme.dark ? '#7ABADF' : '#3B8BBE'}
                    style={styles.noteBullet}
                  />
                  <Text style={[styles.noteText, { color: theme.colors.text }]}>{note.text}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      const updated = (pet.bulletNotes ?? []).filter((n: { id: string }) => n.id !== note.id);
                      updatePet({ ...pet, bulletNotes: updated });
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle-outline" size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))
            )}

            <View style={[styles.noteInputRow, { borderTopColor: theme.colors.border }]}>
              <TextInput
                style={[
                  styles.noteInput,
                  {
                    color: theme.colors.text,
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: theme.colors.border,
                  },
                ]}
                placeholder="Add a note..."
                placeholderTextColor={theme.colors.textSecondary}
                value={newNoteText}
                onChangeText={setNewNoteText}
                onSubmitEditing={() => {
                  if (newNoteText.trim()) {
                    const updated = [
                      ...(pet.bulletNotes ?? []),
                      { id: generateId(), text: newNoteText.trim() },
                    ];
                    updatePet({ ...pet, bulletNotes: updated });
                    setNewNoteText('');
                  }
                }}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[
                  styles.noteAddBtn,
                  { backgroundColor: theme.dark ? '#4A7A3A' : theme.colors.primary },
                  !newNoteText.trim() && { opacity: 0.4 },
                ]}
                onPress={() => {
                  if (newNoteText.trim()) {
                    const updated = [
                      ...(pet.bulletNotes ?? []),
                      { id: generateId(), text: newNoteText.trim() },
                    ];
                    updatePet({ ...pet, bulletNotes: updated });
                    setNewNoteText('');
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Card>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          onPress={() => navigation.navigate('ScheduleTab')}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar" size={24} color={theme.colors.primary} />
          <Text style={[styles.statNumber, { color: theme.colors.text }]}>{petSchedule.length}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Events</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          onPress={() => navigation.navigate('MealsTab')}
          activeOpacity={0.7}
        >
          <Ionicons name="restaurant" size={24} color={theme.colors.warning} />
          <Text style={[styles.statNumber, { color: theme.colors.text }]}>{petMeals.length}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Meals</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          onPress={() => navigation.navigate('MedicalTab')}
          activeOpacity={0.7}
        >
          <Ionicons name="medkit" size={24} color={theme.colors.danger} />
          <Text style={[styles.statNumber, { color: theme.colors.text }]}>{petMeds.length}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Meds</Text>
        </TouchableOpacity>
      </View>

      {/* Upcoming Schedule */}
      <Card>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Upcoming Today</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ScheduleTab')}>
            <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>
        {nextEvents.length > 0 ? (
          nextEvents.map((event) => {
            const typeInfo = EVENT_TYPE_INFO[event.type] || EVENT_TYPE_INFO.other;
            return (
              <TouchableOpacity
                key={event.id}
                activeOpacity={0.6}
                onPress={() => onDetailEvent(event.id)}
                style={[styles.eventRow, { borderBottomColor: theme.colors.border }]}
              >
                <View style={[styles.eventIcon, { backgroundColor: typeInfo.color + '18' }]}>
                  <Ionicons name={typeInfo.icon} size={18} color={typeInfo.color} />
                </View>
                <View style={styles.eventInfo}>
                  <Text style={[styles.eventTitle, { color: theme.colors.text }]}>{event.title}</Text>
                  <Text style={[styles.eventTime, { color: theme.colors.textSecondary }]}>
                    {formatTime(event.time)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            );
          })
        ) : (
          <Text style={[styles.noEventsText, { color: theme.colors.textSecondary }]}>
            No more events today
          </Text>
        )}
      </Card>

      {/* Import Pet Link / Un-join Link */}
      {!isOwner ? (
        <TouchableOpacity
          style={styles.importLink}
          onPress={() => {
            Alert.alert(
              'Unsubscribe from Shared Pet',
              `Are you sure you want to unsubscribe from ${pet.name}? This will remove the pet from your app.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Unsubscribe',
                  style: 'destructive',
                  onPress: () => deletePet(pet.id),
                },
              ],
            );
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="person-remove-outline" size={16} color={theme.colors.danger} />
          <Text style={[styles.importLinkText, { color: theme.colors.danger }]}>
            Unsubscribe from shared pet
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.importLink}
          onPress={() => navigation.navigate('ImportPet')}
          activeOpacity={0.7}
        >
          <Ionicons name="people-outline" size={16} color={theme.colors.primary} />
          <Text style={[styles.importLinkText, { color: theme.colors.primary }]}>
            Join a shared pet
          </Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

export function HomeScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { pets, selectedPetId, selectPet, scheduleEvents, updatePet } = useData();
  const [detailEvent, setDetailEvent] = useState<string | null>(null);
  const [galleryPetId, setGalleryPetId] = useState<string | null>(null);
  const galleryPet = galleryPetId ? pets.find((p) => p.id === galleryPetId) : null;

  // Swipe carousel — native horizontal ScrollView with snap + rubber-band edges
  const currentIndex = pets.findIndex(p => p.id === selectedPetId);
  const scrollRef = useRef<any>(null);
  const lastScrollIndex = useRef(currentIndex);
  const snapOffsets = pets.map((_, i) => BOUNCE_MAX + i * SNAP_OFFSET);
  const initialOffset = useRef({ x: BOUNCE_MAX + currentIndex * SNAP_OFFSET, y: 0 });

  // Animated scroll position for rubber-band resistance
  const scrollX = useRef(new Animated.Value(BOUNCE_MAX + currentIndex * SNAP_OFFSET)).current;
  const lastScrollX = useRef(BOUNCE_MAX + currentIndex * SNAP_OFFSET);

  // Rubber-band resistance: non-linear counter-transform in the padding area
  // The further you pull past the edge, the stronger the resistance
  const firstPageX = BOUNCE_MAX;
  const lastPageX = BOUNCE_MAX + Math.max(0, pets.length - 1) * SNAP_OFFSET;
  const counterFull = Math.round(BOUNCE_MAX * 0.7);
  const counterHalf = Math.round(BOUNCE_MAX * 0.28);
  const counterQuarter = Math.round(BOUNCE_MAX * 0.1);

  const resistInput: number[] = [
    0,
    firstPageX * 0.5,
    firstPageX * 0.75,
    firstPageX,
  ];
  const resistOutput: number[] = [-counterFull, -counterHalf, -counterQuarter, 0];
  if (lastPageX > firstPageX) {
    resistInput.push(lastPageX);
    resistOutput.push(0);
  }
  resistInput.push(lastPageX + BOUNCE_MAX * 0.25);
  resistOutput.push(counterQuarter);
  resistInput.push(lastPageX + BOUNCE_MAX * 0.5);
  resistOutput.push(counterHalf);
  resistInput.push(lastPageX + BOUNCE_MAX);
  resistOutput.push(counterFull);

  const resistance = scrollX.interpolate({
    inputRange: resistInput,
    outputRange: resistOutput,
    extrapolate: 'clamp',
  });

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: true,
      listener: (e: any) => { lastScrollX.current = e.nativeEvent.contentOffset.x; },
    },
  );

  // Ensure correct scroll position when ScrollView first renders
  // (contentOffset prop is unreliable; the mount useEffect fires before
  // the ScrollView exists when transitioning from 0→1 pets)
  const hasInitialScrolled = useRef(false);
  const handleCarouselLayout = () => {
    if (!hasInitialScrolled.current) {
      hasInitialScrolled.current = true;
      const target = BOUNCE_MAX + currentIndex * SNAP_OFFSET;
      scrollRef.current?.scrollTo({ x: target, animated: false });
    }
  };

  // Sync scroll position when pet changes externally (e.g. header avatar tap)
  useEffect(() => {
    if (currentIndex !== lastScrollIndex.current) {
      scrollRef.current?.scrollTo({ x: BOUNCE_MAX + currentIndex * SNAP_OFFSET, animated: true });
    }
    lastScrollIndex.current = currentIndex;
  }, [currentIndex]);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round((x - BOUNCE_MAX) / SNAP_OFFSET);
    const clamped = Math.max(0, Math.min(pets.length - 1, newIndex));
    const targetX = BOUNCE_MAX + clamped * SNAP_OFFSET;
    if (Math.abs(x - targetX) > 2) {
      scrollRef.current?.scrollTo({ x: targetX, animated: true });
    }
    if (clamped !== currentIndex) {
      lastScrollIndex.current = clamped;
      selectPet(pets[clamped].id);
    }
  };

  const handleDragEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    if (x < firstPageX || x > lastPageX) {
      const nearest = Math.max(0, Math.min(pets.length - 1, Math.round((x - BOUNCE_MAX) / SNAP_OFFSET)));
      scrollRef.current?.scrollTo({ x: BOUNCE_MAX + nearest * SNAP_OFFSET, animated: true });
      if (nearest !== currentIndex) {
        lastScrollIndex.current = nearest;
        selectPet(pets[nearest].id);
      }
    }
  };

  if (pets.length === 0) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <PetAvatarHeader
          title="PetPassport"
          onAddPet={() => navigation.navigate('AddPetChoice')}
        />
        <View style={{ flex: 1, paddingBottom: 80 }}>
          <EmptyState
            icon="paw"
            title="Welcome to PetPassport"
            subtitle="Add your first pet to get started tracking their schedule, meals, and medical info."
            actionLabel="Add Your Pet"
            onAction={() => navigation.navigate('AddPetChoice')}
          />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <PetAvatarHeader
        title="PetPassport"
        onAddPet={() => navigation.navigate('AddPetChoice')}
      />

      {pets.length > 0 && (
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToOffsets={snapOffsets}
          snapToStart={false}
          snapToEnd={false}
          decelerationRate="fast"
          disableIntervalMomentum={true}
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={{ paddingLeft: BOUNCE_MAX + PAGE_PEEK, paddingRight: BOUNCE_MAX + PAGE_PEEK }}
          contentOffset={initialOffset.current}
          onLayout={handleCarouselLayout}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onScrollEndDrag={handleDragEnd}
          onMomentumScrollEnd={handleScrollEnd}
          style={{ flex: 1 }}
        >
          <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: resistance }] }}>
            {pets.map((pet, i) => (
              <View
                key={pet.id}
                style={{
                  width: PAGE_WIDTH,
                  marginRight: i < pets.length - 1 ? PAGE_GAP : 0,
                }}
              >
                <PetPageContent
                  pet={pet}
                  navigation={navigation}
                  onDetailEvent={setDetailEvent}
                  onOpenGallery={() => setGalleryPetId(pet.id)}
                />
              </View>
            ))}
          </Animated.View>
        </Animated.ScrollView>
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

      {/* Pet Gallery Modal */}
      {galleryPet && (
        <PetGalleryModal
          visible={galleryPetId !== null}
          pet={galleryPet}
          onClose={() => setGalleryPetId(null)}
          onUpdateGallery={async (images) => {
            await updatePet({ ...galleryPet, galleryImages: images });
          }}
          onUpdateProfileImage={async (uri) => {
            await updatePet({ ...galleryPet, profileImage: uri });
          }}
        />
      )}
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

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingBottom: 100,
  },

  /* Expanded profile card */
  profileCard: {
    marginTop: 8,
    overflow: 'hidden',
  },
  cornerTriangleLeft: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 120,
    height: 120,
    transform: [{ rotate: '45deg' }],
    zIndex: 2,
  },
  cornerIconLeft: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 3,
  },
  editCornerWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 75,
    height: 75,
    zIndex: 4,
  },
  cornerTriangleRight: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 120,
    height: 120,
    transform: [{ rotate: '45deg' }],
  },
  cornerIconRight: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  profileContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  shareButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  profileImageWrap: {
    position: 'relative',
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
  galleryBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#555555',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
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
  personalitySectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
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

  /* Notes section */
  notesCard: {
    marginTop: 8,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notesIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  notesCountBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  notesCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  notesBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  notesEmptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  noteBullet: {
    flexShrink: 0,
  },
  noteText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  noteInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  noteInput: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  noteAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
