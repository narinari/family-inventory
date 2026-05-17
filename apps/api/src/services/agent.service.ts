import { db } from '../lib/firebase-admin.js';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const agentMappingsCollection = db.collection('agentMappings');

export interface AgentMapping {
  actorId: string;
  familyId: string;
  userId: string;
  description?: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface UpsertAgentMappingInput {
  actorId: string;
  familyId: string;
  userId: string;
  description?: string;
}

function toAgentMapping(doc: FirebaseFirestore.DocumentSnapshot): AgentMapping {
  const data = doc.data()!;
  const mapping: AgentMapping = {
    actorId: data.actorId,
    familyId: data.familyId,
    userId: data.userId,
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
  };

  if (typeof data.description === 'string') {
    mapping.description = data.description;
  }

  return mapping;
}

export async function getAgentMapping(actorId: string): Promise<AgentMapping | null> {
  const snapshot = await agentMappingsCollection
    .where('actorId', '==', actorId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  return toAgentMapping(snapshot.docs[0]);
}

export async function upsertAgentMapping(
  input: UpsertAgentMappingInput
): Promise<AgentMapping> {
  const snapshot = await agentMappingsCollection
    .where('actorId', '==', input.actorId)
    .limit(1)
    .get();

  const now = FieldValue.serverTimestamp();

  if (snapshot.empty) {
    const docData: Record<string, unknown> = {
      actorId: input.actorId,
      familyId: input.familyId,
      userId: input.userId,
      createdAt: now,
      updatedAt: now,
    };

    if (input.description !== undefined) {
      docData.description = input.description;
    }

    const docRef = await agentMappingsCollection.add(docData);
    const created = await docRef.get();
    return toAgentMapping(created);
  }

  const existingDoc = snapshot.docs[0];
  const updateData: Record<string, unknown> = {
    familyId: input.familyId,
    userId: input.userId,
    updatedAt: now,
  };

  if (input.description !== undefined) {
    updateData.description = input.description;
  }

  await existingDoc.ref.update(updateData);
  const updated = await existingDoc.ref.get();
  return toAgentMapping(updated);
}
