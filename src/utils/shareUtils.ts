import { Share } from 'react-native';
import {
  Pet,
  ScheduleEvent,
  Meal,
  VetInfo,
  Medication,
  SharedPetData,
} from '../types';

const SHARE_PREFIX = 'MYCOMPANION:';

/**
 * Build a formatted text summary of a pet for casual sharing.
 */
export function buildProfileSummary(
  pet: Pet,
  schedule: ScheduleEvent[],
  meals: Meal[],
  medications: Medication[],
  vetInfo: VetInfo[],
): string {
  const lines: string[] = [];
  const type = pet.type.charAt(0).toUpperCase() + pet.type.slice(1);

  lines.push(`Meet ${pet.name}!`);
  lines.push(`${type}${pet.breed ? ` - ${pet.breed}` : ''}`);
  if (pet.weight) lines.push(`Weight: ${pet.weight} ${pet.weightUnit}`);
  if (pet.birthday) lines.push(`Birthday: ${pet.birthday}`);
  if (pet.personality) {
    lines.push(
      `Personality: ${pet.personality
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .join(', ')}`,
    );
  }
  if (pet.notes) lines.push(`Notes: ${pet.notes}`);
  if (pet.bulletNotes && pet.bulletNotes.length > 0) {
    lines.push('');
    lines.push('Care Notes:');
    pet.bulletNotes.forEach((note) => {
      lines.push(`  • ${note.text}`);
    });
  }

  if (schedule.length > 0) {
    lines.push('');
    lines.push(`Daily Schedule (${schedule.length} events)`);
  }
  if (meals.length > 0) {
    lines.push(`Meals & Treats: ${meals.length}`);
  }
  if (medications.length > 0) {
    lines.push(`Medications: ${medications.length}`);
  }
  if (vetInfo.length > 0) {
    lines.push(`Vet: ${vetInfo[0].vetName || vetInfo[0].clinicName}`);
  }

  lines.push('');
  lines.push('Shared from PetPassport');

  return lines.join('\n');
}

/**
 * Share a text summary of the pet via the native share sheet.
 */
export async function shareProfileSummary(
  pet: Pet,
  schedule: ScheduleEvent[],
  meals: Meal[],
  medications: Medication[],
  vetInfo: VetInfo[],
): Promise<void> {
  const message = buildProfileSummary(pet, schedule, meals, medications, vetInfo);
  await Share.share({ message });
}

/**
 * Encode full pet data into a share code string.
 * Strips ids and profileImage so the recipient gets a clean import.
 */
export function encodePetData(
  pet: Pet,
  scheduleEvents: ScheduleEvent[],
  meals: Meal[],
  vetInfo: VetInfo[],
  medications: Medication[],
): string {
  const { id: _id, profileImage: _img, ...petData } = pet;

  const data: SharedPetData = {
    version: 1,
    pet: petData,
    scheduleEvents: scheduleEvents.map(({ id: _eid, petId: _pid, ...rest }) => rest),
    meals: meals.map(({ id: _mid, petId: _mpid, ...rest }) => rest),
    vetInfo: vetInfo.map(({ id: _vid, petId: _vpid, ...rest }) => rest),
    medications: medications.map(({ id: _medid, petId: _medpid, ...rest }) => rest),
  };

  const json = JSON.stringify(data);
  // Base64 encode — btoa works in React Native's Hermes engine
  const encoded = btoa(json);
  return `${SHARE_PREFIX}${encoded}`;
}

/**
 * Decode a share code back into SharedPetData.
 * Returns null if the code is invalid.
 */
export function decodePetData(code: string): SharedPetData | null {
  try {
    const trimmed = code.trim();
    if (!trimmed.startsWith(SHARE_PREFIX)) return null;

    const encoded = trimmed.slice(SHARE_PREFIX.length);
    const json = atob(encoded);
    const data: SharedPetData = JSON.parse(json);

    // Basic validation
    if (data.version !== 1) return null;
    if (!data.pet || !data.pet.name || !data.pet.type) return null;

    return data;
  } catch {
    return null;
  }
}

/**
 * Share the full pet data code via the native share sheet.
 */
export async function shareFullPetData(
  pet: Pet,
  scheduleEvents: ScheduleEvent[],
  meals: Meal[],
  vetInfo: VetInfo[],
  medications: Medication[],
): Promise<void> {
  const code = encodePetData(pet, scheduleEvents, meals, vetInfo, medications);
  await Share.share({
    message: `Import ${pet.name}'s full profile in PetPassport!\n\n${code}`,
  });
}

/**
 * Generate a short 6-character share code for real-time pet sharing.
 */
export function generateShareCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Share a pet's share code via the native share sheet.
 */
export async function shareLink(petName: string, code: string): Promise<void> {
  await Share.share({
    message: `Join ${petName}'s profile on PetPassport! Enter this share code: ${code}`,
  });
}
