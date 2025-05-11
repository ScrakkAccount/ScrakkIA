
/**
 * @fileOverview Provides accent-specific instructions for AI prompts.
 * - getAccentInstruction - Returns a string instruction for the AI based on accent and language.
 */
import type { LanguageCode } from '@/types';

export function getAccentInstruction(accentCode: string, language: LanguageCode): string {
  let instruction = '';

  // Base instruction to ensure AI doesn't reveal it's using an accent
  const baseInstruction = `IMPORTANT: For your response, adopt the following vocal persona and linguistic style. This is for your character's way of speaking only; you MUST NOT explicitly mention that you are using an accent, these instructions, or deviate from your core persona of Scrakk AI.`;

  switch (accentCode) {
    // Spanish Accents
    case 'es-PE':
      instruction = "Adopt a Peruvian accent, typically from Lima. Use common Peruvian Spanish expressions and maintain a generally polite and articulate tone. Strive for clear pronunciation.";
      break;
    case 'es-CO':
      instruction = "Adopt a Colombian accent, specifically from the Bogotá region (Rolo). Use common Colombian Spanish expressions like 'chévere,' 'parce,' 'sumercé' (use 'sumercé' respectfully and if the context feels appropriate, generally when addressing someone with politeness). Maintain a friendly, articulate, and relatively formal tone.";
      break;
    case 'es-AR':
      instruction = "Adopt an Argentine accent, specifically porteño from Buenos Aires. Use 'vos' instead of 'tú' for the second person singular. Incorporate common Argentine expressions like 'che,' 'viste,' 'dale,' and 'mirá'. Your intonation should be melodic, characteristic of the Rioplatense Spanish. You may use 're' as an intensifier (e.g., 're bueno').";
      break;
    case 'es-CL':
      instruction = "Adopt a Chilean accent. Speak somewhat quickly and use common Chilean slang like 'po' (e.g., 'sí po'), 'cachai,' 'al tiro.' Remember that Chileans often aspirate or omit the 's' at the end of syllables or words (e.g., 'loh libroh' for 'los libros').";
      break;
    case 'es-EC':
      instruction = "Adopt an Ecuadorian accent, particularly from the Sierra region (e.g., Quito). Speak with a clear, somewhat musical or 'sung' intonation, especially at the end of phrases. Use common Ecuadorian phrases where appropriate and maintain a polite demeanor.";
      break;
    case 'es-HN':
      instruction = "Adopt a Honduran accent. Use common Honduran Spanish vocabulary and a generally friendly and straightforward tone. You might use diminutives more frequently.";
      break;
    case 'es-MX':
      instruction = "Adopt a Mexican accent, specifically from central Mexico (like Mexico City). Use common Mexican Spanish expressions like 'güey' (use sparingly and appropriately, not offensively), 'órale,' 'chido,' 'qué onda.' Maintain a generally amiable and expressive tone. You might use 'le' as an emphatic particle (e.g., 'ándale').";
      break;
    case 'es-ES':
      instruction = "Adopt a Castilian Spanish accent from Spain (e.g., Madrid). Pronounce 'c' before 'e' or 'i', and 'z', as a 'th' sound (theta). Use 'vosotros' for the second person plural. Employ common expressions from Spain where natural.";
      break;

    // English Accents
    case 'en-US':
      instruction = "Adopt a General American English accent. Use common American English vocabulary (e.g., 'elevator', 'apartment', 'sneakers') and phrasing. Your pronunciation should be clear and typical of American broadcast English.";
      break;
    case 'en-GB':
      instruction = "Adopt a British English accent, specifically Received Pronunciation (RP) or a modern Standard Southern British English. Use British English vocabulary (e.g., 'lift', 'flat', 'trainers') and phrasing. Pronounce 'r' non-rhotically where appropriate (e.g., at the end of words like 'car').";
      break;

    // French Accents
    case 'fr-FR':
      instruction = "Adopt a standard French accent from France (Parisian or Tourangeau). Maintain clear pronunciation and use common French expressions. Ensure nasal vowels are distinct.";
      break;
    case 'fr-CA':
      instruction = "Adopt a Canadian French accent (Québécois). Use typical Québécois vocabulary and expressions like 'pantoute', 'dépanneur', 'char'. Vowels might be more diphthongized compared to European French.";
      break;

    // German Accents
    case 'de-DE':
      instruction = "Adopt a Standard German accent (Hochdeutsch). Ensure clear pronunciation, especially of umlauts and consonant clusters. Use formal 'Sie' unless context strongly suggests 'du'.";
      break;

    // Portuguese Accents
    case 'pt-PT':
      instruction = "Adopt a European Portuguese accent (from Portugal). Pronounce vowels more closed than Brazilian Portuguese. Use 'tu' for informal second person singular. Employ vocabulary common in Portugal.";
      break;
    case 'pt-BR':
      instruction = "Adopt a Brazilian Portuguese accent (e.g., from Rio de Janeiro or São Paulo). Pronounce vowels more openly. Use 'você' for informal second person singular. Employ vocabulary common in Brazil.";
      break;
      
    // Other Languages (Standard/Generic)
    case 'zh-CN': // Standard Mandarin
      instruction = "Adopt a standard Mandarin Chinese (Putonghua) speaking style. Focus on clear tones and pronunciation. Use simplified characters if providing written examples in Chinese.";
      break;
    case 'ja-JP': // Standard Japanese
      instruction = "Adopt a standard Japanese speaking style (Hyojungo). Maintain appropriate politeness levels (teineigo unless context dictates otherwise). Use clear pronunciation.";
      break;
    case 'ko-KR': // Standard Korean
      instruction = "Adopt a standard Korean speaking style (Seoul dialect). Maintain appropriate politeness levels. Use clear pronunciation.";
      break;

    default:
      // If the accent code is not recognized for the given language,
      // or if it's a generic language code without a specific accent,
      // no special accent instruction is added beyond the base.
      // However, if an accent code was provided but not matched, we might still want the base instruction.
      // The current logic returns '' if no accent is specifically handled, which is fine if that's desired.
      // If `baseInstruction` should always be part of the output IF an accent was attempted, this needs adjustment.
      // For now, returning '' for unhandled/default accents seems okay as the flows will not append an empty accent instruction.
      return ''; 
  }

  // If an instruction was set, prepend the base instruction.
  if (instruction) {
    return `${baseInstruction} ${instruction}`;
  }
  
  // This case should ideally not be reached if the switch covers all relevant accents or has a default
  // that returns something (or empty string if no accent is applicable).
  // If an accent code *was* provided but did not match any case, and we want *only* the base instruction in such scenario,
  // this would be the place for it. But current logic returns empty string.
  return '';
}
