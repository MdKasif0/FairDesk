// src/ai/flows/join-group.ts
'use server';

/**
 * @fileOverview A secure, server-side flow for a user to join a group.
 *
 * - joinGroup - The main function to handle a user joining a group.
 * - JoinGroupInput - Input type for joinGroup.
 * - JoinGroupOutput - Output type for joinGroup.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
} from 'firebase/firestore';
import {db} from '@/lib/firebase-admin'; // Use admin SDK

const JoinGroupInputSchema = z.object({
  inviteCode: z.string().trim().min(1, {message: 'Invite code is required.'}),
  user: z.object({
    uid: z.string(),
  }),
});
export type JoinGroupInput = z.infer<typeof JoinGroupInputSchema>;

const JoinGroupOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  groupId: z.string().optional(),
});
export type JoinGroupOutput = z.infer<typeof JoinGroupOutputSchema>;

export async function joinGroup(
  input: JoinGroupInput
): Promise<JoinGroupOutput> {
  return joinGroupFlow(input);
}

const joinGroupFlow = ai.defineFlow(
  {
    name: 'joinGroupFlow',
    inputSchema: JoinGroupInputSchema,
    outputSchema: JoinGroupOutputSchema,
  },
  async ({inviteCode, user}) => {
    try {
      const q = query(
        collection(db, 'groups'),
        where('inviteCode', '==', inviteCode)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return {success: false, message: 'Invalid Invite Code'};
      }

      const groupDoc = querySnapshot.docs[0];
      const groupData = groupDoc.data();

      if (groupData.members.includes(user.uid)) {
        return {
          success: true,
          message: "You're already in this group.",
          groupId: groupDoc.id,
        };
      }

      if (groupData.members.length >= groupData.seats.length) {
        return {
          success: false,
          message: `Group is full. This group only has ${groupData.seats.length} seats available.`,
        };
      }

      const batch = writeBatch(db);

      // Add user to group's member list
      batch.update(groupDoc.ref, {
        members: [...groupData.members, user.uid],
      });

      // Update user's document with group ID
      const userRef = doc(db, 'users', user.uid);
      batch.update(userRef, {groupId: groupDoc.id});

      await batch.commit();

      return {
        success: true,
        message: 'Joined group successfully!',
        groupId: groupDoc.id,
      };
    } catch (error: any) {
      console.error('Error in joinGroupFlow:', error);
      return {
        success: false,
        message:
          error.message || 'An unexpected server error occurred.',
      };
    }
  }
);
