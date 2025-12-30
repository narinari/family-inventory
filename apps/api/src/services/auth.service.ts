import { db } from '../lib/firebase-admin.js';
import {
  User,
  Family,
  InviteCode,
  AuthUser,
  generateInviteCode,
  calculateExpiryDate,
  isInviteCodeExpired,
  normalizeInviteCode,
} from '@family-inventory/shared';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const usersCollection = db.collection('users');
const familiesCollection = db.collection('families');
const inviteCodesCollection = db.collection('inviteCodes');

export async function getUserByUid(uid: string): Promise<User | null> {
  const doc = await usersCollection.doc(uid).get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  return {
    id: doc.id,
    ...data,
    createdAt: (data.createdAt as Timestamp).toDate(),
    updatedAt: (data.updatedAt as Timestamp).toDate(),
  } as User;
}

export async function createUser(
  authUser: AuthUser,
  familyId: string,
  isAdmin: boolean = false
): Promise<User> {
  const now = FieldValue.serverTimestamp();

  const userData = {
    email: authUser.email,
    displayName: authUser.displayName || authUser.email.split('@')[0],
    photoURL: authUser.photoURL || null,
    role: isAdmin ? 'admin' : 'member',
    familyId,
    createdAt: now,
    updatedAt: now,
  };

  await usersCollection.doc(authUser.uid).set(userData);

  return {
    id: authUser.uid,
    ...userData,
    role: isAdmin ? 'admin' : 'member',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;
}

export async function createFamily(creatorUid: string, name: string = 'マイファミリー'): Promise<Family> {
  const now = FieldValue.serverTimestamp();

  const familyData = {
    name,
    createdBy: creatorUid,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await familiesCollection.add(familyData);

  return {
    id: docRef.id,
    ...familyData,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Family;
}

export async function createInviteCode(
  familyId: string,
  createdBy: string,
  expiresInDays: number = 7
): Promise<InviteCode> {
  const code = generateInviteCode();
  const expiresAt = calculateExpiryDate(expiresInDays);
  const now = FieldValue.serverTimestamp();

  const inviteCodeData = {
    code,
    familyId,
    createdBy,
    status: 'active',
    expiresAt: Timestamp.fromDate(expiresAt),
    createdAt: now,
  };

  const docRef = await inviteCodesCollection.add(inviteCodeData);

  return {
    id: docRef.id,
    ...inviteCodeData,
    status: 'active',
    expiresAt,
    createdAt: new Date(),
  } as InviteCode;
}

export async function validateInviteCode(
  code: string
): Promise<{ valid: boolean; familyId?: string; inviteCodeId?: string; error?: string }> {
  const normalizedCode = normalizeInviteCode(code);

  const snapshot = await inviteCodesCollection
    .where('code', '==', normalizedCode)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (snapshot.empty) {
    return { valid: false, error: '招待コードが見つかりません' };
  }

  const doc = snapshot.docs[0];
  const data = doc.data();
  const expiresAt = (data.expiresAt as Timestamp).toDate();

  if (isInviteCodeExpired(expiresAt)) {
    await doc.ref.update({ status: 'expired' });
    return { valid: false, error: '招待コードの有効期限が切れています' };
  }

  return {
    valid: true,
    familyId: data.familyId,
    inviteCodeId: doc.id,
  };
}

export async function useInviteCode(inviteCodeId: string, usedBy: string): Promise<void> {
  await inviteCodesCollection.doc(inviteCodeId).update({
    status: 'used',
    usedBy,
    usedAt: FieldValue.serverTimestamp(),
  });
}

export async function getFamilyMembers(familyId: string): Promise<User[]> {
  const snapshot = await usersCollection.where('familyId', '==', familyId).get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate(),
      updatedAt: (data.updatedAt as Timestamp).toDate(),
    } as User;
  });
}

export async function getFamilyInviteCodes(familyId: string): Promise<InviteCode[]> {
  const snapshot = await inviteCodesCollection
    .where('familyId', '==', familyId)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      expiresAt: (data.expiresAt as Timestamp).toDate(),
      createdAt: (data.createdAt as Timestamp).toDate(),
      usedAt: data.usedAt ? (data.usedAt as Timestamp).toDate() : undefined,
    } as InviteCode;
  });
}
