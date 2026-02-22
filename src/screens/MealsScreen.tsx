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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { generateId } from '../utils/generateId';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { Card } from '../components/Card';
import { FormInput } from '../components/FormInput';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { PetAvatarHeader } from '../components/PetAvatarHeader';

export function MealsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const {
    selectedPet,
    selectedPetId,
    meals,
    addMeal,
    updateMeal,
    deleteMeal,
    scheduleEvents,
  } = useData();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingMeal, setEditingMeal] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [mealType, setMealType] = useState<'meal' | 'treat'>('meal');
  const [brand, setBrand] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const petMeals = meals.filter((m) => m.petId === selectedPetId);
  const mealItems = petMeals.filter((m) => m.type === 'meal');
  const treatItems = petMeals.filter((m) => m.type === 'treat');

  const resetForm = () => {
    setName('');
    setMealType('meal');
    setBrand('');
    setAmount('');
    setNotes('');
    setEditingMeal(null);
  };

  const openAddModal = (type: 'meal' | 'treat' = 'meal') => {
    resetForm();
    setMealType(type);
    setModalVisible(true);
  };

  const openEditModal = (mealId: string) => {
    const meal = meals.find((m) => m.id === mealId);
    if (!meal) return;
    setEditingMeal(mealId);
    setName(meal.name);
    setMealType(meal.type);
    setBrand(meal.brand || '');
    setAmount(meal.amount || '');
    setNotes(meal.notes || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a name.');
      return;
    }

    try {
      const mealData = {
        id: editingMeal || generateId(),
        petId: selectedPetId!,
        name: name.trim(),
        type: mealType,
        brand: brand.trim() || undefined,
        amount: amount.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (editingMeal) {
        await updateMeal(mealData);
      } else {
        await addMeal(mealData);
      }

      setModalVisible(false);
      resetForm();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save meal.');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMeal(id),
      },
    ]);
  };

  // Find schedule events linked to each meal
  const getLinkedEvents = (mealId: string) =>
    scheduleEvents.filter((e) => e.linkedMealId === mealId);

  const formatTime = (t: string): string => {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  };

  if (!selectedPet) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <PetAvatarHeader
          title="Meals"
          onAddPet={() => navigation.navigate('HomeTab', { screen: 'AddPet' })}
        />
        <EmptyState
          icon="restaurant"
          title="No Pet Selected"
          subtitle="Add a pet first to manage their meals and treats."
          actionLabel="Add Pet"
          onAction={() => navigation.navigate('HomeTab', { screen: 'AddPet' })}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <PetAvatarHeader
        title="Meals"
        onAddPet={() => navigation.navigate('HomeTab', { screen: 'AddPet' })}
        rightAccessory={
          <TouchableOpacity onPress={() => openAddModal()} style={styles.addButton}>
            <Ionicons name="add-circle" size={28} color={theme.colors.primary} />
          </TouchableOpacity>
        }
      />

      {petMeals.length === 0 ? (
        <EmptyState
          icon="restaurant-outline"
          title="No Meals Yet"
          subtitle={`Track ${selectedPet.name}'s meals and favorite treats.`}
          actionLabel="Add Meal"
          onAction={() => openAddModal()}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Meals Section */}
          {mealItems.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: '#F59E0B20' }]}>
                  <Ionicons name="restaurant" size={18} color="#F59E0B" />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Meals
                </Text>
              </View>
              {mealItems.map((meal) => {
                const linked = getLinkedEvents(meal.id);
                return (
                  <TouchableOpacity
                    key={meal.id}
                    activeOpacity={0.7}
                    onPress={() => openEditModal(meal.id)}
                    onLongPress={() => handleDelete(meal.id)}
                  >
                    <Card>
                      <Text style={[styles.mealName, { color: theme.colors.text }]}>
                        {meal.name}
                      </Text>
                      {meal.brand && (
                        <Text style={[styles.mealDetail, { color: theme.colors.textSecondary }]}>
                          Brand: {meal.brand}
                        </Text>
                      )}
                      {meal.amount && (
                        <Text style={[styles.mealDetail, { color: theme.colors.textSecondary }]}>
                          Amount: {meal.amount}
                        </Text>
                      )}
                      {linked.length > 0 && (
                        <View style={styles.linkedTimes}>
                          <Ionicons
                            name="time-outline"
                            size={14}
                            color={theme.colors.textSecondary}
                          />
                          <Text
                            style={[
                              styles.linkedTimesText,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            {linked.map((e) => formatTime(e.time)).join(', ')}
                          </Text>
                        </View>
                      )}
                      {meal.notes && (
                        <Text
                          style={[styles.mealNotes, { color: theme.colors.textSecondary }]}
                          numberOfLines={2}
                        >
                          {meal.notes}
                        </Text>
                      )}
                    </Card>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* Treats Section */}
          {treatItems.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: '#EC489920' }]}>
                  <Ionicons name="heart" size={18} color="#EC4899" />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Treats
                </Text>
              </View>
              {treatItems.map((treat) => (
                <TouchableOpacity
                  key={treat.id}
                  activeOpacity={0.7}
                  onPress={() => openEditModal(treat.id)}
                  onLongPress={() => handleDelete(treat.id)}
                >
                  <Card>
                    <Text style={[styles.mealName, { color: theme.colors.text }]}>
                      {treat.name}
                    </Text>
                    {treat.brand && (
                      <Text style={[styles.mealDetail, { color: theme.colors.textSecondary }]}>
                        Brand: {treat.brand}
                      </Text>
                    )}
                    {treat.amount && (
                      <Text style={[styles.mealDetail, { color: theme.colors.textSecondary }]}>
                        Amount: {treat.amount}
                      </Text>
                    )}
                    {treat.notes && (
                      <Text
                        style={[styles.mealNotes, { color: theme.colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {treat.notes}
                      </Text>
                    )}
                  </Card>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Add Buttons */}
          <View style={styles.addButtonsRow}>
            <Button
              title="Add Meal"
              onPress={() => openAddModal('meal')}
              variant="secondary"
              style={styles.addItemBtn}
              icon={<Ionicons name="restaurant-outline" size={18} color={theme.colors.primary} />}
            />
            <Button
              title="Add Treat"
              onPress={() => openAddModal('treat')}
              variant="secondary"
              style={styles.addItemBtn}
              icon={<Ionicons name="heart-outline" size={18} color={theme.colors.primary} />}
            />
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => { setModalVisible(false); resetForm(); }}>
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                resetForm();
              }}
              style={styles.modalHeaderBtn}
            >
              <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {editingMeal ? 'Edit' : 'Add'} {mealType === 'meal' ? 'Meal' : 'Treat'}
            </Text>
            <TouchableOpacity onPress={handleSave} style={styles.modalHeaderBtn}>
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
            {/* Type Toggle */}
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
              Type
            </Text>
            <View style={styles.typeToggle}>
              <TouchableOpacity
                style={[
                  styles.typeToggleBtn,
                  styles.typeToggleBtnLeft,
                  {
                    backgroundColor:
                      mealType === 'meal'
                        ? theme.colors.primary
                        : theme.colors.inputBackground,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => setMealType('meal')}
              >
                <Ionicons
                  name="restaurant"
                  size={16}
                  color={mealType === 'meal' ? '#FFFFFF' : theme.colors.textSecondary}
                />
                <Text
                  style={{
                    color: mealType === 'meal' ? '#FFFFFF' : theme.colors.text,
                    fontWeight: '600',
                    marginLeft: 6,
                  }}
                >
                  Meal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeToggleBtn,
                  styles.typeToggleBtnRight,
                  {
                    backgroundColor:
                      mealType === 'treat'
                        ? theme.colors.primary
                        : theme.colors.inputBackground,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => setMealType('treat')}
              >
                <Ionicons
                  name="heart"
                  size={16}
                  color={mealType === 'treat' ? '#FFFFFF' : theme.colors.textSecondary}
                />
                <Text
                  style={{
                    color: mealType === 'treat' ? '#FFFFFF' : theme.colors.text,
                    fontWeight: '600',
                    marginLeft: 6,
                  }}
                >
                  Treat
                </Text>
              </TouchableOpacity>
            </View>

            <FormInput
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g., Kibble, Chicken Jerky"
            />

            <FormInput
              label="Brand"
              value={brand}
              onChangeText={setBrand}
              placeholder="e.g., Blue Buffalo"
            />

            <FormInput
              label="Amount / Serving Size"
              value={amount}
              onChangeText={setAmount}
              placeholder="e.g., 1 cup, 2 pieces"
            />

            <FormInput
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional details"
              multiline
              style={{ height: 80 }}
            />

            {editingMeal && (
              <Button
                title="Delete"
                onPress={() => {
                  setModalVisible(false);
                  handleDelete(editingMeal);
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
  addButton: {
    padding: 4,
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
  },
  mealName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  mealDetail: {
    fontSize: 14,
    marginTop: 2,
  },
  mealNotes: {
    fontSize: 13,
    marginTop: 6,
    fontStyle: 'italic',
  },
  linkedTimes: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  linkedTimesText: {
    fontSize: 13,
  },
  addButtonsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 16,
  },
  addItemBtn: {
    flex: 1,
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
  typeToggle: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  typeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
  },
  typeToggleBtnLeft: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderRightWidth: 0,
  },
  typeToggleBtnRight: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  deleteBtn: {
    marginTop: 16,
  },
});
