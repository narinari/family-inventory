import { db } from '../lib/firebase-admin.js';
import {
  Wishlist,
  CreateWishlistInput,
  UpdateWishlistInput,
  WishlistFilter,
  Item,
} from '@family-inventory/shared';
import { FieldValue, Timestamp, Query, DocumentData } from 'firebase-admin/firestore';

function getWishlistCollection(familyId: string) {
  return db.collection('families').doc(familyId).collection('wishlist');
}

function getItemsCollection(familyId: string) {
  return db.collection('families').doc(familyId).collection('items');
}

function toWishlist(doc: FirebaseFirestore.DocumentSnapshot, familyId: string): Wishlist {
  const data = doc.data()!;
  return {
    id: doc.id,
    familyId,
    name: data.name,
    itemTypeId: data.itemTypeId || undefined,
    requesterId: data.requesterId,
    priority: data.priority,
    priceRange: data.priceRange || undefined,
    deadline: data.deadline ? (data.deadline as Timestamp).toDate() : undefined,
    url: data.url || undefined,
    tags: data.tags || [],
    memo: data.memo || undefined,
    status: data.status,
    createdAt: (data.createdAt as Timestamp).toDate(),
    updatedAt: (data.updatedAt as Timestamp).toDate(),
  };
}

export async function getWishlistItems(familyId: string, filter?: WishlistFilter): Promise<Wishlist[]> {
  let query: Query<DocumentData> = getWishlistCollection(familyId);

  if (filter?.status) {
    query = query.where('status', '==', filter.status);
  }
  if (filter?.requesterId) {
    query = query.where('requesterId', '==', filter.requesterId);
  }
  if (filter?.priority) {
    query = query.where('priority', '==', filter.priority);
  }

  const snapshot = await query.orderBy('createdAt', 'desc').get();

  let items = snapshot.docs.map((doc) => toWishlist(doc, familyId));

  if (filter?.tags && filter.tags.length > 0) {
    items = items.filter((item) => filter.tags!.some((tag) => item.tags.includes(tag)));
  }

  return items;
}

export async function getWishlistById(familyId: string, id: string): Promise<Wishlist | null> {
  const doc = await getWishlistCollection(familyId).doc(id).get();
  if (!doc.exists) return null;
  return toWishlist(doc, familyId);
}

export async function createWishlistItem(
  familyId: string,
  requesterId: string,
  input: CreateWishlistInput
): Promise<Wishlist> {
  const now = FieldValue.serverTimestamp();

  const wishlistData = {
    name: input.name,
    itemTypeId: input.itemTypeId || null,
    requesterId: input.requesterId || requesterId,
    priority: input.priority || 'medium',
    priceRange: input.priceRange || null,
    deadline: input.deadline ? Timestamp.fromDate(input.deadline) : null,
    url: input.url || null,
    tags: input.tags || [],
    memo: input.memo || null,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await getWishlistCollection(familyId).add(wishlistData);

  return {
    id: docRef.id,
    familyId,
    name: input.name,
    itemTypeId: input.itemTypeId,
    requesterId: input.requesterId || requesterId,
    priority: input.priority || 'medium',
    priceRange: input.priceRange,
    deadline: input.deadline,
    url: input.url,
    tags: input.tags || [],
    memo: input.memo,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function updateWishlistItem(
  familyId: string,
  id: string,
  input: UpdateWishlistInput
): Promise<Wishlist | null> {
  const docRef = getWishlistCollection(familyId).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) return null;

  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.itemTypeId !== undefined) updateData.itemTypeId = input.itemTypeId;
  if (input.requesterId !== undefined) updateData.requesterId = input.requesterId;
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.priceRange !== undefined) updateData.priceRange = input.priceRange;
  if (input.deadline !== undefined) {
    updateData.deadline = input.deadline ? Timestamp.fromDate(input.deadline) : null;
  }
  if (input.url !== undefined) updateData.url = input.url;
  if (input.tags !== undefined) updateData.tags = input.tags;
  if (input.memo !== undefined) updateData.memo = input.memo;

  await docRef.update(updateData);
  return getWishlistById(familyId, id);
}

export async function purchaseWishlistItem(
  familyId: string,
  id: string
): Promise<{ wishlist: Wishlist; item: Item } | null> {
  const docRef = getWishlistCollection(familyId).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.status !== 'pending') {
    throw new Error('INVALID_STATUS');
  }

  const now = FieldValue.serverTimestamp();

  // Update wishlist status
  await docRef.update({
    status: 'purchased',
    updatedAt: now,
  });

  // Create new item from wishlist
  const itemData = {
    itemTypeId: data.itemTypeId || null,
    ownerId: data.requesterId,
    status: 'owned',
    boxId: null,
    tags: data.tags || [],
    memo: data.memo || null,
    purchasedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const itemDocRef = await getItemsCollection(familyId).add(itemData);

  const wishlist = await getWishlistById(familyId, id);
  const item: Item = {
    id: itemDocRef.id,
    familyId,
    itemTypeId: data.itemTypeId || '',
    ownerId: data.requesterId,
    status: 'owned',
    tags: data.tags || [],
    memo: data.memo,
    purchasedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return { wishlist: wishlist!, item };
}

export async function cancelWishlistItem(familyId: string, id: string): Promise<Wishlist | null> {
  const docRef = getWishlistCollection(familyId).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.status !== 'pending') {
    throw new Error('INVALID_STATUS');
  }

  await docRef.update({
    status: 'cancelled',
    updatedAt: FieldValue.serverTimestamp(),
  });

  return getWishlistById(familyId, id);
}

export async function searchWishlistItems(
  familyId: string,
  query: string,
  status?: 'pending' | 'purchased' | 'cancelled'
): Promise<Wishlist[]> {
  const items = await getWishlistItems(familyId, status ? { status } : undefined);
  const lowerQuery = query.toLowerCase();

  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(lowerQuery) ||
      (item.memo && item.memo.toLowerCase().includes(lowerQuery))
  );
}
