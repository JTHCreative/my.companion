import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  query,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { Pet, ScheduleEvent, Meal, VetInfo, Medication, SharedPetData } from '../types';
import { generateId } from '../utils/generateId';

interface DataContextValue {
  pets: Pet[];
  selectedPetId: string | null;
  selectedPet: Pet | null;
  selectPet: (id: string) => void;
  addPet: (pet: Pet) => Promise<void>;
  updatePet: (pet: Pet) => Promise<void>;
  deletePet: (id: string) => Promise<void>;

  scheduleEvents: ScheduleEvent[];
  addScheduleEvent: (event: ScheduleEvent) => Promise<void>;
  updateScheduleEvent: (event: ScheduleEvent) => Promise<void>;
  deleteScheduleEvent: (id: string) => Promise<void>;

  meals: Meal[];
  addMeal: (meal: Meal) => Promise<void>;
  updateMeal: (meal: Meal) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;

  vetInfo: VetInfo[];
  addVetInfo: (vet: VetInfo) => Promise<void>;
  updateVetInfo: (vet: VetInfo) => Promise<void>;
  deleteVetInfo: (id: string) => Promise<void>;

  medications: Medication[];
  addMedication: (med: Medication) => Promise<void>;
  updateMedication: (med: Medication) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;

  importPetData: (data: SharedPetData) => Promise<string>;

  petSelectorOpen: boolean;
  setPetSelectorOpen: (open: boolean) => void;

  loading: boolean;
}

const DataContext = createContext<DataContextValue>({} as DataContextValue);

// AsyncStorage keys (used for migration and local preferences)
const ASYNC_KEYS = {
  pets: 'companion_pets',
  scheduleEvents: 'companion_schedule',
  meals: 'companion_meals',
  vetInfo: 'companion_vets',
  medications: 'companion_medications',
  selectedPetId: 'companion_selected_pet',
  migrated: 'companion_firestore_migrated',
};

// Helper to get a user-scoped Firestore collection reference
function userCollection(userId: string, collectionName: string) {
  return collection(db, 'users', userId, collectionName);
}

// Helper to get a user-scoped Firestore document reference
function userDoc(userId: string, collectionName: string, docId: string) {
  return doc(db, 'users', userId, collectionName, docId);
}

