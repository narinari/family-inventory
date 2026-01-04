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
  ItemWithRelatedTags,
  TagWithSource,
  TagSource,
} from '@family-inventory/shared';
import { FieldValue, Timestamp, Query, DocumentData } from 'firebase-admin/firestore';
import { getItemTypeById } from './item-type.service.js';
import { getTags } from './tag.service.js';

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
  if (filter?.typeId) {
    query = query.where('itemTypeId', '==', filter.typeId);
  }

  const snapshot = await query.orderBy('createdAt', 'desc').get();

  let items = snapshot.docs.map((doc) => toItem(doc, familyId));

  if (filter?.tags && filter.tags.length > 0) {
    if (filter.includeInheritedTags) {
      // 継承タグを含めた絞り込み
      const itemTypesSnapshot = await db.collection('families').doc(familyId).collection('itemTypes').get();
      const boxesSnapshot = await getBoxesCollection(familyId).get();
      const locationsSnapshot = await getLocationsCollection(familyId).get();

      const itemTypeTagsMap = new Map<string, string[]>();
      itemTypesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        itemTypeTagsMap.set(doc.id, data.tags || []);
      });

      const boxTagsMap = new Map<string, { tags: string[]; locationId?: string }>();
      boxesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        boxTagsMap.set(doc.id, { tags: data.tags || [], locationId: data.locationId });
      });

      const locationTagsMap = new Map<string, string[]>();
      locationsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        locationTagsMap.set(doc.id, data.tags || []);
      });

      items = items.filter((item) => {
        // アイテム自身のタグ
        const allTags = new Set<string>(item.tags);

        // アイテム種別のタグ
        const itemTypeTags = itemTypeTagsMap.get(item.itemTypeId) || [];
        itemTypeTags.forEach((tag) => allTags.add(tag));

        // 箱のタグと保管場所のタグ
        if (item.boxId) {
          const boxInfo = boxTagsMap.get(item.boxId);
          if (boxInfo) {
            boxInfo.tags.forEach((tag) => allTags.add(tag));
            if (boxInfo.locationId) {
              const locationTags = locationTagsMap.get(boxInfo.locationId) || [];
              locationTags.forEach((tag) => allTags.add(tag));
            }
          }
        }

        return filter.tags!.some((tag) => allTags.has(tag));
      });
    } else {
      // アイテム自身のタグのみで絞り込み
      items = items.filter((item) => filter.tags!.some((tag) => item.tags.includes(tag)));
    }
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
        tags: boxData.tags || [],
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
            tags: locationData.tags || [],
            createdAt: (locationData.createdAt as Timestamp).toDate(),
            updatedAt: (locationData.updatedAt as Timestamp).toDate(),
          };
        }
      }
    }
  }

  return { item, itemType, box, location };
}

function getUsersCollection(familyId: string) {
  return db.collection('families').doc(familyId).collection('users');
}

export async function getItemWithRelatedTags(
  familyId: string,
  id: string
): Promise<ItemWithRelatedTags | null> {
  const item = await getItemById(familyId, id);
  if (!item) return null;

  const itemType = await getItemTypeById(familyId, item.itemTypeId);
  if (!itemType) return null;

  // 全タグを取得してマップを作成
  const allTags = await getTags(familyId);
  const tagMap = new Map(allTags.map((t) => [t.id, t]));

  // 関連タグを収集
  const relatedTags: TagWithSource[] = [];

  // アイテム自身のタグ
  for (const tagId of item.tags) {
    const tag = tagMap.get(tagId);
    if (tag) {
      relatedTags.push({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        source: 'item' as TagSource,
      });
    }
  }

  // アイテム種別のタグ
  for (const tagId of itemType.tags) {
    const tag = tagMap.get(tagId);
    if (tag && !relatedTags.some((t) => t.id === tag.id)) {
      relatedTags.push({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        source: 'itemType' as TagSource,
      });
    }
  }

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
        tags: boxData.tags || [],
        createdAt: (boxData.createdAt as Timestamp).toDate(),
        updatedAt: (boxData.updatedAt as Timestamp).toDate(),
      };

      // 箱のタグ
      for (const tagId of box.tags) {
        const tag = tagMap.get(tagId);
        if (tag && !relatedTags.some((t) => t.id === tag.id)) {
          relatedTags.push({
            id: tag.id,
            name: tag.name,
            color: tag.color,
            source: 'box' as TagSource,
          });
        }
      }

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
            tags: locationData.tags || [],
            createdAt: (locationData.createdAt as Timestamp).toDate(),
            updatedAt: (locationData.updatedAt as Timestamp).toDate(),
          };

          // 保管場所のタグ
          for (const tagId of location.tags) {
            const tag = tagMap.get(tagId);
            if (tag && !relatedTags.some((t) => t.id === tag.id)) {
              relatedTags.push({
                id: tag.id,
                name: tag.name,
                color: tag.color,
                source: 'location' as TagSource,
              });
            }
          }
        }
      }
    }
  }

  // 所有者情報を取得
  let owner = undefined;
  const userDoc = await getUsersCollection(familyId).doc(item.ownerId).get();
  if (userDoc.exists) {
    const userData = userDoc.data()!;
    owner = {
      id: userDoc.id,
      displayName: userData.displayName || 'Unknown',
    };
  }

  return { item, itemType, owner, box, location, relatedTags };
}
