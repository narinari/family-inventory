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
  createTestItem,
  assertFails,
  assertSucceeds,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from './setup';

describe('families/{familyId}/items subcollection', () => {
  const familyId1 = 'family-1';
  const familyId2 = 'family-2';
  const adminUserId = 'admin-user';
  const memberUserId = 'member-user';
  const otherUserId = 'other-user';
  const itemId1 = 'item-1';
  const itemTypeId = 'item-type-1';

  beforeAll(async () => {
    await setupTestEnv();
  });

  afterAll(async () => {
    await cleanupTestEnv();
  });

  beforeEach(async () => {
    await getTestEnv().clearFirestore();
    await withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'users', adminUserId), createTestUser(familyId1, 'admin'));
      await setDoc(doc(db, 'users', memberUserId), createTestUser(familyId1, 'member'));
      await setDoc(doc(db, 'families', familyId1), createTestFamily(adminUserId));
    });
  });

  describe('read', () => {
    beforeEach(async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, 'families', familyId1, 'items', itemId1),
          createTestItem(itemTypeId, memberUserId)
        );
      });
    });

    it('should deny access without authentication', async () => {
      const unauthDb = getUnauthContext().firestore();
      await assertFails(getDoc(doc(unauthDb, 'families', familyId1, 'items', itemId1)));
    });

    it('should allow family member to read items', async () => {
      const authDb = getAuthContext(memberUserId).firestore();
      await assertSucceeds(getDoc(doc(authDb, 'families', familyId1, 'items', itemId1)));
    });

    it('should allow family admin to read items', async () => {
      const authDb = getAuthContext(adminUserId).firestore();
      await assertSucceeds(getDoc(doc(authDb, 'families', familyId1, 'items', itemId1)));
    });

    it('should deny non-family member from reading items', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', otherUserId), createTestUser(familyId2));
      });

      const authDb = getAuthContext(otherUserId).firestore();
      await assertFails(getDoc(doc(authDb, 'families', familyId1, 'items', itemId1)));
    });
  });

  describe('create', () => {
    it('should allow family member to create item with required fields', async () => {
      const authDb = getAuthContext(memberUserId).firestore();
      const itemData = createTestItem(itemTypeId, memberUserId);

      await assertSucceeds(setDoc(doc(authDb, 'families', familyId1, 'items', itemId1), itemData));
    });

    it('should allow family admin to create item', async () => {
      const authDb = getAuthContext(adminUserId).firestore();
      const itemData = createTestItem(itemTypeId, adminUserId);

      await assertSucceeds(setDoc(doc(authDb, 'families', familyId1, 'items', itemId1), itemData));
    });

    it('should deny creating item without required fields', async () => {
      const authDb = getAuthContext(memberUserId).firestore();
      const incompleteData = {
        name: 'Test Item',
        createdAt: new Date(),
      };

      await assertFails(
        setDoc(doc(authDb, 'families', familyId1, 'items', itemId1), incompleteData)
      );
    });

    it('should deny non-family member from creating item', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', otherUserId), createTestUser(familyId2));
      });

      const authDb = getAuthContext(otherUserId).firestore();
      const itemData = createTestItem(itemTypeId, otherUserId);

      await assertFails(setDoc(doc(authDb, 'families', familyId1, 'items', itemId1), itemData));
    });

    it('should deny unauthenticated user from creating item', async () => {
      const unauthDb = getUnauthContext().firestore();
      const itemData = createTestItem(itemTypeId, memberUserId);

      await assertFails(setDoc(doc(unauthDb, 'families', familyId1, 'items', itemId1), itemData));
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, 'families', familyId1, 'items', itemId1),
          createTestItem(itemTypeId, memberUserId)
        );
      });
    });

    it('should allow family member to update item', async () => {
      const authDb = getAuthContext(memberUserId).firestore();
      await assertSucceeds(
        updateDoc(doc(authDb, 'families', familyId1, 'items', itemId1), {
          name: 'Updated Item Name',
          status: 'consumed',
        })
      );
    });

    it('should allow family admin to update item', async () => {
      const authDb = getAuthContext(adminUserId).firestore();
      await assertSucceeds(
        updateDoc(doc(authDb, 'families', familyId1, 'items', itemId1), {
          name: 'Updated Item Name',
        })
      );
    });

    it('should deny non-family member from updating item', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', otherUserId), createTestUser(familyId2));
      });

      const authDb = getAuthContext(otherUserId).firestore();
      await assertFails(
        updateDoc(doc(authDb, 'families', familyId1, 'items', itemId1), {
          name: 'Updated Item Name',
        })
      );
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, 'families', familyId1, 'items', itemId1),
          createTestItem(itemTypeId, memberUserId)
        );
      });
    });

    it('should allow family admin to delete item', async () => {
      const authDb = getAuthContext(adminUserId).firestore();
      await assertSucceeds(deleteDoc(doc(authDb, 'families', familyId1, 'items', itemId1)));
    });

    it('should deny family member from deleting item', async () => {
      const authDb = getAuthContext(memberUserId).firestore();
      await assertFails(deleteDoc(doc(authDb, 'families', familyId1, 'items', itemId1)));
    });

    it('should deny non-family member from deleting item', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', otherUserId), createTestUser(familyId2, 'admin'));
      });

      const authDb = getAuthContext(otherUserId).firestore();
      await assertFails(deleteDoc(doc(authDb, 'families', familyId1, 'items', itemId1)));
    });
  });
});
