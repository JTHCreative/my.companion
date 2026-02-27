import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import {
  encodePetData,
  shareProfileSummary,
  shareFullPetData,
} from '../utils/shareUtils';

export function SharePetScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { selectedPet, scheduleEvents, meals, medications, vetInfo } = useData();
  const [copied, setCopied] = useState(false);

  const petSchedule = scheduleEvents.filter((e) => e.petId === selectedPet?.id);
  const petMeals = meals.filter((m) => m.petId === selectedPet?.id);
  const petMeds = medications.filter((m) => m.petId === selectedPet?.id);
  const petVets = vetInfo.filter((v) => v.petId === selectedPet?.id);

  const shareCode = useMemo(() => {
    if (!selectedPet) return '';
    return encodePetData(selectedPet, petSchedule, petMeals, petVets, petMeds);
  }, [selectedPet, petSchedule, petMeals, petVets, petMeds]);

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

  const handleShareFullData = async () => {
    try {
      await shareFullPetData(selectedPet, petSchedule, petMeals, petVets, petMeds);
    } catch {
      // User cancelled share sheet
    }
  };

  const handleCopyCode = async () => {
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

        {/* Share Full Data Option */}
        <Card>
          <View style={styles.optionHeader}>
            <View
              style={[
                styles.optionIcon,
                { backgroundColor: theme.colors.primaryLight },
              ]}
            >
              <Ionicons
                name="download-outline"
                size={22}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
                Share Full Profile
              </Text>
              <Text
                style={[
                  styles.optionDescription,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Share {selectedPet.name}'s complete profile including{' '}
                {dataCount > 0
                  ? `${dataCount} items (schedule, meals, meds, vet info)`
                  : 'all data'}
                . The recipient can import it into their Petfolio app.
              </Text>
            </View>
          </View>

          <Button
            title="Share via..."
            onPress={handleShareFullData}
            icon={
              <Ionicons name="share-outline" size={18} color="#FFFFFF" />
            }
            style={styles.optionButton}
          />

          {/* Divider */}
          <View
            style={[styles.divider, { borderBottomColor: theme.colors.border }]}
          />

          {/* Copy Code Section */}
          <Text
            style={[
              styles.codeLabel,
              { color: theme.colors.textSecondary },
            ]}
          >
            Or copy the share code:
          </Text>
          <TouchableOpacity
            onPress={handleCopyCode}
            activeOpacity={0.7}
            style={[
              styles.codeBox,
              { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border },
            ]}
          >
            <Text
              style={[styles.codeText, { color: theme.colors.text }]}
              numberOfLines={3}
            >
              {shareCode}
            </Text>
          </TouchableOpacity>
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
            style={styles.optionButton}
          />
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
            Profile photos are not included in shared data. The recipient will
            be able to add their own photo after importing.
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
  divider: {
    borderBottomWidth: 1,
    marginVertical: 16,
  },
  codeLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  codeBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  codeText: {
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
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
