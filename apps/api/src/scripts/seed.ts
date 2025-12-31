/**
 * Seed script to create initial family and invite code
 * Run with: npx tsx src/scripts/seed.ts
 */

import { db } from '../lib/firebase-admin.js';
import { generateInviteCode, calculateExpiryDate } from '@family-inventory/shared';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const familiesCollection = db.collection('families');
const inviteCodesCollection = db.collection('inviteCodes');

async function seed() {
  console.log('Starting seed...\n');

  // Check if a family already exists
  const existingFamilies = await familiesCollection.limit(1).get();

  let familyId: string;

  if (!existingFamilies.empty) {
    familyId = existingFamilies.docs[0].id;
    console.log(`Using existing family: ${familyId}`);
  } else {
    // Create initial family
    const now = FieldValue.serverTimestamp();
    const familyData = {
      name: 'マイファミリー',
      createdBy: 'system',
      createdAt: now,
      updatedAt: now,
    };

    const familyRef = await familiesCollection.add(familyData);
    familyId = familyRef.id;
    console.log(`Created new family: ${familyId}`);
  }

  // Create new invite code
  const code = generateInviteCode();
  const expiresAt = calculateExpiryDate(30); // 30 days expiry
  const now = FieldValue.serverTimestamp();

  const inviteCodeData = {
    code,
    familyId,
    createdBy: 'system',
    status: 'active',
    expiresAt: Timestamp.fromDate(expiresAt),
    createdAt: now,
  };

  await inviteCodesCollection.add(inviteCodeData);

  console.log('\n========================================');
  console.log('Seed completed successfully!');
  console.log('========================================');
  console.log(`\nInvite Code: ${code}`);
  console.log(`Expires: ${expiresAt.toLocaleDateString('ja-JP')}`);
  console.log('\nShare this code with the first user to sign up.\n');

  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
