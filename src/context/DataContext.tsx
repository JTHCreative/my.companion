import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  writeBatch,
  query,
  where,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { Pet, ScheduleEvent, Meal, VetInfo, Medication, Message, SharedPetPreview } from '../types';
import { generateId } from '../utils/generateId';
import { generateShareCode } from '../utils/shareUtils';

/**
 * Firestore document shape: each pet document embeds all related data
 * to minimize read costs (1 collection listener instead of 5).
 *
 * Structure: pets/{petId} → PetDocument
 * Queried by: where('members', 'array-contains', uid)
 */
interface PetDocument extends Pet {
  ownerUid: string;
  members: string[];
  shareCode?: string;
  scheduleEvents: ScheduleEvent[];
  meals: Meal[];
  vetInfo: VetInfo[];
  medications: Medication[];
  messages: Message[];
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

  messages: Message[];
  addMessage: (msg: Message) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  togglePinMessage: (id: string, pinned: boolean) => Promise<void>;
  cleanupOldMessages: () => Promise<void>;

  createShareLink: (petId: string) => Promise<string>;
  lookupShareCode: (code: string) => Promise<SharedPetPreview | null>;
  joinSharedPet: (code: string) => Promise<string>;

  isOwner: boolean;

  petSelectorOpen: boolean;
  setPetSelectorOpen: (open: boolean) => void;

  loading: boolean;
}

const DataContext = createContext<DataContextValue>({} as DataContextValue);

// AsyncStorage keys (used for migration, local preferences, and offline cache)
const ASYNC_KEYS = {
  pets: 'companion_pets',
  scheduleEvents: 'companion_schedule',
  meals: 'companion_meals',
  vetInfo: 'companion_vets',
  medications: 'companion_medications',
  selectedPetId: 'companion_selected_pet',
  migrated: 'companion_firestore_migrated',
  migratedToRoot: 'companion_migrated_root_pets',
  offlineCache: 'companion_offline_cache',
  writeQueue: 'companion_write_queue',
};

// --- Offline write queue ---
// Each queued operation is a self-contained description of a Firestore write
// that can be replayed when connectivity returns.

type QueuedWrite =
  | { type: 'set'; path: string; data: any }
  | { type: 'update'; path: string; data: any }
  | { type: 'delete'; path: string };

async function getWriteQueue(): Promise<QueuedWrite[]> {
  const raw = await AsyncStorage.getItem(ASYNC_KEYS.writeQueue);
  return raw ? JSON.parse(raw) : [];
}

async function appendToWriteQueue(op: QueuedWrite): Promise<void> {
  const queue = await getWriteQueue();
  queue.push(op);
  await AsyncStorage.setItem(ASYNC_KEYS.writeQueue, JSON.stringify(queue));
}

async function clearWriteQueue(): Promise<void> {
  await AsyncStorage.removeItem(ASYNC_KEYS.writeQueue);
}

async function flushWriteQueue(): Promise<void> {
  const queue = await getWriteQueue();
  if (queue.length === 0) return;

  for (const op of queue) {
    try {
      const segments = op.path.split('/');
      const ref = doc(db, segments[0], ...segments.slice(1));
      switch (op.type) {
        case 'set':
          await setDoc(ref, op.data);
          break;
        case 'update':
          await updateDoc(ref, op.data);
          break;
        case 'delete':
          await deleteDoc(ref);
          break;
      }
    } catch (error) {
      console.warn('Failed to flush queued write, will retry later:', error);
      // Keep remaining ops in queue and stop
      const remaining = queue.slice(queue.indexOf(op));
      await AsyncStorage.setItem(ASYNC_KEYS.writeQueue, JSON.stringify(remaining));
      return;
    }
  }
  await clearWriteQueue();
}

// --- Offline cache helpers ---

async function saveOfflineCache(userId: string, docs: PetDocument[]): Promise<void> {
  await AsyncStorage.setItem(
    `${ASYNC_KEYS.offlineCache}_${userId}`,
    JSON.stringify(docs),
  );
}

async function loadOfflineCache(userId: string): Promise<PetDocument[]> {
  const raw = await AsyncStorage.getItem(`${ASYNC_KEYS.offlineCache}_${userId}`);
  return raw ? JSON.parse(raw) : [];
}

