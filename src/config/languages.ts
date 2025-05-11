
import type { LanguageOption, AccentOption } from '@/types';

export const SPANISH_ACCENTS: AccentOption[] = [
  { code: 'es-PE', name: 'Peruano (Perú)' },
  { code: 'es-CO', name: 'Colombiano (Colombia)' },
  { code: 'es-AR', name: 'Argentino (Argentina)' },
  { code: 'es-CL', name: 'Chileno (Chile)' },
  { code: 'es-EC', name: 'Ecuatoriano (Ecuador)' },
  { code: 'es-HN', name: 'Hondureño (Honduras)' },
  { code: 'es-MX', name: 'Mexicano (México)' },
  { code: 'es-ES', name: 'Español (España)' },
];

export const ENGLISH_ACCENTS: AccentOption[] = [
  { code: 'en-US', name: 'American (US)' },
  { code: 'en-GB', name: 'British (UK)' },
];

export const FRENCH_ACCENTS: AccentOption[] = [
  { code: 'fr-FR', name: 'Français (France)' },
  { code: 'fr-CA', name: 'Français (Canada)' },
];

export const GERMAN_ACCENTS: AccentOption[] = [
  { code: 'de-DE', name: 'Deutsch (Deutschland)' },
  // { code: 'de-AT', name: 'Österreichisch (Österreich)' }, // Example
];

export const PORTUGUESE_ACCENTS: AccentOption[] = [
  { code: 'pt-PT', name: 'Português (Portugal)' },
  { code: 'pt-BR', name: 'Português (Brasil)' },
];

// For languages like Chinese, Japanese, Korean, "accent" might be more about regional dialects
// or politeness levels. For simplicity, we can offer a "Standard" option or fewer variations.
export const CHINESE_ACCENTS: AccentOption[] = [
  { code: 'zh-CN', name: 'Mandarín (Estándar)' },
];

export const JAPANESE_ACCENTS: AccentOption[] = [
  { code: 'ja-JP', name: 'Japonés (Estándar)' },
];

export const KOREAN_ACCENTS: AccentOption[] = [
  { code: 'ko-KR', name: 'Coreano (Estándar)' },
];


export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', accents: ENGLISH_ACCENTS },
  { code: 'es', name: 'Español (Spanish)', accents: SPANISH_ACCENTS },
  { code: 'fr', name: 'Français (French)', accents: FRENCH_ACCENTS },
  { code: 'de', name: 'Deutsch (German)', accents: GERMAN_ACCENTS },
  { code: 'zh', name: '中文 (Chinese)', accents: CHINESE_ACCENTS },
  { code: 'ja', name: '日本語 (Japanese)', accents: JAPANESE_ACCENTS },
  { code: 'ko', name: '한국어 (Korean)', accents: KOREAN_ACCENTS },
  { code: 'pt', name: 'Português (Portuguese)', accents: PORTUGUESE_ACCENTS },
];

export const DEFAULT_LANGUAGE_CODE: LanguageCode = 'en';
export const DEFAULT_ACCENT_CODE: string | null = null; // Or a specific default like 'en-US' if 'en' is selected
