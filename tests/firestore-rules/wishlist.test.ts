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
  createTestWishlistItem,
  assertFails,
  assertSucceeds,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from './setup';

describe('families/{familyId}/wishlist', () => {
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
          doc(db, 'families', familyId, 'wishlist', 'wish-1'),
          createTestWishlistItem(memberId)
        );
      });

      const unauthDb = getUnauthContext().firestore();
      await assertFails(
        getDoc(doc(unauthDb, 'families', familyId, 'wishlist', 'wish-1'))
      );
    });

    it('should allow family member to read', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, 'families', familyId, 'wishlist', 'wish-1'),
          createTestWishlistItem(memberId)
        );
      });

      const authDb = getAuthContext(memberId).firestore();
      await assertSucceeds(
        getDoc(doc(authDb, 'families', familyId, 'wishlist', 'wish-1'))
      );
    });

    it('should deny access to other family data', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, 'families', otherFamilyId, 'wishlist', 'wish-1'),
          createTestWishlistItem(otherFamilyUserId)
        );
      });

      const authDb = getAuthContext(memberId).firestore();
      await assertFails(
        getDoc(doc(authDb, 'families', otherFamilyId, 'wishlist', 'wish-1'))
      );
    });
  });

  describe('create', () => {
    it('should deny unauthenticated create', async () => {
      const unauthDb = getUnauthContext().firestore();
      await assertFails(
        setDoc(
          doc(unauthDb, 'families', familyId, 'wishlist', 'wish-1'),
          createTestWishlistItem(memberId)
        )
      );
    });

    it('should allow family member to create with required fields', async () => {
      const authDb = getAuthContext(memberId).firestore();
      await assertSucceeds(
        setDoc(
          doc(authDb, 'families', familyId, 'wishlist', 'wish-1'),
          createTestWishlistItem(memberId)
        )
      );
    });

    it('should deny create without required name field', async () => {
      const authDb = getAuthContext(memberId).firestore();
      await assertFails(
        setDoc(doc(authDb, 'families', familyId, 'wishlist', 'wish-1'), {
          requesterId: memberId,
          priority: 'medium',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );
    });

    it('should deny create without required requesterId field', async () => {
      const authDb = getAuthContext(memberId).firestore();
      await assertFails(
        setDoc(doc(authDb, 'families', familyId, 'wishlist', 'wish-1'), {
          name: 'Wishlist Item',
          priority: 'medium',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );
    });

    it('should deny create without required priority field', async () => {
      const authDb = getAuthContext(memberId).firestore();
      await assertFails(
        setDoc(doc(authDb, 'families', familyId, 'wishlist', 'wish-1'), {
          name: 'Wishlist Item',
          requesterId: memberId,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );
    });

    it('should deny create without required status field', async () => {
      const authDb = getAuthContext(memberId).firestore();
      await assertFails(
        setDoc(doc(authDb, 'families', familyId, 'wishlist', 'wish-1'), {
          name: 'Wishlist Item',
          requesterId: memberId,
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );
    });

    it('should deny create in other family', async () => {
      const authDb = getAuthContext(memberId).firestore();
      await assertFails(
        setDoc(
          doc(authDb, 'families', otherFamilyId, 'wishlist', 'wish-1'),
          createTestWishlistItem(memberId)
        )
      );
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, 'families', familyId, 'wishlist', 'wish-1'),
          createTestWishlistItem(memberId)
        );
      });
    });

    it('should deny unauthenticated update', async () => {
      const unauthDb = getUnauthContext().firestore();
      await assertFails(
        updateDoc(doc(unauthDb, 'families', familyId, 'wishlist', 'wish-1'), {
          name: 'Updated Wishlist Item',
        })
      );
    });

    it('should allow family member to update', async () => {
      const authDb = getAuthContext(memberId).firestore();
      await assertSucceeds(
        updateDoc(doc(authDb, 'families', familyId, 'wishlist', 'wish-1'), {
          name: 'Updated Wishlist Item',
        })
      );
    });

    it('should allow family member to update status', async () => {
      const authDb = getAuthContext(memberId).firestore();
      await assertSucceeds(
        updateDoc(doc(authDb, 'families', familyId, 'wishlist', 'wish-1'), {
          status: 'purchased',
        })
      );
    });

    it('should deny update in other family', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, 'families', otherFamilyId, 'wishlist', 'wish-1'),
          createTestWishlistItem(otherFamilyUserId)
        );
      });

      const authDb = getAuthContext(memberId).firestore();
      await assertFails(
        updateDoc(doc(authDb, 'families', otherFamilyId, 'wishlist', 'wish-1'), {
          name: 'Updated Wishlist Item',
        })
      );
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, 'families', familyId, 'wishlist', 'wish-1'),
          createTestWishlistItem(memberId)
        );
      });
    });

    it('should deny unauthenticated delete', async () => {
      const unauthDb = getUnauthContext().firestore();
      await assertFails(
        deleteDoc(doc(unauthDb, 'families', familyId, 'wishlist', 'wish-1'))
      );
    });

    it('should deny member delete', async () => {
      const authDb = getAuthContext(memberId).firestore();
      await assertFails(
        deleteDoc(doc(authDb, 'families', familyId, 'wishlist', 'wish-1'))
      );
    });

    it('should allow admin to delete', async () => {
      const authDb = getAuthContext(adminId).firestore();
      await assertSucceeds(
        deleteDoc(doc(authDb, 'families', familyId, 'wishlist', 'wish-1'))
      );
    });

    it('should deny admin delete in other family', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, 'families', otherFamilyId, 'wishlist', 'wish-1'),
          createTestWishlistItem(otherFamilyUserId)
        );
      });

      const authDb = getAuthContext(adminId).firestore();
      await assertFails(
        deleteDoc(doc(authDb, 'families', otherFamilyId, 'wishlist', 'wish-1'))
      );
    });
  });
});
