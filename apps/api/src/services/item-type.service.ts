import { db } from '../lib/firebase-admin.js';
import { ItemType, CreateItemTypeInput, UpdateItemTypeInput } from '@family-inventory/shared';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

function getItemTypesCollection(familyId: string) {
  return db.collection('families').doc(familyId).collection('itemTypes');
}

export async function getItemTypes(familyId: string): Promise<ItemType[]> {
  const snapshot = await getItemTypesCollection(familyId).orderBy('name').get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      familyId,
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate(),
      updatedAt: (data.updatedAt as Timestamp).toDate(),
    } as ItemType;
  });
}

export async function getItemTypeById(familyId: string, id: string): Promise<ItemType | null> {
  const doc = await getItemTypesCollection(familyId).doc(id).get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  return {
    id: doc.id,
    familyId,
    ...data,
    createdAt: (data.createdAt as Timestamp).toDate(),
    updatedAt: (data.updatedAt as Timestamp).toDate(),
  } as ItemType;
}

export async function createItemType(
  familyId: string,
  input: CreateItemTypeInput
): Promise<ItemType> {
  const now = FieldValue.serverTimestamp();

  const itemTypeData = {
    name: input.name,
    manufacturer: input.manufacturer || null,
    description: input.description || null,
    tags: input.tags || [],
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await getItemTypesCollection(familyId).add(itemTypeData);

  return {
    id: docRef.id,
    familyId,
    name: input.name,
    manufacturer: input.manufacturer,
    description: input.description,
    tags: input.tags || [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function updateItemType(
  familyId: string,
  id: string,
  input: UpdateItemTypeInput
): Promise<ItemType | null> {
  const docRef = getItemTypesCollection(familyId).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) return null;

  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.manufacturer !== undefined) updateData.manufacturer = input.manufacturer;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.tags !== undefined) updateData.tags = input.tags;

  await docRef.update(updateData);

  return getItemTypeById(familyId, id);
}

export async function deleteItemType(familyId: string, id: string): Promise<boolean> {
  const docRef = getItemTypesCollection(familyId).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) return false;

  await docRef.delete();
  return true;
}

export async function isItemTypeInUse(familyId: string, itemTypeId: string): Promise<boolean> {
  const itemsSnapshot = await db
    .collection('families')
    .doc(familyId)
    .collection('items')
    .where('itemTypeId', '==', itemTypeId)
    .limit(1)
    .get();

  return !itemsSnapshot.empty;
}
