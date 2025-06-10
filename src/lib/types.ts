
import type { Timestamp } from 'firebase/firestore';

export type Person = {
  id: string; // Firestore document ID if managed, otherwise can be name
  name: string;
  // emoji?: string; // For ⚡️ vs 🪫
};

export type EventType = 'Party' | 'Work Meeting' | 'One-on-One' | 'Family Gathering' | 'Solo Activity' | 'Other';

export type Interaction = {
  id: string; // Firestore document ID
  userId: string;
  people: Person[]; // Array of { id: string, name: string }
  eventType: EventType;
  customEventType?: string; // Used if eventType is 'Other'
  feelingBefore: number; // Slider value (e.g., 0-100)
  feelingAfter: number; // Slider value (e.g., 0-100)
  vibe?: string; // 1-3 words
  notes?: string;
  timestamp: Date; // Should be a JS Date object. Stored as Firestore Timestamp, converted on read.
};

export type Mood = string; // Changed from union type to simple string for customizability

export type JournalEntry = {
  id: string; // Firestore document ID
  userId: string;
  content: string;
  moods?: Mood[]; // Now an array of strings
  timestamp: Date; // JS Date object. Stored as Firestore Timestamp, converted on read.
  relatedInteractionId?: string; // Optional link to an interaction
};

export type EnergyDataPoint = {
  date: string; // e.g., "YYYY-MM-DD"
  fullDate?: string; // e.g., "YYYY-MM-DD" for sorting/filtering before display formatting
  energyLevel: number; // 0-100
  eventCount: number;
};

export type RelationshipType = 'Friend' | 'Family' | 'Colleague' | 'Acquaintance' | 'Other';

export interface ManagedPerson {
  id: string; // Firestore document ID
  userId: string;
  name: string;
  relationshipType: RelationshipType;
  customRelationshipType?: string; // Used if relationshipType is 'Other'
  notes?: string;
  // Future: avatarUrl?: string;
  // Future: energyImpact?: 'positive' | 'negative' | 'neutral'; // Auto-calculated or user-set
  createdAt: Date;
  updatedAt: Date;
}

export interface UserStats {
  id?: string; // Document ID, typically 'main'
  lastLogDate?: Date; // Stored as Firestore Timestamp, used as JS Date in app
  consecutiveLogStreak: number;
  totalInteractionsLogged: number;
  totalJournalEntriesWritten: number;
  // We could add specific achievements here later, e.g., unlockedAchievements: string[]
}
