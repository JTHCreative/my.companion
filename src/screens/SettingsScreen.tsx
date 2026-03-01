import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { PetAvatarHeader } from '../components/PetAvatarHeader';

export function SettingsScreen({ navigation }: { navigation: any }) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <PetAvatarHeader
        title="Settings"
        onAddPet={() => navigation.navigate('AddPet')}
        initialSelectorOpen
        rightAccessory={
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        }
      />

      {/* Theme Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
          APPEARANCE
        </Text>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Ionicons
                name={isDark ? 'moon' : 'sunny'}
                size={22}
                color={theme.colors.primary}
              />
              <Text style={[styles.settingText, { color: theme.colors.text }]}>Theme</Text>
            </View>
            <View style={[styles.toggleContainer, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
              <TouchableOpacity
                onPress={() => { if (isDark) toggleTheme(); }}
                activeOpacity={0.7}
                style={[
                  styles.toggleOption,
                  !isDark && [styles.toggleOptionActive, { backgroundColor: theme.colors.primary }],
                ]}
              >
                <Ionicons
                  name="sunny"
                  size={14}
                  color={!isDark ? theme.colors.textInverse : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.toggleText,
                    { color: !isDark ? theme.colors.textInverse : theme.colors.textSecondary },
                    !isDark && styles.toggleTextActive,
                  ]}
                >
                  Day
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { if (!isDark) toggleTheme(); }}
                activeOpacity={0.7}
                style={[
                  styles.toggleOption,
                  isDark && [styles.toggleOptionActive, { backgroundColor: theme.colors.primary }],
                ]}
              >
                <Ionicons
                  name="moon"
                  size={14}
                  color={isDark ? theme.colors.textInverse : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.toggleText,
                    { color: isDark ? theme.colors.textInverse : theme.colors.textSecondary },
                    isDark && styles.toggleTextActive,
                  ]}
                >
                  Night
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  toggleOptionActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '500',
  },
  toggleTextActive: {
    fontWeight: '700',
  },
});
