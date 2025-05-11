'use server';

/**
 * @fileOverview A Genkit flow that adds a language tag to each user message.
 *
 * - languageTagging - A function that adds a language tag to a message.
 * - LanguageTaggingInput - The input type for the languageTagging function.
 * - LanguageTaggingOutput - The return type for the languageTagging function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const LanguageTaggingInputSchema = z.object({
  message: z.string().describe('The message to be tagged.'),
  language: z.string().describe('The language of the message.'),
});
export type LanguageTaggingInput = z.infer<typeof LanguageTaggingInputSchema>;

const LanguageTaggingOutputSchema = z.object({
  taggedMessage: z.string().describe('The message with the language tag.'),
});
export type LanguageTaggingOutput = z.infer<typeof LanguageTaggingOutputSchema>;

export async function languageTagging(input: LanguageTaggingInput): Promise<LanguageTaggingOutput> {
  return languageTaggingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'languageTaggingPrompt',
  input: {schema: LanguageTaggingInputSchema},
  output: {schema: LanguageTaggingOutputSchema},
  prompt: `Add the language tag to the message.

Message: {{{message}}} ({{{language}}})`,
});

const languageTaggingFlow = ai.defineFlow(
  {
    name: 'languageTaggingFlow',
    inputSchema: LanguageTaggingInputSchema,
    outputSchema: LanguageTaggingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
