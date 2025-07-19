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

const OptimizeSeatingArrangementInputSchema = z.object({
  nonWorkingDays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).describe('Array of dates in YYYY-MM-DD format representing non-working days.'),
  specialEvents: z.record(z.string()).describe('Object mapping dates (YYYY-MM-DD) to descriptions of special events.'),
  pastArrangements: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date of the seating arrangement (YYYY-MM-DD).'),
    seats: z.array(z.string()).length(3).describe('Array of seat assignments for that date, should have 3 values.'),
  })).describe('History of past seating arrangements, mapping dates to an array of assigned seats.'),
  friends: z.array(z.string()).length(3).describe('Array of friend names.').default(['Alice', 'Bob', 'Charlie']),
});

export type OptimizeSeatingArrangementInput = z.infer<typeof OptimizeSeatingArrangementInputSchema>;

const OptimizeSeatingArrangementOutputSchema = z.object({
  arrangement: z.array(z.string()).length(3).describe('Optimized seating arrangement considering fairness, non-working days, and special events.'),
  reasoning: z.string().describe('Explanation of why the AI chose this seating arrangement.'),
});

export type OptimizeSeatingArrangementOutput = z.infer<typeof OptimizeSeatingArrangementOutputSchema>;

export async function optimizeSeatingArrangement(input: OptimizeSeatingArrangementInput): Promise<OptimizeSeatingArrangementOutput> {
  return optimizeSeatingArrangementFlow(input);
}

const optimizeSeatingArrangementPrompt = ai.definePrompt({
  name: 'optimizeSeatingArrangementPrompt',
  input: {schema: OptimizeSeatingArrangementInputSchema},
  output: {schema: OptimizeSeatingArrangementOutputSchema},
  prompt: `You are an AI assistant specialized in optimizing seating arrangements for three friends: {{{friends}}}. Your goal is to suggest a fair and optimal seating arrangement, considering the following factors:

  - **Fairness:** Ensure that each friend gets a turn in each seat over time. Take into account these past seating arrangements: {{{pastArrangements}}}.
  - **Non-Working Days:** These days are: {{{nonWorkingDays}}}. These days should be skipped when suggesting arrangements.
  - **Special Events:** On these days: {{{specialEvents}}}, prioritize seating arrangements that accommodate the event, if possible.

  Given this information, suggest the most optimal seating arrangement for the next working day and explain your reasoning. The seating arrangement must be an array of the friend names: {{{friends}}}.`,
});

const optimizeSeatingArrangementFlow = ai.defineFlow(
  {
    name: 'optimizeSeatingArrangementFlow',
    inputSchema: OptimizeSeatingArrangementInputSchema,
    outputSchema: OptimizeSeatingArrangementOutputSchema,
  },
  async input => {
    const {output} = await optimizeSeatingArrangementPrompt(input);
    return output!;
  }
);
