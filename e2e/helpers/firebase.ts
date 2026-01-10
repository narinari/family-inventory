import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Emulator 用の環境変数設定
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
process.env.GCLOUD_PROJECT = 'demo-family-inventory';
process.env.GOOGLE_CLOUD_PROJECT = 'demo-family-inventory';

const PROJECT_ID = 'demo-family-inventory';

// Admin SDK 初期化（既存アプリがあれば再利用）
function getAdminApp() {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0];
  }
  return initializeApp({ projectId: PROJECT_ID });
}

const app = getAdminApp();
export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);

/**
 * Firestore の全データをクリア
 */
export async function clearFirestore(): Promise<void> {
  const response = await fetch(
    `http://localhost:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' }
  );
  if (!response.ok) {
    throw new Error(`Failed to clear Firestore: ${response.statusText}`);
  }
}

/**
 * Firebase Auth の全ユーザーをクリア
 */
export async function clearAuth(): Promise<void> {
  const response = await fetch(
    `http://localhost:9099/emulator/v1/projects/${PROJECT_ID}/accounts`,
    { method: 'DELETE' }
  );
  if (!response.ok) {
    throw new Error(`Failed to clear Auth: ${response.statusText}`);
  }
}

/**
 * テストユーザーを Firebase Auth に作成
 */
export async function createTestUser(
  uid: string,
  email: string,
  displayName: string
): Promise<void> {
  try {
    await adminAuth.deleteUser(uid);
  } catch {
    // ユーザーが存在しない場合は無視
  }

  await adminAuth.createUser({
    uid,
    email,
    displayName,
    emailVerified: true,
  });
}

/**
 * カスタムトークンを生成（e2e テストの認証用）
 */
export async function createCustomToken(uid: string): Promise<string> {
  return adminAuth.createCustomToken(uid);
}

/**
 * テストデータをセットアップ
 */
export async function setupTestData(data: {
  users?: Array<{ id: string; data: Record<string, unknown> }>;
  families?: Array<{ id: string; data: Record<string, unknown> }>;
  items?: Array<{ familyId: string; id: string; data: Record<string, unknown> }>;
  itemTypes?: Array<{
    familyId: string;
    id: string;
    data: Record<string, unknown>;
  }>;
  boxes?: Array<{ familyId: string; id: string; data: Record<string, unknown> }>;
  locations?: Array<{
    familyId: string;
    id: string;
    data: Record<string, unknown>;
  }>;
}): Promise<void> {
  const batch = adminDb.batch();

  if (data.users) {
    for (const user of data.users) {
      batch.set(adminDb.collection('users').doc(user.id), user.data);
    }
  }

  if (data.families) {
    for (const family of data.families) {
      batch.set(adminDb.collection('families').doc(family.id), family.data);
    }
  }

  if (data.items) {
    for (const item of data.items) {
      batch.set(
        adminDb
          .collection('families')
          .doc(item.familyId)
          .collection('items')
          .doc(item.id),
        item.data
      );
    }
  }

  if (data.itemTypes) {
    for (const itemType of data.itemTypes) {
      batch.set(
        adminDb
          .collection('families')
          .doc(itemType.familyId)
          .collection('itemTypes')
          .doc(itemType.id),
        itemType.data
      );
    }
  }

  if (data.boxes) {
    for (const box of data.boxes) {
      batch.set(
        adminDb
          .collection('families')
          .doc(box.familyId)
          .collection('boxes')
          .doc(box.id),
        box.data
      );
    }
  }

  if (data.locations) {
    for (const location of data.locations) {
      batch.set(
        adminDb
          .collection('families')
          .doc(location.familyId)
          .collection('locations')
          .doc(location.id),
        location.data
      );
    }
  }

  await batch.commit();
}

