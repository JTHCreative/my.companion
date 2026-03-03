import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

/**
 * Firestore document shape: each pet document embeds all related data
 * to minimize read costs (1 collection listener instead of 5).
 *
 * Structure: users/{uid}/pets/{petId} → PetDocument
 */
interface PetDocument extends Pet {
  scheduleEvents: ScheduleEvent[];
  meals: Meal[];
  vetInfo: VetInfo[];
  medications: Medication[];
}

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

// Helper to get the pets collection reference for a user
function petsCollection(userId: string) {
  return collection(db, 'users', userId, 'pets');
}

// Helper to get a specific pet document reference
function petDoc(userId: string, petId: string) {
  return doc(db, 'users', userId, 'pets', petId);
}

// Extract Pet fields from a PetDocument (strip embedded arrays)
function extractPet(petDoc: PetDocument): Pet {
  const { scheduleEvents, meals, vetInfo, medications, ...pet } = petDoc;
  return pet;
}

// Write a full PetDocument to Firestore
async function writePetDoc(userId: string, petDocument: PetDocument): Promise<void> {
  await setDoc(petDoc(userId, petDocument.id), petDocument);
}

// Migrate existing AsyncStorage data to the embedded Firestore structure.
// Uses a global flag — the legacy data was never user-scoped, so it should
// only ever be migrated once (to whichever user first logs in after the
// Firestore upgrade). Every subsequent user starts with a blank slate.
async function migrateAsyncStorageToFirestore(userId: string): Promise<void> {
  const globalKey = ASYNC_KEYS.migrated;
  const alreadyMigrated = await AsyncStorage.getItem(globalKey);
  if (alreadyMigrated === 'true') return;

  // Also clear any stale legacy data keys unconditionally so no future
  // user can ever inherit them, even if the batch write below is skipped.
  const [petsRaw, eventsRaw, mealsRaw, vetsRaw, medsRaw] = await Promise.all([
    AsyncStorage.getItem(ASYNC_KEYS.pets),
    AsyncStorage.getItem(ASYNC_KEYS.scheduleEvents),
    AsyncStorage.getItem(ASYNC_KEYS.meals),
    AsyncStorage.getItem(ASYNC_KEYS.vetInfo),
    AsyncStorage.getItem(ASYNC_KEYS.medications),
  ]);

  // Clear legacy keys immediately — regardless of whether we migrate
  await Promise.all([
    AsyncStorage.removeItem(ASYNC_KEYS.pets),
    AsyncStorage.removeItem(ASYNC_KEYS.scheduleEvents),
    AsyncStorage.removeItem(ASYNC_KEYS.meals),
    AsyncStorage.removeItem(ASYNC_KEYS.vetInfo),
    AsyncStorage.removeItem(ASYNC_KEYS.medications),
  ]);

  const pets: Pet[] = petsRaw ? JSON.parse(petsRaw) : [];
  const events: ScheduleEvent[] = eventsRaw ? JSON.parse(eventsRaw) : [];
  const meals: Meal[] = mealsRaw ? JSON.parse(mealsRaw) : [];
  const vets: VetInfo[] = vetsRaw ? JSON.parse(vetsRaw) : [];
  const meds: Medication[] = medsRaw ? JSON.parse(medsRaw) : [];

  const hasData = pets.length > 0 || events.length > 0 || meals.length > 0 || vets.length > 0 || meds.length > 0;
  if (hasData) {
    const batch = writeBatch(db);
    for (const pet of pets) {
      const petDocument: PetDocument = {
        ...pet,
        scheduleEvents: events.filter((e) => e.petId === pet.id),
        meals: meals.filter((m) => m.petId === pet.id),
        vetInfo: vets.filter((v) => v.petId === pet.id),
        medications: meds.filter((m) => m.petId === pet.id),
      };
      batch.set(petDoc(userId, pet.id), petDocument);
    }
    await batch.commit();
  }

  await AsyncStorage.setItem(globalKey, 'true');
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [petDocs, setPetDocs] = useState<PetDocument[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [petSelectorOpen, setPetSelectorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Cleanup previous listener
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    if (!user) {
      setPetDocs([]);
      setSelectedPetId(null);
      AsyncStorage.removeItem(ASYNC_KEYS.selectedPetId);
      setLoading(false);
      return;
    }

    const userId = user.uid;
    let isMounted = true;

    async function init() {
      // Only run legacy migration for accounts that existed before the
      // Firestore upgrade. Brand-new accounts (created within the last
      // 60 s) have nothing to migrate — skip and mark done so the
      // migration never runs for them.
      const createdAt = user.metadata.creationTime
        ? new Date(user.metadata.creationTime).getTime()
        : 0;
      const isNewAccount = Date.now() - createdAt < 60_000;

      if (isNewAccount) {
        // Ensure migration is permanently skipped for this install
        await AsyncStorage.setItem(ASYNC_KEYS.migrated, 'true');
      } else {
        await migrateAsyncStorageToFirestore(userId);
      }

      // Load selectedPetId from local storage (UI preference)
      const savedSelectedId = await AsyncStorage.getItem(ASYNC_KEYS.selectedPetId);
      if (isMounted && savedSelectedId) {
        setSelectedPetId(savedSelectedId);
      }

      // Single real-time listener on the pets collection
      let isFirstSnapshot = true;
      unsubRef.current = onSnapshot(query(petsCollection(userId)), (snapshot) => {
        if (!isMounted) return;
        const docs = snapshot.docs
          .map((d) => ({ ...d.data(), id: d.id } as PetDocument))
          .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
        setPetDocs(docs);
        if (isFirstSnapshot) {
          isFirstSnapshot = false;
          setLoading(false);
        }
      });
    }

    setLoading(true);
    init();

    return () => {
      isMounted = false;
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [user]);

  // Derive flat arrays from embedded PetDocuments (same API for consumers)
  const pets = useMemo(() => petDocs.map(extractPet), [petDocs]);

  const scheduleEvents = useMemo(
    () => petDocs.flatMap((d) => d.scheduleEvents ?? []),
    [petDocs]
  );

  const meals = useMemo(
    () => petDocs.flatMap((d) => d.meals ?? []),
    [petDocs]
  );

  const vetInfo = useMemo(
    () => petDocs.flatMap((d) => d.vetInfo ?? []),
    [petDocs]
  );

  const medications = useMemo(
    () => petDocs.flatMap((d) => d.medications ?? []),
    [petDocs]
  );

  const selectedPet = useMemo(
    () => pets.find((p) => p.id === selectedPetId) || null,
    [pets, selectedPetId]
  );

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

  // Helper: find a PetDocument by id from current state
  const findPetDoc = useCallback(
    (petId: string): PetDocument | undefined => petDocs.find((d) => d.id === petId),
    [petDocs]
  );

  // --- Pet CRUD ---

  const addPet = useCallback(async (pet: Pet) => {
    if (!user) return;
    const newDoc: PetDocument = {
      ...pet,
      scheduleEvents: [],
      meals: [],
      vetInfo: [],
      medications: [],
    };
    await writePetDoc(user.uid, newDoc);
    if (!selectedPetId) {
      setSelectedPetId(pet.id);
      await AsyncStorage.setItem(ASYNC_KEYS.selectedPetId, pet.id);
    }
  }, [user, selectedPetId]);

  const updatePet = useCallback(async (pet: Pet) => {
    if (!user) return;
    const existing = findPetDoc(pet.id);
    if (!existing) return;
    const updated: PetDocument = {
      ...existing,
      ...pet,
    };
    await writePetDoc(user.uid, updated);
  }, [user, findPetDoc]);

  const deletePet = useCallback(async (id: string) => {
    if (!user) return;
    // Single document delete — no cascading needed
    await deleteDoc(petDoc(user.uid, id));
    if (selectedPetId === id) {
      setSelectedPetId(null);
      await AsyncStorage.removeItem(ASYNC_KEYS.selectedPetId);
    }
  }, [user, selectedPetId]);

  // --- Schedule CRUD ---

  const addScheduleEvent = useCallback(async (event: ScheduleEvent) => {
    if (!user) return;
    const existing = findPetDoc(event.petId);
    if (!existing) return;
    const updated: PetDocument = {
      ...existing,
      scheduleEvents: [...existing.scheduleEvents, event],
    };
    await writePetDoc(user.uid, updated);
  }, [user, findPetDoc]);

  const updateScheduleEvent = useCallback(async (event: ScheduleEvent) => {
    if (!user) return;
    const existing = findPetDoc(event.petId);
    if (!existing) return;
    const updated: PetDocument = {
      ...existing,
      scheduleEvents: existing.scheduleEvents.map((e) => (e.id === event.id ? event : e)),
    };
    await writePetDoc(user.uid, updated);
  }, [user, findPetDoc]);

  const deleteScheduleEvent = useCallback(async (id: string) => {
    if (!user) return;
    const ownerDoc = petDocs.find((d) => d.scheduleEvents.some((e) => e.id === id));
    if (!ownerDoc) return;
    const updated: PetDocument = {
      ...ownerDoc,
      scheduleEvents: ownerDoc.scheduleEvents.filter((e) => e.id !== id),
    };
    await writePetDoc(user.uid, updated);
  }, [user, petDocs]);

  // --- Meal CRUD ---

  const addMeal = useCallback(async (meal: Meal) => {
    if (!user) return;
    const existing = findPetDoc(meal.petId);
    if (!existing) return;
    const updated: PetDocument = {
      ...existing,
      meals: [...existing.meals, meal],
    };
    await writePetDoc(user.uid, updated);
  }, [user, findPetDoc]);

  const updateMeal = useCallback(async (meal: Meal) => {
    if (!user) return;
    const existing = findPetDoc(meal.petId);
    if (!existing) return;
    const updated: PetDocument = {
      ...existing,
      meals: existing.meals.map((m) => (m.id === meal.id ? meal : m)),
    };
    await writePetDoc(user.uid, updated);
  }, [user, findPetDoc]);

  const deleteMeal = useCallback(async (id: string) => {
    if (!user) return;
    const ownerDoc = petDocs.find((d) => d.meals.some((m) => m.id === id));
    if (!ownerDoc) return;
    const updated: PetDocument = {
      ...ownerDoc,
      meals: ownerDoc.meals.filter((m) => m.id !== id),
    };
    await writePetDoc(user.uid, updated);
  }, [user, petDocs]);

  // --- Vet CRUD ---

  const addVetInfo = useCallback(async (vet: VetInfo) => {
    if (!user) return;
    const existing = findPetDoc(vet.petId);
    if (!existing) return;
    const updated: PetDocument = {
      ...existing,
      vetInfo: [...existing.vetInfo, vet],
    };
    await writePetDoc(user.uid, updated);
  }, [user, findPetDoc]);

  const updateVetInfo = useCallback(async (vet: VetInfo) => {
    if (!user) return;
    const existing = findPetDoc(vet.petId);
    if (!existing) return;
    const updated: PetDocument = {
      ...existing,
      vetInfo: existing.vetInfo.map((v) => (v.id === vet.id ? vet : v)),
    };
    await writePetDoc(user.uid, updated);
  }, [user, findPetDoc]);

  const deleteVetInfo = useCallback(async (id: string) => {
    if (!user) return;
    const ownerDoc = petDocs.find((d) => d.vetInfo.some((v) => v.id === id));
    if (!ownerDoc) return;
    const updated: PetDocument = {
      ...ownerDoc,
      vetInfo: ownerDoc.vetInfo.filter((v) => v.id !== id),
    };
    await writePetDoc(user.uid, updated);
  }, [user, petDocs]);

  // --- Medication CRUD ---

  const addMedication = useCallback(async (med: Medication) => {
    if (!user) return;
    const existing = findPetDoc(med.petId);
    if (!existing) return;
    const updated: PetDocument = {
      ...existing,
      medications: [...existing.medications, med],
    };
    await writePetDoc(user.uid, updated);
  }, [user, findPetDoc]);

  const updateMedication = useCallback(async (med: Medication) => {
    if (!user) return;
    const existing = findPetDoc(med.petId);
    if (!existing) return;
    const updated: PetDocument = {
      ...existing,
      medications: existing.medications.map((m) => (m.id === med.id ? med : m)),
    };
    await writePetDoc(user.uid, updated);
  }, [user, findPetDoc]);

  const deleteMedication = useCallback(async (id: string) => {
    if (!user) return;
    const ownerDoc = petDocs.find((d) => d.medications.some((m) => m.id === id));
    if (!ownerDoc) return;
    const updated: PetDocument = {
      ...ownerDoc,
      medications: ownerDoc.medications.filter((m) => m.id !== id),
    };
    await writePetDoc(user.uid, updated);
  }, [user, petDocs]);

  // --- Import ---

  const importPetData = useCallback(async (data: SharedPetData): Promise<string> => {
    if (!user) throw new Error('Must be signed in to import pet data');
    const petId = generateId();

    const newDoc: PetDocument = {
      ...data.pet,
      id: petId,
      profileImage: null,
      scheduleEvents: data.scheduleEvents.map((e) => ({ ...e, id: generateId(), petId })),
      meals: data.meals.map((m) => ({ ...m, id: generateId(), petId })),
      vetInfo: data.vetInfo.map((v) => ({ ...v, id: generateId(), petId })),
      medications: data.medications.map((m) => ({ ...m, id: generateId(), petId })),
    };

    // Single document write instead of a batch across 5 collections
    await writePetDoc(user.uid, newDoc);

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
