import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { generateId } from '../utils/generateId';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { Card } from '../components/Card';
import { FormInput } from '../components/FormInput';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import { DatePicker } from '../components/DatePicker';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { PetAvatarHeader } from '../components/PetAvatarHeader';

type ModalMode = 'none' | 'vet' | 'medication';

const FREQUENCY_OPTIONS = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Every other day',
  'Weekly',
  'As needed',
];

export function MedicalScreen({ navigation }: any) {
  const { theme } = useTheme();
  const {
    selectedPet,
    selectedPetId,
    vetInfo,
    addVetInfo,
    updateVetInfo,
    deleteVetInfo,
    medications,
    addMedication,
    updateMedication,
    deleteMedication,
  } = useData();

  const [modalMode, setModalMode] = useState<ModalMode>('none');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Vet form state
  const [clinicName, setClinicName] = useState('');
  const [vetName, setVetName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [vetNotes, setVetNotes] = useState('');

  // Medication form state
  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Once daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [medNotes, setMedNotes] = useState('');

  const petVets = vetInfo.filter((v) => v.petId === selectedPetId);
  const petMeds = medications.filter((m) => m.petId === selectedPetId);

  const resetForm = () => {
    setClinicName('');
    setVetName('');
    setPhone('');
    setAddress('');
    setVetNotes('');
    setMedName('');
    setDosage('');
    setFrequency('Once daily');
    setStartDate('');
    setEndDate('');
    setMedNotes('');
    setEditingId(null);
  };

  const openVetModal = (vetId?: string) => {
    resetForm();
    if (vetId) {
      const vet = vetInfo.find((v) => v.id === vetId);
      if (vet) {
        setEditingId(vetId);
        setClinicName(vet.clinicName);
        setVetName(vet.vetName);
        setPhone(vet.phone);
        setAddress(vet.address || '');
        setVetNotes(vet.notes || '');
      }
    }
    setModalMode('vet');
  };

  const openMedModal = (medId?: string) => {
    resetForm();
    if (medId) {
      const med = medications.find((m) => m.id === medId);
      if (med) {
        setEditingId(medId);
        setMedName(med.name);
        setDosage(med.dosage);
        setFrequency(med.frequency);
        setStartDate(med.startDate || '');
        setEndDate(med.endDate || '');
        setMedNotes(med.notes || '');
      }
    }
    setModalMode('medication');
  };

  const handleSaveVet = async () => {
    if (!clinicName.trim() && !vetName.trim()) {
      Alert.alert('Required', 'Please enter a clinic or vet name.');
      return;
    }

    try {
      const data = {
        id: editingId || generateId(),
        petId: selectedPetId!,
        clinicName: clinicName.trim(),
        vetName: vetName.trim(),
        phone: phone.trim(),
        address: address.trim() || undefined,
        notes: vetNotes.trim() || undefined,
      };

      if (editingId) {
        await updateVetInfo(data);
      } else {
        await addVetInfo(data);
      }

      setModalMode('none');
      resetForm();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save vet info.');
    }
  };

  const handleSaveMed = async () => {
    if (!medName.trim()) {
      Alert.alert('Required', 'Please enter the medication name.');
      return;
    }

    try {
      const data = {
        id: editingId || generateId(),
        petId: selectedPetId!,
        name: medName.trim(),
        dosage: dosage.trim(),
        frequency,
        startDate: startDate.trim() || undefined,
        endDate: endDate.trim() || undefined,
        notes: medNotes.trim() || undefined,
      };

      if (editingId) {
        await updateMedication(data);
      } else {
        await addMedication(data);
      }

      setModalMode('none');
      resetForm();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save medication.');
    }
  };

  const handleCallVet = (phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    if (cleaned) {
      Linking.openURL(`tel:${cleaned}`);
    } else {
      Alert.alert('No Phone Number', 'No phone number is available for this vet.');
    }
  };

  const handleDirections = (address: string) => {
    const encoded = encodeURIComponent(address);
    const url = Platform.select({
      ios: `maps:0,0?q=${encoded}`,
      android: `geo:0,0?q=${encoded}`,
    }) || `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    Linking.openURL(url);
  };

  const formatPhoneNumber = (phone: string): string => {
    const digits = phone.replace(/[^\d]/g, '');
    if (digits.length === 10) {
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11 && digits[0] === '1') {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    return phone;
  };

  const handleDeleteVet = (id: string) => {
    Alert.alert('Delete Vet', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteVetInfo(id),
      },
    ]);
  };

  const handleDeleteMed = (id: string) => {
    Alert.alert('Delete Medication', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMedication(id),
      },
    ]);
  };

  if (!selectedPet) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <PetAvatarHeader
          title="Medical"
          onAddPet={() => navigation.navigate('AddPetChoice')}
        />
        <EmptyState
          icon="medkit"
          title="No Pet Selected"
          subtitle="Add a pet first to manage their medical information."
          actionLabel="Add Pet"
          onAction={() => navigation.navigate('AddPetChoice')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <PetAvatarHeader
        title="Medical"
        onAddPet={() => navigation.navigate('AddPetChoice')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Vet Info Section */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#3B82F620' }]}>
            <Ionicons name="medical" size={18} color="#3B82F6" />
          </View>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Veterinarian
          </Text>
          <TouchableOpacity onPress={() => openVetModal()} style={styles.sectionAddBtn}>
            <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {petVets.length === 0 ? (
          <Card>
            <TouchableOpacity
              style={styles.emptyCardContent}
              onPress={() => openVetModal()}
            >
              <Ionicons
                name="add-circle-outline"
                size={24}
                color={theme.colors.textSecondary}
              />
              <Text style={[styles.emptyCardText, { color: theme.colors.textSecondary }]}>
                Add vet information
              </Text>
            </TouchableOpacity>
          </Card>
        ) : (
          petVets.map((vet) => (
            <TouchableOpacity
              key={vet.id}
              activeOpacity={0.7}
              onPress={() => openVetModal(vet.id)}
              onLongPress={() => handleDeleteVet(vet.id)}
            >
              <Card>
                <View style={styles.vetHeader}>
                  <View style={styles.vetInfo}>
                    {vet.clinicName && (
                      <Text style={[styles.vetClinic, { color: theme.colors.text }]}>
                        {vet.clinicName}
                      </Text>
                    )}
                    {vet.vetName && (
                      <Text style={[styles.vetName, { color: theme.colors.textSecondary }]}>
                        Dr. {vet.vetName}
                      </Text>
                    )}
                  </View>
                  <View style={styles.vetActions}>
                    {vet.address && (
                      <TouchableOpacity
                        style={[styles.callButton, { backgroundColor: theme.colors.primary }]}
                        onPress={() => handleDirections(vet.address!)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="navigate" size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                    {vet.phone && (
                      <TouchableOpacity
                        style={[styles.callButton, { backgroundColor: theme.colors.success }]}
                        onPress={() => handleCallVet(vet.phone)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="call" size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                {vet.phone && (
                  <View style={styles.detailRow}>
                    <Ionicons name="call-outline" size={16} color={theme.colors.textSecondary} />
                    <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
                      {formatPhoneNumber(vet.phone)}
                    </Text>
                  </View>
                )}
                {vet.address && (
                  <View style={styles.detailRow}>
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color={theme.colors.textSecondary}
                    />
                    <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
                      {vet.address}
                    </Text>
                  </View>
                )}
                {vet.notes && (
                  <Text style={[styles.notesText, { color: theme.colors.textSecondary }]}>
                    {vet.notes}
                  </Text>
                )}
              </Card>
            </TouchableOpacity>
          ))
        )}

        {/* Medications Section */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#EF444420' }]}>
            <Ionicons name="medkit" size={18} color="#EF4444" />
          </View>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Medications
          </Text>
          <TouchableOpacity onPress={() => openMedModal()} style={styles.sectionAddBtn}>
            <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {petMeds.length === 0 ? (
          <Card>
            <TouchableOpacity
              style={styles.emptyCardContent}
              onPress={() => openMedModal()}
            >
              <Ionicons
                name="add-circle-outline"
                size={24}
                color={theme.colors.textSecondary}
              />
              <Text style={[styles.emptyCardText, { color: theme.colors.textSecondary }]}>
                Add medication
              </Text>
            </TouchableOpacity>
          </Card>
        ) : (
          petMeds.map((med) => (
            <TouchableOpacity
              key={med.id}
              activeOpacity={0.7}
              onPress={() => openMedModal(med.id)}
              onLongPress={() => handleDeleteMed(med.id)}
            >
              <Card>
                <View style={styles.medHeader}>
                  <View
                    style={[
                      styles.medIcon,
                      { backgroundColor: theme.colors.primaryLight },
                    ]}
                  >
                    <Ionicons name="medical" size={18} color={theme.colors.primary} />
                  </View>
                  <View style={styles.medInfo}>
                    <Text style={[styles.medName, { color: theme.colors.text }]}>
                      {med.name}
                    </Text>
                    {med.dosage && (
                      <Text style={[styles.medDosage, { color: theme.colors.textSecondary }]}>
                        {med.dosage}
                      </Text>
                    )}
                  </View>
                </View>
                <View
                  style={[
                    styles.frequencyBadge,
                    { backgroundColor: theme.colors.primaryLight },
                  ]}
                >
                  <Ionicons name="repeat" size={14} color={theme.colors.primary} />
                  <Text style={[styles.frequencyText, { color: theme.colors.primary }]}>
                    {med.frequency}
                  </Text>
                </View>
                {(med.startDate || med.endDate) && (
                  <View style={styles.dateRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={14}
                      color={theme.colors.textSecondary}
                    />
                    <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
                      {med.startDate && `From: ${med.startDate}`}
                      {med.startDate && med.endDate && '  \u2022  '}
                      {med.endDate && `Until: ${med.endDate}`}
                    </Text>
                  </View>
                )}
                {med.notes && (
                  <Text style={[styles.notesText, { color: theme.colors.textSecondary }]}>
                    {med.notes}
                  </Text>
                )}
              </Card>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Vet Modal */}
      <Modal
        visible={modalMode === 'vet'}
        animationType="slide"
        onRequestClose={() => { setModalMode('none'); resetForm(); }}
      >
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity
              onPress={() => {
                setModalMode('none');
                resetForm();
              }}
              style={styles.modalHeaderBtn}
            >
              <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {editingId ? 'Edit Vet' : 'Add Vet'}
            </Text>
            <TouchableOpacity onPress={handleSaveVet} style={styles.modalHeaderBtn}>
              <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '700' }}>
                Save
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalBodyContent}
            keyboardShouldPersistTaps="handled"
          >
            <FormInput
              label="Clinic Name"
              value={clinicName}
              onChangeText={setClinicName}
              placeholder="e.g., Happy Paws Vet Clinic"
            />
            <FormInput
              label="Veterinarian Name"
              value={vetName}
              onChangeText={setVetName}
              placeholder="e.g., Smith"
            />
            <FormInput
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="(555) 123-4567"
              keyboardType="phone-pad"
            />
            <AddressAutocomplete
              label="Address"
              value={address}
              onChange={setAddress}
              placeholder="Search address..."
            />
            <FormInput
              label="Notes"
              value={vetNotes}
              onChangeText={setVetNotes}
              placeholder="Office hours, specialties, etc."
              multiline
              style={{ height: 80 }}
            />

            {editingId && (
              <Button
                title="Delete Vet"
                onPress={() => {
                  setModalMode('none');
                  handleDeleteVet(editingId);
                  resetForm();
                }}
                variant="danger"
                style={styles.deleteBtn}
                icon={<Ionicons name="trash" size={18} color="#FFFFFF" />}
              />
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Medication Modal */}
      <Modal
        visible={modalMode === 'medication'}
        animationType="slide"
        onRequestClose={() => { setModalMode('none'); resetForm(); }}
      >
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity
              onPress={() => {
                setModalMode('none');
                resetForm();
              }}
              style={styles.modalHeaderBtn}
            >
              <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {editingId ? 'Edit Medication' : 'Add Medication'}
            </Text>
            <TouchableOpacity onPress={handleSaveMed} style={styles.modalHeaderBtn}>
              <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '700' }}>
                Save
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalBodyContent}
          >
            <FormInput
              label="Medication Name"
              value={medName}
              onChangeText={setMedName}
              placeholder="e.g., Heartgard"
            />
            <FormInput
              label="Dosage"
              value={dosage}
              onChangeText={setDosage}
              placeholder="e.g., 1 tablet, 5mg"
            />

            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
              Frequency
            </Text>
            <View style={styles.frequencyGrid}>
              {FREQUENCY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.frequencyChip,
                    {
                      backgroundColor:
                        frequency === opt
                          ? theme.colors.primary
                          : theme.colors.inputBackground,
                      borderColor:
                        frequency === opt
                          ? theme.colors.primary
                          : theme.colors.border,
                    },
                  ]}
                  onPress={() => setFrequency(opt)}
                >
                  <Text
                    style={{
                      color: frequency === opt ? '#FFFFFF' : theme.colors.text,
                      fontSize: 14,
                      fontWeight: '600',
                    }}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={setStartDate}
              placeholder="MM/DD/YYYY"
            />
            <DatePicker
              label="End Date (Optional)"
              value={endDate}
              onChange={setEndDate}
              placeholder="MM/DD/YYYY"
              optional
            />
            <FormInput
              label="Notes"
              value={medNotes}
              onChangeText={setMedNotes}
              placeholder="Administration instructions, side effects, etc."
              multiline
              style={{ height: 80 }}
            />

            {editingId && (
              <Button
                title="Delete Medication"
                onPress={() => {
                  setModalMode('none');
                  handleDeleteMed(editingId);
                  resetForm();
                }}
                variant="danger"
                style={styles.deleteBtn}
                icon={<Ionicons name="trash" size={18} color="#FFFFFF" />}
              />
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  sectionAddBtn: {
    padding: 4,
  },
  emptyCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  emptyCardText: {
    fontSize: 15,
  },
  vetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  vetInfo: {
    flex: 1,
  },
  vetClinic: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  vetName: {
    fontSize: 15,
    marginBottom: 4,
  },
  vetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 12,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    flex: 1,
  },
  notesText: {
    fontSize: 13,
    marginTop: 12,
    fontStyle: 'italic',
  },
  medHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  medIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medInfo: {
    flex: 1,
    marginLeft: 12,
  },
  medName: {
    fontSize: 17,
    fontWeight: '700',
  },
  medDosage: {
    fontSize: 14,
    marginTop: 2,
  },
  frequencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
    marginTop: 4,
  },
  frequencyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  dateText: {
    fontSize: 13,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  modalHeaderBtn: {
    minWidth: 60,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  frequencyChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  deleteBtn: {
    marginTop: 16,
  },
});
