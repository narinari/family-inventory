import { db } from '../lib/firebase-admin.js';
import {
  Item,
  CreateItemInput,
  UpdateItemInput,
  ConsumeItemInput,
  GiveItemInput,
  SellItemInput,
  ItemFilter,
  ItemLocation,
} from '@family-inventory/shared';
import { FieldValue, Timestamp, Query, DocumentData } from 'firebase-admin/firestore';
import { getItemTypeById } from './item-type.service.js';

function getItemsCollection(familyId: string) {
  return db.collection('families').doc(familyId).collection('items');
}

function getBoxesCollection(familyId: string) {
  return db.collection('families').doc(familyId).collection('boxes');
}

function getLocationsCollection(familyId: string) {
  return db.collection('families').doc(familyId).collection('locations');
}

function toItem(doc: FirebaseFirestore.DocumentSnapshot, familyId: string): Item {
  const data = doc.data()!;
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
  };
}

export async function getItems(familyId: string, filter?: ItemFilter): Promise<Item[]> {
  let query: Query<DocumentData> = getItemsCollection(familyId);

  if (filter?.status) {
    query = query.where('status', '==', filter.status);
  }
  if (filter?.ownerId) {
    query = query.where('ownerId', '==', filter.ownerId);
  }
  if (filter?.boxId) {
    query = query.where('boxId', '==', filter.boxId);
  }

  const snapshot = await query.orderBy('createdAt', 'desc').get();

  let items = snapshot.docs.map((doc) => toItem(doc, familyId));

  if (filter?.tags && filter.tags.length > 0) {
    items = items.filter((item) => filter.tags!.some((tag) => item.tags.includes(tag)));
  }

  return items;
}

export async function getItemById(familyId: string, id: string): Promise<Item | null> {
  const doc = await getItemsCollection(familyId).doc(id).get();
  if (!doc.exists) return null;
  return toItem(doc, familyId);
}

export async function createItem(
  familyId: string,
  ownerId: string,
  input: CreateItemInput
): Promise<Item> {
  const now = FieldValue.serverTimestamp();

  const itemData = {
    itemTypeId: input.itemTypeId,
    ownerId: input.ownerId || ownerId,
    status: 'owned',
    boxId: input.boxId || null,
    tags: input.tags || [],
    memo: input.memo || null,
    purchasedAt: input.purchasedAt ? Timestamp.fromDate(input.purchasedAt) : null,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await getItemsCollection(familyId).add(itemData);

  return {
    id: docRef.id,
    familyId,
    itemTypeId: input.itemTypeId,
    ownerId: input.ownerId || ownerId,
    status: 'owned',
    boxId: input.boxId,
    tags: input.tags || [],
    memo: input.memo,
    purchasedAt: input.purchasedAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function updateItem(
  familyId: string,
  id: string,
  input: UpdateItemInput
): Promise<Item | null> {
  const docRef = getItemsCollection(familyId).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) return null;

  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.ownerId !== undefined) updateData.ownerId = input.ownerId;
  if (input.boxId !== undefined) updateData.boxId = input.boxId;
  if (input.tags !== undefined) updateData.tags = input.tags;
  if (input.memo !== undefined) updateData.memo = input.memo;
  if (input.purchasedAt !== undefined) {
    updateData.purchasedAt = input.purchasedAt ? Timestamp.fromDate(input.purchasedAt) : null;
  }

  await docRef.update(updateData);
  return getItemById(familyId, id);
}

export async function consumeItem(
  familyId: string,
  id: string,
  input?: ConsumeItemInput
): Promise<Item | null> {
  const docRef = getItemsCollection(familyId).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.status !== 'owned') {
    throw new Error('INVALID_STATUS');
  }

  await docRef.update({
    status: 'consumed',
    consumedAt: input?.consumedAt ? Timestamp.fromDate(input.consumedAt) : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return getItemById(familyId, id);
}

export async function giveItem(
  familyId: string,
  id: string,
  input: GiveItemInput
): Promise<Item | null> {
  const docRef = getItemsCollection(familyId).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.status !== 'owned') {
    throw new Error('INVALID_STATUS');
  }

  await docRef.update({
    status: 'given',
    givenTo: input.givenTo,
    givenAt: input.givenAt ? Timestamp.fromDate(input.givenAt) : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return getItemById(familyId, id);
}

export async function sellItem(
  familyId: string,
  id: string,
  input?: SellItemInput
): Promise<Item | null> {
  const docRef = getItemsCollection(familyId).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.status !== 'owned') {
    throw new Error('INVALID_STATUS');
  }

  await docRef.update({
    status: 'sold',
    soldTo: input?.soldTo || null,
    soldPrice: input?.soldPrice || null,
    soldAt: input?.soldAt ? Timestamp.fromDate(input.soldAt) : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return getItemById(familyId, id);
}

export async function getItemLocation(familyId: string, id: string): Promise<ItemLocation | null> {
  const item = await getItemById(familyId, id);
  if (!item) return null;

  const itemType = await getItemTypeById(familyId, item.itemTypeId);
  if (!itemType) return null;

  let box = undefined;
  let location = undefined;

  if (item.boxId) {
    const boxDoc = await getBoxesCollection(familyId).doc(item.boxId).get();
    if (boxDoc.exists) {
      const boxData = boxDoc.data()!;
      box = {
        id: boxDoc.id,
        familyId,
        name: boxData.name,
        locationId: boxData.locationId || undefined,
        description: boxData.description || undefined,
        createdAt: (boxData.createdAt as Timestamp).toDate(),
        updatedAt: (boxData.updatedAt as Timestamp).toDate(),
      };

      if (boxData.locationId) {
        const locationDoc = await getLocationsCollection(familyId).doc(boxData.locationId).get();
        if (locationDoc.exists) {
          const locationData = locationDoc.data()!;
          location = {
            id: locationDoc.id,
            familyId,
            name: locationData.name,
            address: locationData.address || undefined,
            description: locationData.description || undefined,
            createdAt: (locationData.createdAt as Timestamp).toDate(),
            updatedAt: (locationData.updatedAt as Timestamp).toDate(),
          };
        }
      }
    }
  }

  return { item, itemType, box, location };
}
