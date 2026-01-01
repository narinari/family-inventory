import { db } from '../lib/firebase-admin.js';
import { Box, CreateBoxInput, UpdateBoxInput, Item } from '@family-inventory/shared';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

function getBoxesCollection(familyId: string) {
  return db.collection('families').doc(familyId).collection('boxes');
}

function getItemsCollection(familyId: string) {
  return db.collection('families').doc(familyId).collection('items');
}

function toBox(doc: FirebaseFirestore.DocumentSnapshot, familyId: string): Box {
  const data = doc.data()!;
  return {
    id: doc.id,
    familyId,
    name: data.name,
    locationId: data.locationId || undefined,
    description: data.description || undefined,
    createdAt: (data.createdAt as Timestamp).toDate(),
    updatedAt: (data.updatedAt as Timestamp).toDate(),
  };
}

export async function getBoxes(familyId: string): Promise<Box[]> {
  const snapshot = await getBoxesCollection(familyId).orderBy('name').get();
  return snapshot.docs.map((doc) => toBox(doc, familyId));
}

export async function getBoxById(familyId: string, id: string): Promise<Box | null> {
  const doc = await getBoxesCollection(familyId).doc(id).get();
  if (!doc.exists) return null;
  return toBox(doc, familyId);
}

export async function createBox(familyId: string, input: CreateBoxInput): Promise<Box> {
  const now = FieldValue.serverTimestamp();

  const boxData = {
    name: input.name,
    locationId: input.locationId || null,
    description: input.description || null,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await getBoxesCollection(familyId).add(boxData);

  return {
    id: docRef.id,
    familyId,
    name: input.name,
    locationId: input.locationId,
    description: input.description,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function updateBox(
  familyId: string,
  id: string,
  input: UpdateBoxInput
): Promise<Box | null> {
  const docRef = getBoxesCollection(familyId).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) return null;

  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.locationId !== undefined) updateData.locationId = input.locationId;
  if (input.description !== undefined) updateData.description = input.description;

  await docRef.update(updateData);
  return getBoxById(familyId, id);
}

export async function deleteBox(familyId: string, id: string): Promise<boolean> {
  const docRef = getBoxesCollection(familyId).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) return false;

  await docRef.delete();
  return true;
}

export async function isBoxInUse(familyId: string, boxId: string): Promise<boolean> {
  const snapshot = await getItemsCollection(familyId)
    .where('boxId', '==', boxId)
    .limit(1)
    .get();

  return !snapshot.empty;
}

export async function getBoxItems(familyId: string, boxId: string): Promise<Item[]> {
  const snapshot = await getItemsCollection(familyId)
    .where('boxId', '==', boxId)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      familyId,
      itemTypeId: data.itemTypeId,
      ownerId: data.ownerId,
      status: data.status,
      boxId: data.boxId || undefined,
      tags: data.tags || [],
      memo: data.memo || undefined,
      purchasedAt: data.purchasedAt ? (data.purchasedAt as Timestamp).toDate() : undefined,
      consumedAt: data.consumedAt ? (data.consumedAt as Timestamp).toDate() : undefined,
      givenAt: data.givenAt ? (data.givenAt as Timestamp).toDate() : undefined,
      soldAt: data.soldAt ? (data.soldAt as Timestamp).toDate() : undefined,
      givenTo: data.givenTo || undefined,
      soldTo: data.soldTo || undefined,
      soldPrice: data.soldPrice || undefined,
      createdAt: (data.createdAt as Timestamp).toDate(),
      updatedAt: (data.updatedAt as Timestamp).toDate(),
    } as Item;
  });
}
