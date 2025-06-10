
'use server';
/**
 * @fileOverview A Genkit flow to generate brief, contextual insights for the dashboard.
 *
 * - generateQuickInsightFlow - The Genkit flow that takes current energy, recent activity, and streak to generate an insight.
 * - GenerateQuickInsightInput - The input type for the flow.
 * - GenerateQuickInsightOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateQuickInsightInputSchema = z.object({
  currentEnergy: z.number().min(0).max(100).describe('The user\'s current energy level (0-100%).'),
  recentInteractionsSummary: z.string().describe('A very brief summary of the last 1-2 interactions, including type and energy change. Example: "Last: Party (+20%). Prev: Work Meeting (-15%)." or "No recent interactions logged."'),
  consecutiveLogStreak: z.number().min(0).describe('Current number of consecutive days the user has logged an activity.'),
  userName: z.string().optional().describe('The name of the user, if available.'),
});
export type GenerateQuickInsightInput = z.infer<typeof GenerateQuickInsightInputSchema>;

const GenerateQuickInsightOutputSchema = z.object({
  quickInsight: z.string().describe('A concise (1-3 sentences, max ~150 characters) insightful, encouraging, or observational comment based on the input. It should be actionable or reflective if possible.'),
});
export type GenerateQuickInsightOutput = z.infer<typeof GenerateQuickInsightOutputSchema>;

const prompt = ai.definePrompt({
  name: 'quickInsightPrompt',
  input: { schema: GenerateQuickInsightInputSchema },
  output: { schema: GenerateQuickInsightOutputSchema },
  prompt: `You are Social Compass, an empathetic AI companion. The user's name is {{#if userName}}{{userName}}{{else}}the user{{/if}}.
Current energy: {{currentEnergy}}%.
Recent activity: {{{recentInteractionsSummary}}}
Consecutive logging streak: {{consecutiveLogStreak}} days.

Generate a short (1-3 sentences, around 150 chars max) and friendly insight or encouragement for {{#if userName}}{{userName}}{{else}}the user{{/if}}.
- If energy is high and recent activity positive, be encouraging.
- If energy is low, be supportive and perhaps suggest a recharge or reflection.
- If streak is good, acknowledge it.
- If no recent activity, gently nudge towards logging.
- Keep it concise and directly related to the provided data.
- Avoid generic advice; make it sound like a quick, personal observation.
Example for high energy, good streak: "Fantastic energy at {{currentEnergy}}% and a {{consecutiveLogStreak}}-day streak! Keep riding that wave! What amazing thing will you do today?"
Example for low energy: "Seeing your energy at {{currentEnergy}}%. {{{recentInteractionsSummary}}} How about a moment to recharge or a quick journal entry?"
Example for no recent activity: "Your battery is at {{currentEnergy}}%. Log an interaction or a quick check-in to see how your social world is shaping your energy!"
`,
});

export const generateQuickInsightFlow = ai.defineFlow(
  {
    name: 'quickInsightGenerationFlow',
    inputSchema: GenerateQuickInsightInputSchema,
    outputSchema: GenerateQuickInsightOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      console.warn("Quick insight LLM returned empty output.");
      // Return a default non-empty insight to avoid breaking UI
      return { quickInsight: "Remember to log your interactions to track your energy!" };
    }
    return output;
  }
);