// --- Firestore helpers (root-level pets collection) ---

function petRef(petId: string) {
  return doc(db, 'pets', petId);
}

// Recursively strip undefined values from an object so Firestore never
// receives invalid data (arrayUnion/arrayRemove/updateDoc all reject undefined).
function stripUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(stripUndefined) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = stripUndefined(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

// Extract Pet fields from a PetDocument (strip embedded arrays)
function extractPet(petDoc: PetDocument): Pet {
  const { scheduleEvents, meals, vetInfo, medications, messages, ...pet } = petDoc;
  return pet;
}

// Write a full PetDocument to Firestore
async function writePetDoc(petDocument: PetDocument): Promise<void> {
  await setDoc(petRef(petDocument.id), petDocument);
}

// --- Legacy migration: AsyncStorage → user-scoped Firestore (old path) ---
// This migrates pre-Firestore data directly into the root pets collection
// with proper ownership fields, so no second migration is needed.
async function migrateAsyncStorageToFirestore(userId: string): Promise<void> {
  const globalKey = ASYNC_KEYS.migrated;
  const alreadyMigrated = await AsyncStorage.getItem(globalKey);
  if (alreadyMigrated === 'true') return;

  const [petsRaw, eventsRaw, mealsRaw, vetsRaw, medsRaw] = await Promise.all([
    AsyncStorage.getItem(ASYNC_KEYS.pets),
    AsyncStorage.getItem(ASYNC_KEYS.scheduleEvents),
    AsyncStorage.getItem(ASYNC_KEYS.meals),
    AsyncStorage.getItem(ASYNC_KEYS.vetInfo),
    AsyncStorage.getItem(ASYNC_KEYS.medications),
  ]);

  // Clear legacy keys immediately
  await Promise.all([
    AsyncStorage.removeItem(ASYNC_KEYS.pets),
    AsyncStorage.removeItem(ASYNC_KEYS.scheduleEvents),
    AsyncStorage.removeItem(ASYNC_KEYS.meals),
    AsyncStorage.removeItem(ASYNC_KEYS.vetInfo),
    AsyncStorage.removeItem(ASYNC_KEYS.medications),
  ]);

  const pets: Pet[] = petsRaw ? JSON.parse(petsRaw) : [];
  const events: ScheduleEvent[] = eventsRaw ? JSON.parse(eventsRaw) : [];
  const mealsList: Meal[] = mealsRaw ? JSON.parse(mealsRaw) : [];
  const vets: VetInfo[] = vetsRaw ? JSON.parse(vetsRaw) : [];
  const meds: Medication[] = medsRaw ? JSON.parse(medsRaw) : [];

  const hasData = pets.length > 0 || events.length > 0 || mealsList.length > 0 || vets.length > 0 || meds.length > 0;
  if (hasData) {
    const batch = writeBatch(db);
    for (const pet of pets) {
      const petDocument: PetDocument = {
        ...pet,
        ownerUid: userId,
        members: [userId],
        scheduleEvents: events.filter((e) => e.petId === pet.id),
        meals: mealsList.filter((m) => m.petId === pet.id),
        vetInfo: vets.filter((v) => v.petId === pet.id),
        medications: meds.filter((m) => m.petId === pet.id),
        messages: [],
      };
      batch.set(petRef(pet.id), petDocument);
    }
    await batch.commit();
  }

  await AsyncStorage.setItem(globalKey, 'true');
}

// --- Migration: user-scoped Firestore → root pets collection ---
// For users who already migrated to users/{uid}/pets before the
// real-time sharing update.
async function migrateToRootCollection(userId: string): Promise<void> {
  const alreadyMigrated = await AsyncStorage.getItem(ASYNC_KEYS.migratedToRoot);
  if (alreadyMigrated === 'true') return;

  const legacyRef = collection(db, 'users', userId, 'pets');
  const snapshot = await getDocs(legacyRef);

  if (!snapshot.empty) {
    const batch = writeBatch(db);
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as PetDocument;

      // Write to root collection with ownership fields
      batch.set(petRef(docSnap.id), {
        ...data,
        ownerUid: data.ownerUid || userId,
        members: data.members || [userId],
      });

      // Delete old user-scoped doc
      batch.delete(doc(db, 'users', userId, 'pets', docSnap.id));
    }
    await batch.commit();
  }

  await AsyncStorage.setItem(ASYNC_KEYS.migratedToRoot, 'true');
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [petDocs, setPetDocs] = useState<PetDocument[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [petSelectorOpen, setPetSelectorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const unsubRef = useRef<(() => void) | null>(null);
  const isConnectedRef = useRef(true);

  // Flush the write queue whenever connectivity is restored
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected ?? true;
      const wasDisconnected = !isConnectedRef.current;
      isConnectedRef.current = connected;
      if (connected && wasDisconnected) {
        flushWriteQueue().catch((err) =>
          console.warn('Write queue flush failed:', err),
        );
      }
    });
    return () => unsubscribe();
  }, []);

  // Helper: execute a Firestore write, or queue it if offline
  const execOrQueue = useCallback(async (
    op: QueuedWrite,
    execute: () => Promise<void>,
  ) => {
    if (isConnectedRef.current) {
      try {
        await execute();
        return;
      } catch (error: any) {
        // If it's a network error, fall through to queue
        if (error?.code !== 'unavailable' && error?.message?.indexOf('network') === -1) {
          throw error;
        }
      }
    }
    await appendToWriteQueue(op);
  }, []);

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
      // Load cached data immediately so the UI has something to show
      const cached = await loadOfflineCache(userId);
      if (isMounted && cached.length > 0) {
        setPetDocs(cached);
        setLoading(false);
      }

      // Only run legacy migration for accounts that existed before the
      // Firestore upgrade. Brand-new accounts (created within the last
      // 60 s) have nothing to migrate.
      const createdAt = user!.metadata.creationTime
        ? new Date(user!.metadata.creationTime).getTime()
        : 0;
      const isNewAccount = Date.now() - createdAt < 60_000;

      if (isNewAccount) {
        await AsyncStorage.setItem(ASYNC_KEYS.migrated, 'true');
        await AsyncStorage.setItem(ASYNC_KEYS.migratedToRoot, 'true');
      } else {
        // Run AsyncStorage → Firestore migration (writes to root pets/ now)
        await migrateAsyncStorageToFirestore(userId);
        // Move any existing user-scoped pets to root collection
        await migrateToRootCollection(userId);
      }

      // Flush any pending writes from a previous offline session
      await flushWriteQueue().catch(() => {});

      // Load selectedPetId from local storage (UI preference)
      const savedSelectedId = await AsyncStorage.getItem(ASYNC_KEYS.selectedPetId);
      if (isMounted && savedSelectedId) {
        setSelectedPetId(savedSelectedId);
      }

      // Real-time listener on root pets collection filtered by membership
      let isFirstSnapshot = true;
      const q = query(
        collection(db, 'pets'),
        where('members', 'array-contains', userId),
      );
      unsubRef.current = onSnapshot(q, (snapshot) => {
        if (!isMounted) return;
        const docs = snapshot.docs
          .map((d) => ({ ...d.data(), id: d.id } as PetDocument))
          .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
        setPetDocs(docs);
        // Persist snapshot to AsyncStorage for offline access
        saveOfflineCache(userId, docs).catch(() => {});
        if (isFirstSnapshot) {
          isFirstSnapshot = false;
          setLoading(false);
        }
      }, (error) => {
        console.warn('Firestore snapshot error:', error);
        // Still clear loading on error so the UI doesn't hang
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

  const messages = useMemo(
    () => petDocs.flatMap((d) => (d.messages ?? []).map((m) => ({ ...m, petId: d.id }))),
    [petDocs]
  );

  const selectedPet = useMemo(
    () => pets.find((p) => p.id === selectedPetId) || null,
    [pets, selectedPetId]
  );

  const isOwner = useMemo(
    () => !!user && !!selectedPet && selectedPet.ownerUid === user.uid,
    [user, selectedPet]
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

  // Helper: apply a local optimistic update to petDocs and persist to cache
  const applyLocalUpdate = useCallback((updater: (docs: PetDocument[]) => PetDocument[]) => {
    setPetDocs((prev) => {
      const next = updater(prev);
      if (user) {
        saveOfflineCache(user.uid, next).catch(() => {});
      }
      return next;
    });
  }, [user]);

  // --- Pet CRUD ---

  const addPet = useCallback(async (pet: Pet) => {
    if (!user) return;
    const newDoc: PetDocument = {
      ...pet,
      ownerUid: user.uid,
      members: [user.uid],
      scheduleEvents: [],
      meals: [],
      vetInfo: [],
      medications: [],
      messages: [],
    };

    // Optimistic local update
    applyLocalUpdate((docs) => [...docs, newDoc]);

    await execOrQueue(
      { type: 'set', path: `pets/${pet.id}`, data: newDoc },
      () => writePetDoc(newDoc),
    );
    if (!selectedPetId) {
      setSelectedPetId(pet.id);
      await AsyncStorage.setItem(ASYNC_KEYS.selectedPetId, pet.id);
    }
  }, [user, selectedPetId, execOrQueue, applyLocalUpdate]);

  const updatePet = useCallback(async (pet: Pet) => {
    if (!user) return;
    const existing = findPetDoc(pet.id);
    if (!existing) return;
    // Only send changed pet fields, not embedded arrays
    const { scheduleEvents, meals, vetInfo, medications, ...existingPetFields } = existing;
    const changes: Record<string, any> = {};
    for (const key of Object.keys(pet) as (keyof Pet)[]) {
      if (pet[key] !== existingPetFields[key]) {
        changes[key] = pet[key];
      }
    }
    if (Object.keys(changes).length > 0) {
      // Optimistic local update
      applyLocalUpdate((docs) =>
        docs.map((d) => (d.id === pet.id ? { ...d, ...changes } : d)),
      );

      await execOrQueue(
        { type: 'update', path: `pets/${pet.id}`, data: changes },
        () => updateDoc(petRef(pet.id), changes),
      );
    }
  }, [user, findPetDoc, execOrQueue, applyLocalUpdate]);

  const deletePet = useCallback(async (id: string) => {
    if (!user) return;
    const existing = findPetDoc(id);
    if (!existing) return;

    if (existing.ownerUid === user.uid) {
      // Optimistic local update
      applyLocalUpdate((docs) => docs.filter((d) => d.id !== id));

      await execOrQueue(
        { type: 'delete', path: `pets/${id}` },
        () => deleteDoc(petRef(id)),
      );
    } else {
      // Non-owner leaves — remove themselves from members
      applyLocalUpdate((docs) => docs.filter((d) => d.id !== id));

      await execOrQueue(
        { type: 'update', path: `pets/${id}`, data: { members: arrayRemove(user.uid) } },
        () => updateDoc(petRef(id), { members: arrayRemove(user.uid) }),
      );
    }

    if (selectedPetId === id) {
      setSelectedPetId(null);
      await AsyncStorage.removeItem(ASYNC_KEYS.selectedPetId);
    }
  }, [user, selectedPetId, findPetDoc, execOrQueue, applyLocalUpdate]);

  // --- Schedule CRUD ---

  const addScheduleEvent = useCallback(async (event: ScheduleEvent) => {
    if (!user) return;
    const clean = stripUndefined(event);

    applyLocalUpdate((docs) =>
      docs.map((d) => (d.id === event.petId ? { ...d, scheduleEvents: [...d.scheduleEvents, clean] } : d)),
    );

    await execOrQueue(
      { type: 'update', path: `pets/${event.petId}`, data: { scheduleEvents: arrayUnion(clean) } },
      () => updateDoc(petRef(event.petId), { scheduleEvents: arrayUnion(clean) }),
    );
  }, [user, execOrQueue, applyLocalUpdate]);

  const updateScheduleEvent = useCallback(async (event: ScheduleEvent) => {
    if (!user) return;
    const existing = findPetDoc(event.petId);
    if (!existing) return;
    const updated = existing.scheduleEvents.map((e) => (e.id === event.id ? stripUndefined(event) : e));

    applyLocalUpdate((docs) =>
      docs.map((d) => (d.id === event.petId ? { ...d, scheduleEvents: updated } : d)),
    );

    await execOrQueue(
      { type: 'update', path: `pets/${event.petId}`, data: { scheduleEvents: updated } },
      () => updateDoc(petRef(event.petId), { scheduleEvents: updated }),
    );
  }, [user, findPetDoc, execOrQueue, applyLocalUpdate]);

  const deleteScheduleEvent = useCallback(async (id: string) => {
    if (!user) return;
    const ownerDoc = petDocs.find((d) => d.scheduleEvents.some((e) => e.id === id));
    if (!ownerDoc) return;
    const toRemove = ownerDoc.scheduleEvents.find((e) => e.id === id);
    if (!toRemove) return;

    applyLocalUpdate((docs) =>
      docs.map((d) => (d.id === ownerDoc.id ? { ...d, scheduleEvents: d.scheduleEvents.filter((e) => e.id !== id) } : d)),
    );

    await execOrQueue(
      { type: 'update', path: `pets/${ownerDoc.id}`, data: { scheduleEvents: arrayRemove(toRemove) } },
      () => updateDoc(petRef(ownerDoc.id), { scheduleEvents: arrayRemove(toRemove) }),
    );
  }, [user, petDocs, execOrQueue, applyLocalUpdate]);

  // --- Meal CRUD ---

  const addMeal = useCallback(async (meal: Meal) => {
    if (!user) return;
    const clean = stripUndefined(meal);

    applyLocalUpdate((docs) =>
      docs.map((d) => (d.id === meal.petId ? { ...d, meals: [...d.meals, clean] } : d)),
    );

    await execOrQueue(
      { type: 'update', path: `pets/${meal.petId}`, data: { meals: arrayUnion(clean) } },
      () => updateDoc(petRef(meal.petId), { meals: arrayUnion(clean) }),
    );
  }, [user, execOrQueue, applyLocalUpdate]);

  const updateMeal = useCallback(async (meal: Meal) => {
    if (!user) return;
    const existing = findPetDoc(meal.petId);
    if (!existing) return;
    const updated = existing.meals.map((m) => (m.id === meal.id ? stripUndefined(meal) : m));

    applyLocalUpdate((docs) =>
      docs.map((d) => (d.id === meal.petId ? { ...d, meals: updated } : d)),
    );

    await execOrQueue(
      { type: 'update', path: `pets/${meal.petId}`, data: { meals: updated } },
      () => updateDoc(petRef(meal.petId), { meals: updated }),
    );
  }, [user, findPetDoc, execOrQueue, applyLocalUpdate]);

  const deleteMeal = useCallback(async (id: string) => {
    if (!user) return;
    const ownerDoc = petDocs.find((d) => d.meals.some((m) => m.id === id));
    if (!ownerDoc) return;
    const toRemove = ownerDoc.meals.find((m) => m.id === id);
    if (!toRemove) return;

    applyLocalUpdate((docs) =>
      docs.map((d) => (d.id === ownerDoc.id ? { ...d, meals: d.meals.filter((m) => m.id !== id) } : d)),
    );

    await execOrQueue(
      { type: 'update', path: `pets/${ownerDoc.id}`, data: { meals: arrayRemove(toRemove) } },
      () => updateDoc(petRef(ownerDoc.id), { meals: arrayRemove(toRemove) }),
    );
  }, [user, petDocs, execOrQueue, applyLocalUpdate]);

  // --- Vet CRUD ---

  const addVetInfo = useCallback(async (vet: VetInfo) => {
    if (!user) return;
    const clean = stripUndefined(vet);

    applyLocalUpdate((docs) =>
      docs.map((d) => (d.id === vet.petId ? { ...d, vetInfo: [...d.vetInfo, clean] } : d)),
    );

    await execOrQueue(
      { type: 'update', path: `pets/${vet.petId}`, data: { vetInfo: arrayUnion(clean) } },
      () => updateDoc(petRef(vet.petId), { vetInfo: arrayUnion(clean) }),
    );
  }, [user, execOrQueue, applyLocalUpdate]);

  const updateVetInfo = useCallback(async (vet: VetInfo) => {
    if (!user) return;
    const existing = findPetDoc(vet.petId);
    if (!existing) return;
    const updated = existing.vetInfo.map((v) => (v.id === vet.id ? stripUndefined(vet) : v));

    applyLocalUpdate((docs) =>
      docs.map((d) => (d.id === vet.petId ? { ...d, vetInfo: updated } : d)),
    );

    await execOrQueue(
      { type: 'update', path: `pets/${vet.petId}`, data: { vetInfo: updated } },
      () => updateDoc(petRef(vet.petId), { vetInfo: updated }),
    );
  }, [user, findPetDoc, execOrQueue, applyLocalUpdate]);

  const deleteVetInfo = useCallback(async (id: string) => {
    if (!user) return;
    const ownerDoc = petDocs.find((d) => d.vetInfo.some((v) => v.id === id));
    if (!ownerDoc) return;
    const toRemove = ownerDoc.vetInfo.find((v) => v.id === id);
    if (!toRemove) return;

    applyLocalUpdate((docs) =>
      docs.map((d) => (d.id === ownerDoc.id ? { ...d, vetInfo: d.vetInfo.filter((v) => v.id !== id) } : d)),
    );

    await execOrQueue(
      { type: 'update', path: `pets/${ownerDoc.id}`, data: { vetInfo: arrayRemove(toRemove) } },
      () => updateDoc(petRef(ownerDoc.id), { vetInfo: arrayRemove(toRemove) }),
    );
  }, [user, petDocs, execOrQueue, applyLocalUpdate]);

  // --- Medication CRUD ---

  const addMedication = useCallback(async (med: Medication) => {
    if (!user) return;
    const clean = stripUndefined(med);

    applyLocalUpdate((docs) =>
      docs.map((d) => (d.id === med.petId ? { ...d, medications: [...d.medications, clean] } : d)),
    );

    await execOrQueue(
      { type: 'update', path: `pets/${med.petId}`, data: { medications: arrayUnion(clean) } },
      () => updateDoc(petRef(med.petId), { medications: arrayUnion(clean) }),
    );
  }, [user, execOrQueue, applyLocalUpdate]);

  const updateMedication = useCallback(async (med: Medication) => {
    if (!user) return;
    const existing = findPetDoc(med.petId);
    if (!existing) return;
    const updated = existing.medications.map((m) => (m.id === med.id ? stripUndefined(med) : m));

    applyLocalUpdate((docs) =>
      docs.map((d) => (d.id === med.petId ? { ...d, medications: updated } : d)),
    );

    await execOrQueue(
      { type: 'update', path: `pets/${med.petId}`, data: { medications: updated } },
      () => updateDoc(petRef(med.petId), { medications: updated }),
    );
  }, [user, findPetDoc, execOrQueue, applyLocalUpdate]);

  const deleteMedication = useCallback(async (id: string) => {
    if (!user) return;
    const ownerDoc = petDocs.find((d) => d.medications.some((m) => m.id === id));
    if (!ownerDoc) return;
    const toRemove = ownerDoc.medications.find((m) => m.id === id);
    if (!toRemove) return;

    applyLocalUpdate((docs) =>
      docs.map((d) => (d.id === ownerDoc.id ? { ...d, medications: d.medications.filter((m) => m.id !== id) } : d)),
    );

    await execOrQueue(
      { type: 'update', path: `pets/${ownerDoc.id}`, data: { medications: arrayRemove(toRemove) } },
      () => updateDoc(petRef(ownerDoc.id), { medications: arrayRemove(toRemove) }),
    );
  }, [user, petDocs, execOrQueue, applyLocalUpdate]);

  // --- Message CRUD ---

  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  const addMessageFn = useCallback(async (msg: Message) => {
    if (!user) return;
    const clean = stripUndefined(msg);

    applyLocalUpdate((docs) =>
      docs.map((d) => (d.id === msg.petId ? { ...d, messages: [...(d.messages ?? []), clean] } : d)),
    );

    await execOrQueue(
      { type: 'update', path: `pets/${msg.petId}`, data: { messages: arrayUnion(clean) } },
      () => updateDoc(petRef(msg.petId), { messages: arrayUnion(clean) }),
    );
  }, [user, execOrQueue, applyLocalUpdate]);

  const deleteMessageFn = useCallback(async (id: string) => {
    if (!user) return;
    const ownerDoc = petDocs.find((d) => (d.messages ?? []).some((m) => m.id === id));
    if (!ownerDoc) return;
    const toRemove = (ownerDoc.messages ?? []).find((m) => m.id === id);
    if (!toRemove) return;

    applyLocalUpdate((docs) =>
      docs.map((d) => (d.id === ownerDoc.id ? { ...d, messages: (d.messages ?? []).filter((m) => m.id !== id) } : d)),
    );

    await execOrQueue(
      { type: 'update', path: `pets/${ownerDoc.id}`, data: { messages: arrayRemove(toRemove) } },
      () => updateDoc(petRef(ownerDoc.id), { messages: arrayRemove(toRemove) }),
    );
  }, [user, petDocs, execOrQueue, applyLocalUpdate]);

  const togglePinMessageFn = useCallback(async (id: string, pinned: boolean) => {
    if (!user) return;
    const ownerDoc = petDocs.find((d) => (d.messages ?? []).some((m) => m.id === id));
    if (!ownerDoc) return;
    const updated = (ownerDoc.messages ?? []).map((m) => (m.id === id ? { ...m, pinned } : m));

    applyLocalUpdate((docs) =>
      docs.map((d) => (d.id === ownerDoc.id ? { ...d, messages: updated } : d)),
    );

    await execOrQueue(
      { type: 'update', path: `pets/${ownerDoc.id}`, data: { messages: updated } },
      () => updateDoc(petRef(ownerDoc.id), { messages: updated }),
    );
  }, [user, petDocs, execOrQueue, applyLocalUpdate]);

  const cleanupOldMessagesFn = useCallback(async () => {
    if (!user || !selectedPetId) return;
    const ownerDoc = findPetDoc(selectedPetId);
    if (!ownerDoc) return;
    const cutoff = Date.now() - THIRTY_DAYS_MS;
    const currentMessages = ownerDoc.messages ?? [];
    const filtered = currentMessages.filter((m) => m.pinned || m.createdAt >= cutoff);
    if (filtered.length < currentMessages.length) {
      applyLocalUpdate((docs) =>
        docs.map((d) => (d.id === selectedPetId ? { ...d, messages: filtered } : d)),
      );

      await execOrQueue(
        { type: 'update', path: `pets/${selectedPetId}`, data: { messages: filtered } },
        () => updateDoc(petRef(selectedPetId), { messages: filtered }),
      );
    }
  }, [user, selectedPetId, findPetDoc, execOrQueue, applyLocalUpdate]);

  // --- Share link management ---

  const createShareLink = useCallback(async (petId: string): Promise<string> => {
    if (!user) throw new Error('Must be signed in');
    const existing = findPetDoc(petId);
    if (!existing) throw new Error('Pet not found');

    // Return existing share code if one exists, and backfill preview data
    // for share links that were created before preview embedding.
    if (existing.shareCode) {
      setDoc(doc(db, 'shareLinks', existing.shareCode), {
        petId,
        ownerUid: user.uid,
        name: existing.name,
        type: existing.type,
        breed: existing.breed,
        weight: existing.weight,
        weightUnit: existing.weightUnit,
        scheduleEventCount: existing.scheduleEvents?.length ?? 0,
        mealCount: existing.meals?.length ?? 0,
        medicationCount: existing.medications?.length ?? 0,
        vetInfoCount: existing.vetInfo?.length ?? 0,
      }, { merge: true }).catch(() => {});
      return existing.shareCode;
    }

    // Generate a new share code
    const code = generateShareCode();

    // Create the share link lookup document with embedded preview data
    // so non-members can look up the pet without needing read access to
    // the pets collection.
    await setDoc(doc(db, 'shareLinks', code), {
      petId,
      ownerUid: user.uid,
      createdAt: Date.now(),
      name: existing.name,
      type: existing.type,
      breed: existing.breed,
      weight: existing.weight,
      weightUnit: existing.weightUnit,
      scheduleEventCount: existing.scheduleEvents?.length ?? 0,
      mealCount: existing.meals?.length ?? 0,
      medicationCount: existing.medications?.length ?? 0,
      vetInfoCount: existing.vetInfo?.length ?? 0,
    });

    // Store the share code on the pet document
    await updateDoc(petRef(petId), { shareCode: code });

    return code;
  }, [user, findPetDoc]);

  const lookupShareCode = useCallback(async (code: string): Promise<SharedPetPreview | null> => {
    if (!user) return null;

    const trimmed = code.trim().toUpperCase();
    const linkSnap = await getDoc(doc(db, 'shareLinks', trimmed));
    if (!linkSnap.exists()) return null;

    const linkData = linkSnap.data() as {
      petId: string;
      name?: string;
      type?: string;
      breed?: string;
      weight?: string;
      weightUnit?: 'lbs' | 'kg';
      scheduleEventCount?: number;
      mealCount?: number;
      medicationCount?: number;
      vetInfoCount?: number;
    };

    // Check local state to see if the user already has access
    const alreadyMember = petDocs.some((d) => d.id === linkData.petId);

    // Use preview data embedded in the shareLinks document so non-members
    // don't need read access to the pets collection.
    if (linkData.name) {
      return {
        petId: linkData.petId,
        name: linkData.name,
        type: (linkData.type ?? 'dog') as SharedPetPreview['type'],
        breed: linkData.breed ?? '',
        weight: linkData.weight ?? '',
        weightUnit: linkData.weightUnit ?? 'lbs',
        scheduleEventCount: linkData.scheduleEventCount ?? 0,
        mealCount: linkData.mealCount ?? 0,
        medicationCount: linkData.medicationCount ?? 0,
        vetInfoCount: linkData.vetInfoCount ?? 0,
        alreadyMember,
      };
    }

    // Fallback for share links created before preview data was embedded:
    // try reading the pet document directly (works if user is already a member
    // or if rules allow it).
    try {
      const petSnap = await getDoc(petRef(linkData.petId));
      if (!petSnap.exists()) return null;

      const petData = petSnap.data() as PetDocument;
      return {
        petId: linkData.petId,
        name: petData.name,
        type: petData.type,
        breed: petData.breed,
        weight: petData.weight,
        weightUnit: petData.weightUnit,
        scheduleEventCount: petData.scheduleEvents?.length ?? 0,
        mealCount: petData.meals?.length ?? 0,
        medicationCount: petData.medications?.length ?? 0,
        vetInfoCount: petData.vetInfo?.length ?? 0,
        alreadyMember,
      };
    } catch {
      // Permission denied — the share link exists but the pet document
      // is not readable by this user. Return minimal preview so the user
      // can still attempt to join.
      return {
        petId: linkData.petId,
        name: 'Shared Pet',
        type: 'dog',
        breed: '',
        weight: '',
        weightUnit: 'lbs',
        scheduleEventCount: 0,
        mealCount: 0,
        medicationCount: 0,
        vetInfoCount: 0,
        alreadyMember,
      };
    }
  }, [user, petDocs]);

  const joinSharedPet = useCallback(async (code: string): Promise<string> => {
    if (!user) throw new Error('Must be signed in');

    const trimmed = code.trim().toUpperCase();
    const linkSnap = await getDoc(doc(db, 'shareLinks', trimmed));
    if (!linkSnap.exists()) throw new Error('Invalid share code');

    const { petId } = linkSnap.data() as { petId: string };

    // Add current user to the pet's members array
    await updateDoc(petRef(petId), {
      members: arrayUnion(user.uid),
    });

    // Select this pet
    setSelectedPetId(petId);
    await AsyncStorage.setItem(ASYNC_KEYS.selectedPetId, petId);

    return petId;
  }, [user]);

  const contextValue = useMemo<DataContextValue>(() => ({
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
    messages,
    addMessage: addMessageFn,
    deleteMessage: deleteMessageFn,
    togglePinMessage: togglePinMessageFn,
    cleanupOldMessages: cleanupOldMessagesFn,
    isOwner,
    createShareLink,
    lookupShareCode,
    joinSharedPet,
    petSelectorOpen,
    setPetSelectorOpen,
    loading,
  }), [
    pets, selectedPetId, selectedPet, selectPet,
    addPet, updatePet, deletePet,
    scheduleEvents, addScheduleEvent, updateScheduleEvent, deleteScheduleEvent,
    meals, addMeal, updateMeal, deleteMeal,
    vetInfo, addVetInfo, updateVetInfo, deleteVetInfo,
    medications, addMedication, updateMedication, deleteMedication,
    messages, addMessageFn, deleteMessageFn, togglePinMessageFn, cleanupOldMessagesFn,
    isOwner, createShareLink, lookupShareCode, joinSharedPet,
    petSelectorOpen, setPetSelectorOpen, loading,
  ]);

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
