import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  setupTestEnv,
  cleanupTestEnv,
  getTestEnv,
  getAuthContext,
  getUnauthContext,
  withSecurityRulesDisabled,
  createTestUser,
  createTestFamily,
  assertFails,
  assertSucceeds,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from './setup';

describe('families collection', () => {
  const familyId1 = 'family-1';
  const familyId2 = 'family-2';
  const adminUserId = 'admin-user';
  const memberUserId = 'member-user';
  const otherUserId = 'other-user';

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
        await setDoc(doc(db, 'families', familyId1), createTestFamily(adminUserId));
      });

      const unauthDb = getUnauthContext().firestore();
      await assertFails(getDoc(doc(unauthDb, 'families', familyId1)));
    });

    it('should allow family member to read family data', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', memberUserId), createTestUser(familyId1));
        await setDoc(doc(db, 'families', familyId1), createTestFamily(adminUserId));
      });

      const authDb = getAuthContext(memberUserId).firestore();
      await assertSucceeds(getDoc(doc(authDb, 'families', familyId1)));
    });

    it('should deny non-family member from reading family data', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', otherUserId), createTestUser(familyId2));
        await setDoc(doc(db, 'families', familyId1), createTestFamily(adminUserId));
      });

      const authDb = getAuthContext(otherUserId).firestore();
      await assertFails(getDoc(doc(authDb, 'families', familyId1)));
    });
  });

  describe('create', () => {
    it('should allow authenticated user to create a family', async () => {
      const authDb = getAuthContext(adminUserId).firestore();
      const familyData = createTestFamily(adminUserId);

      await assertSucceeds(setDoc(doc(authDb, 'families', familyId1), familyData));
    });

    it('should deny creating family without required fields', async () => {
      const authDb = getAuthContext(adminUserId).firestore();
      const incompleteData = {
        name: 'Test Family',
      };

      await assertFails(setDoc(doc(authDb, 'families', familyId1), incompleteData));
    });

    it('should deny creating family with different createdBy', async () => {
      const authDb = getAuthContext(adminUserId).firestore();
      const familyData = createTestFamily(otherUserId);

      await assertFails(setDoc(doc(authDb, 'families', familyId1), familyData));
    });

    it('should deny creating family without authentication', async () => {
      const unauthDb = getUnauthContext().firestore();
      const familyData = createTestFamily(adminUserId);

      await assertFails(setDoc(doc(unauthDb, 'families', familyId1), familyData));
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', adminUserId), createTestUser(familyId1, 'admin'));
        await setDoc(doc(db, 'users', memberUserId), createTestUser(familyId1, 'member'));
        await setDoc(doc(db, 'families', familyId1), createTestFamily(adminUserId));
      });
    });

    it('should allow admin to update family', async () => {
      const authDb = getAuthContext(adminUserId).firestore();
      await assertSucceeds(
        updateDoc(doc(authDb, 'families', familyId1), {
          name: 'Updated Family Name',
        })
      );
    });

    it('should deny member from updating family', async () => {
      const authDb = getAuthContext(memberUserId).firestore();
      await assertFails(
        updateDoc(doc(authDb, 'families', familyId1), {
          name: 'Updated Family Name',
        })
      );
    });

    it('should deny non-member from updating family', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', otherUserId), createTestUser(familyId2, 'admin'));
      });

      const authDb = getAuthContext(otherUserId).firestore();
      await assertFails(
        updateDoc(doc(authDb, 'families', familyId1), {
          name: 'Updated Family Name',
        })
      );
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', adminUserId), createTestUser(familyId1, 'admin'));
        await setDoc(doc(db, 'families', familyId1), createTestFamily(adminUserId));
      });
    });

    it('should deny deleting family even by admin', async () => {
      const authDb = getAuthContext(adminUserId).firestore();
      await assertFails(deleteDoc(doc(authDb, 'families', familyId1)));
    });

    it('should deny deleting family by member', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', memberUserId), createTestUser(familyId1, 'member'));
      });

      const authDb = getAuthContext(memberUserId).firestore();
      await assertFails(deleteDoc(doc(authDb, 'families', familyId1)));
    });
  });
});
