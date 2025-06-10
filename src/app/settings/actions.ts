
'use server';

import { db } from '@/lib/firebase';
import { collection, getDocs, writeBatch, doc, getDoc, Timestamp, deleteDoc } from 'firebase/firestore';
import type { Interaction, JournalEntry, ManagedPerson, UserStats } from '@/lib/types';

// Helper to convert Firestore Timestamps to ISO strings for JSON serialization
const convertTimestampsToISO = (data: any): any => {
  if (data instanceof Timestamp) {
    return data.toDate().toISOString();
  }
  if (Array.isArray(data)) {
    return data.map(convertTimestampsToISO);
  }
  if (typeof data === 'object' && data !== null) {
    const res: { [key: string]: any } = {};
    for (const key in data) {
      res[key] = convertTimestampsToISO(data[key]);
    }
    return res;
  }
  return data;
};


export async function exportUserDataAction(userId: string): Promise<{ success: boolean; data?: string; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User ID not provided for export.' };
  }
  console.log(`[Action] Attempting to export data for userId: ${userId}`);

  try {
    console.log(`[Action] Fetching interactions for ${userId}...`);
    const interactionsRef = collection(db, 'users', userId, 'interactions');
    const interactionsSnap = await getDocs(interactionsRef);
    const interactions = interactionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Interaction[];
    console.log(`[Action] Fetched ${interactions.length} interactions for ${userId}.`);

    console.log(`[Action] Fetching journal entries for ${userId}...`);
    const journalEntriesRef = collection(db, 'users', userId, 'journalEntries');
    const journalEntriesSnap = await getDocs(journalEntriesRef);
    const journalEntries = journalEntriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as JournalEntry[];
    console.log(`[Action] Fetched ${journalEntries.length} journal entries for ${userId}.`);

    console.log(`[Action] Fetching managed people for ${userId}...`);
    const managedPeopleRef = collection(db, 'users', userId, 'managedPeople');
    const managedPeopleSnap = await getDocs(managedPeopleRef);
    const managedPeople = managedPeopleSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ManagedPerson[];
    console.log(`[Action] Fetched ${managedPeople.length} managed people for ${userId}.`);

    console.log(`[Action] Fetching user stats for ${userId}...`);
    const statsRef = doc(db, 'users', userId, 'stats', 'main');
    const statsSnap = await getDoc(statsRef);
    const userStats = statsSnap.exists() ? ({ id: statsSnap.id, ...statsSnap.data() } as UserStats) : null;
    console.log(`[Action] Fetched user stats for ${userId}: ${userStats ? 'found' : 'not found'}.`);

    const allData = {
      interactions: convertTimestampsToISO(interactions),
      journalEntries: convertTimestampsToISO(journalEntries),
      managedPeople: convertTimestampsToISO(managedPeople),
      userStats: userStats ? convertTimestampsToISO(userStats) : null,
    };
    console.log(`[Action] Data export successful for userId: ${userId}.`);
    return { success: true, data: JSON.stringify(allData, null, 2) };
  } catch (error: any) {
    console.error(`[Action] Error exporting user data for userId ${userId}:`, error.code, error.message);
    return { success: false, error: `Failed to export data. Firebase error: ${error.message} (Code: ${error.code})` };
  }
}


export async function deleteUserAllDataAction(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User ID not provided for deletion.' };
  }
  console.log(`[Action] Attempting to delete all data for userId: ${userId}`);

  try {
    const collectionsToDelete = ['interactions', 'journalEntries', 'managedPeople'];
    
    for (const collectionName of collectionsToDelete) {
      const collectionPath = `users/${userId}/${collectionName}`;
      console.log(`[Action] Deleting documents from collection: ${collectionPath}`);
      const q = query(collection(db, collectionPath));
      const querySnapshot = await getDocs(q);
      let batch = writeBatch(db);
      let operationCount = 0;
      if (querySnapshot.empty) {
        console.log(`[Action] No documents found in ${collectionPath}. Skipping delete for this collection.`);
        continue;
      }
      querySnapshot.forEach((docSnapshot) => {
        console.log(`[Action] Adding delete for doc ${docSnapshot.id} in ${collectionPath} to batch.`);
        batch.delete(docSnapshot.ref);
        operationCount++;
        if (operationCount >= 490) { 
          console.log(`[Action] Committing batch for ${collectionPath} due to operation count limit...`);
          batch.commit(); 
          batch = writeBatch(db); 
          operationCount = 0;
        }
      });
      if (operationCount > 0) {
        console.log(`[Action] Committing final batch for ${collectionPath}...`);
        await batch.commit();
      }
      console.log(`[Action] Finished deleting documents from collection: ${collectionPath}. Deleted ${querySnapshot.size} documents.`);
    }

    const statsRef = doc(db, 'users', userId, 'stats', 'main');
    console.log(`[Action] Checking user stats document at ${statsRef.path}`);
    const statsSnap = await getDoc(statsRef);
    if (statsSnap.exists()) {
      console.log(`[Action] Deleting user stats document for ${userId}...`);
      await deleteDoc(statsRef);
      console.log(`[Action] User stats document deleted for ${userId}.`);
    } else {
      console.log(`[Action] No user stats document found for ${userId}. Skipping delete.`);
    }
    
    console.log(`[Action] All data deletion successful for userId: ${userId}.`);
    return { success: true };
  } catch (error: any) {
    console.error(`[Action] Error deleting user data for userId ${userId}:`, error.code, error.message);
    return { success: false, error: `Failed to delete data. Firebase error: ${error.message} (Code: ${error.code})` };
  }
}
