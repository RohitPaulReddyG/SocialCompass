
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from "@/components/ui/calendar";
import type { Interaction } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { CalendarDays, Loader2, ListChecks, Edit3 } from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import ProtectedPage from '@/components/auth/ProtectedPage';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, Timestamp, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';


export default function CalendarViewPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  useEffect(() => {
    if (user && user.uid && !authLoading) {
      setIsLoadingData(true);
      const fetchAllInteractions = async () => {
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
          console.error("Error fetching interactions for calendar: ", error);
          toast({ title: "Error", description: "Could not fetch interactions for calendar.", variant: "destructive" });
          setInteractions([]);
        } finally {
          setIsLoadingData(false);
          setHasFetchedOnce(true);
        }
      };
      fetchAllInteractions();
    } else if (!authLoading && !user) {
      setInteractions([]);
      setIsLoadingData(false);
      setHasFetchedOnce(true);
    }
  }, [user, authLoading, toast]);

  const interactionsOnSelectedDate = interactions.filter(interaction =>
    selectedDate && isSameDay(interaction.timestamp, selectedDate)
  );

  const interactionDates = interactions.map(interaction => interaction.timestamp);

  const getDisplayEventType = (interaction: Interaction): string => {
    if (interaction.eventType === 'Other' && interaction.customEventType) {
      return interaction.customEventType;
    }
    return interaction.eventType;
  };

  return (
    <ProtectedPage>
      <div className="space-y-8">
        <Card className="shadow-xl rounded-xl animate-in fade-in-50 duration-300">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <CalendarDays className="text-primary h-7 w-7" />
              Activity Calendar
            </CardTitle>
            <CardDescription>
              View your logged interactions on a calendar. Click a day to see details.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-full md:w-auto mx-auto md:mx-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border shadow-sm bg-popover"
                modifiers={{
                  highlighted: interactionDates,
                }}
                modifiersStyles={{
                  highlighted: {
                    border: "2px solid hsl(var(--primary))",
                    borderRadius: 'var(--radius)',
                  }
                }}
                disabled={isLoadingData || authLoading}
              />
            </div>
            <div className="flex-1 w-full">
              <Card className="min-h-[372px] shadow-inner"> {/* Match approx height of calendar */}
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <ListChecks className="text-accent h-6 w-6"/>
                    Interactions on {selectedDate ? format(selectedDate, "MMMM d, yyyy") : 'selected date'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(isLoadingData && !hasFetchedOnce) || authLoading ? (
                    <div className="flex justify-center items-center h-[250px]">
                       <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : interactions.length === 0 && hasFetchedOnce ? (
                     <div className="text-center py-10 h-[250px] flex flex-col justify-center items-center">
                        <CalendarDays className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground text-lg">Your calendar is waiting for entries!</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Log an interaction to see it appear here.
                        </p>
                        <Button asChild className="mt-4">
                          <Link href="/log-interaction">Log Interaction</Link>
                        </Button>
                      </div>
                  ) : interactionsOnSelectedDate.length > 0 ? (
                    <ScrollArea className="h-[250px] pr-3">
                      <ul className="space-y-4">
                        {interactionsOnSelectedDate.map(interaction => (
                          <li key={interaction.id} className="border-b pb-3 last:border-b-0">
                            <p className="font-semibold text-primary">
                              {getDisplayEventType(interaction)} with {interaction.people.map(p => p.name).join(', ')}
                            </p>
                            <p className="text-xs text-muted-foreground">{format(interaction.timestamp, "p")}</p>
                            <p className="text-sm mt-1">Energy: {interaction.feelingBefore}% → {interaction.feelingAfter}%</p>
                            {interaction.vibe && <p className="text-sm">Vibe: <Badge variant="secondary">{interaction.vibe}</Badge></p>}
                            {interaction.notes && <p className="text-sm mt-1 text-muted-foreground italic">Notes: {interaction.notes}</p>}
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-10 h-[250px] flex flex-col justify-center items-center">
                      <p className="text-muted-foreground">No interactions logged on this day.</p>
                       {selectedDate && interactions.length > 0 && (
                         <p className="text-xs text-muted-foreground mt-1">Try selecting a highlighted day.</p>
                       )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  );
}
