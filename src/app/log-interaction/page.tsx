
"use client";

import { useState, useEffect } from 'react';
import { InteractionLogForm } from '@/components/forms/InteractionLogForm';
import type { Interaction, Person } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import ProtectedPage from '@/components/auth/ProtectedPage';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, getDocs, Timestamp, serverTimestamp } from 'firebase/firestore';
import { Edit3, ListChecks, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateUserStats, type UpdateUserStatsResult } from '@/lib/userStatsUtils';
import Link from 'next/link';

export default function LogInteractionPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  useEffect(() => {
    if (user && user.uid && !authLoading) {
      setIsLoadingData(true);
      const fetchInteractions = async () => {
        try {
          const interactionsCol = collection(db, 'users', user.uid, 'interactions');
          const q = query(interactionsCol, orderBy('timestamp', 'desc'));
          const querySnapshot = await getDocs(q);
          const fetchedInteractions = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              ...data,
              id: doc.id, 
              timestamp: (data.timestamp as Timestamp).toDate(),
              people: Array.isArray(data.people) ? data.people : [{ id: 'unknown', name: String(data.people || 'Unknown') }],
            } as Interaction;
          });
          setInteractions(fetchedInteractions);
        } catch (error) {
          console.error("Error fetching interactions: ", error);
          toast({
            title: "Error",
            description: "Could not fetch your interactions.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingData(false);
          setHasFetchedOnce(true);
        }
      };
      fetchInteractions();
    } else if (!authLoading && !user) {
      setInteractions([]);
      setIsLoadingData(false);
      setHasFetchedOnce(true);
    }
  }, [user, authLoading, toast]);


  const handleLogInteraction = async (interactionData: Omit<Interaction, 'id' | 'userId' | 'timestamp'> ) => {
    if (!user || !user.uid) {
      toast({
        title: "Error",
        description: "You must be logged in to log an interaction.",
        variant: "destructive",
      });
      return;
    }
    
    const newInteractionForFirestore: { [key: string]: any } = {
      userId: user.uid,
      people: interactionData.people,
      eventType: interactionData.eventType,
      feelingBefore: interactionData.feelingBefore,
      feelingAfter: interactionData.feelingAfter,
      timestamp: serverTimestamp(), 
    };

    if (interactionData.eventType === 'Other' && interactionData.customEventType && interactionData.customEventType.trim() !== '') {
      newInteractionForFirestore.customEventType = interactionData.customEventType.trim();
    }
    if (interactionData.vibe && interactionData.vibe.trim() !== '') {
      newInteractionForFirestore.vibe = interactionData.vibe.trim();
    }
    if (interactionData.notes && interactionData.notes.trim() !== '') {
      newInteractionForFirestore.notes = interactionData.notes.trim();
    }

    try {
      const interactionsCol = collection(db, 'users', user.uid, 'interactions');
      const docRef = await addDoc(interactionsCol, newInteractionForFirestore); 
      
      toast({
        title: "Interaction Logged!",
        description: `Your interaction for ${interactionData.eventType === 'Other' && interactionData.customEventType ? interactionData.customEventType : interactionData.eventType} has been saved.`,
      });
      
      const newInteractionForState: Interaction = {
        id: docRef.id, 
        userId: user.uid,
        people: interactionData.people,
        eventType: interactionData.eventType,
        customEventType: interactionData.customEventType,
        feelingBefore: interactionData.feelingBefore,
        feelingAfter: interactionData.feelingAfter,
        vibe: interactionData.vibe,
        notes: interactionData.notes,
        timestamp: new Date(), 
      };
      setInteractions(prev => [newInteractionForState, ...prev].sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()));
      
      const statsResult: UpdateUserStatsResult = await updateUserStats(user.uid, 'interaction');
      if (statsResult.success && statsResult.streakUpdated && statsResult.newStreakValue !== undefined) {
        if (statsResult.newStreakValue > 1 && statsResult.newStreakValue > (statsResult.previousStreakValue || 0) ) {
            toast({ title: "Streak Continued!", description: `Your logging streak is now ${statsResult.newStreakValue} days! Keep it up! 🔥` });
        } else if (statsResult.newStreakValue === 1 && (statsResult.previousStreakValue === 0 || statsResult.newStreakValue > (statsResult.previousStreakValue || 0))) {
            toast({ title: "New Streak Started!", description: `Your logging streak is now 1 day! 🔥` });
        }
      } else if (!statsResult.success) {
        // updateUserStats already shows a toast for its specific errors
        console.error("Stats update failed after logging interaction:", statsResult.error);
      }

    } catch (error) {
      console.error("Error adding interaction: ", error);
      toast({
        title: "Error Logging Interaction",
        description: "Could not save your interaction. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const getDisplayEventType = (interaction: Interaction): string => {
    if (interaction.eventType === 'Other' && interaction.customEventType) {
      return interaction.customEventType;
    }
    return interaction.eventType;
  };

  return (
    <ProtectedPage>
      <div className="space-y-8">
        <Card className="w-full max-w-2xl mx-auto shadow-xl rounded-xl animate-in fade-in-50 duration-300">
            <CardHeader>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    <Edit3 className="text-primary h-7 w-7" />
                    Log New Interaction
                </CardTitle>
                <CardDescription>
                Record how your social encounters affect your energy.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <InteractionLogForm onLogInteraction={handleLogInteraction} />
            </CardContent>
        </Card>

        {(isLoadingData && !hasFetchedOnce && user && !authLoading) && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!authLoading && !isLoadingData && interactions.length > 0 && hasFetchedOnce && (
          <Card className="shadow-xl rounded-xl animate-in fade-in-50 duration-500">
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <ListChecks className="text-primary h-7 w-7" />
                Recently Logged Interactions
                </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <ul className="space-y-4">
                  {interactions.map((interaction, index) => (
                    <li key={interaction.id}> 
                      <Card className="bg-card/50 hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">
                            {getDisplayEventType(interaction)} with {interaction.people && Array.isArray(interaction.people) ? interaction.people.map(p => p.name).join(', ') : 'Unknown'}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {format(interaction.timestamp, "PPP p")}
                          </p>
                        </CardHeader>
                        <CardContent className="text-sm space-y-1">
                          <p><strong>Before:</strong> {interaction.feelingBefore}% | <strong>After:</strong> {interaction.feelingAfter}%</p>
                          {interaction.vibe && <p><strong>Vibe:</strong> {interaction.vibe}</p>}
                          {interaction.notes && <p><strong>Notes:</strong> {interaction.notes}</p>}
                        </CardContent>
                      </Card>
                      {index < interactions.length - 1 && <Separator className="my-4" />}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
        {!authLoading && !isLoadingData && interactions.length === 0 && hasFetchedOnce && user && (
            <Card className="shadow-md rounded-xl border-dashed border-2 animate-in fade-in-50 duration-500">
                <CardContent className="p-6 text-center">
                    <Edit3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground text-lg">No interactions logged yet.</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Use the form above to start tracking your social energy!
                    </p>
                     <Button asChild className="mt-4">
                        <Link href="/log-interaction">Log your first interaction</Link>
                    </Button>
                </CardContent>
            </Card>
        )}
         {!authLoading && !user && (
            <Card className="shadow-md rounded-xl border-dashed border-2 animate-in fade-in-50 duration-500">
                <CardContent className="p-6 text-center">
                    <Edit3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground text-lg">Please <Link href="/login" className="text-primary underline">log in</Link> to record interactions.</p>
                </CardContent>
            </Card>
        )}
      </div>
    </ProtectedPage>
  );
}
