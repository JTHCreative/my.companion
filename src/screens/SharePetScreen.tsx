import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { shareProfileSummary } from '../utils/shareUtils';

export function SharePetScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { selectedPet, scheduleEvents, meals, medications, vetInfo, createShareLink } = useData();
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const petSchedule = scheduleEvents.filter((e) => e.petId === selectedPet?.id);
  const petMeals = meals.filter((m) => m.petId === selectedPet?.id);
  const petMeds = medications.filter((m) => m.petId === selectedPet?.id);
  const petVets = vetInfo.filter((v) => v.petId === selectedPet?.id);

  // Auto-generate share code when screen opens
  useEffect(() => {
    if (!selectedPet) return;
    if (selectedPet.shareCode) {
      setShareCode(selectedPet.shareCode);
      return;
    }
    setGenerating(true);
    createShareLink(selectedPet.id)
      .then(setShareCode)
      .catch(() => {})
      .finally(() => setGenerating(false));
  }, [selectedPet?.id, selectedPet?.shareCode]);

  if (!selectedPet) {
    navigation.goBack();
    return null;
  }

  const handleShareSummary = async () => {
    try {
      await shareProfileSummary(selectedPet, petSchedule, petMeals, petMeds, petVets);
    } catch {
      // User cancelled share sheet
    }
  };

  const handleShareCode = async () => {
    if (!shareCode) return;
    try {
      await Share.share({
        message: `Join ${selectedPet.name}'s profile on PetPassport! Enter this share code: ${shareCode}`,
      });
    } catch {
      // User cancelled share sheet
    }
  };

  const handleCopyCode = async () => {
    if (!shareCode) return;
    await Clipboard.setStringAsync(shareCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const dataCount =
    petSchedule.length + petMeals.length + petMeds.length + petVets.length;

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
          Share {selectedPet.name}
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Share Summary Option */}
        <Card>
          <View style={styles.optionHeader}>
            <View
              style={[
                styles.optionIcon,
                { backgroundColor: theme.colors.primaryLight },
              ]}
            >
              <Ionicons
                name="chatbubble-outline"
                size={22}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
                Share Profile Summary
              </Text>
              <Text
                style={[
                  styles.optionDescription,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Send a text summary of {selectedPet.name}'s profile via
                messages, email, or social media.
              </Text>
            </View>
          </View>
          <Button
            title="Share Summary"
            onPress={handleShareSummary}
            variant="secondary"
            icon={
              <Ionicons
                name="share-outline"
                size={18}
                color={theme.colors.primary}
              />
            }
            style={styles.optionButton}
          />
        </Card>

        {/* Share Link Option (Real-time) */}
        <Card>
          <View style={styles.optionHeader}>
            <View
              style={[
                styles.optionIcon,
                { backgroundColor: theme.colors.primaryLight },
              ]}
            >
              <Ionicons
                name="link-outline"
                size={22}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
                Share Pet Link
              </Text>
              <Text
                style={[
                  styles.optionDescription,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Share a code that lets another PetPassport user access{' '}
                {selectedPet.name}'s full profile in real-time
                {dataCount > 0
                  ? ` (${dataCount} items including schedule, meals, meds & vet info)`
                  : ''}
                . Any changes you make will sync to their app automatically.
              </Text>
            </View>
          </View>

          {generating ? (
            <View style={styles.generatingRow}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.generatingText, { color: theme.colors.textSecondary }]}>
                Generating share code...
              </Text>
            </View>
          ) : shareCode ? (
            <>
              {/* Share Code Display */}
              <TouchableOpacity
                onPress={handleCopyCode}
                activeOpacity={0.7}
                style={[
                  styles.codeBox,
                  { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border },
                ]}
              >
                <Text style={[styles.codeText, { color: theme.colors.text }]}>
                  {shareCode}
                </Text>
              </TouchableOpacity>

              <View style={styles.buttonRow}>
                <Button
                  title={copied ? 'Copied!' : 'Copy Code'}
                  onPress={handleCopyCode}
                  variant="secondary"
                  icon={
                    <Ionicons
                      name={copied ? 'checkmark' : 'copy-outline'}
                      size={18}
                      color={theme.colors.primary}
                    />
                  }
                  style={styles.rowButton}
                />
                <Button
                  title="Share via..."
                  onPress={handleShareCode}
                  icon={
                    <Ionicons name="share-outline" size={18} color="#FFFFFF" />
                  }
                  style={styles.rowButton}
                />
              </View>
            </>
          ) : null}
        </Card>

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={theme.colors.textSecondary}
          />
          <Text
            style={[styles.infoText, { color: theme.colors.textSecondary }]}
          >
            When you share a pet link, the recipient will see all updates you
            make in real-time. Profile photos are stored locally and not
            included in the share.
          </Text>
        </View>
      </ScrollView>
    </View>
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
  optionHeader: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    lineHeight: 19,
  },
  optionButton: {
    marginTop: 4,
  },
  generatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  generatingText: {
    fontSize: 14,
  },
  codeBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  codeText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 6,
    fontFamily: 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rowButton: {
    flex: 1,
  },
  infoNote: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
