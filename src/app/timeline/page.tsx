
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, TooltipProps } from 'recharts';
import type { Interaction, EnergyDataPoint } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Filter, Loader2, BarChart3 } from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, startOfDay, endOfDay } from 'date-fns';
import ProtectedPage from '@/components/auth/ProtectedPage';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, Timestamp, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const processInteractionsForChart = (interactions: Interaction[], period: string): EnergyDataPoint[] => {
  if (!interactions.length) return [];

  const sortedInteractions = [...interactions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  const dailyAverages: { [key: string]: { totalEnergy: number; count: number } } = {};

  sortedInteractions.forEach(interaction => {
    const dateStr = format(new Date(interaction.timestamp), 'yyyy-MM-dd');
    if (!dailyAverages[dateStr]) {
      dailyAverages[dateStr] = { totalEnergy: 0, count: 0 };
    }
    dailyAverages[dateStr].totalEnergy += interaction.feelingAfter;
    dailyAverages[dateStr].count += 1;
  });

  let dataPoints: EnergyDataPoint[] = Object.entries(dailyAverages).map(([date, { totalEnergy, count }]) => ({
    date: format(parseISO(date), 'MMM d'), 
    fullDate: date, 
    energyLevel: Math.round(totalEnergy / count),
    eventCount: count,
  })).sort((a,b) => {
    const dateA = a.fullDate ? new Date(a.fullDate).getTime() : 0;
    const dateB = b.fullDate ? new Date(b.fullDate).getTime() : 0;
    return dateA - dateB;
  });
  
  return dataPoints.map(({date, energyLevel, eventCount}) => ({date, energyLevel, eventCount}));
};

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover p-3 rounded-md shadow-lg border border-border">
        <p className="label text-sm font-semibold">{`${label}`}</p>
        <p className="text-primary">{`Avg. Energy: ${payload[0].value}%`}</p>
        {payload.find(p => p.dataKey === 'eventCount') && 
          <p className="text-accent">{`Events: ${payload.find(p => p.dataKey === 'eventCount')?.value}`}</p>
        }
      </div>
    );
  }
  return null;
};

export default function TimelinePage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [chartData, setChartData] = useState<EnergyDataPoint[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<string>("last7days");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);


  useEffect(() => {
    if (user && user.uid && !authLoading) {
      setIsLoadingData(true);
      const fetchInteractionsForPeriod = async () => {
        try {
          let q;
          const interactionsCol = collection(db, 'users', user.uid, 'interactions');
          const now = new Date();
          let startDate: Date;
          let endDate: Date = endOfDay(now); 

          switch (filterPeriod) {
            case 'last7days':
              startDate = startOfDay(subDays(now, 6));
              break;
            case 'thisWeek':
              startDate = startOfDay(startOfWeek(now, { weekStartsOn: 1 })); 
              endDate = endOfDay(endOfWeek(now, { weekStartsOn: 1 }));     
              break;
            case 'thisMonth':
              startDate = startOfDay(startOfMonth(now));
              endDate = endOfDay(endOfMonth(now));
              break;
            case 'allTime':
              q = query(interactionsCol, orderBy('timestamp', 'asc'));
              break;
            default: 
              startDate = startOfDay(subDays(now, 6));
          }

          if (filterPeriod !== 'allTime') {
             q = query(
              interactionsCol, 
              where('timestamp', '>=', Timestamp.fromDate(startDate!)),
              where('timestamp', '<=', Timestamp.fromDate(endDate!)),
              orderBy('timestamp', 'asc')
            );
          }
          
          const querySnapshot = await getDocs(q!);
          const fetchedInteractions = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              ...data,
              id: doc.id,
              timestamp: (data.timestamp as Timestamp).toDate(),
              people: Array.isArray(data.people) ? data.people : [{ id: 'unknown', name: String(data.people || 'Unknown') }],
            } as Interaction;
          });
          
          setChartData(processInteractionsForChart(fetchedInteractions, filterPeriod));

        } catch (error) {
          console.error("Error fetching interactions for timeline: ", error);
          toast({ title: "Error", description: "Could not fetch interactions for timeline.", variant: "destructive" });
          setChartData([]);
        } finally {
          setIsLoadingData(false);
          setHasFetchedOnce(true);
        }
      };
      fetchInteractionsForPeriod();
    } else if (!authLoading && !user) {
      setChartData([]);
      setIsLoadingData(false);
      setHasFetchedOnce(true);
    }
  }, [user, authLoading, toast, filterPeriod]);


  return (
    <ProtectedPage>
      <div className="space-y-8">
        <Card className="shadow-xl rounded-xl animate-in fade-in-50 duration-300">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <BarChart3 className="text-primary h-7 w-7" />
                  Your Social Energy Timeline
                  </CardTitle>
                <CardDescription>
                  Visualize how your energy levels fluctuate over time based on your logged interactions.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <Select value={filterPeriod} onValueChange={setFilterPeriod} disabled={authLoading || isLoadingData}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last7days">Last 7 Days</SelectItem>
                    <SelectItem value="thisWeek">This Week</SelectItem>
                    <SelectItem value="thisMonth">This Month</SelectItem>
                    <SelectItem value="allTime">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(isLoadingData && !hasFetchedOnce) || authLoading ? (
              <div className="flex justify-center items-center h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `${value}%`}
                    domain={[0, 100]}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent) / 0.2)' }}/>
                  <Legend wrapperStyle={{fontSize: "14px"}}/>
                  <Line
                    type="monotone"
                    dataKey="energyLevel"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    dot={{ r: 4, fill: 'hsl(var(--chart-1))' }}
                    activeDot={{ r: 6, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                    name="Avg. Energy After Interaction"
                  />
                   <Line
                    type="monotone"
                    dataKey="eventCount"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 4, fill: 'hsl(var(--chart-2))' }}
                    activeDot={{ r: 6, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                    name="Number of Events"
                    hide 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-10 h-[400px] flex flex-col justify-center items-center animate-in fade-in-50 duration-500">
                <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">Your energy timeline awaits!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Log your first interaction to see your energy levels visualized here.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/log-interaction">Log First Interaction</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  );
}

