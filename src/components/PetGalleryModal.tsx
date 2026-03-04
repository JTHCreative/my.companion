import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { PetImage } from './PetImage';
import { Pet } from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = 20;
const GRID_GAP = 3;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * 2) / 3);
const MAX_PHOTOS = 9;

interface PetGalleryModalProps {
  visible: boolean;
  pet: Pet;
  onClose: () => void;
  onUpdateGallery: (images: string[]) => void;
}

export function PetGalleryModal({
  visible,
  pet,
  onClose,
  onUpdateGallery,
}: PetGalleryModalProps) {
  const { theme } = useTheme();
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>(pet.galleryImages || []);
  const galleryImagesRef = useRef(galleryImages);

  useEffect(() => {
    const images = pet.galleryImages || [];
    galleryImagesRef.current = images;
    setGalleryImages(images);
  }, [pet.galleryImages]);

  const updateGallery = (newImages: string[]) => {
    galleryImagesRef.current = newImages;
    setGalleryImages(newImages);
    onUpdateGallery(newImages);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      updateGallery([...galleryImagesRef.current, result.assets[0].uri]);
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
      updateGallery([...galleryImagesRef.current, result.assets[0].uri]);
    }
  };

  const showAddOptions = () => {
    Alert.alert('Add Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleDeleteImage = (index: number) => {
    Alert.alert('Remove Photo', 'Remove this photo from the gallery?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          updateGallery(galleryImagesRef.current.filter((_, i) => i !== index));
        },
      },
    ]);
  };

  const handleLongPress = (index: number) => {
    handleDeleteImage(index);
  };

  const renderGridCells = () => {
    const cells = [];

    for (let i = 0; i < MAX_PHOTOS; i++) {
      if (i < galleryImages.length) {
        cells.push(
          <TouchableOpacity
            key={`img-${galleryImages[i]}`}
            activeOpacity={0.8}
            onPress={() => setViewingImage(galleryImages[i])}
            onLongPress={() => handleLongPress(i)}
            style={[
              styles.gridCell,
              {
                backgroundColor: theme.colors.inputBackground,
                marginRight: (i % 3) < 2 ? GRID_GAP : 0,
                marginBottom: i < 6 ? GRID_GAP : 0,
              },
            ]}
          >
            <PetImage
              uri={galleryImages[i]}
              petName={pet.name}
              style={styles.gridImage}
              fallbackStyle={[styles.gridImage, { borderRadius: 8 }]}
              fallbackFontSize={24}
              fallbackBg={theme.colors.inputBackground}
              fallbackColor={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        );
      } else if (i === galleryImages.length) {
        // Add button in next empty slot
        cells.push(
          <TouchableOpacity
            key={`add-${i}`}
            activeOpacity={0.7}
            onPress={showAddOptions}
            style={[
              styles.gridCell,
              styles.addCell,
              {
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.border,
                marginRight: (i % 3) < 2 ? GRID_GAP : 0,
                marginBottom: i < 6 ? GRID_GAP : 0,
              },
            ]}
          >
            <Ionicons name="add" size={32} color={theme.colors.primary} />
            <Text style={[styles.addText, { color: theme.colors.textSecondary }]}>
              Add
            </Text>
          </TouchableOpacity>
        );
      } else {
        // Empty placeholder
        cells.push(
          <View
            key={`empty-${i}`}
            style={[
              styles.gridCell,
              {
                backgroundColor: theme.colors.inputBackground,
                opacity: 0.4,
                marginRight: (i % 3) < 2 ? GRID_GAP : 0,
                marginBottom: i < 6 ? GRID_GAP : 0,
              },
            ]}
          />
        );
      }
    }

    return cells;
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={onClose}
      >
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {pet.name}'s Gallery
            </Text>
            <View style={styles.backButton}>
              <Text style={[styles.photoCount, { color: theme.colors.textSecondary }]}>
                {galleryImages.length}/{MAX_PHOTOS}
              </Text>
            </View>
          </View>

          {/* Profile image as first display */}
          {pet.profileImage && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setViewingImage(pet.profileImage)}
              style={styles.profileSection}
            >
              <PetImage
                uri={pet.profileImage}
                petName={pet.name}
                style={[styles.profilePreview, { borderColor: theme.colors.border }]}
                fallbackStyle={[styles.profilePreview, { borderColor: theme.colors.border, borderRadius: 40 }]}
                fallbackFontSize={32}
                fallbackBg={theme.colors.inputBackground}
                fallbackColor={theme.colors.textSecondary}
              />
              <Text style={[styles.profileLabel, { color: theme.colors.textSecondary }]}>
                Profile Photo
              </Text>
            </TouchableOpacity>
          )}

          {/* Grid */}
          <View style={styles.gridContainer}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
              Gallery Photos
            </Text>
            <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>
              Long press a photo to remove it
            </Text>
            <View style={styles.grid}>
              {renderGridCells()}
            </View>
          </View>
        </View>
      </Modal>

      {/* Fullscreen image viewer */}
      <Modal
        visible={viewingImage !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setViewingImage(null)}
      >
        <TouchableOpacity
          style={styles.fullscreenOverlay}
          activeOpacity={1}
          onPress={() => setViewingImage(null)}
        >
          <View style={styles.fullscreenCloseRow}>
            <TouchableOpacity
              onPress={() => setViewingImage(null)}
              style={styles.fullscreenCloseBtn}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {viewingImage && (
            <PetImage
              uri={viewingImage}
              petName={pet.name}
              style={styles.fullscreenImage}
              fallbackStyle={[styles.fullscreenImage, { borderRadius: 12 }]}
              fallbackFontSize={64}
              fallbackBg="rgba(255,255,255,0.1)"
              fallbackColor="#FFFFFF"
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </Modal>
    </>
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
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  photoCount: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  profilePreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
  },
  profileLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
  },
  gridContainer: {
    paddingHorizontal: GRID_PADDING,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  hintText: {
    fontSize: 11,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  addCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  addText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCloseRow: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  fullscreenCloseBtn: {
    padding: 8,
  },
  fullscreenImage: {
    width: SCREEN_WIDTH - 20,
    height: SCREEN_WIDTH - 20,
  },
});
