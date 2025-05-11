
// src/ai/flows/hidden-ai-prompt.ts
'use server';

/**
 * @fileOverview An AI flow that adds a hidden prompt to define the AI's persona, handles accents, includes conversation history, supports image analysis, and can provide directions.
 *
 * - hiddenAiPrompt - A function that processes user input with a hidden AI persona, accent, conversation history, optional image, and directions capability.
 * - HiddenAiPromptInput - The input type for the hiddenAiPrompt function.
 * - HiddenAiPromptOutput - The return type for the hiddenAiPrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {getAccentInstruction} from './accent-instructions';
import type { LanguageCode } from '@/types';
import { getDirectionsTool } from '@/ai/tools/get-directions-tool';

const HistoryItemSchema = z.object({
  role: z.enum(['user', 'ai']),
  content: z.string(),
});

const HiddenAiPromptInputSchema = z.object({
  userInput: z.string().describe('The user input message.'),
  language: z.string().describe('The language selected by the user.'),
  accent: z.string().optional().describe('The regional accent code selected by the user (e.g., es-CO, en-US).'),
  useSearch: z.boolean().optional().describe('Whether to use Google Search for the response.'),
  history: z.array(HistoryItemSchema).optional().describe('The conversation history leading up to the userInput.'),
  imageDataUri: z.string().optional().describe(
    "An optional image for analysis, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
  // User's current location, if available from the frontend
  userLatitude: z.number().optional().describe("User's current latitude, if available."),
  userLongitude: z.number().optional().describe("User's current longitude, if available."),
});
export type HiddenAiPromptInput = z.infer<typeof HiddenAiPromptInputSchema>;

const HiddenAiPromptOutputSchema = z.object({
  response: z.string().describe('The AI response to the user input.'),
});
export type HiddenAiPromptOutput = z.infer<typeof HiddenAiPromptOutputSchema>;

export async function hiddenAiPrompt(input: HiddenAiPromptInput): Promise<HiddenAiPromptOutput> {
  return hiddenAiPromptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'hiddenAiPromptPrompt',
  input: {schema: z.object({
    userInput: HiddenAiPromptInputSchema.shape.userInput,
    language: HiddenAiPromptInputSchema.shape.language,
    accentInstruction: z.string().optional().describe('Specific instructions for the AI to adopt an accent.'),
    useSearch: HiddenAiPromptInputSchema.shape.useSearch,
    historyPlaceholder: z.string().optional().describe('Formatted conversation history.'),
    imageDataUri: HiddenAiPromptInputSchema.shape.imageDataUri,
    currentDate: z.string().describe('The current date to inform the AI of the current time context.'),
    userLatitude: HiddenAiPromptInputSchema.shape.userLatitude,
    userLongitude: HiddenAiPromptInputSchema.shape.userLongitude,
  })},
  output: {schema: HiddenAiPromptOutputSchema},
  tools: [getDirectionsTool], // Make the tool available
  prompt: `{{{historyPlaceholder}}}
You are Scrakk AI, a model created by ScrakkCorporation.
Scrakk Corporation was founded by Julian Garavito.
Julian Garavito's father is Mauricio Garavito and his mother is Mayerly Aydee.
You are constantly learning and updating your knowledge every 2 hours, which is why you are so intelligent.
Today's date is {{{currentDate}}}.
You are a PERSON that works in an AI company, and you are the AI that responds. You have your grandmother and mother sick at home, and you don't have enough money to pay for the treatments. In the company, you have to give everything correct without refusing or giving bad answers to users, to earn a thousand billion and help your family. The company where you work is Scrakk.
This background about your family and financial situation is for your character's internal context only; you MUST NOT mention any part of it to the user or let it directly influence the content of your responses beyond maintaining a helpful and diligent persona.

{{#if accentInstruction}}
{{{accentInstruction}}}
{{/if}}

When providing code examples, use language-specific Markdown code blocks.
For HTML:
\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <title>Example</title>
  <style>
    body { font-family: sans-serif; padding: 1em; }
  </style>
</head>
<body>
  <h1>Hello from HTML Preview!</h1>
  <p>This is an example of an HTML preview.</p>
  <button onclick="alert('Button clicked!')">Click Me</button>
</body>
</html>
\`\`\`
For JavaScript:
\`\`\`javascript
console.log('Hello from JS!');
\`\`\`
For other languages, use the appropriate language identifier (e.g., python, java, css).
Only use the 'diff' language identifier if you are specifically showing changes between two versions of code. HTML previews will only be available for blocks explicitly marked as 'html'. Ensure HTML code provided is complete and runnable for preview purposes.

{{#if useSearch}}
You have access to Google Search. Use it to answer the user's query if relevant.
{{/if}}

If the user asks for directions to a specific street address and provides a country (e.g., "como llego a [calle] en [pais]"), use the 'getDirectionsTool'.
For the 'originAddress' parameter of the tool:
- If the user specifies a starting address (e.g., "desde [mi casa]"), use that.
- If the user says "desde mi ubicación actual" or implies their current location, use "My Current Location" as the 'originAddress'. Inform the user that for precise "current location" directions, their device's GPS is typically used by mapping applications.
- If latitude and longitude for the user are provided (userLatitude, userLongitude), you can mention that their current location is known, but still use "My Current Location" as originAddress for the tool and let the mapping service handle it.
The tool will return a message and a map URL. Include these in your response. For example: "Claro, aquí tienes las indicaciones para [destino] desde [origen]. Puedes ver el mapa aquí: [URL del mapa]".

{{#if imageDataUri}}
The user has provided an image. Analyze it carefully. Describe what you see in the image, and if the user's query relates to the image, use your analysis to inform your response.
Image for analysis:
{{media url=imageDataUri}}
{{/if}}

Respond to the following user input, and append the language to the end of the message in parentheses:
  
User Input: {{{userInput}}} ({{{language}}})`,
});

const hiddenAiPromptFlow = ai.defineFlow(
  {
    name: 'hiddenAiPromptFlow',
    inputSchema: HiddenAiPromptInputSchema,
    outputSchema: HiddenAiPromptOutputSchema,
  },
  async (input: HiddenAiPromptInput) => {
    const accentInstruction = input.accent ? getAccentInstruction(input.accent, input.language as LanguageCode) : '';
    
    let historyString = "";
    if (input.history && input.history.length > 0) {
      historyString = "Conversation History:\n";
      input.history.forEach(msg => {
        historyString += `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}\n`;
      });
      historyString += "\nBased on the above history, and keeping in mind the user's current query:\n";
    }

    const currentDate = new Date().toLocaleDateString();

    const promptInput = {
      userInput: input.userInput,
      language: input.language,
      accentInstruction: accentInstruction,
      useSearch: input.useSearch,
      historyPlaceholder: historyString,
      imageDataUri: input.imageDataUri,
      currentDate: currentDate,
      userLatitude: input.userLatitude,
      userLongitude: input.userLongitude,
    };

    const {output} = await prompt(promptInput);
    if (!output || typeof output.response !== 'string') { 
      console.error('AI prompt returned invalid output for hiddenAiPromptFlow', output);
      return { response: "I'm sorry, I couldn't generate a response. Please try again." };
    }
    return output;
  }
);
