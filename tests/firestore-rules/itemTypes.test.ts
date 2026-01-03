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
  createTestItemType,
  assertFails,
  assertSucceeds,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from './setup';

describe('families/{familyId}/itemTypes', () => {
  const familyId = 'test-family-1';
  const otherFamilyId = 'test-family-2';
  const memberId = 'member-user-1';
  const adminId = 'admin-user-1';
  const otherFamilyUserId = 'other-family-user';

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

      await setDoc(doc(db, 'families', familyId), createTestFamily(adminId));
      await setDoc(doc(db, 'families', otherFamilyId), createTestFamily(otherFamilyUserId));

      await setDoc(doc(db, 'users', memberId), createTestUser(familyId, 'member'));
      await setDoc(doc(db, 'users', adminId), createTestUser(familyId, 'admin'));
      await setDoc(doc(db, 'users', otherFamilyUserId), createTestUser(otherFamilyId, 'member'));
    });
  });

  describe('read', () => {
    it('should deny unauthenticated access', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, 'families', familyId, 'itemTypes', 'type-1'),
          createTestItemType()
        );
      });

      const unauthDb = getUnauthContext().firestore();
      await assertFails(
        getDoc(doc(unauthDb, 'families', familyId, 'itemTypes', 'type-1'))
      );
    });

    it('should allow family member to read', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, 'families', familyId, 'itemTypes', 'type-1'),
          createTestItemType()
        );
      });

      const authDb = getAuthContext(memberId).firestore();
      await assertSucceeds(
        getDoc(doc(authDb, 'families', familyId, 'itemTypes', 'type-1'))
      );
    });

    it('should deny access to other family data', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, 'families', otherFamilyId, 'itemTypes', 'type-1'),
          createTestItemType()
        );
      });

      const authDb = getAuthContext(memberId).firestore();
      await assertFails(
        getDoc(doc(authDb, 'families', otherFamilyId, 'itemTypes', 'type-1'))
      );
    });
  });

  describe('create', () => {
    it('should deny unauthenticated create', async () => {
      const unauthDb = getUnauthContext().firestore();
      await assertFails(
        setDoc(
          doc(unauthDb, 'families', familyId, 'itemTypes', 'type-1'),
          createTestItemType()
        )
      );
    });

    it('should allow family member to create with required fields', async () => {
      const authDb = getAuthContext(memberId).firestore();
      await assertSucceeds(
        setDoc(
          doc(authDb, 'families', familyId, 'itemTypes', 'type-1'),
          createTestItemType()
        )
      );
    });

    it('should deny create without required name field', async () => {
      const authDb = getAuthContext(memberId).firestore();
      await assertFails(
        setDoc(doc(authDb, 'families', familyId, 'itemTypes', 'type-1'), {
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );
    });

    it('should deny create in other family', async () => {
      const authDb = getAuthContext(memberId).firestore();
      await assertFails(
        setDoc(
          doc(authDb, 'families', otherFamilyId, 'itemTypes', 'type-1'),
          createTestItemType()
        )
      );
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, 'families', familyId, 'itemTypes', 'type-1'),
          createTestItemType()
        );
      });
    });

    it('should deny unauthenticated update', async () => {
      const unauthDb = getUnauthContext().firestore();
      await assertFails(
        updateDoc(doc(unauthDb, 'families', familyId, 'itemTypes', 'type-1'), {
          name: 'Updated Name',
        })
      );
    });

    it('should allow family member to update', async () => {
      const authDb = getAuthContext(memberId).firestore();
      await assertSucceeds(
        updateDoc(doc(authDb, 'families', familyId, 'itemTypes', 'type-1'), {
          name: 'Updated Name',
        })
      );
    });

    it('should deny update in other family', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, 'families', otherFamilyId, 'itemTypes', 'type-1'),
          createTestItemType()
        );
      });

      const authDb = getAuthContext(memberId).firestore();
      await assertFails(
        updateDoc(doc(authDb, 'families', otherFamilyId, 'itemTypes', 'type-1'), {
          name: 'Updated Name',
        })
      );
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, 'families', familyId, 'itemTypes', 'type-1'),
          createTestItemType()
        );
      });
    });

    it('should deny unauthenticated delete', async () => {
      const unauthDb = getUnauthContext().firestore();
      await assertFails(
        deleteDoc(doc(unauthDb, 'families', familyId, 'itemTypes', 'type-1'))
      );
    });

    it('should deny member delete', async () => {
      const authDb = getAuthContext(memberId).firestore();
      await assertFails(
        deleteDoc(doc(authDb, 'families', familyId, 'itemTypes', 'type-1'))
      );
    });

    it('should allow admin to delete', async () => {
      const authDb = getAuthContext(adminId).firestore();
      await assertSucceeds(
        deleteDoc(doc(authDb, 'families', familyId, 'itemTypes', 'type-1'))
      );
    });

    it('should deny admin delete in other family', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, 'families', otherFamilyId, 'itemTypes', 'type-1'),
          createTestItemType()
        );
      });

      const authDb = getAuthContext(adminId).firestore();
      await assertFails(
        deleteDoc(doc(authDb, 'families', otherFamilyId, 'itemTypes', 'type-1'))
      );
    });
  });
});
