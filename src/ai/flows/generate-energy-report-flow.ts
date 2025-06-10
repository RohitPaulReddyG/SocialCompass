
'use server';
/**
 * @fileOverview A Genkit flow to generate energy reports based on social interactions.
 *
 * - generateEnergyReportFlow - The Genkit flow that takes formatted interaction logs and generates a report.
 * - GenerateEnergyReportFlowInput - The input type for the Genkit flow itself.
 * - GenerateEnergyReportOutput - The return type for the Genkit flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
// Firestore imports are no longer needed here as data fetching moves to client

// Schema for the direct input to the Genkit flow prompt
// This now expects the logs directly, not parameters to fetch them.
const GenerateEnergyReportFlowInputSchema = z.object({
  interactionLogs: z.string().describe('A detailed log of social interactions for the specified period, including who, what, where, when, and subjective feelings before and after.'),
  periodDescription: z.string().describe('A human-readable description of the period being reported on (e.g., "Last 7 Days", "Month of July 2024").'),
  userName: z.string().optional().describe('The name of the user, if available, to personalize the report.'),
});
export type GenerateEnergyReportFlowInput = z.infer<typeof GenerateEnergyReportFlowInputSchema>;

// Schema for the output of the Genkit flow
const EnergyReportOutputSchema = z.object({
  reportTitle: z.string().describe("A concise title for the report, e.g., 'Weekly Energy Review: June 10 - June 16' or 'Monthly Energy Report for July 2024'."),
  overallSummary: z.string().describe("A brief narrative summary of the user's social energy trends during the period. Mention overall mood if discernible."),
  interactionStats: z.object({
    totalInteractions: z.number().describe("Total number of interactions logged during the period."),
    averageEnergyChange: z.number().min(-100).max(100).describe("Average percentage change in energy across all interactions (after - before)."),
    daysWithMostInteractions: z.string().optional().describe("Day(s) of the week or specific dates with the most social activity, if a pattern exists."),
    interactionsPerDay: z.number().optional().describe("Average number of interactions per day during the period."),
  }),
  peakEnergizers: z.array(z.object({
    name: z.string().describe("Name of the event type or person."),
    category: z.enum(["EventType", "Person", "Vibe"]).describe("Category: EventType, Person, or Vibe."),
    count: z.number().describe("Number of times this energizer was logged."),
    averagePositiveChange: z.number().describe("Average positive energy change associated with this energizer."),
  })).describe("Top 2-3 event types, people, or vibes that consistently led to significant energy increases. Only include if clear patterns exist."),
  significantDrainers: z.array(z.object({
    name: z.string().describe("Name of the event type or person."),
    category: z.enum(["EventType", "Person", "Vibe"]).describe("Category: EventType, Person, or Vibe."),
    count: z.number().describe("Number of times this drainer was logged."),
    averageNegativeChange: z.number().describe("Average negative energy change associated with this drainer."),
  })).describe("Top 2-3 event types, people, or vibes that consistently led to significant energy decreases. Only include if clear patterns exist."),
  keyObservations: z.array(z.string()).describe("2-4 bullet-point observations about patterns, specific vibes, common notes, or noteworthy interactions/days."),
  actionableSuggestions: z.array(z.string()).describe("2-3 actionable and personalized suggestions for managing social energy based on the report's findings. Be empathetic and constructive."),
});
export type GenerateEnergyReportOutput = z.infer<typeof EnergyReportOutputSchema>;

// The wrapper function `generateEnergyReport` that fetched data is removed.
// The client will now call `generateEnergyReportFlow` directly after fetching and formatting data.

const prompt = ai.definePrompt({
  name: 'energyReportPrompt',
  input: { schema: GenerateEnergyReportFlowInputSchema },
  output: { schema: EnergyReportOutputSchema },
  prompt: `You are Social Compass, an insightful and empathetic AI assistant helping users understand their social energy.
The user's name is {{#if userName}}{{userName}}{{else}}the user{{/if}}.
Analyze the following social interaction logs for the period: {{{periodDescription}}}.

Interaction Logs:
{{{interactionLogs}}}

Based ONLY on the provided logs, generate a comprehensive energy report. Structure your response strictly according to the 'EnergyReportOutputSchema'.
Your analysis should focus on:
1.  **Overall Summary**: A brief narrative about energy trends. What was the general mood or energy flow?
2.  **Interaction Statistics**: Calculate total interactions, average energy change (after - before), and average interactions per day. Identify day(s) with most activity if a clear pattern exists.
3.  **Peak Energizers**: Identify up to 3 specific event types, people, or common vibes that consistently resulted in the most significant POSITIVE energy changes. For each, state its name, category (EventType, Person, or Vibe), count, and average positive energy change.
4.  **Significant Drainers**: Identify up to 3 specific event types, people, or common vibes that consistently resulted in the most significant NEGATIVE energy changes. For each, state its name, category (EventType, Person, or Vibe), count, and average negative energy change.
5.  **Key Observations**: 2-4 bullet points highlighting interesting patterns, recurring themes in notes/vibes, or specific interactions/days that stand out.
6.  **Actionable Suggestions**: 2-3 empathetic, personalized, and actionable suggestions to help {{#if userName}}{{userName}}{{else}}the user{{/if}} manage their social energy better, based on the report.

Important considerations for your analysis:
- For Energizers/Drainers: Calculate average energy change specifically for that item. Focus on impact and consistency. If no clear patterns emerge for energizers or drainers, return an empty array for those fields rather than forcing an answer.
- People: If multiple people are listed in an interaction, attribute the interaction's impact to all individuals mentioned for pattern analysis.
- Calculations: Ensure 'averageEnergyChange' in interactionStats is the average of (feelingAfter - feelingBefore). For energizers/drainers, 'averagePositiveChange' and 'averageNegativeChange' refer to the magnitude of change.
- Tone: Be supportive, insightful, and slightly optimistic, even when discussing drainers. The goal is self-awareness and improvement.
- Output Format: Adhere strictly to the JSON schema provided for EnergyReportOutputSchema. Do not add any conversational text outside the JSON structure.
- Empty Data: If 'No interactions logged for this period.' is the input for interactionLogs, generate a report indicating this, with appropriate empty or zeroed-out values for stats. For example, the summary could state that no data was available.
`,
});

// Renamed to reflect it's the direct flow. The client will call this.
export const generateEnergyReportFlow = ai.defineFlow(
  {
    name: 'energyReportGenerationFlow', // Keep original flow name for Genkit's perspective
    inputSchema: GenerateEnergyReportFlowInputSchema,
    outputSchema: EnergyReportOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    
    if (!output) {
        console.error("LLM returned empty output for energy report generation.");
        throw new Error("Failed to generate energy report due to empty LLM response.");
    }
    return output;
  }
);
