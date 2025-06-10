
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { JournalEntry, Mood } from '@/lib/types'; 
import { BookOpen, Tag, PlusCircle, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import ProtectedPage from '@/components/auth/ProtectedPage';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, getDocs, Timestamp, serverTimestamp } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { updateUserStats, type UpdateUserStatsResult } from '@/lib/userStatsUtils';
import Link from 'next/link';

export default function JournalPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [currentEntryText, setCurrentEntryText] = useState('');
  const [selectedMoods, setSelectedMoods] = useState<Mood[]>([]); 
  const [currentMoodInput, setCurrentMoodInput] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  useEffect(() => {
    if (user && user.uid && !authLoading) {
      setIsLoadingData(true);
      const fetchEntries = async () => {
        try {
          const entriesCol = collection(db, 'users', user.uid, 'journalEntries');
          const q = query(entriesCol, orderBy('timestamp', 'desc'));
          const querySnapshot = await getDocs(q);
          const fetchedEntries = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              ...data,
              id: doc.id,
              timestamp: (data.timestamp as Timestamp).toDate(),
              moods: data.moods || [], 
            } as JournalEntry;
          });
          setEntries(fetchedEntries);
        } catch (error) {
          console.error("Error fetching journal entries: ", error);
          toast({
            title: "Error",
            description: "Could not fetch your journal entries.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingData(false);
          setHasFetchedOnce(true);
        }
      };
      fetchEntries();
    } else if (!authLoading && !user) {
      setEntries([]);
      setIsLoadingData(false);
      setHasFetchedOnce(true);
    }
  }, [user, authLoading, toast]);

  const handleAddEntry = async () => {
    if (!currentEntryText.trim()) {
      toast({
        title: "Empty Entry",
        description: "Please write something before saving.",
        variant: "destructive",
      });
      return;
    }
    if (!user || !user.uid) {
       toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
       return;
    }

    setIsSaving(true);
    const newEntryDataForFirestore = {
      userId: user.uid,
      content: currentEntryText,
      moods: selectedMoods,
      timestamp: serverTimestamp(),
    };

    try {
      const entriesCol = collection(db, 'users', user.uid, 'journalEntries');
      const docRef = await addDoc(entriesCol, newEntryDataForFirestore);
      
      toast({
        title: "Journal Entry Saved!",
        description: "Your thoughts have been recorded.",
      });
      
      const newEntryForState: JournalEntry = {
        id: docRef.id, 
        userId: user.uid,
        content: currentEntryText,
        moods: selectedMoods,
        timestamp: new Date(), 
      };
      setEntries(prevEntries => [newEntryForState, ...prevEntries].sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()));

      setCurrentEntryText('');
      setSelectedMoods([]);
      setCurrentMoodInput('');

      const statsResult = await updateUserStats(user.uid, 'journalEntry');
      if (statsResult.success && statsResult.streakUpdated && statsResult.newStreakValue !== undefined) {
         if (statsResult.newStreakValue > 1 && statsResult.newStreakValue > (statsResult.previousStreakValue || 0) ) {
            toast({ title: "Streak Continued!", description: `Your logging streak is now ${statsResult.newStreakValue} days! Keep it up! 🔥` });
        } else if (statsResult.newStreakValue === 1 && (statsResult.previousStreakValue === 0 || statsResult.newStreakValue > (statsResult.previousStreakValue || 0))) {
            toast({ title: "New Streak Started!", description: `Your logging streak is now 1 day! 🔥` });
        }
      } else if (!statsResult.success) {
        // updateUserStats already shows a toast for its specific errors
        console.error("Stats update failed after logging journal entry:", statsResult.error);
      }

    } catch (error) {
      console.error("Error adding journal entry: ", error);
      toast({
        title: "Error",
        description: "Could not save your journal entry.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMood = () => {
    if (currentMoodInput.trim() && !selectedMoods.includes(currentMoodInput.trim())) {
      setSelectedMoods(prev => [...prev, currentMoodInput.trim()]);
      setCurrentMoodInput('');
    } else if (selectedMoods.includes(currentMoodInput.trim())) {
      toast({ title: "Mood already added", variant: "default" });
    }
  };

  const handleRemoveMood = (moodToRemove: string) => {
    setSelectedMoods(prev => prev.filter(m => m !== moodToRemove));
  };

  return (
    <ProtectedPage>
      <div className="space-y-8">
        <Card className="shadow-xl rounded-xl animate-in fade-in-50 duration-300">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="text-primary h-7 w-7" />
              Private Journal
            </CardTitle>
            <CardDescription>
              Record your deeper reflections on social experiences. This space is just for you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="What's on your mind? How did that interaction really make you feel?"
              value={currentEntryText}
              onChange={(e) => setCurrentEntryText(e.target.value)}
              rows={6}
              className="resize-none"
              disabled={isSaving}
            />
            <div className="space-y-2">
              <label htmlFor="mood-input" className="text-sm font-medium flex items-center gap-1">
                <Tag className="h-4 w-4 text-muted-foreground" />
                Tag moods (optional):
              </label>
              <div className="flex items-center gap-2">
                <Input 
                  id="mood-input"
                  type="text"
                  placeholder="Type a mood (e.g., energized, thoughtful)"
                  value={currentMoodInput}
                  onChange={(e) => setCurrentMoodInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddMood();}}}
                  className="flex-grow"
                  disabled={isSaving}
                />
                <Button onClick={handleAddMood} size="sm" variant="outline" disabled={isSaving || !currentMoodInput.trim()}>
                  Add Mood
                </Button>
              </div>
              {selectedMoods.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedMoods.map(mood => (
                    <Badge key={mood} variant="secondary" className="capitalize flex items-center gap-1">
                      {mood}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 ml-1 opacity-50 hover:opacity-100"
                        onClick={() => handleRemoveMood(mood)}
                        disabled={isSaving}
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove {mood}</span>
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={handleAddEntry} className="w-full" disabled={isSaving || !currentEntryText.trim()}>
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><PlusCircle className="mr-2 h-4 w-4" /> Add to Journal</>
              )}
            </Button>
          </CardContent>
        </Card>

        {(isLoadingData && !hasFetchedOnce && user && !authLoading) && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!authLoading && !isLoadingData && entries.length > 0 && hasFetchedOnce && (
          <Card className="shadow-lg rounded-xl animate-in fade-in-50 duration-500">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Your Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <ul className="space-y-6">
                  {entries.map((entry) => (
                    <li key={entry.id}>
                      <div className="p-4 border rounded-lg bg-card/50 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <p className="text-xs text-muted-foreground mb-1">
                          {format(entry.timestamp, "PPP p")}
                        </p>
                        <p className="whitespace-pre-wrap break-words text-foreground mb-2">{entry.content}</p>
                        {entry.moods && entry.moods.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t">
                            {entry.moods.map(mood => (
                              <Badge key={mood} variant="secondary" className="capitalize">{mood}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
         {!authLoading && !isLoadingData && entries.length === 0 && hasFetchedOnce && user && (
           <Card className="shadow-md rounded-xl border-dashed border-2 animate-in fade-in-50 duration-500">
              <CardContent className="p-6 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg">Your journal is a blank canvas.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Write your first entry above to start your reflection journey.
                  </p>
                  <Button asChild className="mt-4">
                    <Link href="/journal">Write First Entry</Link>
                  </Button>
              </CardContent>
          </Card>
         )}
         {!authLoading && !user && (
            <Card className="shadow-md rounded-xl border-dashed border-2 animate-in fade-in-50 duration-500">
                <CardContent className="p-6 text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground text-lg">Please <Link href="/login" className="text-primary underline">log in</Link> to use the journal.</p>
                </CardContent>
            </Card>
        )}
      </div>
    </ProtectedPage>
  );
}
