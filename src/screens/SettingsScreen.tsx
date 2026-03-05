import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export function SettingsScreen({ navigation }: { navigation: any }) {
  const { theme, toggleTheme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, displayName, signOut, updateDisplayName, updateUserEmail, updateUserPassword } = useAuth();
  const { prefs, permissionStatus, updatePrefs, requestPermissions } = useNotifications();

  const [accountExpanded, setAccountExpanded] = useState(false);
  const [notificationsExpanded, setNotificationsExpanded] = useState(false);

  // Detect if user signed in via Google
  const isGoogleUser = user?.providerData?.some((p) => p.providerId === 'google.com') ?? false;

  // Editable fields
  const [editName, setEditName] = useState(displayName);
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Visibility toggles
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [saving, setSaving] = useState(false);

  // Reset fields when expanding
  const toggleAccountSection = () => {
    if (!accountExpanded) {
      setEditName(displayName);
      setEditEmail(user?.email || '');
      setNewPassword('');
      setConfirmNewPassword('');
    }
    setAccountExpanded(!accountExpanded);
  };

  const handleToggleNotifications = async () => {
    if (!prefs.enabled) {
      // Turning on — request permissions if needed
      if (permissionStatus !== 'granted') {
        const granted = await requestPermissions();
        if (!granted) {
          Alert.alert(
            'Notifications Blocked',
            'Please enable notifications in your device settings to receive pet reminders.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  if (Platform.OS === 'ios') {
                    Linking.openURL('app-settings:');
                  } else {
                    Linking.openSettings();
                  }
                },
              },
            ],
          );
          return;
        }
      }
    }
    await updatePrefs({ enabled: !prefs.enabled });
  };

  const handleToggleScheduleReminders = async () => {
    await updatePrefs({ scheduleReminders: !prefs.scheduleReminders });
  };

  const reminderOptions = [0, 5, 10, 15, 30] as const;

  const toggleReminderOption = (mins: number) => {
    const current = Array.isArray(prefs.reminderMinutesBefore)
      ? prefs.reminderMinutesBefore
      : [prefs.reminderMinutesBefore];
    const isSelected = current.includes(mins);
    let updated: number[];
    if (isSelected) {
      updated = current.filter((m) => m !== mins);
      // Must have at least one option selected
      if (updated.length === 0) return;
    } else {
      updated = [...current, mins].sort((a, b) => a - b);
    }
    updatePrefs({ reminderMinutesBefore: updated });
  };

  const handleSaveAccount = async () => {
    // Validate
    if (editName.trim() === '') {
      Alert.alert('Error', 'User name cannot be empty.');
      return;
    }

    const emailChanged = !isGoogleUser && editEmail.trim() !== user?.email;
    const passwordChanged = !isGoogleUser && newPassword.length > 0;

    if (!isGoogleUser) {
      if (editEmail.trim() === '' || !/\S+@\S+\.\S+/.test(editEmail.trim())) {
        Alert.alert('Error', 'Please enter a valid email.');
        return;
      }
      if (passwordChanged && newPassword.length < 6) {
        Alert.alert('Error', 'New password must be at least 6 characters.');
        return;
      }
      if (passwordChanged && newPassword !== confirmNewPassword) {
        Alert.alert('Error', 'New passwords do not match.');
        return;
      }
    }

    setSaving(true);
    try {
      // Update display name if changed
      if (editName.trim() !== displayName) {
        await updateDisplayName(editName.trim());
      }

      // Update email if changed (email users only)
      if (emailChanged) {
        await updateUserEmail(editEmail.trim());
      }

      // Update password if changed (email users only)
      if (passwordChanged) {
        await updateUserPassword(newPassword);
      }

      Alert.alert('Success', 'Account settings updated.');
      setNewPassword('');
      setConfirmNewPassword('');
      setAccountExpanded(false);
    } catch (error: any) {
      let message = 'Failed to update. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'That email is already in use by another account.';
      } else if (error.code === 'auth/requires-recent-login') {
        message = 'Please sign out and sign back in, then try again.';
      } else if (error.code === 'auth/weak-password') {
        message = 'New password is too weak. Use at least 6 characters.';
      }
      Alert.alert('Update Failed', message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch {
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          }
        },
      },
    ]);
  };

  const renderPasswordInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    visible: boolean,
    toggleVisible: () => void,
  ) => (
    <View style={styles.accountFieldContainer}>
      <Text style={[styles.accountFieldLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <View style={styles.passwordInputWrapper}>
        <TextInput
          style={[
            styles.accountInput,
            {
              backgroundColor: theme.colors.inputBackground,
              color: theme.colors.text,
              borderColor: theme.colors.border,
              paddingRight: 44,
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.tabBarInactive}
          secureTextEntry={!visible}
          autoCapitalize="none"
        />
        <TouchableOpacity
          onPress={toggleVisible}
          activeOpacity={0.6}
          style={styles.passwordEyeButton}
        >
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border, paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Settings</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]} keyboardShouldPersistTaps="handled">
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

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
          NOTIFICATIONS
        </Text>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {/* Expandable header */}
          <TouchableOpacity
            onPress={() => setNotificationsExpanded(!notificationsExpanded)}
            activeOpacity={0.7}
            style={styles.settingRow}
          >
            <View style={styles.settingLabel}>
              <Ionicons
                name={prefs.enabled ? 'notifications' : 'notifications-off-outline'}
                size={22}
                color={theme.colors.primary}
              />
              <Text style={[styles.settingText, { color: theme.colors.text }]}>Notification Settings</Text>
            </View>
            <Ionicons
              name={notificationsExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          {notificationsExpanded && (
            <View style={[styles.accountContent, { borderTopColor: theme.colors.border }]}>
              {/* Master toggle */}
              <TouchableOpacity
                onPress={handleToggleNotifications}
                activeOpacity={0.7}
                style={styles.settingRow}
              >
                <View style={styles.settingLabel}>
                  <Ionicons
                    name={prefs.enabled ? 'notifications' : 'notifications-off-outline'}
                    size={22}
                    color={theme.colors.primary}
                  />
                  <Text style={[styles.settingText, { color: theme.colors.text }]}>Enable Notifications</Text>
                </View>
                <View
                  style={[
                    styles.togglePill,
                    { backgroundColor: prefs.enabled ? theme.colors.primary : theme.colors.inputBackground },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleKnob,
                      prefs.enabled ? styles.toggleKnobOn : styles.toggleKnobOff,
                    ]}
                  />
                </View>
              </TouchableOpacity>

              {prefs.enabled && (
                <>
                  {/* Divider */}
                  <View style={{ height: 1, backgroundColor: theme.colors.border, marginHorizontal: 0 }} />

                  {/* Schedule Reminders toggle */}
                  <TouchableOpacity
                    onPress={handleToggleScheduleReminders}
                    activeOpacity={0.7}
                    style={styles.settingRow}
                  >
                    <View style={styles.settingLabel}>
                      <Ionicons name="alarm-outline" size={22} color={theme.colors.primary} />
                      <Text style={[styles.settingText, { color: theme.colors.text }]}>Schedule Reminders</Text>
                    </View>
                    <View
                      style={[
                        styles.togglePill,
                        { backgroundColor: prefs.scheduleReminders ? theme.colors.primary : theme.colors.inputBackground },
                      ]}
                    >
                      <View
                        style={[
                          styles.toggleKnob,
                          prefs.scheduleReminders ? styles.toggleKnobOn : styles.toggleKnobOff,
                        ]}
                      />
                    </View>
                  </TouchableOpacity>

                  {prefs.scheduleReminders && (
                    <>
                      {/* Divider */}
                      <View style={{ height: 1, backgroundColor: theme.colors.border, marginHorizontal: 0 }} />

                      {/* Reminder timing */}
                      <View style={[styles.settingRow, { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
                        <View style={styles.settingLabel}>
                          <Ionicons name="time-outline" size={22} color={theme.colors.primary} />
                          <Text style={[styles.settingText, { color: theme.colors.text }]}>Remind Me Before</Text>
                        </View>
                        <View style={styles.reminderOptions}>
                          {reminderOptions.map((mins) => {
                            const selected = Array.isArray(prefs.reminderMinutesBefore)
                              ? prefs.reminderMinutesBefore.includes(mins)
                              : prefs.reminderMinutesBefore === mins;
                            return (
                              <TouchableOpacity
                                key={mins}
                                onPress={() => toggleReminderOption(mins)}
                                activeOpacity={0.7}
                                style={[
                                  styles.reminderChip,
                                  {
                                    backgroundColor: selected
                                      ? theme.colors.primary
                                      : theme.colors.inputBackground,
                                    borderColor: selected
                                      ? theme.colors.primary
                                      : theme.colors.border,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.reminderChipText,
                                    {
                                      color: selected
                                        ? theme.colors.textInverse
                                        : theme.colors.text,
                                    },
                                  ]}
                                >
                                  {mins === 0 ? 'At time' : `${mins} min`}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    </>
                  )}
                </>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Account Settings Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
          ACCOUNT
        </Text>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <TouchableOpacity
            onPress={toggleAccountSection}
            activeOpacity={0.7}
            style={styles.settingRow}
          >
            <View style={styles.settingLabel}>
              <Ionicons name="person-outline" size={22} color={theme.colors.primary} />
              <Text style={[styles.settingText, { color: theme.colors.text }]}>Account Settings</Text>
            </View>
            <Ionicons
              name={accountExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          {accountExpanded && (
            <View style={[styles.accountContent, { borderTopColor: theme.colors.border }]}>
              {/* Google sign-in indicator */}
              {isGoogleUser && (
                <View style={[styles.providerBadge, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                  <Ionicons name="logo-google" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.providerBadgeText, { color: theme.colors.textSecondary }]}>
                    Signed in with Google
                  </Text>
                </View>
              )}

              {/* User Name */}
              <View style={styles.accountFieldContainer}>
                <Text style={[styles.accountFieldLabel, { color: theme.colors.textSecondary }]}>User Name</Text>
                <TextInput
                  style={[
                    styles.accountInput,
                    {
                      backgroundColor: theme.colors.inputBackground,
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Your display name"
                  placeholderTextColor={theme.colors.tabBarInactive}
                  autoCapitalize="words"
                />
              </View>

              {/* Email & Password — only for email/password users */}
              {!isGoogleUser && (
                <>
                  {/* Email */}
                  <View style={styles.accountFieldContainer}>
                    <Text style={[styles.accountFieldLabel, { color: theme.colors.textSecondary }]}>Email</Text>
                    <TextInput
                      style={[
                        styles.accountInput,
                        {
                          backgroundColor: theme.colors.inputBackground,
                          color: theme.colors.text,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      value={editEmail}
                      onChangeText={setEditEmail}
                      placeholder="you@example.com"
                      placeholderTextColor={theme.colors.tabBarInactive}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  {/* New Password */}
                  {renderPasswordInput(
                    'New Password',
                    newPassword,
                    setNewPassword,
                    'Leave blank to keep current',
                    showNewPassword,
                    () => setShowNewPassword(!showNewPassword),
                  )}

                  {/* Confirm New Password */}
                  {renderPasswordInput(
                    'Confirm New Password',
                    confirmNewPassword,
                    setConfirmNewPassword,
                    'Re-enter new password',
                    showConfirmPassword,
                    () => setShowConfirmPassword(!showConfirmPassword),
                  )}
                </>
              )}

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSaveAccount}
                disabled={saving}
                activeOpacity={0.7}
                style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={theme.colors.textInverse} />
                ) : (
                  <Text style={[styles.saveButtonText, { color: theme.colors.textInverse }]}>
                    Save Changes
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.7}
          style={[styles.signOutButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <Ionicons name="log-out-outline" size={22} color={theme.colors.danger} />
          <Text style={[styles.signOutText, { color: theme.colors.danger }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
  accountContent: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  accountFieldContainer: {
    gap: 6,
  },
  accountFieldLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  accountInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  passwordInputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordEyeButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  saveButton: {
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  togglePill: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobOn: {
    alignSelf: 'flex-end',
  },
  toggleKnobOff: {
    alignSelf: 'flex-start',
  },
  reminderOptions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    paddingLeft: 34,
  },
  reminderChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  reminderChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  providerBadgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
