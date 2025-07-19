// use server'

/**
 * @fileOverview This file defines a Genkit flow for suggesting a seating arrangement based on past arrangements and fairness.
 *
 * - suggestSeatingArrangement - A function that suggests a seating arrangement.
 * - SuggestSeatingArrangementInput - The input type for the suggestSeatingArrangement function.
 * - SuggestSeatingArrangementOutput - The return type for the suggestSeatingArrangement function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestSeatingArrangementInputSchema = z.object({
  availableFriends: z
    .array(z.string())
    .describe('An array of the names of the friends who are present.'),
  pastArrangements: z
    .array(z.record(z.string()))
    .optional()
    .describe('An array of past seating arrangements, each being a record of friend to seat assignment.'),
});
export type SuggestSeatingArrangementInput = z.infer<
  typeof SuggestSeatingArrangementInputSchema
>;

const SuggestSeatingArrangementOutputSchema = z.object({
  suggestedArrangement: z
    .record(z.string())
    .describe('A record of suggested seating arrangement, mapping friend names to seat positions.'),
});
export type SuggestSeatingArrangementOutput = z.infer<
  typeof SuggestSeatingArrangementOutputSchema
>;

export async function suggestSeatingArrangement(
  input: SuggestSeatingArrangementInput
): Promise<SuggestSeatingArrangementOutput> {
  return suggestSeatingArrangementFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestSeatingArrangementPrompt',
  input: {schema: SuggestSeatingArrangementInputSchema},
  output: {schema: SuggestSeatingArrangementOutputSchema},
  prompt: `You are an AI assistant designed to suggest seating arrangements for a group of friends.

Given the following information about available friends and past arrangements, suggest a seating arrangement that is fair and takes into account past arrangements to minimize repetition.

Available Friends: {{availableFriends}}

{{#if pastArrangements}}
Past Arrangements:
{{#each pastArrangements}}
  - {{{this}}}
{{/each}}
{{else}}
No past arrangements available.
{{/if}}

Consider fairness by ensuring that no one friend is always in the same seat.  The output should be a JSON object mapping friend names to seat positions. The seat positions are just strings.
`,
});

const suggestSeatingArrangementFlow = ai.defineFlow(
  {
    name: 'suggestSeatingArrangementFlow',
    inputSchema: SuggestSeatingArrangementInputSchema,
    outputSchema: SuggestSeatingArrangementOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
