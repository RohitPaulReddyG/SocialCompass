
'use server';

import type { UserStats, UpdateUserStatsResult } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { isToday, isYesterday, startOfDay } from 'date-fns';

export async function updateUserStats(
  userId: string,
  logType: 'interaction' | 'journalEntry'
): Promise<UpdateUserStatsResult> {
  if (!userId) {
    console.error("[Stats] User ID is required to update stats.");
    return { success: false, error: "User ID is required.", stats: null, streakUpdated: false };
  }

  let currentConsecutiveLogStreak = 0;
  let currentTotalInteractionsLogged = 0;
  let currentTotalJournalEntriesWritten = 0;
  let currentLastLogDate: Date | undefined = undefined;
  
  try {
    const statsDocRef = doc(db, 'users', userId, 'stats', 'main');
    const statsDocSnap = await getDoc(statsDocRef);

    if (statsDocSnap.exists()) {
      const data = statsDocSnap.data();
      currentConsecutiveLogStreak = typeof data.consecutiveLogStreak === 'number' ? data.consecutiveLogStreak : 0;
      currentTotalInteractionsLogged = typeof data.totalInteractionsLogged === 'number' ? data.totalInteractionsLogged : 0;
      currentTotalJournalEntriesWritten = typeof data.totalJournalEntriesWritten === 'number' ? data.totalJournalEntriesWritten : 0;
      currentLastLogDate = data.lastLogDate ? (data.lastLogDate as Timestamp).toDate() : undefined;
    }

    const today = startOfDay(new Date());
    let newStreak = currentConsecutiveLogStreak;
    const previousStreak = currentConsecutiveLogStreak;
    let streakActuallyUpdated = false;

    if (currentLastLogDate) {
      const lastLogDateStart = startOfDay(currentLastLogDate);
      if (isToday(lastLogDateStart)) {
        if (newStreak === 0) { // Should only happen if stats doc was just created with 0 streak
             newStreak = 1;
             if (previousStreak === 0) streakActuallyUpdated = true;
        }
        // No change to streak if already logged today, unless it was the very first log of a new streak.
      } else if (isYesterday(lastLogDateStart)) {
        newStreak = newStreak + 1;
        streakActuallyUpdated = true;
      } else { // Gap in logging
        newStreak = 1;
        streakActuallyUpdated = true;
      }
    } else { // First log ever or first log since stats were created
      newStreak = 1;
      streakActuallyUpdated = true;
    }
    
    if (newStreak === 0 && (logType === 'interaction' || logType === 'journalEntry')) {
        newStreak = 1; // Ensures streak is at least 1 for a new log.
        if (previousStreak === 0) streakActuallyUpdated = true;
    }

    const newTotalInteractions = logType === 'interaction'
      ? currentTotalInteractionsLogged + 1
      : currentTotalInteractionsLogged;
    const newTotalJournalEntries = logType === 'journalEntry'
      ? currentTotalJournalEntriesWritten + 1
      : currentTotalJournalEntriesWritten;

    const statsToSave: Omit<UserStats, 'id'> = {
      consecutiveLogStreak: newStreak,
      totalInteractionsLogged: newTotalInteractions,
      totalJournalEntriesWritten: newTotalJournalEntries,
      lastLogDate: Timestamp.fromDate(today),
    };
    
    // console.log("[Stats] Attempting to save stats:", JSON.stringify(statsToSave));
    await setDoc(statsDocRef, statsToSave, { merge: true });
    // console.log("[Stats] Stats saved successfully.");

    const returnedStats: UserStats = {
      consecutiveLogStreak: statsToSave.consecutiveLogStreak,
      totalInteractionsLogged: statsToSave.totalInteractionsLogged,
      totalJournalEntriesWritten: statsToSave.totalJournalEntriesWritten,
      lastLogDate: today, 
    };

    return {
      success: true,
      stats: returnedStats,
      streakUpdated: streakActuallyUpdated && newStreak !== previousStreak,
      newStreakValue: newStreak,
      previousStreakValue: previousStreak,
    };

  } catch (error: any) {
    console.error("[Stats] Error updating user stats in updateUserStats:", error);
    const fallbackStats: UserStats = {
      consecutiveLogStreak: currentConsecutiveLogStreak,
      totalInteractionsLogged: currentTotalInteractionsLogged,
      totalJournalEntriesWritten: currentTotalJournalEntriesWritten,
      lastLogDate: currentLastLogDate,
    };
    return {
      success: false,
      stats: fallbackStats,
      error: "Could not update your activity stats.",
      streakUpdated: false,
    };
  }
}
