'use server';
/**
 * @fileOverview A Genkit flow for transcribing speech to text using the configured AI model.
 *
 * - transcribeAudio - Transcribes audio data to text.
 * - TranscribeAudioInput - Input schema for audio transcription.
 * - TranscribeAudioOutput - Output schema for audio transcription.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TranscribeAudioInputSchema = z.object({
  audioDataUri: z.string().describe(
    "Audio data as a Base64 encoded data URI. Expected format: 'data:audio/<format>;base64,<encoded_data>'."
  ),
  languageCode: z.string().optional().describe(
    "Language code for transcription (e.g., 'en', 'es', 'fr-FR'). This serves as a hint to the model."
  ),
});
export type TranscribeAudioInput = z.infer<typeof TranscribeAudioInputSchema>;

const TranscribeAudioOutputSchema = z.object({
  transcribedText: z.string().describe('The transcribed text from the audio.'),
});
export type TranscribeAudioOutput = z.infer<typeof TranscribeAudioOutputSchema>;

export async function transcribeAudio(input: TranscribeAudioInput): Promise<TranscribeAudioOutput> {
  return transcribeAudioFlow(input);
}

const transcribePrompt = ai.definePrompt({
  name: 'transcribeAudioPrompt',
  input: { schema: TranscribeAudioInputSchema },
  output: { schema: TranscribeAudioOutputSchema },
  system: `You are a highly accurate speech-to-text transcription service. Your task is to transcribe the provided audio data.
If a language hint is given, prioritize that language.
If the audio is unclear, contains no discernible speech, or if you cannot process the audio data for any reason,
you MUST respond with an empty string in the 'transcribedText' field. Do not make up text if unsure.`,
  prompt: `
{{media url=audioDataUri}}

{{#if languageCode}}
The following is a hint for the audio's language: {{languageCode}}. Please prioritize transcription in this language.
{{else}}
No specific language hint provided. Transcribe based on the detected language from the audio.
{{/if}}

Provide the transcription of the audio above.
  `,
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
    temperature: 0.1, // Lower temperature for more deterministic transcription
  },
});

const transcribeAudioFlow = ai.defineFlow(
  {
    name: 'transcribeAudioFlow',
    inputSchema: TranscribeAudioInputSchema,
    outputSchema: TranscribeAudioOutputSchema,
  },
  async (input) => {
    try {
      // console.log("Attempting to transcribe audio. Language hint:", input.languageCode);
      // console.log("Audio Data URI (first 100 chars):", input.audioDataUri.substring(0, 100));
      
      // Ensure the model receives the audioDataUri correctly for media processing.
      // The `{{media url=audioDataUri}}` in the prompt string handles this.
      const { output } = await transcribePrompt({ 
        audioDataUri: input.audioDataUri,
        languageCode: input.languageCode 
      });
      
      if (!output) {
        console.warn('Transcription prompt did not return a structured output. Returning empty text.');
        return { transcribedText: "" };
      }
      // console.log("Transcription output:", output.transcribedText);
      return output;
    } catch (error) {
      console.error("Error in transcribeAudioFlow:", error);
      // Provide a user-friendly error or indicate failure
      return { transcribedText: "[Error during transcription]" };
    }
  }
);
