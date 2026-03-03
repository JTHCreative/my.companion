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
import { SharedPetPreview } from '../types';

export function ImportPetScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { lookupShareCode, joinSharedPet } = useData();
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<SharedPetPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [joining, setJoining] = useState(false);

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      const trimmed = text.trim();
      setCode(trimmed);
      handleLookup(trimmed);
    }
  };

  const handleLookup = async (shareCode?: string) => {
    const lookupCode = (shareCode || code).trim();
    if (!lookupCode) return;

    setError(null);
    setPreview(null);
    setLooking(true);

    try {
      const result = await lookupShareCode(lookupCode);
      if (result) {
        setPreview(result);
      } else {
        setError('Invalid share code. Please check the code and try again.');
      }
    } catch {
      setError('Could not look up share code. Please check your connection and try again.');
    } finally {
      setLooking(false);
    }
  };

  const handleJoin = async () => {
    if (!preview) return;

    setJoining(true);
    try {
      await joinSharedPet(code.trim());
      Alert.alert(
        'Pet Joined!',
        `You now have access to ${preview.name}'s profile. Changes will sync in real-time.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch {
      Alert.alert('Join Failed', 'Something went wrong while joining. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const petType = preview
    ? preview.type.charAt(0).toUpperCase() + preview.type.slice(1)
    : '';

  const totalItems = preview
    ? preview.scheduleEventCount +
      preview.mealCount +
      preview.medicationCount +
      preview.vetInfoCount
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
          Join a Pet
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
                  name="people-outline"
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
                  Join a Shared Pet
                </Text>
                <Text
                  style={[
                    styles.instructionText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Enter the share code you received from another Petfolio
                  user to access their pet's profile. Changes will sync in
                  real-time between all members.
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
                !code && styles.codeInputEmpty,
              ]}
              placeholder="Enter 6 Digit Code"
              placeholderTextColor={theme.colors.textSecondary}
              value={code}
              onChangeText={(text) => {
                setCode(text.toUpperCase());
                setError(null);
                setPreview(null);
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              textAlign="center"
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
                  title="Look Up"
                  onPress={() => handleLookup()}
                  variant="secondary"
                  loading={looking}
                  style={styles.lookupButton}
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
                {preview.alreadyMember ? 'Already Joined' : 'Preview'}
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
                      {preview.name}
                    </Text>
                    <Text
                      style={[
                        styles.previewSubtitle,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {petType}
                      {preview.breed ? ` - ${preview.breed}` : ''}
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
                  {preview.scheduleEventCount > 0 && (
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
                        {preview.scheduleEventCount} events
                      </Text>
                    </View>
                  )}
                  {preview.mealCount > 0 && (
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
                        {preview.mealCount} meals
                      </Text>
                    </View>
                  )}
                  {preview.medicationCount > 0 && (
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
                        {preview.medicationCount} meds
                      </Text>
                    </View>
                  )}
                  {preview.vetInfoCount > 0 && (
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
                        {preview.vetInfoCount} vets
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

              {preview.alreadyMember ? (
                <View style={styles.alreadyJoinedRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text style={[styles.alreadyJoinedText, { color: theme.colors.primary }]}>
                    You already have access to this pet's profile.
                  </Text>
                </View>
              ) : (
                <Button
                  title={`Join ${preview.name}`}
                  onPress={handleJoin}
                  loading={joining}
                  icon={
                    !joining ? (
                      <Ionicons name="people-outline" size={18} color="#FFFFFF" />
                    ) : undefined
                  }
                  style={styles.joinButton}
                />
              )}
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
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 6,
    minHeight: 60,
  },
  codeInputEmpty: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0,
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
  lookupButton: {
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
  alreadyJoinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  alreadyJoinedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  joinButton: {
    marginTop: 14,
  },
});
