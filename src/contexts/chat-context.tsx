
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ChatSession, ChatMessage, LanguageCode, ImageAttachment, FileAttachment } from '@/types';
import useLocalStorage from '@/hooks/use-local-storage';
import { hiddenAiPrompt } from '@/ai/flows/hidden-ai-prompt'; 
import { regenerateAiResponse } from '@/ai/flows/regenerate-ai-response';
import { DEFAULT_LANGUAGE_CODE, SUPPORTED_LANGUAGES, DEFAULT_ACCENT_CODE } from '@/config/languages';
import { v4 as uuidv4 } from 'uuid'; // Using uuid for unique IDs
import { textToSpeech } from '@/ai/flows/text-to-speech-flow';

interface ChatContextType {
  chats: ChatSession[];
  activeChatId: string | null;
  selectedLanguage: LanguageCode;
  selectedAccent: string | null;
  isLoadingAiResponse: boolean;
  isEditingMessageId: string | null;
  currentSpokenText: string | null;
  isPlayingAudio: boolean;
  useSearch: boolean; 
  voiceMode: 'idle' | 'voice-to-chat' | 'speak-with-ai';
  currentMicAction: 'idle' | 'voice-to-chat' | 'speak-with-ai';
  userLocation: { latitude: number; longitude: number; } | null; // Added userLocation
  setVoiceMode: (mode: 'idle' | 'voice-to-chat' | 'speak-with-ai') => void;
  setCurrentMicAction: (action: 'idle' | 'voice-to-chat' | 'speak-with-ai') => void;
  createNewChat: () => string;
  selectChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  sendMessage: (rawText: string, attachmentFile?: File, skipAiResponse?: boolean) => Promise<void>;
  regenerateLastAiResponse: () => Promise<void>;
  startEditMessage: (messageId: string) => void;
  cancelEditMessage: () => void;
  submitEditMessage: (messageId: string, newRawText: string) => void;
  copyMessageToClipboard: (text: string) => void;
  setLanguage: (languageCode: LanguageCode) => void;
  setAccent: (accentCode: string | null) => void;
  getChatName: (chat: ChatSession) => string;
  speakText: (text: string, language: LanguageCode, accent?: string | null) => void;
  stopSpeaking: () => void;
  setCurrentSpokenText: (text: string | null) => void;
  setUseSearch: (useSearch: boolean) => void; 
  updateUserLocation: () => void; // Added function to update user location
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const LS_CHATS_KEY = 'scrakkAiStudio_chats';
const LS_ACTIVE_CHAT_ID_KEY = 'scrakkAiStudio_activeChatId';
const LS_SELECTED_LANGUAGE_KEY = 'scrakkAiStudio_selectedLanguage';
const LS_SELECTED_ACCENT_KEY = 'scrakkAiStudio_selectedAccent';
const LS_USE_SEARCH_KEY = 'scrakkAiStudio_useSearch'; 
const MAX_HISTORY_MESSAGES = 20; // Max number of messages to include in history


// Helper to read file as Data URL
const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};


