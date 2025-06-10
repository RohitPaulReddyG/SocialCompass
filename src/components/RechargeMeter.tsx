
"use client";

import type { FC } from 'react';
import { BatteryFull, BatteryMedium, BatteryLow, BatteryWarning, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface RechargeMeterProps {
  currentEnergy: number | null;
  activityStreak: number;
  quickInsight?: string | null;
  isInsightLoading?: boolean;
  className?: string;
}

const RechargeMeter: FC<RechargeMeterProps> = ({ currentEnergy, activityStreak, quickInsight, isInsightLoading, className }) => {
  const energyLevel = currentEnergy === null ? 50 : currentEnergy;

  const getEnergyStatus = () => {
    if (currentEnergy === null) return { text: "Log an interaction to see your battery!", icon: <BatteryMedium className="text-muted-foreground" />, color: "bg-muted" };
    if (energyLevel > 75) return { text: "Fully Charged & Ready!", icon: <BatteryFull className="text-green-500" />, color: "bg-green-500" };
    if (energyLevel > 50) return { text: "Feeling Good", icon: <BatteryMedium className="text-yellow-500" />, color: "bg-yellow-500" };
    if (energyLevel > 25) return { text: "Running Low", icon: <BatteryLow className="text-orange-500" />, color: "bg-orange-500" };
    return { text: "Critically Drained", icon: <BatteryWarning className="text-red-500" />, color: "bg-red-500" };
  };

  const status = getEnergyStatus();

  return (
    <Card className={cn("w-full shadow-lg rounded-xl flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">Your Social Battery</CardTitle>
          {status.icon}
        </div>
      </CardHeader>
      <CardContent className={cn("flex-grow flex flex-col", quickInsight ? "justify-between" : "")}>
        <div className={cn(quickInsight ? "" : "my-auto")}>
          <div className="flex items-center gap-3 my-2">
            <Progress value={energyLevel} className="h-5 flex-1" indicatorClassName={status.color} />
            <span className="text-3xl font-bold text-foreground">{energyLevel}%</span>
          </div>
          <p className="text-sm text-muted-foreground text-center mb-3">{status.text}</p>
        </div>

        {isInsightLoading && (
          <div className="text-sm text-muted-foreground text-center py-3 flex items-center justify-center">
            <Sparkles className="h-4 w-4 mr-2 animate-pulse text-primary" />
            Generating quick thought...
          </div>
        )}
        {quickInsight && !isInsightLoading && (
          <blockquote className="mt-1 mb-3 p-3 bg-muted/40 border-l-4 border-accent rounded-md italic text-sm text-foreground/90">
            <Sparkles className="inline-block h-4 w-4 mr-1.5 mb-0.5 text-accent" />
            {quickInsight}
          </blockquote>
        )}
         {currentEnergy === null && !quickInsight && !isInsightLoading && (
           <p className="text-xs text-muted-foreground text-center py-3">
            Log your first interaction to get started and receive personalized insights!
          </p>
        )}

        <p className="text-sm text-primary mt-auto pt-3 font-medium">Consecutive Log Days: {activityStreak} 🔥</p>
      </CardContent>
    </Card>
  );
};

export default RechargeMeter;
