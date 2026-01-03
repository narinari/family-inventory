import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  setupTestEnv,
  cleanupTestEnv,
  getTestEnv,
  getAuthContext,
  getUnauthContext,
  withSecurityRulesDisabled,
  createTestUser,
  assertFails,
  assertSucceeds,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from './setup';

describe('users collection', () => {
  const familyId1 = 'family-1';
  const familyId2 = 'family-2';
  const userId1 = 'user-1';
  const userId2 = 'user-2';
  const userId3 = 'user-3';

  beforeAll(async () => {
    await setupTestEnv();
  });

  afterAll(async () => {
    await cleanupTestEnv();
  });

  beforeEach(async () => {
    await getTestEnv().clearFirestore();
  });

  describe('read', () => {
    it('should deny access without authentication', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', userId1), createTestUser(familyId1));
      });

      const unauthDb = getUnauthContext().firestore();
      await assertFails(getDoc(doc(unauthDb, 'users', userId1)));
    });

    it('should allow reading own data with authentication', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', userId1), createTestUser(familyId1));
      });

      const authDb = getAuthContext(userId1).firestore();
      await assertSucceeds(getDoc(doc(authDb, 'users', userId1)));
    });

    it('should allow reading data of users in the same family', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', userId1), createTestUser(familyId1));
        await setDoc(doc(db, 'users', userId2), createTestUser(familyId1));
      });

      const authDb = getAuthContext(userId1).firestore();
      await assertSucceeds(getDoc(doc(authDb, 'users', userId2)));
    });

    it('should deny reading data of users in different family', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', userId1), createTestUser(familyId1));
        await setDoc(doc(db, 'users', userId2), createTestUser(familyId2));
      });

      const authDb = getAuthContext(userId1).firestore();
      await assertFails(getDoc(doc(authDb, 'users', userId2)));
    });
  });

  describe('create', () => {
    it('should allow creating own document with required fields', async () => {
      const authDb = getAuthContext(userId1).firestore();
      const userData = createTestUser(familyId1);

      await assertSucceeds(setDoc(doc(authDb, 'users', userId1), userData));
    });

    it('should deny creating document for another user', async () => {
      const authDb = getAuthContext(userId1).firestore();
      const userData = createTestUser(familyId1);

      await assertFails(setDoc(doc(authDb, 'users', userId2), userData));
    });

    it('should deny creating document without required fields', async () => {
      const authDb = getAuthContext(userId1).firestore();
      const incompleteData = {
        email: 'test@example.com',
        displayName: 'Test User',
      };

      await assertFails(setDoc(doc(authDb, 'users', userId1), incompleteData));
    });

    it('should deny creating document with invalid role', async () => {
      const authDb = getAuthContext(userId1).firestore();
      const invalidData = {
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'superadmin',
        familyId: familyId1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await assertFails(setDoc(doc(authDb, 'users', userId1), invalidData));
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', userId1), createTestUser(familyId1));
        await setDoc(doc(db, 'users', userId2), createTestUser(familyId1));
      });
    });

    it('should allow updating own document', async () => {
      const authDb = getAuthContext(userId1).firestore();
      await assertSucceeds(
        updateDoc(doc(authDb, 'users', userId1), {
          displayName: 'Updated Name',
          role: 'member',
          familyId: familyId1,
        })
      );
    });

    it('should deny updating another user document', async () => {
      const authDb = getAuthContext(userId1).firestore();
      await assertFails(
        updateDoc(doc(authDb, 'users', userId2), {
          displayName: 'Updated Name',
          role: 'member',
          familyId: familyId1,
        })
      );
    });

    it('should deny changing role', async () => {
      const authDb = getAuthContext(userId1).firestore();
      await assertFails(
        updateDoc(doc(authDb, 'users', userId1), {
          role: 'admin',
          familyId: familyId1,
        })
      );
    });

    it('should deny changing familyId', async () => {
      const authDb = getAuthContext(userId1).firestore();
      await assertFails(
        updateDoc(doc(authDb, 'users', userId1), {
          role: 'member',
          familyId: familyId2,
        })
      );
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', userId1), createTestUser(familyId1, 'admin'));
      });
    });

    it('should deny deleting own document', async () => {
      const authDb = getAuthContext(userId1).firestore();
      await assertFails(deleteDoc(doc(authDb, 'users', userId1)));
    });

    it('should deny deleting any user document', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', userId2), createTestUser(familyId1));
      });

      const authDb = getAuthContext(userId1).firestore();
      await assertFails(deleteDoc(doc(authDb, 'users', userId2)));
    });
  });
});
