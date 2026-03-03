export type PetType = 'dog' | 'cat' | 'bird' | 'fish' | 'reptile' | 'rabbit' | 'hamster' | 'other';

export interface Pet {
  id: string;
  name: string;
  type: PetType;
  breed: string;
  weight: string;
  weightUnit: 'lbs' | 'kg';
  personality: string;
  profileImage: string | null;
  galleryImages?: string[];
  birthday?: string;
  createdAt?: number;
  notes?: string;
  bulletNotes?: { id: string; text: string }[];
  ownerUid?: string;
  members?: string[];
  shareCode?: string;
}

export type ScheduleEventType =
  | 'feeding'
  | 'potty'
  | 'nap'
  | 'wake'
  | 'sleep'
  | 'play'
  | 'walk'
  | 'medication'
  | 'other';

export interface ScheduleEvent {
  id: string;
  petId: string;
  type: ScheduleEventType;
  title: string;
  time: string; // HH:MM format
  days: string[]; // ['Mon', 'Tue', ...]
  notes?: string;
  linkedMealId?: string; // links feeding events to meals
  linkedMedicationId?: string; // links medication events to medications
}

export interface Ingredient {
  name: string;
  quantity: string;
  brand?: string;
}

export interface Meal {
  id: string;
  petId: string;
  name: string;
  type: 'meal' | 'treat';
  ingredients?: Ingredient[];
  notes?: string;
}

export interface VetInfo {
  id: string;
  petId: string;
  clinicName: string;
  vetName: string;
  phone: string;
  address?: string;
  notes?: string;
}

export interface Medication {
  id: string;
  petId: string;
  name: string;
  dosage: string;
  frequency: string; // e.g., "Once daily", "Twice daily", "Every 8 hours"
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  scheduleReminders: boolean;
  reminderMinutesBefore: number; // minutes before event to send reminder
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  enabled: true,
  scheduleReminders: true,
  reminderMinutesBefore: 15,
};

export interface SharedPetData {
  version: 1;
  pet: Omit<Pet, 'id' | 'profileImage'>;
  scheduleEvents: Omit<ScheduleEvent, 'id' | 'petId'>[];
  meals: Omit<Meal, 'id' | 'petId'>[];
  vetInfo: Omit<VetInfo, 'id' | 'petId'>[];
  medications: Omit<Medication, 'id' | 'petId'>[];
}

export interface SharedPetPreview {
  petId: string;
  name: string;
  type: PetType;
  breed: string;
  weight: string;
  weightUnit: 'lbs' | 'kg';
  scheduleEventCount: number;
  mealCount: number;
  medicationCount: number;
  vetInfoCount: number;
  alreadyMember: boolean;
}
