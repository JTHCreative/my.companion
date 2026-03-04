import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Message } from '../types';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function messagesRef(petId: string) {
  return collection(db, 'pets', petId, 'messages');
}

function messageRef(petId: string, messageId: string) {
  return doc(db, 'pets', petId, 'messages', messageId);
}

export function subscribeToMessages(
  petId: string,
  callback: (messages: Message[]) => void,
): () => void {
  const q = query(messagesRef(petId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(
      (d) => ({ ...d.data(), id: d.id } as Message),
    );
    callback(messages);
  });
}

export async function addMessage(message: Message): Promise<void> {
  await setDoc(messageRef(message.petId, message.id), {
    petId: message.petId,
    authorUid: message.authorUid,
    authorName: message.authorName,
    text: message.text,
    createdAt: message.createdAt,
    pinned: false,
    ...(message.replyTo ? { replyTo: message.replyTo } : {}),
  });
}

export async function deleteMessage(petId: string, messageId: string): Promise<void> {
  await deleteDoc(messageRef(petId, messageId));
}

export async function togglePinMessage(
  petId: string,
  messageId: string,
  pinned: boolean,
): Promise<void> {
  await updateDoc(messageRef(petId, messageId), { pinned });
}

export async function cleanupOldMessages(petId: string): Promise<void> {
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  const q = query(
    messagesRef(petId),
    where('pinned', '==', false),
    where('createdAt', '<', cutoff),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return;

  const batch = writeBatch(db);
  for (const docSnap of snapshot.docs) {
    batch.delete(docSnap.ref);
  }
  await batch.commit();
}
