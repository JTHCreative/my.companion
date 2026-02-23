import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

  loading: boolean;
}

const DataContext = createContext<DataContextValue>({} as DataContextValue);

const KEYS = {
  pets: 'companion_pets',
  scheduleEvents: 'companion_schedule',
  meals: 'companion_meals',
  vetInfo: 'companion_vets',
  medications: 'companion_medications',
  selectedPetId: 'companion_selected_pet',
};

async function loadData<T>(key: string): Promise<T[]> {
  const data = await AsyncStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

async function saveData<T>(key: string, data: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [vetInfo, setVetInfo] = useState<VetInfo[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [p, s, m, v, med, selId] = await Promise.all([
        loadData<Pet>(KEYS.pets),
        loadData<ScheduleEvent>(KEYS.scheduleEvents),
        loadData<Meal>(KEYS.meals),
        loadData<VetInfo>(KEYS.vetInfo),
        loadData<Medication>(KEYS.medications),
        AsyncStorage.getItem(KEYS.selectedPetId),
      ]);
      setPets(p);
      setScheduleEvents(s);
      setMeals(m);
      setVetInfo(v);
      setMedications(med);
      if (selId) setSelectedPetId(selId);
      else if (p.length > 0) setSelectedPetId(p[0].id);
      setLoading(false);
    })();
  }, []);

  const selectedPet = pets.find((p) => p.id === selectedPetId) || null;

  const selectPet = useCallback((id: string) => {
    setSelectedPetId(id);
    AsyncStorage.setItem(KEYS.selectedPetId, id);
  }, []);

  // Pet CRUD
  const addPet = useCallback(async (pet: Pet) => {
    let next: Pet[] = [];
    setPets((prev) => {
      next = [...prev, pet];
      return next;
    });
    await saveData(KEYS.pets, next);
    if (!selectedPetId) {
      setSelectedPetId(pet.id);
      await AsyncStorage.setItem(KEYS.selectedPetId, pet.id);
    }
  }, [selectedPetId]);

  const updatePet = useCallback(async (pet: Pet) => {
    let next: Pet[] = [];
    setPets((prev) => {
      next = prev.map((p) => (p.id === pet.id ? pet : p));
      return next;
    });
    await saveData(KEYS.pets, next);
  }, []);

  const deletePet = useCallback(async (id: string) => {
    let nextPets: Pet[] = [];
    let nextEvents: ScheduleEvent[] = [];
    let nextMeals: Meal[] = [];
    let nextVets: VetInfo[] = [];
    let nextMeds: Medication[] = [];
    setPets((prev) => { nextPets = prev.filter((p) => p.id !== id); return nextPets; });
    setScheduleEvents((prev) => { nextEvents = prev.filter((e) => e.petId !== id); return nextEvents; });
    setMeals((prev) => { nextMeals = prev.filter((m) => m.petId !== id); return nextMeals; });
    setVetInfo((prev) => { nextVets = prev.filter((v) => v.petId !== id); return nextVets; });
    setMedications((prev) => { nextMeds = prev.filter((m) => m.petId !== id); return nextMeds; });
    await Promise.all([
      saveData(KEYS.pets, nextPets),
      saveData(KEYS.scheduleEvents, nextEvents),
      saveData(KEYS.meals, nextMeals),
      saveData(KEYS.vetInfo, nextVets),
      saveData(KEYS.medications, nextMeds),
    ]);
    if (selectedPetId === id) {
      setSelectedPetId(null);
      await AsyncStorage.removeItem(KEYS.selectedPetId);
    }
  }, [selectedPetId]);

  // Schedule CRUD
  const addScheduleEvent = useCallback(async (event: ScheduleEvent) => {
    let next: ScheduleEvent[] = [];
    setScheduleEvents((prev) => {
      next = [...prev, event];
      return next;
    });
    await saveData(KEYS.scheduleEvents, next);
  }, []);

  const updateScheduleEvent = useCallback(async (event: ScheduleEvent) => {
    let next: ScheduleEvent[] = [];
    setScheduleEvents((prev) => {
      next = prev.map((e) => (e.id === event.id ? event : e));
      return next;
    });
    await saveData(KEYS.scheduleEvents, next);
  }, []);

  const deleteScheduleEvent = useCallback(async (id: string) => {
    let next: ScheduleEvent[] = [];
    setScheduleEvents((prev) => {
      next = prev.filter((e) => e.id !== id);
      return next;
    });
    await saveData(KEYS.scheduleEvents, next);
  }, []);

  // Meal CRUD
  const addMeal = useCallback(async (meal: Meal) => {
    let next: Meal[] = [];
    setMeals((prev) => {
      next = [...prev, meal];
      return next;
    });
    await saveData(KEYS.meals, next);
  }, []);

  const updateMeal = useCallback(async (meal: Meal) => {
    let next: Meal[] = [];
    setMeals((prev) => {
      next = prev.map((m) => (m.id === meal.id ? meal : m));
      return next;
    });
    await saveData(KEYS.meals, next);
  }, []);

  const deleteMeal = useCallback(async (id: string) => {
    let next: Meal[] = [];
    setMeals((prev) => {
      next = prev.filter((m) => m.id !== id);
      return next;
    });
    await saveData(KEYS.meals, next);
  }, []);

  // Vet CRUD
  const addVetInfo = useCallback(async (vet: VetInfo) => {
    let next: VetInfo[] = [];
    setVetInfo((prev) => {
      next = [...prev, vet];
      return next;
    });
    await saveData(KEYS.vetInfo, next);
  }, []);

  const updateVetInfo = useCallback(async (vet: VetInfo) => {
    let next: VetInfo[] = [];
    setVetInfo((prev) => {
      next = prev.map((v) => (v.id === vet.id ? vet : v));
      return next;
    });
    await saveData(KEYS.vetInfo, next);
  }, []);

  const deleteVetInfo = useCallback(async (id: string) => {
    let next: VetInfo[] = [];
    setVetInfo((prev) => {
      next = prev.filter((v) => v.id !== id);
      return next;
    });
    await saveData(KEYS.vetInfo, next);
  }, []);

  // Medication CRUD
  const addMedication = useCallback(async (med: Medication) => {
    let next: Medication[] = [];
    setMedications((prev) => {
      next = [...prev, med];
      return next;
    });
    await saveData(KEYS.medications, next);
  }, []);

  const updateMedication = useCallback(async (med: Medication) => {
    let next: Medication[] = [];
    setMedications((prev) => {
      next = prev.map((m) => (m.id === med.id ? med : m));
      return next;
    });
    await saveData(KEYS.medications, next);
  }, []);

  const deleteMedication = useCallback(async (id: string) => {
    let next: Medication[] = [];
    setMedications((prev) => {
      next = prev.filter((m) => m.id !== id);
      return next;
    });
    await saveData(KEYS.medications, next);
  }, []);

  // Import a shared pet's full data
  const importPetData = useCallback(async (data: SharedPetData): Promise<string> => {
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

    let nextPets: Pet[] = [];
    let nextEvents: ScheduleEvent[] = [];
    let nextMeals: Meal[] = [];
    let nextVets: VetInfo[] = [];
    let nextMeds: Medication[] = [];

    setPets((prev) => { nextPets = [...prev, newPet]; return nextPets; });
    setScheduleEvents((prev) => { nextEvents = [...prev, ...newEvents]; return nextEvents; });
    setMeals((prev) => { nextMeals = [...prev, ...newMeals]; return nextMeals; });
    setVetInfo((prev) => { nextVets = [...prev, ...newVets]; return nextVets; });
    setMedications((prev) => { nextMeds = [...prev, ...newMeds]; return nextMeds; });

    await Promise.all([
      saveData(KEYS.pets, nextPets),
      saveData(KEYS.scheduleEvents, nextEvents),
      saveData(KEYS.meals, nextMeals),
      saveData(KEYS.vetInfo, nextVets),
      saveData(KEYS.medications, nextMeds),
    ]);

    // Auto-select the newly imported pet
    setSelectedPetId(petId);
    await AsyncStorage.setItem(KEYS.selectedPetId, petId);

    return petId;
  }, []);

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
        loading,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
