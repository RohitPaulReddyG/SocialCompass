
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Lightbulb, AlertTriangle } from 'lucide-react';
import { getSocialCompassInsights, type SocialCompassInsightsInput, type SocialCompassInsightsOutput } from '@/ai/flows/social-compass-insights';
import type { Interaction } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import ProtectedPage from '@/components/auth/ProtectedPage';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';


function formatInteractionsForAI(interactions: Interaction[]): string {
  if (!interactions.length) {
    return "No interactions logged yet.";
  }
  return interactions
    .map(interaction => {
      const peopleMet = interaction.people && Array.isArray(interaction.people)
        ? interaction.people.map(p => p.name).join(', ')
        : 'Unknown';
      const eventTypeDisplay = interaction.eventType === 'Other' && interaction.customEventType 
        ? interaction.customEventType 
        : interaction.eventType;
      return `Date: ${format(interaction.timestamp, 'yyyy-MM-dd HH:mm')}
Event Type: ${eventTypeDisplay}
People Met: ${peopleMet}
Feeling Before: ${interaction.feelingBefore}%
Feeling After: ${interaction.feelingAfter}%
Vibe: ${interaction.vibe || 'N/A'}
Notes: ${interaction.notes || 'N/A'}
--------------------`;
    })
    .join('\n\n');
}

export default function InsightsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [interactionLogsText, setInteractionLogsText] = useState('');
  const [insights, setInsights] = useState<SocialCompassInsightsOutput | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allInteractionsCount, setAllInteractionsCount] = useState<number>(0);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  useEffect(() => {
    if (user && user.uid && !authLoading) {
      setIsLoadingData(true);
      setHasFetchedOnce(false);
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
          setAllInteractionsCount(fetchedInteractions.length);
          setInteractionLogsText(formatInteractionsForAI(fetchedInteractions));
        } catch (e) {
          console.error("Error fetching interactions for insights: ", e);
          toast({ title: "Error", description: "Could not fetch interactions.", variant: "destructive" });
          setError("Could not load your interaction data.");
          setInteractionLogsText("Error loading interaction logs.");
        } finally {
          setIsLoadingData(false);
          setHasFetchedOnce(true);
        }
      };
      fetchInteractions();
    } else if (!authLoading && !user) {
      setInteractionLogsText("Please log in to view insights based on your data.");
      setIsLoadingData(false);
      setAllInteractionsCount(0);
      setHasFetchedOnce(true);
    }
  }, [user, authLoading, toast]);

  const handleGenerateInsights = async () => {
    if (!user || !user.uid) {
      setError("Please log in to generate insights.");
      return;
    }
    if (!interactionLogsText.trim() || interactionLogsText === "No interactions logged yet." || interactionLogsText === "Error loading interaction logs.") {
      setError("Please log some interactions first, or ensure your logs are loaded correctly.");
      return;
    }
    setIsGeneratingInsights(true);
    setError(null);
    setInsights(null);
    try {
      const input: SocialCompassInsightsInput = { 
        interactionLogs: interactionLogsText,
        userName: user.displayName || user.email || undefined,
      };
      const result = await getSocialCompassInsights(input);
      setInsights(result);
    } catch (e) {
      console.error("Error generating insights:", e);
      setError("Failed to generate insights. The AI model might be busy or there was an issue with your data. Please try again.");
       toast({ title: "Insight Generation Failed", description: "Please try again later.", variant: "destructive" });
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  return (
    <ProtectedPage>
      <div className="space-y-8">
        <Card className="shadow-xl rounded-xl animate-in fade-in-50 duration-300">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Lightbulb className="text-primary h-7 w-7" />
              Custom Social Insights
            </CardTitle>
            <CardDescription>
              Gain personalized insights into your social energy patterns. Your interaction logs are automatically compiled.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="interactionLogsTextarea" className="block text-sm font-medium text-foreground mb-1">
                Your Interaction Logs (Auto-compiled for AI Analysis)
              </label>
              <ScrollArea className="h-60 w-full rounded-md border p-3 bg-muted/50">
                  {(isLoadingData && !hasFetchedOnce && user && !authLoading) ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <p className="ml-2 text-muted-foreground">Loading logs...</p>
                    </div>
                  ) : allInteractionsCount === 0 && hasFetchedOnce ? (
                     <div className="flex flex-col items-center justify-center h-full text-center">
                        <Lightbulb className="h-10 w-10 text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">Log some interactions to discover your social patterns.</p>
                        <Button asChild variant="link" className="mt-2">
                            <Link href="/log-interaction">Start Logging Interactions</Link>
                        </Button>
                    </div>
                  ) : (
                    <pre className="text-xs whitespace-pre-wrap break-all">
                        {interactionLogsText}
                    </pre>
                  )}
              </ScrollArea>
              <Textarea
                id="interactionLogsTextarea"
                value={interactionLogsText}
                onChange={(e) => setInteractionLogsText(e.target.value)}
                placeholder="Interaction logs will appear here..."
                className="hidden sr-only resize-none mt-2"
                rows={8}
                disabled
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleGenerateInsights} disabled={isGeneratingInsights || (isLoadingData && !hasFetchedOnce && !user) || allInteractionsCount === 0 || authLoading || !user} className="w-full">
              {isGeneratingInsights ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Insights...
                </>
              ) : (
                'Generate Insights'
              )}
            </Button>
          </CardFooter>
        </Card>

        {insights && (
          <Card className="shadow-lg rounded-xl animate-in fade-in-50 duration-500">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Your Personalized Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-auto max-h-[500px]">
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  {insights.insights}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
         {!insights && !isGeneratingInsights && allInteractionsCount > 0 && hasFetchedOnce && !authLoading && user &&(
          <Card className="shadow-md rounded-xl border-dashed border-2 animate-in fade-in-50 duration-500">
              <CardContent className="p-6 text-center">
                  <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                  Your insights are ready to be discovered! Click "Generate Insights" above.
                  </p>
              </CardContent>
          </Card>
         )}
      </div>
    </ProtectedPage>
  );
}
