import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { decodePetData } from '../utils/shareUtils';
import { SharedPetData } from '../types';

export function ImportPetScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { importPetData } = useData();
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<SharedPetData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      setCode(text);
      parseCode(text);
    }
  };

  const parseCode = (text: string) => {
    setError(null);
    setPreview(null);

    if (!text.trim()) return;

    // Try to extract share code from pasted text (user might paste the full message)
    const lines = text.split('\n');
    let shareCode = text.trim();
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('MYCOMPANION:')) {
        shareCode = trimmed;
        break;
      }
    }

    const data = decodePetData(shareCode);
    if (data) {
      setPreview(data);
      setCode(shareCode);
    } else {
      setError('Invalid share code. Make sure you copied the full code from the sender.');
    }
  };

  const handleImport = async () => {
    if (!preview) return;

    setImporting(true);
    try {
      await importPetData(preview);
      Alert.alert(
        'Pet Imported!',
        `${preview.pet.name} has been added to your pets.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch {
      Alert.alert('Import Failed', 'Something went wrong while importing. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const petType = preview
    ? preview.pet.type.charAt(0).toUpperCase() + preview.pet.type.slice(1)
    : '';

  const totalItems = preview
    ? preview.scheduleEvents.length +
      preview.meals.length +
      preview.medications.length +
      preview.vetInfo.length
    : 0;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Import Pet
        </Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Instructions */}
          <Card>
            <View style={styles.instructionHeader}>
              <View
                style={[
                  styles.instructionIcon,
                  { backgroundColor: theme.colors.primaryLight },
                ]}
              >
                <Ionicons
                  name="cloud-download-outline"
                  size={24}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.instructionInfo}>
                <Text
                  style={[
                    styles.instructionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  Import a Shared Pet
                </Text>
                <Text
                  style={[
                    styles.instructionText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Paste the share code you received from another Petfolio
                  user to add their pet's profile to your app.
                </Text>
              </View>
            </View>
          </Card>

          {/* Code Input */}
          <Card>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Share Code
            </Text>
            <TextInput
              style={[
                styles.codeInput,
                {
                  backgroundColor: theme.colors.inputBackground,
                  color: theme.colors.text,
                  borderColor: error
                    ? theme.colors.danger
                    : theme.colors.border,
                },
              ]}
              placeholder="Paste share code here..."
              placeholderTextColor={theme.colors.textSecondary}
              value={code}
              onChangeText={(text) => {
                setCode(text);
                setError(null);
                setPreview(null);
              }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {error && (
              <Text style={[styles.errorText, { color: theme.colors.danger }]}>
                {error}
              </Text>
            )}
            <View style={styles.inputActions}>
              <Button
                title="Paste from Clipboard"
                onPress={handlePaste}
                variant="secondary"
                icon={
                  <Ionicons
                    name="clipboard-outline"
                    size={16}
                    color={theme.colors.primary}
                  />
                }
                style={styles.pasteButton}
              />
              {code.length > 0 && !preview && (
                <Button
                  title="Decode"
                  onPress={() => parseCode(code)}
                  variant="secondary"
                  style={styles.decodeButton}
                />
              )}
            </View>
          </Card>

          {/* Preview */}
          {preview && (
            <Card>
              <Text
                style={[styles.previewTitle, { color: theme.colors.text }]}
              >
                Preview
              </Text>
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <View style={styles.previewRow}>
                  <View
                    style={[
                      styles.previewAvatar,
                      { backgroundColor: theme.colors.primaryLight },
                    ]}
                  >
                    <Ionicons
                      name="paw"
                      size={28}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.previewInfo}>
                    <Text
                      style={[
                        styles.previewName,
                        { color: theme.colors.text },
                      ]}
                    >
                      {preview.pet.name}
                    </Text>
                    <Text
                      style={[
                        styles.previewSubtitle,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {petType}
                      {preview.pet.breed ? ` - ${preview.pet.breed}` : ''}
                    </Text>
                  </View>
                </View>

                {/* Data counts */}
                <View
                  style={[
                    styles.previewStats,
                    { borderTopColor: theme.colors.border },
                  ]}
                >
                  {preview.scheduleEvents.length > 0 && (
                    <View style={styles.previewStat}>
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color={theme.colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.previewStatText,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {preview.scheduleEvents.length} events
                      </Text>
                    </View>
                  )}
                  {preview.meals.length > 0 && (
                    <View style={styles.previewStat}>
                      <Ionicons
                        name="restaurant-outline"
                        size={14}
                        color={theme.colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.previewStatText,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {preview.meals.length} meals
                      </Text>
                    </View>
                  )}
                  {preview.medications.length > 0 && (
                    <View style={styles.previewStat}>
                      <Ionicons
                        name="medkit-outline"
                        size={14}
                        color={theme.colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.previewStatText,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {preview.medications.length} meds
                      </Text>
                    </View>
                  )}
                  {preview.vetInfo.length > 0 && (
                    <View style={styles.previewStat}>
                      <Ionicons
                        name="business-outline"
                        size={14}
                        color={theme.colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.previewStatText,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {preview.vetInfo.length} vets
                      </Text>
                    </View>
                  )}
                  {totalItems === 0 && (
                    <Text
                      style={[
                        styles.previewStatText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Profile info only (no schedule/meals/medical data)
                    </Text>
                  )}
                </View>
              </View>

              <Button
                title={`Import ${preview.pet.name}`}
                onPress={handleImport}
                loading={importing}
                icon={
                  !importing ? (
                    <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                  ) : undefined
                }
                style={styles.importButton}
              />
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingTop: 8,
  },
  instructionHeader: {
    flexDirection: 'row',
  },
  instructionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  instructionInfo: {
    flex: 1,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 13,
    lineHeight: 19,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  codeInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    fontFamily: 'monospace',
    minHeight: 100,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 13,
    marginTop: 6,
  },
  inputActions: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  pasteButton: {
    flex: 1,
  },
  decodeButton: {
    paddingHorizontal: 20,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  previewCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '700',
  },
  previewSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  previewStats: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  previewStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewStatText: {
    fontSize: 13,
  },
  importButton: {
    marginTop: 14,
  },
});
