import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { generateId } from '../utils/generateId';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { FormInput } from '../components/FormInput';
import { DatePicker } from '../components/DatePicker';
import { PersonalityTagPicker } from '../components/PersonalityTagPicker';
import { Button } from '../components/Button';
import { PetType } from '../types';

const PET_TYPES: { value: PetType; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { value: 'dog', label: 'Dog', icon: 'dog' },
  { value: 'cat', label: 'Cat', icon: 'cat' },
  { value: 'bird', label: 'Bird', icon: 'bird' },
  { value: 'fish', label: 'Fish', icon: 'fish' },
  { value: 'reptile', label: 'Reptile', icon: 'snake' },
  { value: 'rabbit', label: 'Rabbit', icon: 'rabbit' },
  { value: 'hamster', label: 'Hamster', icon: 'rodent' },
  { value: 'other', label: 'Other', icon: 'paw' },
];

export function AddEditPetScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { pets, addPet, updatePet, deletePet } = useData();
  const petId = route.params?.petId;
  const existingPet = pets.find((p) => p.id === petId);
  const isEditing = !!existingPet;

  const [name, setName] = useState(existingPet?.name || '');
  const [petType, setPetType] = useState<PetType>(existingPet?.type || 'dog');
  const [breed, setBreed] = useState(existingPet?.breed || '');
  const [weight, setWeight] = useState(existingPet?.weight || '');
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>(
    existingPet?.weightUnit || 'lbs'
  );
  const [personality, setPersonality] = useState(
    existingPet?.personality || ''
  );
  const [profileImage, setProfileImage] = useState<string | null>(
    existingPet?.profileImage || null
  );
  const [birthday, setBirthday] = useState(existingPet?.birthday || '');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Profile Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickImage },
      ...(profileImage
        ? [{ text: 'Remove Photo', onPress: () => setProfileImage(null), style: 'destructive' as const }]
        : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', "Please enter your pet's name.");
      return;
    }

    try {
      const petData = {
        id: existingPet?.id || generateId(),
        name: name.trim(),
        type: petType,
        breed: breed.trim(),
        weight: weight.trim(),
        weightUnit,
        personality: personality.trim(),
        profileImage,
        birthday: birthday.trim(),
        createdAt: existingPet?.createdAt || Date.now(),
      };

      if (isEditing) {
        await updatePet(petData);
      } else {
        await addPet(petData);
      }

      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save pet.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Pet',
      `Are you sure you want to remove ${existingPet?.name}? This will also delete all associated data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePet(petId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {isEditing ? 'Edit Pet' : 'Add Pet'}
        </Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
          <Text style={[styles.saveText, { color: theme.colors.primary }]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.form}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.formContent}
      >
        {/* Profile Image */}
        <TouchableOpacity
          style={styles.imageSection}
          onPress={showImageOptions}
          activeOpacity={0.7}
        >
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <View
              style={[
                styles.profileImage,
                styles.imagePlaceholder,
                { backgroundColor: theme.colors.primaryLight },
              ]}
            >
              <Ionicons name="camera" size={32} color={theme.colors.primary} />
              <Text
                style={[
                  styles.addPhotoText,
                  { color: theme.colors.primary },
                ]}
              >
                Add Photo
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Name */}
        <FormInput
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Enter pet's name"
        />

        {/* Pet Type */}
        <Text
          style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}
        >
          Type
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.typeScroll}
          contentContainerStyle={styles.typeContainer}
        >
          {PET_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typeChip,
                {
                  backgroundColor:
                    petType === type.value
                      ? theme.colors.primary
                      : theme.colors.inputBackground,
                  borderColor:
                    petType === type.value
                      ? theme.colors.primary
                      : theme.colors.border,
                },
              ]}
              onPress={() => setPetType(type.value)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={type.icon}
                size={20}
                color={
                  petType === type.value
                    ? '#FFFFFF'
                    : theme.colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.typeLabel,
                  {
                    color:
                      petType === type.value
                        ? '#FFFFFF'
                        : theme.colors.text,
                  },
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Breed */}
        <FormInput
          label="Breed"
          value={breed}
          onChangeText={setBreed}
          placeholder="e.g., Golden Retriever"
        />

        {/* Weight */}
        <View style={styles.weightRow}>
          <View style={styles.weightInput}>
            <FormInput
              label="Weight"
              value={weight}
              onChangeText={setWeight}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.unitToggle}>
            <Text
              style={[
                styles.fieldLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Unit
            </Text>
            <View style={styles.unitButtons}>
              <TouchableOpacity
                style={[
                  styles.unitButton,
                  styles.unitButtonLeft,
                  {
                    backgroundColor:
                      weightUnit === 'lbs'
                        ? theme.colors.primary
                        : theme.colors.inputBackground,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => setWeightUnit('lbs')}
              >
                <Text
                  style={{
                    color: weightUnit === 'lbs' ? '#FFFFFF' : theme.colors.text,
                    fontWeight: '600',
                  }}
                >
                  lbs
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.unitButton,
                  styles.unitButtonRight,
                  {
                    backgroundColor:
                      weightUnit === 'kg'
                        ? theme.colors.primary
                        : theme.colors.inputBackground,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => setWeightUnit('kg')}
              >
                <Text
                  style={{
                    color: weightUnit === 'kg' ? '#FFFFFF' : theme.colors.text,
                    fontWeight: '600',
                  }}
                >
                  kg
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Personality */}
        <PersonalityTagPicker
          value={personality}
          onChange={setPersonality}
        />

        {/* Birthday */}
        <DatePicker
          label="Birthday"
          value={birthday}
          onChange={setBirthday}
          placeholder="MM/DD/YYYY"
          optional
        />

        {/* Delete Button */}
        {isEditing && (
          <Button
            title="Delete Pet"
            onPress={handleDelete}
            variant="danger"
            style={styles.deleteButton}
            icon={<Ionicons name="trash" size={18} color="#FFFFFF" />}
          />
        )}

        <View style={{ height: 160 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 4,
    minWidth: 50,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: 20,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  typeScroll: {
    marginBottom: 16,
  },
  typeContainer: {
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  typeLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  weightRow: {
    flexDirection: 'row',
    gap: 12,
  },
  weightInput: {
    flex: 1,
  },
  unitToggle: {
    width: 120,
  },
  unitButtons: {
    flexDirection: 'row',
  },
  unitButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 1,
  },
  unitButtonLeft: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderRightWidth: 0,
  },
  unitButtonRight: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  deleteButton: {
    marginTop: 24,
  },
});
