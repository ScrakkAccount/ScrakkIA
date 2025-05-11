
import { config } from 'dotenv';
config();

import '@/ai/flows/language-tagging.ts';
import '@/ai/flows/hidden-ai-prompt.ts';
import '@/ai/flows/regenerate-ai-response.ts';
import '@/ai/flows/speech-to-text-flow.ts';
import '@/ai/flows/text-to-speech-flow.ts';
import '@/ai/flows/accent-instructions.ts';
import '@/ai/tools/get-directions-tool.ts'; // Added new import

