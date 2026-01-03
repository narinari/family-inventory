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
  createTestInviteCode,
  assertFails,
  assertSucceeds,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from './setup';

describe('inviteCodes collection', () => {
  const familyId1 = 'family-1';
  const familyId2 = 'family-2';
  const adminUserId = 'admin-user';
  const memberUserId = 'member-user';
  const otherUserId = 'other-user';
  const newUserId = 'new-user';
  const inviteCodeId1 = 'invite-code-1';

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
    it('should deny access without authentication', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, 'inviteCodes', inviteCodeId1),
          createTestInviteCode(familyId1, adminUserId)
        );
      });

      const unauthDb = getUnauthContext().firestore();
      await assertFails(getDoc(doc(unauthDb, 'inviteCodes', inviteCodeId1)));
    });

    it('should allow authenticated user to read active invite code', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', newUserId), createTestUser(familyId2));
        await setDoc(
          doc(db, 'inviteCodes', inviteCodeId1),
          createTestInviteCode(familyId1, adminUserId, { status: 'active' })
        );
      });

      const authDb = getAuthContext(newUserId).firestore();
      await assertSucceeds(getDoc(doc(authDb, 'inviteCodes', inviteCodeId1)));
    });

    it('should allow family admin to read used invite code', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, 'inviteCodes', inviteCodeId1),
          createTestInviteCode(familyId1, adminUserId, { status: 'used', usedBy: memberUserId })
        );
      });

      const authDb = getAuthContext(adminUserId).firestore();
      await assertSucceeds(getDoc(doc(authDb, 'inviteCodes', inviteCodeId1)));
    });

    it('should deny non-admin from reading used invite code', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', newUserId), createTestUser(familyId2));
        await setDoc(
          doc(db, 'inviteCodes', inviteCodeId1),
          createTestInviteCode(familyId1, adminUserId, { status: 'used', usedBy: memberUserId })
        );
      });

      const authDb = getAuthContext(newUserId).firestore();
      await assertFails(getDoc(doc(authDb, 'inviteCodes', inviteCodeId1)));
    });

    it('should deny member from reading expired invite code', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, 'inviteCodes', inviteCodeId1),
          createTestInviteCode(familyId1, adminUserId, { status: 'expired' })
        );
      });

      const authDb = getAuthContext(memberUserId).firestore();
      await assertFails(getDoc(doc(authDb, 'inviteCodes', inviteCodeId1)));
    });
  });

  describe('create', () => {
    it('should allow family admin to create invite code', async () => {
      const authDb = getAuthContext(adminUserId).firestore();
      const inviteCodeData = createTestInviteCode(familyId1, adminUserId);

      await assertSucceeds(setDoc(doc(authDb, 'inviteCodes', inviteCodeId1), inviteCodeData));
    });

    it('should deny family member from creating invite code', async () => {
      const authDb = getAuthContext(memberUserId).firestore();
      const inviteCodeData = createTestInviteCode(familyId1, memberUserId);

      await assertFails(setDoc(doc(authDb, 'inviteCodes', inviteCodeId1), inviteCodeData));
    });

    it('should deny creating invite code without required fields', async () => {
      const authDb = getAuthContext(adminUserId).firestore();
      const incompleteData = {
        code: 'TEST123',
        familyId: familyId1,
      };

      await assertFails(setDoc(doc(authDb, 'inviteCodes', inviteCodeId1), incompleteData));
    });

    it('should deny admin from creating invite code for another family', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', otherUserId), createTestUser(familyId2, 'admin'));
        await setDoc(doc(db, 'families', familyId2), createTestFamily(otherUserId));
      });

      const authDb = getAuthContext(adminUserId).firestore();
      const inviteCodeData = createTestInviteCode(familyId2, adminUserId);

      await assertFails(setDoc(doc(authDb, 'inviteCodes', inviteCodeId1), inviteCodeData));
    });

    it('should deny unauthenticated user from creating invite code', async () => {
      const unauthDb = getUnauthContext().firestore();
      const inviteCodeData = createTestInviteCode(familyId1, adminUserId);

      await assertFails(setDoc(doc(unauthDb, 'inviteCodes', inviteCodeId1), inviteCodeData));
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', newUserId), createTestUser(familyId2));
        await setDoc(
          doc(db, 'inviteCodes', inviteCodeId1),
          createTestInviteCode(familyId1, adminUserId, { status: 'active' })
        );
      });
    });

    it('should allow changing status from active to used with usedBy', async () => {
      const authDb = getAuthContext(newUserId).firestore();
      await assertSucceeds(
        updateDoc(doc(authDb, 'inviteCodes', inviteCodeId1), {
          status: 'used',
          usedBy: newUserId,
        })
      );
    });

    it('should deny changing status from active to expired', async () => {
      const authDb = getAuthContext(newUserId).firestore();
      await assertFails(
        updateDoc(doc(authDb, 'inviteCodes', inviteCodeId1), {
          status: 'expired',
          usedBy: newUserId,
        })
      );
    });

    it('should deny changing usedBy to different user', async () => {
      const authDb = getAuthContext(newUserId).firestore();
      await assertFails(
        updateDoc(doc(authDb, 'inviteCodes', inviteCodeId1), {
          status: 'used',
          usedBy: otherUserId,
        })
      );
    });

    it('should deny updating already used invite code', async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, 'inviteCodes', inviteCodeId1),
          createTestInviteCode(familyId1, adminUserId, { status: 'used', usedBy: memberUserId })
        );
      });

      const authDb = getAuthContext(newUserId).firestore();
      await assertFails(
        updateDoc(doc(authDb, 'inviteCodes', inviteCodeId1), {
          status: 'used',
          usedBy: newUserId,
        })
      );
    });

    it('should deny updating other fields besides status and usedBy', async () => {
      const authDb = getAuthContext(newUserId).firestore();
      await assertFails(
        updateDoc(doc(authDb, 'inviteCodes', inviteCodeId1), {
          status: 'used',
          usedBy: newUserId,
          familyId: familyId2,
        })
      );
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      await withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(
          doc(db, 'inviteCodes', inviteCodeId1),
          createTestInviteCode(familyId1, adminUserId)
        );
      });
    });

    it('should deny deleting invite code by admin', async () => {
      const authDb = getAuthContext(adminUserId).firestore();
      await assertFails(deleteDoc(doc(authDb, 'inviteCodes', inviteCodeId1)));
    });

    it('should deny deleting invite code by member', async () => {
      const authDb = getAuthContext(memberUserId).firestore();
      await assertFails(deleteDoc(doc(authDb, 'inviteCodes', inviteCodeId1)));
    });

    it('should deny deleting invite code without authentication', async () => {
      const unauthDb = getUnauthContext().firestore();
      await assertFails(deleteDoc(doc(unauthDb, 'inviteCodes', inviteCodeId1)));
    });
  });
});
