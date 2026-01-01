import { db } from '../lib/firebase-admin.js';
import { Tag, CreateTagInput, UpdateTagInput } from '@family-inventory/shared';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

function getTagsCollection(familyId: string) {
  return db.collection('families').doc(familyId).collection('tags');
}

function toTag(doc: FirebaseFirestore.DocumentSnapshot, familyId: string): Tag {
  const data = doc.data()!;
  return {
    id: doc.id,
    familyId,
    name: data.name,
    color: data.color || undefined,
    createdAt: (data.createdAt as Timestamp).toDate(),
    updatedAt: (data.updatedAt as Timestamp).toDate(),
  };
}

export async function getTags(familyId: string): Promise<Tag[]> {
  const snapshot = await getTagsCollection(familyId).orderBy('name').get();
  return snapshot.docs.map((doc) => toTag(doc, familyId));
}

export async function getTagById(familyId: string, id: string): Promise<Tag | null> {
  const doc = await getTagsCollection(familyId).doc(id).get();
  if (!doc.exists) return null;
  return toTag(doc, familyId);
}

export async function createTag(familyId: string, input: CreateTagInput): Promise<Tag> {
  const now = FieldValue.serverTimestamp();

  const tagData = {
    name: input.name,
    color: input.color || null,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await getTagsCollection(familyId).add(tagData);

  return {
    id: docRef.id,
    familyId,
    name: input.name,
    color: input.color,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function updateTag(
  familyId: string,
  id: string,
  input: UpdateTagInput
): Promise<Tag | null> {
  const docRef = getTagsCollection(familyId).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) return null;

  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.color !== undefined) updateData.color = input.color;

  await docRef.update(updateData);
  return getTagById(familyId, id);
}

export async function deleteTag(familyId: string, id: string): Promise<boolean> {
  const docRef = getTagsCollection(familyId).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) return false;

  await docRef.delete();
  return true;
}
