import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import { PetImage } from './PetImage';
import { Pet } from '../types';

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

interface SelectorPetItemProps {
  pet: Pet;
  isSelected: boolean;
  onSelect: (id: string) => void;
  theme: any;
}

const SelectorPetItem = React.memo(function SelectorPetItem({ pet, isSelected, onSelect, theme }: SelectorPetItemProps) {
  const handlePress = useCallback(() => onSelect(pet.id), [onSelect, pet.id]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={styles.selectorItem}
    >
      <View
        style={[
          styles.selectorAvatarRing,
          {
            borderColor: isSelected ? theme.colors.primary : 'transparent',
          },
        ]}
      >
        {pet.profileImage ? (
          <PetImage
            uri={pet.profileImage}
            petName={pet.name}
            style={styles.selectorAvatar}
            fallbackStyle={[styles.selectorAvatar, styles.selectorAvatarPlaceholder, { backgroundColor: theme.colors.primaryLight }]}
            fallbackFontSize={16}
            fallbackBg={theme.colors.primaryLight}
            fallbackColor={theme.colors.primary}
          />
        ) : (
          <View
            style={[
              styles.selectorAvatar,
              styles.selectorAvatarPlaceholder,
              { backgroundColor: theme.colors.primaryLight },
            ]}
          >
            <MaterialCommunityIcons
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
            color: isSelected ? theme.colors.primary : theme.colors.text,
            fontWeight: isSelected ? '700' : '500',
          },
        ]}
        numberOfLines={1}
      >
        {pet.name}
      </Text>
    </TouchableOpacity>
  );
});

interface PetAvatarHeaderProps {
  title: string;
  onAddPet: () => void;
  /** Optional extra element rendered between the title and avatar (e.g. add button) */
  rightAccessory?: React.ReactNode;
}

export function PetAvatarHeader({
  title,
  onAddPet,
  rightAccessory,
}: PetAvatarHeaderProps) {
  const { theme } = useTheme();
  const { pets, selectedPet, selectedPetId, selectPet, petSelectorOpen, setPetSelectorOpen } = useData();
  const { displayName } = useAuth();
  const navigation = useNavigation<any>();

  const handleSelectPet = useCallback((id: string) => {
    selectPet(id);
    setPetSelectorOpen(false);
  }, [selectPet, setPetSelectorOpen]);

  const renderHeaderAvatar = () => {
    if (!selectedPet) {
      // Show user-initial fallback when no pet is selected
      const initial = displayName ? displayName.charAt(0).toUpperCase() : '';
      return (
        <View
          style={[
            styles.headerAvatar,
            { borderColor: theme.colors.border },
          ]}
        >
          <View
            style={[
              styles.headerAvatarImage,
              styles.headerAvatarPlaceholder,
              { backgroundColor: theme.colors.primaryLight },
            ]}
          >
            {initial ? (
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.primary }}>
                {initial}
              </Text>
            ) : (
              <Ionicons name="person" size={18} color={theme.colors.primary} />
            )}
          </View>
        </View>
      );
    }
    return (
      <TouchableOpacity
        onPress={() => setPetSelectorOpen(!petSelectorOpen)}
        activeOpacity={0.7}
        style={[
          styles.headerAvatar,
          {
            borderColor: petSelectorOpen
              ? theme.colors.primary
              : theme.colors.border,
          },
        ]}
      >
        {selectedPet.profileImage ? (
          <PetImage
            uri={selectedPet.profileImage}
            petName={selectedPet.name}
            style={styles.headerAvatarImage}
            fallbackStyle={[styles.headerAvatarImage, styles.headerAvatarPlaceholder, { backgroundColor: theme.colors.primaryLight }]}
            fallbackFontSize={16}
            fallbackBg={theme.colors.primaryLight}
            fallbackColor={theme.colors.primary}
          />
        ) : (
          <View
            style={[
              styles.headerAvatarImage,
              styles.headerAvatarPlaceholder,
              { backgroundColor: theme.colors.primaryLight },
            ]}
          >
            <MaterialCommunityIcons
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
    if (!petSelectorOpen) return null;
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
          {pets.map((pet) => (
            <SelectorPetItem
              key={pet.id}
              pet={pet}
              isSelected={pet.id === selectedPetId}
              onSelect={handleSelectPet}
              theme={theme}
            />
          ))}
          {/* Add New Pet */}
          <TouchableOpacity
            onPress={() => {
              setPetSelectorOpen(false);
              onAddPet();
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
            navigation.navigate('Settings');
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

  return (
    <>
      <View style={[styles.headerBar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerTitleRow}>
          <Logo size={30} iconOnly color={theme.colors.primary} />
          <Text style={[styles.headerTitle, { color: theme.colors.primary }]}>
            {title}
          </Text>
          {rightAccessory ? (
            <View style={styles.headerTitleAccessory}>
              {rightAccessory}
            </View>
          ) : null}
        </View>
        <View style={styles.headerRight}>
          {displayName ? (
            <Text
              style={[styles.headerUserName, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
          ) : null}
          {renderHeaderAvatar()}
        </View>
      </View>
      {renderPetSelectorBar()}
    </>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }),
  },
  headerTitleAccessory: {
    height: 32,
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerUserName: {
    fontSize: 14,
    fontWeight: '600',
    maxWidth: 120,
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
});
