
export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'ko' | 'pt';

export interface AccentOption {
  code: string; // e.g., 'es-CO', 'en-US'
  name: string;
}

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  accents?: AccentOption[];
}

export interface ImageAttachment {
  type: 'image';
  dataUri: string;
  name: string;
  fileType: string; // MIME type
  size: number;
}

export interface FileAttachment {
  type: 'file';
  name: string;
  fileType: string; // MIME type
  size: number;
  dataUri?: string; // Optional: for specific previews or embedding small files
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string; // For AI, this is the response. For User, this is rawText + (language tag)
  rawText?: string; // Original text typed by the user, without language tag
  language?: LanguageCode; // Language of the user message
  accentCode?: string; // Accent code selected by the user for this message
  timestamp: number;
  isEditing?: boolean; // For UI state when editing a user message
  isLoading?: boolean; // For AI message while generating
  attachment?: ImageAttachment | FileAttachment; // New field for attachments
}

export interface ChatSession {
  id:string;
  name: string;
  messages: ChatMessage[];
  createdAt: number;
  lastModified: number;
}

// Make this file a module
export {};
