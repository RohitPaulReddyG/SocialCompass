
"use client"; 

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import RechargeMeter from '@/components/RechargeMeter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lightbulb, Users, Loader2, Edit3, Activity, FileText, Frown, Smile, ListChecks } from 'lucide-react';
import ProtectedPage from '@/components/auth/ProtectedPage';
import type { Interaction, UserStats, EventType } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, Timestamp, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { updateUserStats } from '@/lib/userStatsUtils';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';
import { generateQuickInsightFlow, type GenerateQuickInsightInput } from '@/ai/flows/generate-quick-insight-flow';
import { format } from 'date-fns';

const quickLogFormSchema = z.object({
  feelingAfter: z.number().min(0).max(100),
  quickNotes: z.string().max(100, "Quick notes cannot exceed 100 characters.").optional(),
});
type QuickLogFormValues = z.infer<typeof quickLogFormSchema>;


export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [latestEnergy, setLatestEnergy] = useState<number | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmittingQuickLog, setIsSubmittingQuickLog] = useState(false);
  const [quickInsight, setQuickInsight] = useState<string | null>(null);
  const [isInsightLoading, setIsInsightLoading] = useState(false);

  const quickLogForm = useForm<QuickLogFormValues>({
    resolver: zodResolver(quickLogFormSchema),
    defaultValues: {
      feelingAfter: 50,
      quickNotes: "",
    },
  });

  const fetchRecentInteractionsSummary = async (userId: string, count: number = 2): Promise<string> => {
    try {
      const interactionsCol = collection(db, 'users', userId, 'interactions');
      const interactionsQuery = query(interactionsCol, orderBy('timestamp', 'desc'), limit(count));
      const interactionsSnapshot = await getDocs(interactionsQuery);

      if (interactionsSnapshot.empty) {
        return "No recent interactions logged.";
      }

      const summaries = interactionsSnapshot.docs.map((docSnapshot, index) => {
        const data = docSnapshot.data() as Interaction;
        const eventTypeDisplay = data.eventType === 'Other' && data.customEventType ? data.customEventType : data.eventType;
        const energyChange = data.feelingAfter - data.feelingBefore;
        const prefix = index === 0 ? "Last: " : "Prev: ";
        return `${prefix}${eventTypeDisplay}, Energy: ${energyChange >= 0 ? '+' : ''}${energyChange}%`;
      });
      return summaries.join(". ");
    } catch (error) {
      console.error("Error fetching recent interactions summary:", error);
      return "Could not fetch recent activity.";
    }
  };
  
  const triggerQuickInsightGeneration = useCallback(async (currentEnergy: number, streak: number, userId: string) => {
    if (!userId || authLoading || !user) return;
    setIsInsightLoading(true);
    try {
      const recentInteractionsSummary = await fetchRecentInteractionsSummary(userId);
      const insightInput: GenerateQuickInsightInput = {
        currentEnergy,
        recentInteractionsSummary,
        consecutiveLogStreak: streak,
        userName: user.displayName || user.email || undefined,
      };
      const result = await generateQuickInsightFlow(insightInput);
      setQuickInsight(result.quickInsight);
    } catch (error) {
      console.error("Error generating quick insight:", error);
      setQuickInsight("Could not generate a quick thought right now. Try logging an activity!");
    } finally {
      setIsInsightLoading(false);
    }
  }, [user, authLoading]);


  const fetchDashboardData = useCallback(async () => {
    if (authLoading || !user || !user.uid) {
      setIsLoadingData(false);
      if (!authLoading && !user) { 
        setLatestEnergy(null);
        setUserStats(null);
        setQuickInsight(null);
      }
      return;
    }
    
    setIsLoadingData(true);
    setQuickInsight(null); 
    const userId = user.uid; 

    try {
      let currentEnergy = 50; 
      const interactionsCol = collection(db, 'users', userId, 'interactions');
      const interactionsQuery = query(interactionsCol, orderBy('timestamp', 'desc'), limit(1));
      const interactionsSnapshot = await getDocs(interactionsQuery);
      
      if (!interactionsSnapshot.empty) {
        const latestInteractionData = interactionsSnapshot.docs[0].data() as Interaction;
        currentEnergy = latestInteractionData.feelingAfter;
        setLatestEnergy(currentEnergy);
      } else {
        setLatestEnergy(null); 
      }

      const statsDocRef = doc(db, 'users', userId, 'stats', 'main');
      const statsDocSnap = await getDoc(statsDocRef);
      
      let newStatsState: UserStats = {
        consecutiveLogStreak: 0,
        totalInteractionsLogged: 0,
        totalJournalEntriesWritten: 0,
        lastLogDate: undefined,
      };

      if (statsDocSnap.exists()) {
        const statsData = statsDocSnap.data();
        newStatsState = {
          consecutiveLogStreak: statsData.consecutiveLogStreak || 0,
          totalInteractionsLogged: statsData.totalInteractionsLogged || 0,
          totalJournalEntriesWritten: statsData.totalJournalEntriesWritten || 0,
          lastLogDate: statsData.lastLogDate ? (statsData.lastLogDate as Timestamp).toDate() : undefined,
        };
      }
      setUserStats(newStatsState);
      
      await triggerQuickInsightGeneration(currentEnergy, newStatsState.consecutiveLogStreak, userId);

    } catch (error: any) {
      console.error("Error fetching dashboard data: ", error);
      toast({
        title: "Error loading dashboard",
        description: error.message || "Could not load your dashboard data.",
        variant: "destructive",
      });
      setLatestEnergy(null);
      setUserStats(null);
      setQuickInsight("Error loading insights.");
    } finally {
      setIsLoadingData(false);
    }
  }, [user, authLoading, toast, triggerQuickInsightGeneration]); 

  useEffect(() => {
    if (user && user.uid && !authLoading) {
      fetchDashboardData();
    } else if (!user && !authLoading) {
      setIsLoadingData(false);
      setLatestEnergy(null);
      setUserStats(null);
      setQuickInsight(null);
    }
  }, [user, authLoading, fetchDashboardData]); 

  const handleQuickLogSubmit = async (data: QuickLogFormValues) => {
    if (!user || !user.uid) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsSubmittingQuickLog(true);

    const interactionPayload: any = {
      userId: user.uid,
      people: [{ id: 'quick_log', name: 'Quick Log' }],
      eventType: 'Other' as EventType,
      customEventType: 'Quick Check-in',
      feelingBefore: latestEnergy !== null ? latestEnergy : 50,
      feelingAfter: data.feelingAfter,
      notes: "", 
      vibe: "",  
    };

    if (data.quickNotes && data.quickNotes.trim() !== "") {
      interactionPayload.notes = data.quickNotes.trim();
      interactionPayload.vibe = data.quickNotes.trim().split(' ').slice(0, 3).join(' ');
    }
        
    const interactionPayloadWithTimestamp = {
      ...interactionPayload,
      timestamp: serverTimestamp(),
    };

    try {
      const interactionsCol = collection(db, 'users', user.uid, 'interactions');
      await addDoc(interactionsCol, interactionPayloadWithTimestamp);
      
      toast({ title: "Quick Log Saved!", description: "Your current energy has been recorded." });
      
      const statsResult = await updateUserStats(user.uid, 'interaction');
      if(statsResult.success && statsResult.stats && user?.uid) {
         const updatedDashboardStats: UserStats = {
          consecutiveLogStreak: statsResult.stats.consecutiveLogStreak || 0,
          totalInteractionsLogged: statsResult.stats.totalInteractionsLogged || 0,
          totalJournalEntriesWritten: statsResult.stats.totalJournalEntriesWritten || 0,
          lastLogDate: statsResult.stats.lastLogDate,
        };
        setUserStats(updatedDashboardStats); 
        if (statsResult.streakUpdated && statsResult.newStreakValue !== undefined) {
          if (statsResult.newStreakValue > 1 && statsResult.newStreakValue > (statsResult.previousStreakValue || 0) ) {
            toast({ title: "Streak Continued!", description: `Your logging streak is now ${statsResult.newStreakValue} days! Keep it up! 🔥` });
          } else if (statsResult.newStreakValue === 1 && (statsResult.previousStreakValue === 0 || statsResult.newStreakValue > (statsResult.previousStreakValue || 0))) {
            toast({ title: "New Streak Started!", description: `Your logging streak is now 1 day! 🔥` });
          }
        }
        await triggerQuickInsightGeneration(data.feelingAfter, updatedDashboardStats.consecutiveLogStreak, user.uid);
      } else if (!statsResult.success) {
         toast({ title: "Stats Update Error", description: statsResult.error || "Could not update stats.", variant: "destructive" });
      }

      setLatestEnergy(data.feelingAfter); 
      quickLogForm.reset({feelingAfter: data.feelingAfter, quickNotes: ""});

    } catch (error) {
      console.error("Error saving quick log: ", error);
      toast({ title: "Quick Log Error", description: "Could not save quick log.", variant: "destructive" });
    } finally {
      setIsSubmittingQuickLog(false);
    }
  };
  
  const getDynamicSliderStyles = (value: number) => {
    let textColorClass = 'text-muted-foreground';
    if (value < 35) textColorClass = 'text-destructive';
    else if (value > 65) textColorClass = 'text-green-500';
    else if (value >= 35 && value < 45) textColorClass = 'text-orange-500';
    else if (value >= 45 && value <= 55) textColorClass = 'text-yellow-500';
    else if (value > 55 && value <= 65) textColorClass = 'text-lime-500';

    const minOpacity = 0.3, maxOpacity = 1.0;
    let frownOpacity = maxOpacity - (value / 100) * (maxOpacity - minOpacity);
    let smileOpacity = minOpacity + (value / 100) * (maxOpacity - minOpacity);
    if (value > 40 && value < 60) {
        const midRange = 20; const progressInMid = (value - 40) / midRange;
        frownOpacity = maxOpacity - progressInMid * (maxOpacity-minOpacity);
        smileOpacity = minOpacity + progressInMid * (maxOpacity-minOpacity);
    } else if (value <=40) {
        frownOpacity = maxOpacity - (value/40 * (maxOpacity - (minOpacity+0.2))); smileOpacity = minOpacity + (value/40 * 0.2) ;
    } else if (value >=60) {
        smileOpacity = minOpacity+0.2 + ((value-60)/40 * (maxOpacity - (minOpacity+0.2))); frownOpacity = minOpacity + ((100-value)/40 * 0.2);
    }
    frownOpacity = Math.max(0.2, Math.min(1.0, frownOpacity)); smileOpacity = Math.max(0.2, Math.min(1.0, smileOpacity));
    return { frownStyle: { opacity: frownOpacity }, smileStyle: { opacity: smileOpacity }, textColorClass };
  };


  if (authLoading || (isLoadingData && user && user.uid)) { 
    return (
       <div className="flex h-full min-h-[calc(100vh-10rem)] w-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }
  
  return (
    <ProtectedPage>
      <div className="space-y-8">
        <section className="animate-in fade-in-50 duration-500">
          <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6">
            Welcome to Social Compass{user?.displayName ? `, ${user.displayName.split(' ')[0]}!` : '!'}
          </h2>
          <p className="text-lg text-muted-foreground mb-6">
            Recharge your life by understanding your people. Track your social energy, gain insights, and cultivate a healthier social life.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="animate-in fade-in-50 duration-700 h-full flex flex-col">
            <RechargeMeter 
              className="flex-grow" 
              currentEnergy={latestEnergy} 
              activityStreak={userStats?.consecutiveLogStreak || 0}
              quickInsight={quickInsight}
              isInsightLoading={isInsightLoading}
            />
          </div>
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl animate-in fade-in-50 duration-700 h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Edit3 className="text-accent" />
                Quick Log Energy
              </CardTitle>
              <CardDescription>Quickly log your current energy level.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
              <Form {...quickLogForm}>
                <form onSubmit={quickLogForm.handleSubmit(handleQuickLogSubmit)} className="space-y-4 flex flex-col flex-grow">
                  <FormField
                    control={quickLogForm.control}
                    name="feelingAfter"
                    render={({ field }) => {
                      const dynamicStyles = getDynamicSliderStyles(field.value);
                      return (
                        <FormItem>
                          <FormLabel>How are you feeling NOW?</FormLabel>
                           <div className="flex items-center gap-4">
                              <Frown className="text-destructive transition-opacity duration-300 ease-in-out" style={dynamicStyles.frownStyle} />
                              <FormControl>
                                <Slider
                                  defaultValue={[field.value]}
                                  max={100} step={1}
                                  onValueChange={(value) => field.onChange(value[0])}
                                  className="flex-1"
                                  disabled={isSubmittingQuickLog}
                                />
                              </FormControl>
                              <Smile className="text-green-500 transition-opacity duration-300 ease-in-out" style={dynamicStyles.smileStyle} />
                           </div>
                          <FormDescription className={cn("text-center font-medium transition-colors duration-300 ease-in-out", dynamicStyles.textColorClass)}>
                            {field.value}% Charged
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={quickLogForm.control}
                    name="quickNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quick notes/vibe (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Feeling great!" {...field} disabled={isSubmittingQuickLog} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full mt-auto" disabled={isSubmittingQuickLog}> 
                    {isSubmittingQuickLog ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging...</> : "Quick Log Energy"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 md:grid-cols-2 animate-in fade-in-50 duration-900">
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListChecks className="text-accent" />
                Interactions Logged
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">{userStats?.totalInteractionsLogged || 0}</p>
              <p className="text-sm text-muted-foreground">Total interactions recorded.</p>
            </CardContent>
          </Card>
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Activity className="text-accent" />
                Journal Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">{userStats?.totalJournalEntriesWritten || 0}</p>
              <p className="text-sm text-muted-foreground">Total journal entries written.</p>
            </CardContent>
          </Card>
        </section>
        
        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in-50 duration-1000">
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Lightbulb className="text-accent" />
                Discover Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Understand what (and who) recharges or drains you.
              </p>
              <Button asChild variant="outline">
                <Link href="/insights">View Insights</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="text-accent" /> 
                Energy Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Generate AI-powered reports on your energy trends.
              </p>
              <Button asChild>
                <Link href="/reports">View Reports</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Users className="text-accent" />
                Manage People
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Build profiles for people in your life to get better insights.
              </p>
              <Button asChild variant="outline">
                <Link href="/people">View People</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </ProtectedPage>
  );
}
    