// Migrate existing AsyncStorage data to Firestore for a user
async function migrateAsyncStorageToFirestore(userId: string): Promise<void> {
  const migrationKey = `${ASYNC_KEYS.migrated}_${userId}`;
  const alreadyMigrated = await AsyncStorage.getItem(migrationKey);
  if (alreadyMigrated === 'true') return;

  const [petsRaw, eventsRaw, mealsRaw, vetsRaw, medsRaw] = await Promise.all([
    AsyncStorage.getItem(ASYNC_KEYS.pets),
    AsyncStorage.getItem(ASYNC_KEYS.scheduleEvents),
    AsyncStorage.getItem(ASYNC_KEYS.meals),
    AsyncStorage.getItem(ASYNC_KEYS.vetInfo),
    AsyncStorage.getItem(ASYNC_KEYS.medications),
  ]);

  const pets: Pet[] = petsRaw ? JSON.parse(petsRaw) : [];
  const events: ScheduleEvent[] = eventsRaw ? JSON.parse(eventsRaw) : [];
  const meals: Meal[] = mealsRaw ? JSON.parse(mealsRaw) : [];
  const vets: VetInfo[] = vetsRaw ? JSON.parse(vetsRaw) : [];
  const meds: Medication[] = medsRaw ? JSON.parse(medsRaw) : [];

  const hasData = pets.length > 0 || events.length > 0 || meals.length > 0 || vets.length > 0 || meds.length > 0;
  if (!hasData) {
    await AsyncStorage.setItem(migrationKey, 'true');
    return;
  }

  // Batch write all data to Firestore
  const batch = writeBatch(db);

  for (const pet of pets) {
    batch.set(userDoc(userId, 'pets', pet.id), pet);
  }
  for (const event of events) {
    batch.set(userDoc(userId, 'scheduleEvents', event.id), event);
  }
  for (const meal of meals) {
    batch.set(userDoc(userId, 'meals', meal.id), meal);
  }
  for (const vet of vets) {
    batch.set(userDoc(userId, 'vetInfo', vet.id), vet);
  }
  for (const med of meds) {
    batch.set(userDoc(userId, 'medications', med.id), med);
  }

  await batch.commit();
  await AsyncStorage.setItem(migrationKey, 'true');
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [vetInfo, setVetInfo] = useState<VetInfo[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [petSelectorOpen, setPetSelectorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const unsubscribesRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    // Cleanup previous listeners
    unsubscribesRef.current.forEach((unsub) => unsub());
    unsubscribesRef.current = [];

    if (!user) {
      setPets([]);
      setScheduleEvents([]);
      setMeals([]);
      setVetInfo([]);
      setMedications([]);
      setSelectedPetId(null);
      setLoading(false);
      return;
    }

    const userId = user.uid;
    let isMounted = true;

    async function init() {
      // Migrate any existing local data first
      await migrateAsyncStorageToFirestore(userId);

      // Load selectedPetId from local storage (UI preference)
      const savedSelectedId = await AsyncStorage.getItem(ASYNC_KEYS.selectedPetId);
      if (isMounted && savedSelectedId) {
        setSelectedPetId(savedSelectedId);
      }

      // Set up real-time Firestore listeners
      const unsubs: (() => void)[] = [];

      let initialLoads = 5;
      const checkReady = () => {
        initialLoads--;
        if (initialLoads === 0 && isMounted) {
          setLoading(false);
        }
      };

      unsubs.push(
        onSnapshot(query(userCollection(userId, 'pets')), (snapshot) => {
          if (!isMounted) return;
          const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Pet));
          setPets(data);
          checkReady();
        })
      );

      unsubs.push(
        onSnapshot(query(userCollection(userId, 'scheduleEvents')), (snapshot) => {
          if (!isMounted) return;
          const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ScheduleEvent));
          setScheduleEvents(data);
          checkReady();
        })
      );

      unsubs.push(
        onSnapshot(query(userCollection(userId, 'meals')), (snapshot) => {
          if (!isMounted) return;
          const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Meal));
          setMeals(data);
          checkReady();
        })
      );

      unsubs.push(
        onSnapshot(query(userCollection(userId, 'vetInfo')), (snapshot) => {
          if (!isMounted) return;
          const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as VetInfo));
          setVetInfo(data);
          checkReady();
        })
      );

      unsubs.push(
        onSnapshot(query(userCollection(userId, 'medications')), (snapshot) => {
          if (!isMounted) return;
          const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Medication));
          setMedications(data);
          checkReady();
        })
      );

      unsubscribesRef.current = unsubs;
    }

    setLoading(true);
    init();

    return () => {
      isMounted = false;
      unsubscribesRef.current.forEach((unsub) => unsub());
      unsubscribesRef.current = [];
    };
  }, [user]);

  const selectedPet = pets.find((p) => p.id === selectedPetId) || null;

  // Auto-select first pet if none selected
  useEffect(() => {
    if (!loading && pets.length > 0 && !selectedPetId) {
      setSelectedPetId(pets[0].id);
      AsyncStorage.setItem(ASYNC_KEYS.selectedPetId, pets[0].id);
    }
  }, [loading, pets, selectedPetId]);

  const selectPet = useCallback((id: string) => {
    setSelectedPetId(id);
    AsyncStorage.setItem(ASYNC_KEYS.selectedPetId, id);
  }, []);

  // Pet CRUD
  const addPet = useCallback(async (pet: Pet) => {
    if (!user) return;
    await setDoc(userDoc(user.uid, 'pets', pet.id), pet);
    if (!selectedPetId) {
      setSelectedPetId(pet.id);
      await AsyncStorage.setItem(ASYNC_KEYS.selectedPetId, pet.id);
    }
  }, [user, selectedPetId]);

  const updatePet = useCallback(async (pet: Pet) => {
    if (!user) return;
    await setDoc(userDoc(user.uid, 'pets', pet.id), pet);
  }, [user]);

  const deletePet = useCallback(async (id: string) => {
    if (!user) return;
    const userId = user.uid;

    // Delete the pet and all associated data
    const batch = writeBatch(db);
    batch.delete(userDoc(userId, 'pets', id));

    // Delete associated schedule events
    const eventsToDelete = scheduleEvents.filter((e) => e.petId === id);
    for (const event of eventsToDelete) {
      batch.delete(userDoc(userId, 'scheduleEvents', event.id));
    }

    // Delete associated meals
    const mealsToDelete = meals.filter((m) => m.petId === id);
    for (const meal of mealsToDelete) {
      batch.delete(userDoc(userId, 'meals', meal.id));
    }

    // Delete associated vet info
    const vetsToDelete = vetInfo.filter((v) => v.petId === id);
    for (const vet of vetsToDelete) {
      batch.delete(userDoc(userId, 'vetInfo', vet.id));
    }

    // Delete associated medications
    const medsToDelete = medications.filter((m) => m.petId === id);
    for (const med of medsToDelete) {
      batch.delete(userDoc(userId, 'medications', med.id));
    }

    await batch.commit();

    if (selectedPetId === id) {
      setSelectedPetId(null);
      await AsyncStorage.removeItem(ASYNC_KEYS.selectedPetId);
    }
  }, [user, selectedPetId, scheduleEvents, meals, vetInfo, medications]);

  // Schedule CRUD
  const addScheduleEvent = useCallback(async (event: ScheduleEvent) => {
    if (!user) return;
    await setDoc(userDoc(user.uid, 'scheduleEvents', event.id), event);
  }, [user]);

  const updateScheduleEvent = useCallback(async (event: ScheduleEvent) => {
    if (!user) return;
    await setDoc(userDoc(user.uid, 'scheduleEvents', event.id), event);
  }, [user]);

  const deleteScheduleEvent = useCallback(async (id: string) => {
    if (!user) return;
    await deleteDoc(userDoc(user.uid, 'scheduleEvents', id));
  }, [user]);

  // Meal CRUD
  const addMeal = useCallback(async (meal: Meal) => {
    if (!user) return;
    await setDoc(userDoc(user.uid, 'meals', meal.id), meal);
  }, [user]);

  const updateMeal = useCallback(async (meal: Meal) => {
    if (!user) return;
    await setDoc(userDoc(user.uid, 'meals', meal.id), meal);
  }, [user]);

  const deleteMeal = useCallback(async (id: string) => {
    if (!user) return;
    await deleteDoc(userDoc(user.uid, 'meals', id));
  }, [user]);

  // Vet CRUD
  const addVetInfo = useCallback(async (vet: VetInfo) => {
    if (!user) return;
    await setDoc(userDoc(user.uid, 'vetInfo', vet.id), vet);
  }, [user]);

  const updateVetInfo = useCallback(async (vet: VetInfo) => {
    if (!user) return;
    await setDoc(userDoc(user.uid, 'vetInfo', vet.id), vet);
  }, [user]);

  const deleteVetInfo = useCallback(async (id: string) => {
    if (!user) return;
    await deleteDoc(userDoc(user.uid, 'vetInfo', id));
  }, [user]);

  // Medication CRUD
  const addMedication = useCallback(async (med: Medication) => {
    if (!user) return;
    await setDoc(userDoc(user.uid, 'medications', med.id), med);
  }, [user]);

  const updateMedication = useCallback(async (med: Medication) => {
    if (!user) return;
    await setDoc(userDoc(user.uid, 'medications', med.id), med);
  }, [user]);

  const deleteMedication = useCallback(async (id: string) => {
    if (!user) return;
    await deleteDoc(userDoc(user.uid, 'medications', id));
  }, [user]);

  // Import a shared pet's full data
  const importPetData = useCallback(async (data: SharedPetData): Promise<string> => {
    if (!user) throw new Error('Must be signed in to import pet data');
    const userId = user.uid;
    const petId = generateId();

    const newPet: Pet = {
      ...data.pet,
      id: petId,
      profileImage: null,
    };

    const newEvents: ScheduleEvent[] = data.scheduleEvents.map((e) => ({
      ...e,
      id: generateId(),
      petId,
    }));

    const newMeals: Meal[] = data.meals.map((m) => ({
      ...m,
      id: generateId(),
      petId,
    }));

    const newVets: VetInfo[] = data.vetInfo.map((v) => ({
      ...v,
      id: generateId(),
      petId,
    }));

    const newMeds: Medication[] = data.medications.map((med) => ({
      ...med,
      id: generateId(),
      petId,
    }));

    const batch = writeBatch(db);
    batch.set(userDoc(userId, 'pets', newPet.id), newPet);
    for (const event of newEvents) {
      batch.set(userDoc(userId, 'scheduleEvents', event.id), event);
    }
    for (const meal of newMeals) {
      batch.set(userDoc(userId, 'meals', meal.id), meal);
    }
    for (const vet of newVets) {
      batch.set(userDoc(userId, 'vetInfo', vet.id), vet);
    }
    for (const med of newMeds) {
      batch.set(userDoc(userId, 'medications', med.id), med);
    }

    await batch.commit();

    // Auto-select the newly imported pet
    setSelectedPetId(petId);
    await AsyncStorage.setItem(ASYNC_KEYS.selectedPetId, petId);

    return petId;
  }, [user]);

  return (
    <DataContext.Provider
      value={{
        pets,
        selectedPetId,
        selectedPet,
        selectPet,
        addPet,
        updatePet,
        deletePet,
        scheduleEvents,
        addScheduleEvent,
        updateScheduleEvent,
        deleteScheduleEvent,
        meals,
        addMeal,
        updateMeal,
        deleteMeal,
        vetInfo,
        addVetInfo,
        updateVetInfo,
        deleteVetInfo,
        medications,
        addMedication,
        updateMedication,
        deleteMedication,
        importPetData,
        petSelectorOpen,
        setPetSelectorOpen,
        loading,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
