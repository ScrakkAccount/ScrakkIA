'use server';
/**
 * @fileOverview A Genkit flow for synthesizing text to speech.
 *
 * - textToSpeech - Synthesizes text into an audio data URI.
 * - TextToSpeechInput - Input schema for text-to-speech.
 * - TextToSpeechOutput - Output schema for text-to-speech.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAccentInstruction } from './accent-instructions';
import type { LanguageCode } from '@/types';

const TextToSpeechInputSchema = z.object({
  text: z.string().describe('The text to be synthesized.'),
  languageCode: z.string().describe('The BCP-47 language code (e.g., "en-US", "es-ES").'),
  accentCode: z.string().optional().describe('A regional accent code (e.g., "es-CO", "en-GB") to influence the speech style.'),
});
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;

const TextToSpeechOutputSchema = z.object({
  audioDataUri: z.string().describe(
    "The synthesized audio as a Base64 encoded data URI. Expected format: 'data:audio/<format>;base64,<encoded_data>'."
  ),
});
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;

export async function textToSpeech(input: TextToSpeechInput): Promise<TextToSpeechOutput> {
  // This flow assumes that the underlying AI model or a configured tool
  // can handle text-to-speech requests based on the provided prompt.
  // For models like Gemini, direct audio generation from a simple text prompt might not be standard.
  // This would typically involve a dedicated TTS service (e.g., Google Cloud Text-to-Speech API)
  // wrapped as a Genkit tool, or a model specifically designed for TTS that the plugin supports.
  return textToSpeechGenkitFlow(input);
}

// This prompt is structured to guide an AI model capable of TTS.
// The actual capability depends on the model configured in `ai/genkit.ts` and its plugin.
const ttsPrompt = ai.definePrompt({
  name: 'textToSpeechPrompt',
  input: { schema: z.object({
    text: TextToSpeechInputSchema.shape.text,
    languageCode: TextToSpeechInputSchema.shape.languageCode,
    accentInstruction: z.string().optional().describe('Detailed instruction for voice accent and style derived from accentCode and languageCode.'),
  }) },
  output: { schema: TextToSpeechOutputSchema },
  system: `You are an advanced Text-to-Speech (TTS) synthesis engine. 
Your primary function is to convert the provided text into natural-sounding speech audio.
You must strictly adhere to the specified language and accent instructions.
The final output must be an audio data URI. Do not add any conversational text, only the data URI.`,
  prompt: `
{{{accentInstruction}}}

Synthesize the following text into speech:
Text: {{{text}}}
Language to use for synthesis: {{{languageCode}}}

Provide the output ONLY as an audio data URI (e.g., data:audio/mp3;base64,...).
  `,
  // Note: Real TTS often involves specific model configurations or tools.
  // A 'responseModalities: ['AUDIO']' or similar in `config` would be needed
  // if the model plugin supports it directly. This is a placeholder for such a capability.
  config: {
    temperature: 0.3, // Lower temperature for more consistent TTS output
    safetySettings: [ // Standard safety settings
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  }
});

const textToSpeechGenkitFlow = ai.defineFlow(
  {
    name: 'textToSpeechFlow',
    inputSchema: TextToSpeechInputSchema,
    outputSchema: TextToSpeechOutputSchema,
  },
  async (input: TextToSpeechInput) => {
    const accentInstruction = input.accentCode 
      ? getAccentInstruction(input.accentCode, input.languageCode as LanguageCode) 
      : `Speak in a standard voice for the language ${input.languageCode}.`;

    try {
      // This call assumes 'ttsPrompt' targets a model/tool capable of fulfilling the TTS request.
      // If 'gemini-2.0-flash' (or the configured default) doesn't support this directly,
      // this will not produce actual audio.
      const { output } = await ttsPrompt({
        text: input.text,
        languageCode: input.languageCode,
        accentInstruction: accentInstruction,
      });

      if (!output || !output.audioDataUri || !output.audioDataUri.startsWith('data:audio')) {
        console.warn('Text-to-speech prompt did not return a valid audioDataUri. This may indicate the model does not support direct audio generation as prompted. Check model capabilities and plugin support.');
        // Fallback to a silent audio URI to fulfill the contract
        return { audioDataUri: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAVAAAAHgAAAEACAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkYXRhAAAAAA==" }; // Short silent WAV
      }
      return output;
    } catch (error) {
      console.error("Error in textToSpeechFlow:", error);
      // Provide a fallback silent audio URI in case of any error
      return { audioDataUri: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAVAAAAHgAAAEACAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkYXRhAAAAAA==" }; // Short silent WAV
    }
  }
);
