
"use client";

import { useState, type FC } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileText, AlertTriangle, BarChart3, TrendingUp, TrendingDown, Edit3 } from 'lucide-react';
import { generateEnergyReportFlow, type GenerateEnergyReportOutput, type GenerateEnergyReportFlowInput } from '@/ai/flows/generate-energy-report-flow';
import ProtectedPage from '@/components/auth/ProtectedPage';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp, type CollectionReference, type DocumentData } from 'firebase/firestore';
import type { Interaction } from '@/lib/types';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';


type ReportPeriod = 'last7days' | 'last30days' | 'thisMonth';

function formatInteractionsForAIReport(interactions: Interaction[]): string {
  if (!interactions.length) {
    return "No interactions logged for this period.";
  }
  return interactions
    .map(interaction => {
      const peopleMet = interaction.people && Array.isArray(interaction.people) 
        ? interaction.people.map(p => p.name).join(', ') 
        : 'Unknown';
      const eventTypeDisplay = interaction.eventType === 'Other' && interaction.customEventType 
        ? interaction.customEventType 
        : interaction.eventType;
      
      const energyChange = interaction.feelingAfter - interaction.feelingBefore;
      const energyChangeString = energyChange > 0 ? `+${energyChange}` : `${energyChange}`;

      return `Date: ${format(interaction.timestamp, 'yyyy-MM-dd HH:mm')}
Event Type: ${eventTypeDisplay}
People Met: ${peopleMet}
Energy Before: ${interaction.feelingBefore}%
Energy After: ${interaction.feelingAfter}% (Change: ${energyChangeString}%)
Vibe: ${interaction.vibe || 'N/A'}
Notes: ${interaction.notes || 'N/A'}
--------------------`;
    })
    .join('\n\n');
}


