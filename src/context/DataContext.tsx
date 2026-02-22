import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pet, ScheduleEvent, Meal, VetInfo, Medication } from '../types';

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
    setPets((prev) => {
      const next = [...prev, pet];
      saveData(KEYS.pets, next);
      return next;
    });
    if (!selectedPetId) {
      setSelectedPetId(pet.id);
      AsyncStorage.setItem(KEYS.selectedPetId, pet.id);
    }
  }, [selectedPetId]);

  const updatePet = useCallback(async (pet: Pet) => {
    setPets((prev) => {
      const next = prev.map((p) => (p.id === pet.id ? pet : p));
      saveData(KEYS.pets, next);
      return next;
    });
  }, []);

  const deletePet = useCallback(async (id: string) => {
    setPets((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveData(KEYS.pets, next);
      return next;
    });
    setScheduleEvents((prev) => {
      const next = prev.filter((e) => e.petId !== id);
      saveData(KEYS.scheduleEvents, next);
      return next;
    });
    setMeals((prev) => {
      const next = prev.filter((m) => m.petId !== id);
      saveData(KEYS.meals, next);
      return next;
    });
    setVetInfo((prev) => {
      const next = prev.filter((v) => v.petId !== id);
      saveData(KEYS.vetInfo, next);
      return next;
    });
    setMedications((prev) => {
      const next = prev.filter((m) => m.petId !== id);
      saveData(KEYS.medications, next);
      return next;
    });
    if (selectedPetId === id) {
      setSelectedPetId(null);
      AsyncStorage.removeItem(KEYS.selectedPetId);
    }
  }, [selectedPetId]);

  // Schedule CRUD
  const addScheduleEvent = useCallback(async (event: ScheduleEvent) => {
    setScheduleEvents((prev) => {
      const next = [...prev, event];
      saveData(KEYS.scheduleEvents, next);
      return next;
    });
  }, []);

  const updateScheduleEvent = useCallback(async (event: ScheduleEvent) => {
    setScheduleEvents((prev) => {
      const next = prev.map((e) => (e.id === event.id ? event : e));
      saveData(KEYS.scheduleEvents, next);
      return next;
    });
  }, []);

  const deleteScheduleEvent = useCallback(async (id: string) => {
    setScheduleEvents((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveData(KEYS.scheduleEvents, next);
      return next;
    });
  }, []);

  // Meal CRUD
  const addMeal = useCallback(async (meal: Meal) => {
    setMeals((prev) => {
      const next = [...prev, meal];
      saveData(KEYS.meals, next);
      return next;
    });
  }, []);

  const updateMeal = useCallback(async (meal: Meal) => {
    setMeals((prev) => {
      const next = prev.map((m) => (m.id === meal.id ? meal : m));
      saveData(KEYS.meals, next);
      return next;
    });
  }, []);

  const deleteMeal = useCallback(async (id: string) => {
    setMeals((prev) => {
      const next = prev.filter((m) => m.id !== id);
      saveData(KEYS.meals, next);
      return next;
    });
  }, []);

  // Vet CRUD
  const addVetInfo = useCallback(async (vet: VetInfo) => {
    setVetInfo((prev) => {
      const next = [...prev, vet];
      saveData(KEYS.vetInfo, next);
      return next;
    });
  }, []);

  const updateVetInfo = useCallback(async (vet: VetInfo) => {
    setVetInfo((prev) => {
      const next = prev.map((v) => (v.id === vet.id ? vet : v));
      saveData(KEYS.vetInfo, next);
      return next;
    });
  }, []);

  const deleteVetInfo = useCallback(async (id: string) => {
    setVetInfo((prev) => {
      const next = prev.filter((v) => v.id !== id);
      saveData(KEYS.vetInfo, next);
      return next;
    });
  }, []);

  // Medication CRUD
  const addMedication = useCallback(async (med: Medication) => {
    setMedications((prev) => {
      const next = [...prev, med];
      saveData(KEYS.medications, next);
      return next;
    });
  }, []);

  const updateMedication = useCallback(async (med: Medication) => {
    setMedications((prev) => {
      const next = prev.map((m) => (m.id === med.id ? med : m));
      saveData(KEYS.medications, next);
      return next;
    });
  }, []);

  const deleteMedication = useCallback(async (id: string) => {
    setMedications((prev) => {
      const next = prev.filter((m) => m.id !== id);
      saveData(KEYS.medications, next);
      return next;
    });
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
        loading,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
