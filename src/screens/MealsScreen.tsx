import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { generateId } from '../utils/generateId';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { Ingredient } from '../types';
import { Card } from '../components/Card';
import { FormInput } from '../components/FormInput';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { PetAvatarHeader } from '../components/PetAvatarHeader';

export function MealsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    selectedPet,
    selectedPetId,
    meals,
    addMeal,
    updateMeal,
    deleteMeal,
    scheduleEvents,
    isOwner,
  } = useData();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingMeal, setEditingMeal] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [mealType, setMealType] = useState<'meal' | 'treat'>('meal');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [notes, setNotes] = useState('');

  const petMeals = useMemo(
    () => meals.filter((m) => m.petId === selectedPetId),
    [meals, selectedPetId]
  );
  const mealItems = useMemo(
    () => petMeals.filter((m) => m.type === 'meal'),
    [petMeals]
  );
  const treatItems = useMemo(
    () => petMeals.filter((m) => m.type === 'treat'),
    [petMeals]
  );

  const resetForm = () => {
    setName('');
    setMealType('meal');
    setIngredients([]);
    setNotes('');
    setEditingMeal(null);
  };

  const addIngredient = () => {
    setIngredients((prev) => [...prev, { name: '', quantity: '', brand: '' }]);
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing))
    );
  };

  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
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
    setIngredients(meal.ingredients || []);
    setNotes(meal.notes || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a name.');
      return;
    }

    try {
      const filteredIngredients = ingredients
        .filter((ing) => ing.name.trim())
        .map((ing) => ({
          name: ing.name.trim(),
          quantity: ing.quantity.trim(),
          brand: ing.brand?.trim() || undefined,
        }));

      const mealData = {
        id: editingMeal || generateId(),
        petId: selectedPetId!,
        name: name.trim(),
        type: mealType,
        ingredients: filteredIngredients.length > 0 ? filteredIngredients : undefined,
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

  const handleCopyMeal = async (mealId: string) => {
    const meal = meals.find((m) => m.id === mealId);
    if (!meal) return;
    try {
      const copiedMeal = {
        ...meal,
        id: generateId(),
        name: `${meal.name} (Copy)`,
        ingredients: meal.ingredients?.map((ing) => ({ ...ing })),
      };
      await addMeal(copiedMeal);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to copy meal.');
    }
  };

  // Pre-build a map of mealId → linked schedule events for O(1) lookup
  const linkedEventsMap = useMemo(() => {
    const map = new Map<string, typeof scheduleEvents>();
    for (const e of scheduleEvents) {
      if (e.linkedMealId) {
        const existing = map.get(e.linkedMealId) || [];
        existing.push(e);
        map.set(e.linkedMealId, existing);
      }
    }
    return map;
  }, [scheduleEvents]);

  const getLinkedEvents = useCallback(
    (mealId: string) => linkedEventsMap.get(mealId) || [],
    [linkedEventsMap]
  );

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
          onAddPet={() => navigation.navigate('AddPetChoice')}
        />
        <View style={{ flex: 1, paddingBottom: 80 }}>
          <EmptyState
            icon="restaurant"
            title="No Pet Selected"
            subtitle="Add a pet first to manage their meals and treats."
            actionLabel="Add Pet"
            onAction={() => navigation.navigate('AddPetChoice')}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <PetAvatarHeader
        title="Meals"
        onAddPet={() => navigation.navigate('AddPetChoice')}
        rightAccessory={
          isOwner ? (
            <TouchableOpacity onPress={() => openAddModal()} style={styles.addButton}>
              <Ionicons name="add-circle" size={28} color={theme.colors.primary} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {petMeals.length === 0 ? (
        <EmptyState
          icon="restaurant-outline"
          title="No Meals Yet"
          subtitle={isOwner ? `Track ${selectedPet.name}'s meals and favorite treats.` : `${selectedPet.name}'s meals will appear here.`}
          actionLabel={isOwner ? "Add Meal" : undefined}
          onAction={isOwner ? () => openAddModal() : undefined}
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
                    activeOpacity={isOwner ? 0.7 : 1}
                    onPress={isOwner ? () => openEditModal(meal.id) : undefined}
                    onLongPress={isOwner ? () => handleDelete(meal.id) : undefined}
                  >
                    <Card>
                      <View style={styles.mealCardHeader}>
                        <Text style={[styles.mealName, styles.mealNameFlex, { color: theme.colors.text }]}>
                          {meal.name}
                        </Text>
                        {isOwner && (
                          <TouchableOpacity
                            onPress={() => handleCopyMeal(meal.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={styles.copyBtn}
                          >
                            <Ionicons name="copy-outline" size={18} color={theme.colors.textSecondary} />
                          </TouchableOpacity>
                        )}
                      </View>
                      {meal.ingredients && meal.ingredients.length > 0 && (
                        <View style={styles.ingredientsList}>
                          {meal.ingredients.map((ing, idx) => (
                            <View key={idx} style={[styles.ingredientChip, { backgroundColor: theme.colors.inputBackground }]}>
                              <Text style={[styles.ingredientChipText, { color: theme.colors.text }]}>
                                {ing.name}{ing.quantity ? ` (${ing.quantity})` : ''}{ing.brand ? ` — ${ing.brand}` : ''}
                              </Text>
                            </View>
                          ))}
                        </View>
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
                  activeOpacity={isOwner ? 0.7 : 1}
                  onPress={isOwner ? () => openEditModal(treat.id) : undefined}
                  onLongPress={isOwner ? () => handleDelete(treat.id) : undefined}
                >
                  <Card>
                    <View style={styles.mealCardHeader}>
                      <Text style={[styles.mealName, styles.mealNameFlex, { color: theme.colors.text }]}>
                        {treat.name}
                      </Text>
                      {isOwner && (
                        <TouchableOpacity
                          onPress={() => handleCopyMeal(treat.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={styles.copyBtn}
                        >
                          <Ionicons name="copy-outline" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                      )}
                    </View>
                    {treat.ingredients && treat.ingredients.length > 0 && (
                      <View style={styles.ingredientsList}>
                        {treat.ingredients.map((ing, idx) => (
                          <View key={idx} style={[styles.ingredientChip, { backgroundColor: theme.colors.inputBackground }]}>
                            <Text style={[styles.ingredientChipText, { color: theme.colors.text }]}>
                              {ing.name}{ing.quantity ? ` (${ing.quantity})` : ''}{ing.brand ? ` — ${ing.brand}` : ''}
                            </Text>
                          </View>
                        ))}
                      </View>
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

          {/* Add Buttons (owner only) */}
          {isOwner && (
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
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => { setModalVisible(false); resetForm(); }}>
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}
          behavior="padding"
        >
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border, paddingTop: insets.top + 16 }]}>
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
            keyboardShouldPersistTaps="handled"
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

            {/* Ingredients Section */}
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
              Ingredients
            </Text>
            {ingredients.map((ing, index) => (
              <View
                key={index}
                style={[
                  styles.ingredientCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <View style={styles.ingredientCardHeader}>
                  <View
                    style={[
                      styles.ingredientNumber,
                      { backgroundColor: theme.colors.primary + '18' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.ingredientNumberText,
                        { color: theme.colors.primary },
                      ]}
                    >
                      {index + 1}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.ingredientCardTitle,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Ingredient {index + 1}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeIngredient(index)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={22} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
                <View style={styles.ingredientCardBody}>
                  <View style={styles.ingredientInputs}>
                    <FormInput
                      label="Name"
                      value={ing.name}
                      onChangeText={(val: string) => updateIngredient(index, 'name', val)}
                      placeholder="e.g., Chicken Breast"
                      containerStyle={styles.ingredientNameInput}
                    />
                    <FormInput
                      label="Quantity"
                      value={ing.quantity}
                      onChangeText={(val: string) => updateIngredient(index, 'quantity', val)}
                      placeholder="e.g., 2/3 cup"
                      containerStyle={styles.ingredientQtyInput}
                    />
                  </View>
                  <FormInput
                    label="Brand"
                    value={ing.brand || ''}
                    onChangeText={(val: string) => updateIngredient(index, 'brand', val)}
                    placeholder="e.g., Blue Buffalo"
                    containerStyle={styles.ingredientBrandInput}
                  />
                </View>
              </View>
            ))}
            <TouchableOpacity
              onPress={addIngredient}
              style={[styles.addIngredientBtn, { borderColor: theme.colors.border }]}
            >
              <Ionicons name="add" size={18} color={theme.colors.primary} />
              <Text style={{ color: theme.colors.primary, fontWeight: '600', marginLeft: 4 }}>
                Add Ingredient
              </Text>
            </TouchableOpacity>

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

            <View style={{ height: 40 + insets.bottom }} />
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
  mealCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  mealName: {
    fontSize: 17,
    fontWeight: '700',
  },
  mealNameFlex: {
    flex: 1,
  },
  copyBtn: {
    padding: 4,
    marginLeft: 8,
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
  ingredientsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  ingredientChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  ingredientChipText: {
    fontSize: 13,
  },
  ingredientCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  ingredientCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ingredientNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  ingredientNumberText: {
    fontSize: 13,
    fontWeight: '700',
  },
  ingredientCardTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  ingredientCardBody: {},
  ingredientInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  ingredientNameInput: {
    flex: 2,
    marginBottom: 8,
  },
  ingredientQtyInput: {
    flex: 1,
    marginBottom: 8,
  },
  ingredientBrandInput: {
    marginBottom: 0,
  },
  addIngredientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    marginBottom: 16,
  },
});
