import { db } from '../lib/firebase-admin.js';
import { Location, CreateLocationInput, UpdateLocationInput, Box } from '@family-inventory/shared';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

function getLocationsCollection(familyId: string) {
  return db.collection('families').doc(familyId).collection('locations');
}

function getBoxesCollection(familyId: string) {
  return db.collection('families').doc(familyId).collection('boxes');
}

function toLocation(doc: FirebaseFirestore.DocumentSnapshot, familyId: string): Location {
  const data = doc.data()!;
  return {
    id: doc.id,
    familyId,
    name: data.name,
    address: data.address || undefined,
    description: data.description || undefined,
    tags: data.tags || [],
    createdAt: (data.createdAt as Timestamp).toDate(),
    updatedAt: (data.updatedAt as Timestamp).toDate(),
  };
}

export async function getLocations(familyId: string): Promise<Location[]> {
  const snapshot = await getLocationsCollection(familyId).orderBy('name').get();
  return snapshot.docs.map((doc) => toLocation(doc, familyId));
}

export async function getLocationById(familyId: string, id: string): Promise<Location | null> {
  const doc = await getLocationsCollection(familyId).doc(id).get();
  if (!doc.exists) return null;
  return toLocation(doc, familyId);
}

export async function createLocation(familyId: string, input: CreateLocationInput): Promise<Location> {
  const now = FieldValue.serverTimestamp();

  const locationData = {
    name: input.name,
    address: input.address || null,
    description: input.description || null,
    tags: input.tags || [],
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await getLocationsCollection(familyId).add(locationData);

  return {
    id: docRef.id,
    familyId,
    name: input.name,
    address: input.address,
    description: input.description,
    tags: input.tags || [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function updateLocation(
  familyId: string,
  id: string,
  input: UpdateLocationInput
): Promise<Location | null> {
  const docRef = getLocationsCollection(familyId).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) return null;

  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.address !== undefined) updateData.address = input.address;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.tags !== undefined) updateData.tags = input.tags;

  await docRef.update(updateData);
  return getLocationById(familyId, id);
}

export async function deleteLocation(familyId: string, id: string): Promise<boolean> {
  const docRef = getLocationsCollection(familyId).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) return false;

  await docRef.delete();
  return true;
}

export async function isLocationInUse(familyId: string, locationId: string): Promise<boolean> {
  const snapshot = await getBoxesCollection(familyId)
    .where('locationId', '==', locationId)
    .limit(1)
    .get();

  return !snapshot.empty;
}

export async function getLocationBoxes(familyId: string, locationId: string): Promise<Box[]> {
  const snapshot = await getBoxesCollection(familyId)
    .where('locationId', '==', locationId)
    .orderBy('name')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      familyId,
      name: data.name,
      locationId: data.locationId || undefined,
      description: data.description || undefined,
      tags: data.tags || [],
      createdAt: (data.createdAt as Timestamp).toDate(),
      updatedAt: (data.updatedAt as Timestamp).toDate(),
    } as Box;
  });
}
