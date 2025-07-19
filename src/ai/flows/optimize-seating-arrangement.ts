// src/ai/flows/optimize-seating-arrangement.ts
'use server';

/**
 * @fileOverview AI-powered flow to optimize seating arrangements, considering non-working days, special events, and past arrangements.
 *
 * - optimizeSeatingArrangement - The main function to trigger the seating optimization.
 * - OptimizeSeatingArrangementInput - Input type for optimizeSeatingArrangement.
 * - OptimizeSeatingArrangementOutput - Output type for optimizeSeatingArrangement.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { format, addDays, isWeekend, parseISO } from 'date-fns';

const OptimizeSeatingArrangementInputSchema = z.object({
  nonWorkingDays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).describe('Array of dates in YYYY-MM-DD format representing non-working days (holidays).'),
  specialEvents: z.record(z.string()).describe('Object mapping dates (YYYY-MM-DD) to descriptions of special events.'),
  pastArrangements: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date of the seating arrangement (YYYY-MM-DD).'),
    seats: z.array(z.string()).length(3).describe('Array of seat assignments for that date, should have 3 values.'),
  })).describe('History of past seating arrangements.'),
  friends: z.array(z.string()).length(3).describe('Array of friend names.').default(['Alice', 'Bob', 'Charlie']),
});

export type OptimizeSeatingArrangementInput = z.infer<typeof OptimizeSeatingArrangementInputSchema>;

const OptimizeSeatingArrangementOutputSchema = z.object({
  arrangement: z.array(z.string()).length(3).describe('Optimized seating arrangement for the next working day.'),
  reasoning: z.string().describe('Explanation of why the AI chose this seating arrangement.'),
  nextWorkingDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('The next working day for which the arrangement is suggested.'),
});

export type OptimizeSeatingArrangementOutput = z.infer<typeof OptimizeSeatingArrangementOutputSchema>;

export async function optimizeSeatingArrangement(input: OptimizeSeatingArrangementInput): Promise<OptimizeSeatingArrangementOutput> {
  return optimizeSeatingArrangementFlow(input);
}

const optimizeSeatingArrangementPrompt = ai.definePrompt({
  name: 'optimizeSeatingArrangementPrompt',
  input: {schema: z.object({
      ...OptimizeSeatingArrangementInputSchema.shape,
      nextWorkingDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('The determined next working day.'),
      latestArrangement: z.array(z.string()).optional().describe('The most recent seating arrangement.'),
  })},
  output: {schema: OptimizeSeatingArrangementOutputSchema},
  prompt: `You are an AI assistant specialized in creating fair, rotating seating arrangements for three friends: {{{friends}}}.

Your task is to determine the seating arrangement for the next working day, which is {{{nextWorkingDay}}}.

Key factors to consider:
- **Rotation and Fairness**: The primary goal is to rotate the friends through the seats fairly. The last known seating arrangement was: {{{latestArrangement}}}. The new arrangement should be the next logical rotation. For example, if the last arrangement was [Alice, Bob, Charlie], the next should be [Bob, Charlie, Alice].
- **Continuity**: The rotation should pick up from the most recent arrangement, ignoring any non-working days in between.
- **Past History**: Use the full history of past arrangements to ensure long-term fairness. Past arrangements: {{{pastArrangements}}}.
- **Special Events**: Check if the next working day has a special event: {{{specialEvents}}}. If an event description implies a seating preference, consider it. Otherwise, follow the standard rotation.

Based on these rules, determine the optimal seating arrangement for {{{nextWorkingDay}}}. Provide the arrangement and a concise reasoning for your choice. The seating arrangement must be an array of the three friend names: {{{friends}}}.`,
});

const optimizeSeatingArrangementFlow = ai.defineFlow(
  {
    name: 'optimizeSeatingArrangementFlow',
    inputSchema: OptimizeSeatingArrangementInputSchema,
    outputSchema: OptimizeSeatingArrangementOutputSchema,
  },
  async (input) => {
    // Determine the most recent arrangement date from pastArrangements
    const sortedPastArrangements = [...input.pastArrangements].sort((a, b) => b.date.localeCompare(a.date));
    const latestArrangement = sortedPastArrangements.length > 0 ? sortedPastArrangements[0] : null;

    let currentDate = latestArrangement ? parseISO(latestArrangement.date) : new Date();

    // Find the next working day
    let nextDay = addDays(currentDate, 1);
    while (isWeekend(nextDay) || input.nonWorkingDays.includes(format(nextDay, 'yyyy-MM-dd'))) {
        nextDay = addDays(nextDay, 1);
    }
    const nextWorkingDayStr = format(nextDay, 'yyyy-MM-dd');

    const {output} = await optimizeSeatingArrangementPrompt({
      ...input,
      nextWorkingDay: nextWorkingDayStr,
      latestArrangement: latestArrangement?.seats
    });

    if (output) {
      output.nextWorkingDay = nextWorkingDayStr;
    }
    
    return output!;
  }
);