export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chats, setChats] = useLocalStorage<ChatSession[]>(LS_CHATS_KEY, []);
  const [activeChatId, setActiveChatId] = useLocalStorage<string | null>(LS_ACTIVE_CHAT_ID_KEY, null);
  const [selectedLanguage, setSelectedLanguage] = useLocalStorage<LanguageCode>(LS_SELECTED_LANGUAGE_KEY, DEFAULT_LANGUAGE_CODE);
  const [selectedAccent, setSelectedAccent] = useLocalStorage<string | null>(LS_SELECTED_ACCENT_KEY, DEFAULT_ACCENT_CODE);
  const [isLoadingAiResponse, setIsLoadingAiResponse] = useState(false);
  const [isEditingMessageId, setIsEditingMessageId] = useState<string | null>(null);
  const [currentSpokenText, setCurrentSpokenText] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [useSearch, setUseSearch] = useLocalStorage<boolean>(LS_USE_SEARCH_KEY, false); 
  const [voiceMode, setVoiceMode] = useState<'idle' | 'voice-to-chat' | 'speak-with-ai'>('idle');
  const [currentMicAction, setCurrentMicAction] = useState<'idle' | 'voice-to-chat' | 'speak-with-ai'>('idle');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number; } | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0; 
    }
    if (isPlayingAudio) { 
        setIsPlayingAudio(false);
        setCurrentSpokenText(null);
    }
  }, [isPlayingAudio]);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      audioRef.current.onended = () => {
          setIsPlayingAudio(false);
          setCurrentSpokenText(null);
        };
       audioRef.current.onerror = (e) => {
        console.error("Audio playback error:", e);
        setIsPlayingAudio(false);
        setCurrentSpokenText(null);
      };
      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = ''; 
          audioRef.current.onended = null; 
          audioRef.current.onerror = null;
        }
      };
    }
    return undefined;
  }, []);

  const updateUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.warn("Error getting user location:", error.message);
          setUserLocation(null); // Clear location on error or denial
        }
      );
    } else {
      console.warn("Geolocation is not supported by this browser.");
      setUserLocation(null);
    }
  }, []);

  useEffect(() => {
    updateUserLocation(); // Get location on initial load
  }, [updateUserLocation]);


  const speakText = useCallback(async (text: string, language: LanguageCode, accent?: string | null) => {
    if (!audioRef.current || !text) return;
    stopSpeaking(); 

    setIsPlayingAudio(true);
    setCurrentSpokenText(text);

    try {
      const langDetails = SUPPORTED_LANGUAGES.find(l => l.code === language);
      const ttsLanguageCode = accent || langDetails?.accents?.find(a => a.code.startsWith(language + '-'))?.code || language;


      const response = await textToSpeech({ 
        text, 
        languageCode: ttsLanguageCode as LanguageCode, 
        accentCode: accent || undefined 
      });
      if (response.audioDataUri && response.audioDataUri.startsWith('data:audio') && audioRef.current) {
        audioRef.current.src = response.audioDataUri;
        await audioRef.current.play();
      } else {
        console.warn("Received invalid or no audio data from TTS service:", response.audioDataUri);
        setIsPlayingAudio(false);
        setCurrentSpokenText(null);
      }
    } catch (error) {
      console.error("Error during text-to-speech playback:", error);
      setIsPlayingAudio(false);
      setCurrentSpokenText(null);
    }
  }, [stopSpeaking]);


  const createNewChat = useCallback((): string => {
    const newChatId = uuidv4();
    const newChat: ChatSession = {
      id: newChatId,
      name: `Chat ${chats.length + 1}`, 
      messages: [],
      createdAt: Date.now(),
      lastModified: Date.now(),
    };
    setChats(prevChats => [...prevChats, newChat]);
    setActiveChatId(newChatId);
    setCurrentMicAction('idle');
    stopSpeaking();
    return newChatId;
  }, [chats.length, setChats, setActiveChatId, stopSpeaking]);

  useEffect(() => {
    if (chats.length === 0 && typeof window !== 'undefined') { 
      const newId = createNewChat();
      setActiveChatId(newId);
    } else if ((!activeChatId || !chats.find(c => c.id === activeChatId)) && chats.length > 0) {
      setActiveChatId(chats.sort((a,b) => b.lastModified - a.lastModified)[0]?.id || null);
    }
  }, [chats, activeChatId, setActiveChatId, createNewChat]);

  const selectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setIsEditingMessageId(null); 
    stopSpeaking();
    setCurrentMicAction('idle');
  };

  const deleteChat = (chatId: string) => {
    setChats(prevChats => {
      const remainingChats = prevChats.filter(chat => chat.id !== chatId);
      if (activeChatId === chatId) {
        stopSpeaking();
        setCurrentMicAction('idle');
        const sortedRemaining = remainingChats.sort((a,b) => b.lastModified - a.lastModified);
        if (sortedRemaining.length > 0) {
          setActiveChatId(sortedRemaining[0].id);
        } else {
          const newChatId = uuidv4();
          const newChat: ChatSession = {
            id: newChatId,
            name: `Chat 1`,
            messages: [],
            createdAt: Date.now(),
            lastModified: Date.now(),
          };
          setActiveChatId(newChatId);
          return [newChat]; 
        }
      }
      return remainingChats;
    });
  };
  
  const addMessageToChat = useCallback((chatId: string, message: ChatMessage) => {
    setChats(prevChats =>
      prevChats.map(chat =>
        chat.id === chatId
          ? { ...chat, messages: [...chat.messages, message], lastModified: Date.now() }
          : chat
      )
    );
  }, [setChats]);

  const updateMessageInChat = useCallback((chatId: string, updatedMessage: ChatMessage) => {
    setChats(prevChats =>
      prevChats.map(chat =>
        chat.id === chatId
          ? { ...chat, messages: chat.messages.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg), lastModified: Date.now() }
          : chat
      )
    );
  },[setChats]);

  const prepareHistory = (chatSession: ChatSession | undefined, upToMessageIndex?: number): {role: 'user' | 'ai', content: string}[] => {
    if (!chatSession) return [];
    const messagesToConsider = upToMessageIndex !== undefined ? chatSession.messages.slice(0, upToMessageIndex) : chatSession.messages;
    
    return messagesToConsider.slice(-MAX_HISTORY_MESSAGES).map(msg => ({
      role: msg.role,
      content: msg.role === 'user' ? (msg.rawText || '') : msg.text, // Use rawText for user for history to avoid tags
    }));
  };


  const sendMessage = async (rawText: string, attachmentFile?: File, skipAiResponse: boolean = false) => {
    if (!activeChatId || (!rawText.trim() && !attachmentFile)) return;
    
    if (currentMicAction === 'speak-with-ai') {
      stopSpeaking(); 
    }

    let messageAttachment: ImageAttachment | FileAttachment | undefined = undefined;
    let imageDataUriForPrompt: string | undefined = undefined;


    if (attachmentFile) {
        try {
            const dataUri = await readFileAsDataURL(attachmentFile);
            if (attachmentFile.type.startsWith('image/')) {
                messageAttachment = {
                    type: 'image',
                    dataUri,
                    name: attachmentFile.name,
                    fileType: attachmentFile.type,
                    size: attachmentFile.size,
                };
                imageDataUriForPrompt = dataUri;
            } else {
                 messageAttachment = {
                    type: 'file',
                    dataUri, 
                    name: attachmentFile.name,
                    fileType: attachmentFile.type,
                    size: attachmentFile.size,
                };
            }
        } catch (error) {
            console.error("Error reading file:", error);
        }
    }
    
    const langDetails = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage);
    const langName = langDetails?.name || selectedLanguage;
    const accentDetails = selectedAccent ? langDetails?.accents?.find(a => a.code === selectedAccent) : null;
    const tag = accentDetails ? `${langName} (${accentDetails.name})` : langName;


    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      rawText: rawText.trim(),
      text: rawText.trim() ? `${rawText.trim()} (${tag})` : `(${tag})`, 
      language: selectedLanguage,
      accentCode: selectedAccent || undefined, 
      timestamp: Date.now(),
      attachment: messageAttachment,
    };
    addMessageToChat(activeChatId, userMessage);

    if (skipAiResponse) { 
      return;
    }
     if (!rawText.trim() && !messageAttachment) { 
      return;
    }

    const currentChat = chats.find(c => c.id === activeChatId);
    const historyForPrompt = prepareHistory(currentChat); 


    const aiPlaceholderMessage: ChatMessage = {
      id: uuidv4(),
      role: 'ai',
      text: 'Thinking...',
      timestamp: Date.now(),
      isLoading: true,
      language: selectedLanguage, 
      accentCode: selectedAccent || undefined, 
    };
    addMessageToChat(activeChatId, aiPlaceholderMessage);
    setIsLoadingAiResponse(true);

    try {
      const aiResponse = await hiddenAiPrompt({ 
        userInput: rawText.trim(), 
        language: selectedLanguage, 
        accent: selectedAccent || undefined, 
        useSearch: useSearch, 
        history: historyForPrompt,
        imageDataUri: imageDataUriForPrompt,
        userLatitude: userLocation?.latitude,
        userLongitude: userLocation?.longitude,
      });
      const finalAiMessage: ChatMessage = {
        ...aiPlaceholderMessage,
        text: aiResponse.response,
        isLoading: false,
        timestamp: Date.now(),
      };
      updateMessageInChat(activeChatId, finalAiMessage);
      if (currentMicAction === 'speak-with-ai' && aiResponse.response) {
        speakText(aiResponse.response, selectedLanguage, selectedAccent);
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
      const errorAiMessage: ChatMessage = {
         ...aiPlaceholderMessage,
        text: 'Sorry, I encountered an error. Please try again. (Error)',
        isLoading: false,
        timestamp: Date.now(),
      };
      updateMessageInChat(activeChatId, errorAiMessage);
    } finally {
      setIsLoadingAiResponse(false);
    }
  };

  const regenerateLastAiResponse = async () => {
    if (!activeChatId) return;
    stopSpeaking();
    const currentChat = chats.find(c => c.id === activeChatId);
    if (!currentChat) return;

    const lastAiMessageIndex = currentChat.messages.map((m, idx) => (m.role === 'ai' && !m.isLoading) ? idx : -1).filter(idx => idx !== -1).pop();
    if (lastAiMessageIndex === undefined || lastAiMessageIndex === -1) return;

    const lastAiMessage = currentChat.messages[lastAiMessageIndex];
    
    let precedingUserMessage: ChatMessage | undefined;
    let precedingUserMessageIndex = -1;
    for (let i = lastAiMessageIndex - 1; i >= 0; i--) {
        if (currentChat.messages[i].role === 'user') {
            precedingUserMessage = currentChat.messages[i];
            precedingUserMessageIndex = i;
            break;
        }
    }

    if (!precedingUserMessage || !precedingUserMessage.rawText || !precedingUserMessage.language) {
      console.warn("Cannot regenerate: No valid preceding user message found.");
      return;
    }
    
    const historyForPrompt = prepareHistory(currentChat, precedingUserMessageIndex);
    const imageDataUriForPrompt = precedingUserMessage.attachment?.type === 'image' ? precedingUserMessage.attachment.dataUri : undefined;


    const aiMessageToUpdate: ChatMessage = {
      ...lastAiMessage, 
      text: "Regenerating...", 
      isLoading: true,
      language: precedingUserMessage.language,
      accentCode: precedingUserMessage.accentCode || selectedAccent || undefined,
    };
    updateMessageInChat(activeChatId, aiMessageToUpdate);
    setIsLoadingAiResponse(true);

    try {
      const aiResponse = await regenerateAiResponse({ 
        userPrompt: precedingUserMessage.rawText, 
        language: precedingUserMessage.language, 
        accent: precedingUserMessage.accentCode || selectedAccent || undefined, 
        useSearch: useSearch, 
        history: historyForPrompt,
        imageDataUri: imageDataUriForPrompt,
        userLatitude: userLocation?.latitude,
        userLongitude: userLocation?.longitude,
      });
      const updatedAiMessage: ChatMessage = {
        ...aiMessageToUpdate,
        text: aiResponse.response,
        isLoading: false,
        timestamp: Date.now(),
      };
      updateMessageInChat(activeChatId, updatedAiMessage);
      if (currentMicAction === 'speak-with-ai' && aiResponse.response) {
         speakText(aiResponse.response, precedingUserMessage.language, precedingUserMessage.accentCode || selectedAccent);
      }
    } catch (error) {
      console.error("Error regenerating AI response:", error);
       const errorAiMessage: ChatMessage = {
        ...aiMessageToUpdate,
        text: 'Sorry, I encountered an error during regeneration. (Error)',
        isLoading: false,
        timestamp: Date.now(),
      };
      updateMessageInChat(activeChatId, errorAiMessage);
    } finally {
      setIsLoadingAiResponse(false);
    }
  };
  
  const startEditMessage = (messageId: string) => {
    setIsEditingMessageId(messageId);
    stopSpeaking();
  };

  const cancelEditMessage = () => {
    setIsEditingMessageId(null);
  };

  const submitEditMessage = (messageId: string, newRawText: string) => {
    if (!activeChatId) return;
    stopSpeaking();
    const chat = chats.find(c => c.id === activeChatId);
    if (!chat) return;

    const messageIndex = chat.messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1 || chat.messages[messageIndex].role !== 'user') return;

    const originalMessage = chat.messages[messageIndex];
    
    const langDetails = SUPPORTED_LANGUAGES.find(l => l.code === originalMessage.language);
    const langName = langDetails?.name || originalMessage.language;
    const accentDetails = originalMessage.accentCode ? langDetails?.accents?.find(a => a.code === originalMessage.accentCode) : null;
    const tag = accentDetails ? `${langName} (${accentDetails.name})` : langName;


    const updatedUserMessage: ChatMessage = {
      ...originalMessage,
      rawText: newRawText,
      text: `${newRawText} (${tag})`,
      timestamp: Date.now(), 
    };
    
    const messagesToKeep = chat.messages.slice(0, messageIndex + 1).map(m => m.id === messageId ? updatedUserMessage : m);
        
    const updatedChatSession = { ...chat, messages: messagesToKeep, lastModified: Date.now() };
    setChats(prevChats =>
      prevChats.map(c => c.id === activeChatId ? updatedChatSession : c)
    );
    
    setIsEditingMessageId(null);

    const historyForPrompt = prepareHistory(updatedChatSession, messageIndex);
    const imageDataUriForPrompt = originalMessage.attachment?.type === 'image' ? originalMessage.attachment.dataUri : undefined;


    const aiPlaceholderMessage: ChatMessage = {
      id: uuidv4(),
      role: 'ai',
      text: 'Thinking...',
      timestamp: Date.now(),
      isLoading: true,
      language: originalMessage.language || selectedLanguage, 
      accentCode: originalMessage.accentCode || selectedAccent || undefined,
    };
    addMessageToChat(activeChatId, aiPlaceholderMessage); 
    setIsLoadingAiResponse(true);

    hiddenAiPrompt({ 
      userInput: newRawText, 
      language: originalMessage.language || selectedLanguage,
      accent: originalMessage.accentCode || selectedAccent || undefined,
      useSearch: useSearch,
      history: historyForPrompt,
      imageDataUri: imageDataUriForPrompt,
      userLatitude: userLocation?.latitude,
      userLongitude: userLocation?.longitude,
    }).then(aiResponse => {
      const finalAiMessage: ChatMessage = {
        ...aiPlaceholderMessage,
        text: aiResponse.response,
        isLoading: false,
        timestamp: Date.now(),
      };
      updateMessageInChat(activeChatId, finalAiMessage);
      if (currentMicAction === 'speak-with-ai' && aiResponse.response) {
        speakText(aiResponse.response, originalMessage.language || selectedLanguage, originalMessage.accentCode || selectedAccent);
      }
    }).catch(error => {
      console.error("Error getting AI response after edit:", error);
      const errorAiMessage: ChatMessage = {
         ...aiPlaceholderMessage,
        text: 'Sorry, I encountered an error. Please try again. (Error)',
        isLoading: false,
        timestamp: Date.now(),
      };
      updateMessageInChat(activeChatId, errorAiMessage);
    }).finally(() => {
      setIsLoadingAiResponse(false);
    });
  };


  const copyMessageToClipboard = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        // Optional: toast notification
      }).catch(err => {
        console.error("Failed to copy message: ", err);
      });
    }
  };

  const setLanguage = (languageCode: LanguageCode) => {
    setSelectedLanguage(languageCode);
    const langDetails = SUPPORTED_LANGUAGES.find(l => l.code === languageCode);
    if (selectedAccent && (!langDetails || !langDetails.accents || !langDetails.accents.find(a => a.code === selectedAccent))) {
      setSelectedAccent(null);
    }
    stopSpeaking();
  };
  
  const setAccent = (accentCode: string | null) => {
    setSelectedAccent(accentCode);
    stopSpeaking();
  };

 const getChatName = useCallback((chat: ChatSession): string => {
    const defaultNameBase = "Chat";
    // If a custom name exists (not the default pattern), use it.
    if (chat.name && chat.name !== `${defaultNameBase} ${chat.id.substring(0,4)}` && !chat.name.startsWith(`${defaultNameBase} `) && chat.name !== `Chat ${chats.findIndex(c => c.id === chat.id) + 1}`) {
        return chat.name;
    }
    
    const firstUserMessage = chat.messages.find(m => m.role === 'user' && m.rawText && m.rawText.trim() !== '');
    if (firstUserMessage && firstUserMessage.rawText) {
      const name = firstUserMessage.rawText.substring(0, 30).trim();
      // Ensure a name is returned even if the rawText is empty after trimming.
      const finalName = name || `${defaultNameBase} ${chat.id.substring(0,4)}`;
      return name.length === 30 && firstUserMessage.rawText.length > 30 ? `${finalName}...` : finalName;
    }
    // Fallback to chat.name if it exists (could be default like "Chat 1"), or generate default.
    return chat.name || `${defaultNameBase} ${chat.id.substring(0,4)}`; 
  }, [chats]); // Dependency on `chats` to correctly get index for default name if needed.

  const contextValue = useMemo(() => ({
    chats,
    activeChatId,
    selectedLanguage,
    selectedAccent,
    isLoadingAiResponse,
    isEditingMessageId,
    currentSpokenText,
    isPlayingAudio,
    useSearch,
    voiceMode,
    currentMicAction,
    userLocation,
    setVoiceMode,
    setCurrentMicAction,
    createNewChat,
    selectChat,
    deleteChat,
    sendMessage,
    regenerateLastAiResponse,
    startEditMessage,
    cancelEditMessage,
    submitEditMessage,
    copyMessageToClipboard,
    setLanguage,
    setAccent,
    getChatName,
    speakText,
    stopSpeaking,
    setCurrentSpokenText,
    setUseSearch,
    updateUserLocation,
  }), [
    chats, activeChatId, selectedLanguage, selectedAccent, isLoadingAiResponse, isEditingMessageId, 
    currentSpokenText, isPlayingAudio, useSearch, voiceMode, currentMicAction, userLocation,
    setVoiceMode, setCurrentMicAction,
    createNewChat, selectChat, deleteChat, sendMessage, regenerateLastAiResponse, 
    startEditMessage, cancelEditMessage, submitEditMessage, copyMessageToClipboard, 
    setLanguage, setAccent, getChatName, speakText, stopSpeaking, setUseSearch, updateUserLocation
  ]);


  return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