const ReportsPage: FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [report, setReport] = useState<GenerateEnergyReportOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('last7days');
  const [hasInteractionsForPeriod, setHasInteractionsForPeriod] = useState(true); // Assume true initially
  const [isCheckingData, setIsCheckingData] = useState(false); // For checking data before full report generation

  const handleGenerateReport = async () => {
    if (authLoading || !user || !user.uid) {
      toast({ title: "Authentication Error", description: "Please log in to generate reports.", variant: "destructive" });
      setError("Please log in to generate reports.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setReport(null);
    setIsCheckingData(true);

    try {
      let startDate: Date;
      let endDate: Date = new Date();
      let periodDescription: string = "";

      switch (selectedPeriod) {
        case 'last7days':
          startDate = subDays(endDate, 6);
          periodDescription = `Last 7 Days (${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')})`;
          break;
        case 'last30days':
          startDate = subDays(endDate, 29);
          periodDescription = `Last 30 Days (${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')})`;
          break;
        case 'thisMonth':
          startDate = startOfMonth(endDate);
          endDate = endOfMonth(endDate); 
          periodDescription = `This Month (${format(startDate, 'MMMM yyyy')})`;
          break;
        default:
          throw new Error("Invalid period selected.");
      }
      
      const startTimestamp = Timestamp.fromDate(startOfDay(startDate));
      const endTimestamp = Timestamp.fromDate(endOfDay(endDate));

      const interactionsCol = collection(db, 'users', user.uid, 'interactions') as CollectionReference<DocumentData>;
      const interactionsQuery = query(
        interactionsCol,
        where('timestamp', '>=', startTimestamp),
        where('timestamp', '<=', endTimestamp),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(interactionsQuery);
      setIsCheckingData(false);

      if (querySnapshot.empty) {
        setHasInteractionsForPeriod(false);
        toast({ title: "No Data", description: "No interactions found for the selected period to generate a report.", variant: "default" });
        // Optionally generate an "empty" report
        const emptyReportInput: GenerateEnergyReportFlowInput = {
            interactionLogs: "No interactions logged for this period.",
            periodDescription,
            userName: user.displayName || user.email || undefined,
        };
        const result = await generateEnergyReportFlow(emptyReportInput);
        setReport(result);
        setIsLoading(false);
        return;
      }
      setHasInteractionsForPeriod(true);

      const fetchedInteractions = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          timestamp: (data.timestamp as Timestamp).toDate(),
          people: Array.isArray(data.people) ? data.people : [{id: 'unknown', name: String(data.people || 'Unknown')}],
          eventType: data.eventType || 'Unknown',
          customEventType: data.customEventType,
          feelingBefore: data.feelingBefore || 0,
          feelingAfter: data.feelingAfter || 0,
          vibe: data.vibe,
          notes: data.notes,
          userId: data.userId,
        } as Interaction;
      });

      const interactionLogs = formatInteractionsForAIReport(fetchedInteractions);
      
      const flowInput: GenerateEnergyReportFlowInput = {
        interactionLogs,
        periodDescription,
        userName: user.displayName || user.email || undefined,
      };

      const result = await generateEnergyReportFlow(flowInput);
      setReport(result);
      toast({ title: "Report Generated!", description: "Your energy report is ready." });

    } catch (e: any) {
      console.error("Error generating report:", e);
      setError(e.message || "Failed to generate report. The AI model might be busy or there was an issue. Please try again.");
      toast({ title: "Report Generation Failed", description: e.message || "Please try again later.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsCheckingData(false);
    }
  };
  
  const endOfDay = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setHours(23, 59, 59, 999);
    return newDate;
  };

  const startOfDay = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  };

  const renderEnergizersDrainers = (title: string, items: {name: string, category: string, count: number, averagePositiveChange?: number, averageNegativeChange?: number}[], type: 'energizer' | 'drainer') => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
          {type === 'energizer' ? <TrendingUp className="text-green-500 h-6 w-6" /> : <TrendingDown className="text-red-500 h-6 w-6" />}
          {title}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item, index) => (
            <Card key={index} className="bg-card/70 p-4 shadow-sm">
              <CardTitle className="text-lg mb-1">{item.name}</CardTitle>
              <Badge variant="outline" className="capitalize mb-2">{item.category}</Badge>
              <p className="text-sm text-muted-foreground">Logged: {item.count} time(s)</p>
              {item.averagePositiveChange !== undefined && <p className="text-sm text-green-600 dark:text-green-400 font-medium">Avg. Positive Change: +{item.averagePositiveChange.toFixed(1)}%</p>}
              {item.averageNegativeChange !== undefined && <p className="text-sm text-red-600 dark:text-red-400 font-medium">Avg. Negative Change: {item.averageNegativeChange.toFixed(1)}%</p>}
            </Card>
          ))}
        </div>
      </div>
    );
  };
  
  const renderBulletList = (title: string, items: string[]) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2 text-foreground">{title}</h3>
        <ul className="list-disc list-inside space-y-1.5 text-card-foreground pl-2">
          {items.map((item, index) => <li key={index} className="leading-relaxed">{item}</li>)}
        </ul>
      </div>
    );
  }


  return (
    <ProtectedPage>
      <div className="space-y-8">
        <Card className="shadow-xl rounded-xl animate-in fade-in-50 duration-300">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <FileText className="text-primary h-7 w-7" />
              Social Energy Reports
            </CardTitle>
            <CardDescription>
              Generate personalized reports to understand your social energy trends over different periods.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Select value={selectedPeriod} onValueChange={(value) => {setSelectedPeriod(value as ReportPeriod); setHasInteractionsForPeriod(true); setReport(null); setError(null);}} disabled={isLoading || authLoading || isCheckingData}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last7days">Last 7 Days</SelectItem>
                  <SelectItem value="last30days">Last 30 Days</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleGenerateReport} disabled={isLoading || authLoading || !user || isCheckingData} className="w-full sm:w-auto">
                {isLoading || isCheckingData ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isCheckingData ? 'Checking data...' : 'Generating Report...'}
                  </>
                ) : (
                  'Generate Report'
                )}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {isLoading && !report && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
             <p className="ml-2 text-muted-foreground">Generating your report...</p>
          </div>
        )}

        {report && !isLoading && (
          <Card className="shadow-lg rounded-xl animate-in fade-in-50 duration-500">
            <CardHeader className="border-b">
              <CardTitle className="text-2xl font-bold text-primary">{report.reportTitle}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ScrollArea className="h-auto max-h-[75vh] pr-3">
                <div className="space-y-6">
                  
                  <section>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">Overall Summary</h3>
                    <p className="text-card-foreground/90 whitespace-pre-wrap leading-relaxed">{report.overallSummary}</p>
                  </section>
                  
                  <Separator />

                  <section>
                    <h3 className="text-xl font-semibold mb-3 text-foreground">Interaction Statistics</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm p-4 border rounded-lg bg-muted/30">
                      <div><strong className="text-card-foreground">Total Interactions:</strong> <span className="text-primary font-semibold">{report.interactionStats.totalInteractions}</span></div>
                      <div>
                        <strong className="text-card-foreground">Avg. Energy Change:</strong> 
                        <span className={`font-semibold ml-1 ${report.interactionStats.averageEnergyChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {report.interactionStats.averageEnergyChange.toFixed(1)}%
                        </span>
                      </div>
                      {report.interactionStats.daysWithMostInteractions && <div><strong className="text-card-foreground">Most Active:</strong> <span className="text-muted-foreground">{report.interactionStats.daysWithMostInteractions}</span></div>}
                      {report.interactionStats.interactionsPerDay !== undefined && <div><strong className="text-card-foreground">Avg. Interactions/Day:</strong> <span className="text-muted-foreground">{report.interactionStats.interactionsPerDay.toFixed(1)}</span></div>}
                    </div>
                  </section>
                  
                  {report.peakEnergizers?.length > 0 && <Separator />}
                  {renderEnergizersDrainers("Peak Energizers", report.peakEnergizers.map(item => ({...item, category: item.category as string})), 'energizer')}
                  
                  {report.significantDrainers?.length > 0 && <Separator />}
                  {renderEnergizersDrainers("Significant Drainers", report.significantDrainers.map(item => ({...item, category: item.category as string})), 'drainer')}
                  
                  {report.keyObservations?.length > 0 && <Separator />}
                  {renderBulletList("Key Observations", report.keyObservations)}
                  
                  {report.actionableSuggestions?.length > 0 && <Separator />}
                  {renderBulletList("Actionable Suggestions", report.actionableSuggestions)}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {!report && !isLoading && !isCheckingData && !error && !authLoading && user && (
          <Card className="shadow-md rounded-xl border-dashed border-2 animate-in fade-in-50 duration-500">
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">Ready to dive into your energy patterns?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Select a period and click "Generate Report" to see your AI-powered analysis.
              </p>
              {!hasInteractionsForPeriod && (
                 <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
                    No interactions found for the selected period. Please log some interactions or choose a different period.
                    <Button asChild variant="link" className="text-destructive p-0 h-auto ml-1">
                        <Link href="/log-interaction">Log Interactions</Link>
                    </Button>
                 </div>
              )}
            </CardContent>
          </Card>
        )}
        
         {!authLoading && !user && (
             <Card className="shadow-md rounded-xl border-dashed border-2 animate-in fade-in-50 duration-500">
                <CardContent className="p-6 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground text-lg">Please <Link href="/login" className="text-primary underline">log in</Link> to generate reports.</p>
                </CardContent>
             </Card>
         )}
      </div>
    </ProtectedPage>
  );
};

export default ReportsPage;
