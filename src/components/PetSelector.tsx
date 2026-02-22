import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';

interface PetSelectorProps {
  onAddPet: () => void;
}

export function PetSelector({ onAddPet }: PetSelectorProps) {
  const { theme } = useTheme();
  const { pets, selectedPetId, selectPet } = useData();

  if (pets.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {pets.map((pet) => {
          const isSelected = pet.id === selectedPetId;
          return (
            <TouchableOpacity
              key={pet.id}
              style={[
                styles.petItem,
                isSelected && {
                  borderColor: theme.colors.primary,
                  backgroundColor: theme.colors.primaryLight,
                },
              ]}
              onPress={() => selectPet(pet.id)}
              activeOpacity={0.7}
            >
              {pet.profileImage ? (
                <Image source={{ uri: pet.profileImage }} style={styles.avatar} />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    styles.avatarPlaceholder,
                    { backgroundColor: theme.colors.primaryLight },
                  ]}
                >
                  <Ionicons
                    name="paw"
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
              )}
              <Text
                style={[
                  styles.petName,
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
        <TouchableOpacity
          style={[styles.addButton, { borderColor: theme.colors.border }]}
          onPress={onAddPet}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  petItem: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 72,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 4,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  petName: {
    fontSize: 12,
    maxWidth: 64,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
